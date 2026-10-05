import { escapeHTML as escape } from './site-utils.js';
import { setupLeaderboard } from './leaderboard.js?v=attention-compute-plateau-20261005';

const COLORS = ['#9bb9ce', '#d89b86', '#9cc6ad', '#b6a2cf', '#d4bd88', '#b7bbbf'];
const CACHE = new Map();
let counter = 0;
const number = (value, digits = 4) => Number(value).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).replace('-', '−');
const fixed = (value, digits = 4) => Number(value).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).replace('-', '−');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const color = series => COLORS[series.color % COLORS.length];

export function nearest(points, value) {
  if (!points.length) return null;
  let lo = 0, hi = points.length;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (points[m][0] < value) lo = m + 1; else hi = m; }
  if (!lo) return points[0];
  if (lo === points.length) return points[lo - 1];
  return value - points[lo - 1][0] <= points[lo][0] - value ? points[lo - 1] : points[lo];
}
export function tickValues(min, max, count = 5) {
  const raw = (max - min) / Math.max(1, count - 1), power = 10 ** Math.floor(Math.log10(raw || 1));
  const fraction = raw / power, step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * power;
  const ticks = [];
  for (let x = Math.ceil(min / step) * step; x <= max + step * 1e-7; x += step) ticks.push(Number(x.toPrecision(12)));
  return { ticks, digits: Math.max(0, Math.min(5, -Math.floor(Math.log10(step)) + (step / power === 2.5 ? 1 : 0))) };
}
function extent(values, padding = .09) {
  let min = Math.min(...values), max = Math.max(...values);
  const delta = (max - min) || Math.max(.05, Math.abs(min) * .05);
  return [min - delta * padding, max + delta * padding];
}
function chartData(id) {
  if (!CACHE.has(id)) CACHE.set(id, fetch(`./blog/purrence/charts/${encodeURIComponent(id)}.json?v=attention-compute-plateau-20261005`).then(r => {
    if (!r.ok) throw new Error(`Chart unavailable (${r.status})`);
    return r.json();
  }).catch(error => { CACHE.delete(id); throw error; }));
  return CACHE.get(id);
}

class ResearchPlot {
  constructor(host, chart) {
    this.host = host; this.chart = chart; this.index = 0; this.hidden = new Set();
    this.uid = `research-plot-${++counter}`; this.fullRange = false; this.activeX = null;
    this.events = new AbortController(); this.pendingResize = 0;
    this.renderShell();
    this.resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { cancelAnimationFrame(this.pendingResize); this.pendingResize = requestAnimationFrame(() => this.draw()); }) : null;
    if (this.resize) this.resize.observe(this.host);
    else window.addEventListener('resize', () => this.draw(), { signal: this.events.signal });
  }
  get view() { return this.chart.views[this.index]; }
  get visible() { return this.view.series.filter(s => !this.hidden.has(s.id)); }
  renderShell() {
    const { chart, host } = this;
    host.classList.add('research-plot');
    host.innerHTML = `<header class="plot-header"><div><h3 id="${this.uid}-title">${escape(chart.title)}</h3><p class="plot-meta">${escape(chart.meta)}</p></div></header>
      ${chart.views.length > 1 ? `<div class="plot-tabs" role="tablist" aria-label="Views of ${escape(chart.title)}">${chart.views.map((v, i) => `<button type="button" role="tab" id="${this.uid}-tab-${i}" aria-controls="${this.uid}-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-view="${i}">${escape(v.label)}</button>`).join('')}</div>` : ''}
      <div class="plot-panel" id="${this.uid}-panel" ${chart.views.length > 1 ? `role="tabpanel" aria-labelledby="${this.uid}-tab-0"` : ''}>
        <div class="plot-legend" aria-label="Visible series"></div>
        <div class="plot-axis-header"><span class="plot-y-title"></span><button type="button" class="plot-range" data-action="range" hidden>Full range</button></div>
        <div class="plot-stage" tabindex="0" role="group" aria-label="Interactive plot. Point or tap to inspect values. Use left and right arrow keys to move through points. Press Escape to clear."><svg class="plot-svg" role="img" aria-labelledby="${this.uid}-title"></svg><div class="plot-tooltip" hidden></div></div>
        <div class="plot-x-title"></div><div class="plot-a11y" aria-live="polite" aria-atomic="true"></div>
      </div>`;
    this.svg = host.querySelector('svg'); this.stage = host.querySelector('.plot-stage'); this.tooltip = host.querySelector('.plot-tooltip');
    const options = { signal: this.events.signal };
    host.addEventListener('click', e => {
      const tab = e.target.closest('[data-view]');
      if (tab) { this.setView(Number(tab.dataset.view)); return; }
      const series = e.target.closest('[data-series]');
      if (series) {
        const id = series.dataset.series;
        if (this.hidden.has(id)) this.hidden.delete(id); else if (this.visible.length > 1) this.hidden.add(id);
        this.renderLegend(); this.clear(); this.draw(); return;
      }
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'range') { this.fullRange = !this.fullRange; this.updateRange(); this.clear(); this.draw(); }
    }, options);
    host.querySelector('.plot-tabs')?.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault();
      const n = chart.views.length;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (this.index + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
      this.setView(next); host.querySelector(`[data-view="${next}"]`).focus();
    }, options);
    this.stage.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') this.inspectEvent(e); }, options);
    this.stage.addEventListener('pointerdown', e => { this.inspectEvent(e); }, options);
    this.stage.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && document.activeElement !== this.stage) this.clear(); }, options);
    this.stage.addEventListener('blur', () => this.clear(), options);
    this.stage.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.clear(); return; }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
      e.preventDefault();
      const horizontal = this.view.orientation === 'horizontal';
      const xs = [...new Set(this.visible.flatMap(s => s.points.map(p => p[horizontal ? 1 : 0])))].sort((a,b) => a-b);
      let i = this.activeX == null ? -1 : xs.indexOf(this.activeX);
      i = e.key === 'Home' ? 0 : e.key === 'End' ? xs.length - 1 : clamp(i + (['ArrowRight','ArrowDown'].includes(e.key) ? 1 : -1), 0, xs.length - 1);
      this.inspect(xs[i], true);
    }, options);
    this.setView(0);
  }
  setView(index) {
    this.index = index; this.fullRange = false; this.clear();
    if (!this.visible.length) this.hidden.clear();
    this.host.querySelectorAll('[data-view]').forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
    if (this.chart.views.length > 1) this.host.querySelector('.plot-panel').setAttribute('aria-labelledby', `${this.uid}-tab-${index}`);
    this.host.querySelector('.plot-y-title').textContent = this.view.orientation === 'horizontal' ? this.view.yLabel : this.view.yLabel;
    this.host.querySelector('.plot-x-title').textContent = this.view.xLabel;
    this.renderLegend(); this.updateRange(); this.draw();
  }
  updateRange() {
    const button = this.host.querySelector('.plot-range'); button.hidden = !this.view.yDomain;
    button.textContent = this.fullRange ? 'Focus range' : 'Full range';
    button.setAttribute('aria-label', `${this.fullRange ? 'Focus the loss range' : 'Show the full loss range'} for ${this.chart.title}`);
  }
  renderLegend() {
    const legend = this.host.querySelector('.plot-legend'); legend.hidden = !!this.view.hideLegend;
    legend.innerHTML = this.view.hideLegend ? '' : this.view.series.map(s => `<button type="button" data-series="${escape(s.id)}" aria-pressed="${!this.hidden.has(s.id)}" ${this.visible.length === 1 && !this.hidden.has(s.id) ? 'aria-disabled="true"' : ''} style="--series-color:${color(s)}"><span class="plot-swatch" aria-hidden="true"></span>${escape(s.label)}</button>`).join('');
  }
  draw() {
    if (!this.host.isConnected) return;
    const v = this.view, horizontal = v.orientation === 'horizontal';
    const width = Math.max(260, this.stage.clientWidth), mobile = width < 480;
    const height = horizontal ? Math.max(240, v.categories.length * 43 + 38) : mobile ? 265 : 320;
    const margin = { l: horizontal ? (mobile ? 103 : 132) : 47, r: 18, t: 17, b: 35 };
    const all = v.series.flatMap(s => s.points), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const xDomain = v.xDomain || (!horizontal && v.categories ? [-.2, v.categories.length - .8] : extent(v.reference != null && horizontal ? [...xs,v.reference] : xs, .05));
    const yDomain = horizontal ? [-.6, v.categories.length - .4] : v.yDomain && !this.fullRange ? v.yDomain : extent(v.reference != null ? [...ys,v.reference] : ys);
    const pw = width - margin.l - margin.r, ph = height - margin.t - margin.b;
    const x = n => margin.l + (n - xDomain[0]) / (xDomain[1] - xDomain[0]) * pw;
    const y = n => horizontal ? margin.t + (n - yDomain[0]) / (yDomain[1] - yDomain[0]) * ph : margin.t + (yDomain[1] - n) / (yDomain[1] - yDomain[0]) * ph;
    this.geometry = { width,height,margin,pw,ph,x,y,xDomain,yDomain,horizontal };
    const xt = v.xTicks ? { ticks:v.xTicks,digits:0 } : !horizontal && v.categories ? { ticks:v.categories.map((_,i)=>i),digits:0 } : tickValues(...xDomain,mobile ? 4 : 6);
    const yt = horizontal ? { ticks:v.categories.map((_,i)=>i),digits:0 } : tickValues(...yDomain,5);
    let markup = `<defs><clipPath id="${this.uid}-clip"><rect x="${margin.l}" y="${margin.t}" width="${pw}" height="${ph}"/></clipPath></defs>`;
    for (const n of yt.ticks) {
      const label = horizontal ? v.categories[n] : number(n, yt.digits);
      markup += `<line class="plot-grid" x1="${margin.l}" x2="${width-margin.r}" y1="${y(n)}" y2="${y(n)}"/><text class="plot-tick" x="${margin.l-10}" y="${y(n)+4}" text-anchor="end">${escape(label)}</text>`;
    }
    markup += `<line class="plot-baseline" x1="${margin.l}" x2="${width-margin.r}" y1="${height-margin.b}" y2="${height-margin.b}"/>`;
    for (const n of xt.ticks) markup += `<text class="plot-tick" x="${x(n)}" y="${height-12}" text-anchor="middle">${escape(!horizontal && v.categories ? v.categories[n] : number(n,xt.digits))}</text>`;
    if (v.reference != null) markup += horizontal ? `<line class="plot-reference" x1="${x(v.reference)}" x2="${x(v.reference)}" y1="${margin.t}" y2="${height-margin.b}"/>` : `<line class="plot-reference" x1="${margin.l}" x2="${width-margin.r}" y1="${y(v.reference)}" y2="${y(v.reference)}"/>`;
    markup += `<g clip-path="url(#${this.uid}-clip)">`;
    for (const s of this.visible) {
      if (horizontal) {
        for (const p of s.points) {
          if (v.kind === 'bar') markup += `<rect class="plot-bar" x="${Math.min(x(0),x(p[0]))}" y="${y(p[1])-11}" width="${Math.abs(x(p[0])-x(0))}" height="22" rx="2" fill="${color(s)}"/>`;
          else markup += `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="5" fill="${color(s)}"/>`;
        }
      } else {
        const path = s.points.map((p,i)=>`${i?'L':'M'}${x(p[0]).toFixed(2)},${y(p[1]).toFixed(2)}`).join(' ');
        markup += `<path class="plot-line" d="${path}" stroke="${color(s)}"/>`;
        if (v.markers) for (const p of s.points) markup += `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3.5" fill="${color(s)}"/>`;
      }
    }
    markup += `</g><g class="plot-cursor" aria-hidden="true"></g>`;
    this.svg.setAttribute('viewBox',`0 0 ${width} ${height}`); this.svg.setAttribute('width',width); this.svg.setAttribute('height',height);
    this.svg.innerHTML = markup;
    if (this.activeX != null) this.inspect(this.activeX);
  }
  inspectEvent(event) {
    if (!this.geometry) return;
    const g = this.geometry, rect = this.stage.getBoundingClientRect();
    if (g.horizontal) {
      const py = (event.clientY - rect.top) / rect.height * g.height;
      this.inspect(clamp(Math.round(g.yDomain[0] + (py - g.margin.t) / g.ph * (g.yDomain[1]-g.yDomain[0])),0,this.view.categories.length-1));
    } else {
      const px = (event.clientX - rect.left) / rect.width * g.width;
      const value = g.xDomain[0] + (px - g.margin.l) / g.pw * (g.xDomain[1]-g.xDomain[0]);
      const candidates = this.visible.map(s=>nearest(s.points,value)).filter(Boolean);
      if (!candidates.length) return;
      const p = candidates.reduce((a,b)=>Math.abs(a[0]-value)<Math.abs(b[0]-value)?a:b);
      this.inspect(p[0]);
    }
  }
  inspect(value, keyboard = false) {
    const g = this.geometry, v = this.view;
    if (!g || value == null) return;
    this.activeX = value;
    const matches = this.visible.map(s=>({s,p:g.horizontal?s.points.find(p=>p[1]===value):nearest(s.points,value)})).filter(({p})=>p && (g.horizontal || !v.categories || p[0]===value));
    if (!matches.length) return;
    const axis = g.horizontal ? v.categories[value] : v.categories ? v.categories[value] : `${number(value,3)} · ${v.xLabel}`;
    this.tooltip.innerHTML = `<strong>${escape(axis)}</strong>${matches.map(({s,p})=>`<div class="plot-tip-row"><span><i style="background:${color(s)}"></i>${escape(s.label)}</span><b>${fixed(p[g.horizontal?0:1],v.precision || 4)}</b></div>${!g.horizontal && !v.categories && Math.abs(p[0]-value)>1e-8?`<small class="plot-tip-at">at ${number(p[0],3)}</small>`:''}`).join('')}`;
    this.tooltip.hidden = false;
    const focusX = g.horizontal ? g.x(matches[0].p[0]) : g.x(value), focusY = g.horizontal ? g.y(value) : g.margin.t;
    const tw = this.tooltip.offsetWidth;
    this.tooltip.style.left = `${clamp(focusX + 15, 3, g.width - tw - 3)}px`;
    this.tooltip.style.top = `${g.horizontal ? clamp(focusY - this.tooltip.offsetHeight - 12,3,g.height-this.tooltip.offsetHeight) : 7}px`;
    let marks = g.horizontal ? `<line class="plot-hairline" x1="${g.margin.l}" x2="${g.width-g.margin.r}" y1="${g.y(value)}" y2="${g.y(value)}"/>` : `<line class="plot-hairline" x1="${g.x(value)}" x2="${g.x(value)}" y1="${g.margin.t}" y2="${g.height-g.margin.b}"/>`;
    for (const {s,p} of matches) if (g.horizontal || p[1]>=g.yDomain[0]&&p[1]<=g.yDomain[1]) marks += `<circle cx="${g.x(p[0])}" cy="${g.y(p[1])}" r="5" fill="${color(s)}" stroke="#231f20" stroke-width="2"/>`;
    this.svg.querySelector('.plot-cursor').innerHTML = marks;
    if (keyboard) this.host.querySelector('.plot-a11y').textContent = `${axis}. ${matches.map(({s,p})=>`${s.label}: ${fixed(p[g.horizontal?0:1],v.precision||4)}`).join('. ')}`;
  }
  clear() {
    this.activeX = null;
    if (this.tooltip) this.tooltip.hidden = true;
    this.svg?.querySelector('.plot-cursor')?.replaceChildren();
  }
  dispose() { this.resize?.disconnect();cancelAnimationFrame(this.pendingResize);this.events.abort(); }
}

export function setupResearchPlots(root) {
  const plots=[],widgets=[],listeners=new AbortController();let disposed=false;
  const observer=typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries=>entries.forEach(entry=>{
    if (!entry.isIntersecting) return;
    observer.unobserve(entry.target);load(entry.target);
  }),{rootMargin:'500px'}) : null;
  async function load(host) {
    const fallback=host.querySelector('.chart-fallback')?.outerHTML || '';
    try { const data=await chartData(host.dataset.chart);if(!disposed&&host.isConnected)plots.push(new ResearchPlot(host,data)); }
    catch { if(disposed)return;host.innerHTML=fallback+'<p class="plot-load-error">This chart could not load. <button type="button">Try again</button></p>';host.querySelector('button').addEventListener('click',()=>load(host),{once:true,signal:listeners.signal}); }
  }
  root.querySelectorAll('[data-chart]').forEach(host=>observer ? observer.observe(host) : load(host));
  root.querySelectorAll('[data-two-pass-diagram]').forEach(host=>widgets.push(setupTwoPass(host)));
  root.querySelectorAll('[data-vocabulary-budget]').forEach(host=>widgets.push(setupVocabulary(host)));
  root.querySelectorAll('[data-architecture-diagram]').forEach(host=>widgets.push(setupArchitecture(host)));
  root.querySelectorAll('[data-leaderboard-diagram]').forEach(host=>widgets.push(setupLeaderboard(host)));
  return ()=>{disposed=true;observer?.disconnect();listeners.abort();plots.forEach(p=>p.dispose());widgets.forEach(fn=>fn());};
}

function setupTwoPass(host) {
  let stage=0,token=1;const uid=`two-pass-${++counter}`;const events=new AbortController();
  const names=['a','b','c'],tabs=['First pass','Interleave','Second pass'];
  host.className='research-diagram';
  host.innerHTML=`<header class="plot-header"><div><h3>Two passes, one shared backbone</h3><p class="plot-meta">6 loops per pass · zero Jacobi iterations</p></div></header><div class="diagram-controls"><div class="plot-tabs" role="tablist" aria-label="Two pass stages">${tabs.map((t,i)=>`<button type="button" data-stage="${i}" id="${uid}-tab-${i}" aria-controls="${uid}-panel" role="tab" aria-selected="${i===0}">${t}</button>`).join('')}</div><div class="diagram-focus" role="group" aria-label="Token to follow"><span>Follow</span>${names.map((n,i)=>`<button type="button" data-token="${i}" aria-pressed="${i===token}">${n}</button>`).join('')}</div></div><p class="diagram-explanation" aria-live="polite"></p><div class="two-pass-canvas" id="${uid}-panel" role="tabpanel" tabindex="0" aria-labelledby="${uid}-tab-0"></div>`;
  const pill=(text,i,latent=false,active=true)=>`<span class="token-node ${latent?'latent-node':''} ${active?'':'token-muted'} ${i===token?'token-selected':''}">${text}</span>`;
  function draw(){
    host.querySelectorAll('[data-stage]').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===stage));b.tabIndex=i===stage?0:-1;});
    host.querySelectorAll('[data-token]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===token)));
    host.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby',`${uid}-tab-${stage}`);
    const n=names[token],target=token<2?names[token+1]:'next token';
    host.querySelector('.diagram-explanation').textContent=[`The first pass builds z_${n} from the causal prefix ${names.slice(0,token+1).join(', ')}.`,`Place each hidden state beside its real token. The pair shares one logical position.`,`The output at z_${n} predicts ${target}. Later real tokens remain masked.`][stage];
    const real=names.map((n,i)=>pill(n,i,false,i<=token)).join('');
    const latent=names.map((n,i)=>pill(`z<sub>${n}</sub>`,i,true,i<=token)).join('');
    const interleaved=names.map((n,i)=>pill(n,i,false,i<=token)+pill(`z<sub>${n}</sub>`,i,true,i<=token)).join('');
    host.querySelector('.two-pass-canvas').innerHTML=stage===0?`<div class="diagram-row-label">real tokens</div><div class="token-row three-tokens">${real}</div><div class="diagram-arrow">↓</div><div class="shared-block">shared transformer block <span>× 6 loops</span></div><div class="diagram-arrow">↓</div><div class="token-row three-tokens">${latent}</div>`:stage===1?`<div class="interleave-source"><div class="token-row three-tokens">${real}</div><div class="token-row three-tokens">${latent}</div></div><div class="diagram-arrow">↓ interleave</div><div class="token-row six-tokens">${interleaved}</div><div class="position-row"><span>position 0</span><span>position 1</span><span>position 2</span></div>`:`<div class="token-row six-tokens">${interleaved}</div><div class="diagram-arrow">↓</div><div class="shared-block">same transformer block <span>× 6 loops</span></div><div class="diagram-arrow">↓ latent outputs</div><div class="prediction-node">z<sub>${n}</sub><span>→</span><strong>${target}</strong></div>`;
  }
  host.addEventListener('click',e=>{const s=e.target.closest('[data-stage]'),t=e.target.closest('[data-token]');if(s)stage=Number(s.dataset.stage);if(t)token=Number(t.dataset.token);if(s||t)draw();},{signal:events.signal});
  host.querySelector('[role="tablist"]').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();stage=e.key==='Home'?0:e.key==='End'?2:(stage+(e.key==='ArrowRight'?1:2))%3;draw();host.querySelector(`[data-stage="${stage}"]`).focus();},{signal:events.signal});
  draw();return()=>events.abort();
}

function setupVocabulary(host) {
  const events=new AbortController();host.className='research-diagram vocabulary-budget';
  host.innerHTML=`<header class="plot-header"><div><h3>How much of 3M goes to vocabulary?</h3><p class="plot-meta">Illustrative parameter arithmetic · tied embeddings · width 384</p></div></header><label class="budget-slider">Vocabulary size <output>2,048</output><input type="range" min="512" max="16384" step="512" value="2048" aria-label="Vocabulary size"></label><div class="budget-preset" role="group" aria-label="Vocabulary presets">${[2048,4096,8192,16384].map(n=>`<button type="button" data-vocab="${n}">${number(n)}</button>`).join('')}</div><div class="budget-bar" role="img"><span></span></div><div class="budget-numbers" aria-live="polite"></div>`;
  const slider=host.querySelector('input');
  function draw(){const vocab=Number(slider.value),embedding=vocab*384,remaining=3000000-embedding;host.querySelector('output').textContent=number(vocab);host.querySelector('.budget-bar span').style.width=`${Math.min(100,embedding/3000000*100)}%`;host.classList.toggle('budget-over',remaining<0);host.querySelector('.budget-bar').setAttribute('aria-label',`${number(embedding)} embedding parameters. ${fixed(embedding/3000000*100,1)} percent of 3 million`);host.querySelector('.budget-numbers').innerHTML=`<div><strong>${number(embedding)}</strong><span>embedding parameters</span></div><div><strong>${remaining<0?'+':''}${number(Math.abs(remaining))}</strong><span>${remaining<0?'over the entire budget':'left for the rest of the model'}</span></div>`;host.querySelectorAll('[data-vocab]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.vocab)===vocab)));}
  slider.addEventListener('input',draw,{signal:events.signal});host.addEventListener('click',e=>{const b=e.target.closest('[data-vocab]');if(b){slider.value=b.dataset.vocab;draw();}},{signal:events.signal});draw();return()=>events.abort();
}

function setupArchitecture(host) {
  const events=new AbortController();let mode=0;const uid=`architecture-${++counter}`;host.className='research-diagram';
  const models=[{name:'Six loop',schedule:[0,0,0,0,0,0],stored:1,width:384,mlp:'ReLU² · 2,096',attention:'6 head MHA · per head XSA + sigmoid gates',context:'8,192',inference:'2,987,712',training:'4,757,184'},{name:'Pulvis v2 shape',schedule:[0,1,2,3,4,2,3,4,2,3,4,5,6,7,8,9],stored:10,width:160,mlp:'SwiGLU · 352',attention:'5 query heads · 1 KV head',context:'1,024',inference:'2,637,376',training:'2,944,576'}];
  host.innerHTML='<header class="plot-header"><div><h3>Two different allocations of the parameter budget</h3><p class="plot-meta">Each letter identifies a stored block. Repeated letters share weights.</p></div></header><div class="plot-tabs" role="tablist" aria-label="Architecture layout"><button type="button" role="tab" data-architecture="0">Six loop</button><button type="button" role="tab" data-architecture="1">Pulvis v2 shape</button></div><div class="architecture-body"></div>';
  host.querySelectorAll('[data-architecture]').forEach((b,i)=>{b.id=`${uid}-tab-${i}`;b.setAttribute('aria-controls',`${uid}-panel`);});
  const panel=host.querySelector('.architecture-body');panel.id=`${uid}-panel`;panel.setAttribute('role','tabpanel');panel.tabIndex=0;
  function draw(){panel.setAttribute('aria-labelledby',`${uid}-tab-${mode}`);const m=models[mode];host.querySelectorAll('[data-architecture]').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===mode));b.tabIndex=i===mode?0:-1;});host.querySelector('.architecture-body').innerHTML=`<div class="architecture-schedule" aria-label="Block schedule ${m.schedule.map(n=>String.fromCharCode(65+n)).join(', ')}">${m.schedule.map(n=>`<span style="--block-color:${COLORS[n%COLORS.length]}">${String.fromCharCode(65+n)}</span>`).join('')}</div><dl class="architecture-specs">${[['Stored blocks',m.stored],['Block applications',m.schedule.length],['Hidden width',m.width],['Attention',m.attention],['FFN',m.mlp],['Context',m.context],['Inference parameters',m.inference],['Training parameters',m.training]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;}
  host.addEventListener('click',e=>{const b=e.target.closest('[data-architecture]');if(b){mode=Number(b.dataset.architecture);draw();}},{signal:events.signal});host.querySelector('[role="tablist"]').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();mode=e.key==='Home'?0:e.key==='End'?1:1-mode;draw();host.querySelector(`[data-architecture="${mode}"]`).focus();},{signal:events.signal});draw();return()=>events.abort();
}
