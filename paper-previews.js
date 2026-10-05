// Source-checked schematics: ExoFormer §3.4–3.5 and LR-AttnRes §3.2–3.3.
// Three layers / eight coordinates are explanatory drawings, not model dimensions.
export const concepts = {
  exoformer: {
    idea: 'Learn a reusable input reference separately, then mix it into each layer’s attention projections.',
    label: 'ExoFormer: a shared input anchor joins the current projections at each layer.',
    source: 'https://arxiv.org/pdf/2601.08131v4#page=4',
    steps: [
      '1 / project the input once into reusable Q, K, V and gate anchors.',
      '2 / normalize each anchor and mix it with the layer’s own projection.',
      '3 / use the mixed projections for gated attention; reuse the anchor at the next layer.',
    ],
  },
  'lr-attnres': {
    idea: 'Choose earlier layers using a narrow key, while carrying their full-width information forward.',
    label: 'LR-AttnRes: score narrow tail keys, then mix the original full-width values.',
    source: 'https://arxiv.org/pdf/2607.09694v2#page=4',
    steps: [
      '1 / take the last r coordinates of each source as its routing key.',
      '2 / RMS-normalize those keys, score with a learned query, and softmax over sources.',
      '3 / apply those weights to the full-width values. The output still has width d.',
    ],
  },
};
const chips=(tail=false)=>Array.from({length:8},(_,i)=>`<i${tail&&i>=6?' class="key-coordinate"':''}></i>`).join('');

export function paperPreview(slug) {
  const concept=concepts[slug];if(!concept)return '';
  const diagram=slug==='exoformer'?`
    <div class="anchor-path"><span class="input-token">input H₀</span><span class="concept-arrow" aria-hidden="true">→</span><div class="shared-anchor"><span>anchor Q / K / V / G</span><small>separate learned projections · normalized</small></div></div>
    <div class="anchor-bus" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="layer-path">${[1,2,3].map(i=>`<div class="concept-layer"><span class="layer-label">layer ${i}</span><span class="local-projection">local Q / K / V / G</span><span class="projection-mix">learned mix</span><span class="attention-readout">gated attention</span></div>`).join('')}</div>
  `:`
    <div class="routing-headings"><span>earlier sources</span><span>route in r</span><span>output in d</span></div>
    <div class="routing-path"><div class="source-bank" aria-hidden="true">${[0,1,2].map(i=>`<div class="source-vector" style="--source:${i}">${chips(true)}</div>`).join('')}<span class="source-width">full-width values · d</span></div>
      <div class="narrow-router"><span class="query-label">learned query</span><span class="route-keys" aria-hidden="true"><i></i><i></i></span><span class="routing-operation">RMS → scores<br>→ softmax</span></div>
      <div class="full-output"><div class="output-vector" aria-hidden="true">${chips()}</div><span>weighted sum</span><small>all coordinates</small></div>
    </div><div class="value-bypass"><span>values stay full width</span></div>
  `;
  return `<p class="paper-idea">${concept.idea}</p><figure class="paper-concept concept-${slug}" data-concept="${slug}" data-step="0" aria-label="${concept.label}">
    <div class="concept-drawing" role="img" aria-label="${concept.label}">${diagram}</div>
    <figcaption><span class="concept-caption">${slug==='exoformer'?'one persistent reference; a fresh interpretation at each layer.':'small keys decide. full values carry the information.'}</span><button type="button" class="trace-concept" aria-label="Trace the idea in ${slug==='exoformer'?'ExoFormer':'LR-AttnRes'}">trace idea <span aria-hidden="true">↗</span></button></figcaption>
    <div class="concept-meta"><span>schematic · illustrative dimensions</span><a href="${concept.source}" target="_blank" rel="noopener noreferrer">method ↗</a></div>
  </figure>`;
}

export function setupPaperPreviews(root) {
  const lifetime=new AbortController(),timers=new Set();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stop(){for(const timer of timers)clearTimeout(timer);timers.clear();}
  root.addEventListener('click',event=>{
    const button=event.target.closest('.trace-concept');if(!button)return;
    const figure=button.closest('[data-concept]'),slug=figure.dataset.concept,concept=concepts[slug];
    stop();root.querySelectorAll('[data-concept]').forEach(el=>{if(el!==figure)el.dataset.step='0';});
    const setStep=step=>{figure.dataset.step=String(step);figure.querySelector('.concept-caption').textContent=concept.steps[step-1];button.innerHTML=`${step===3?'replay':reduced?'next step':'tracing'} <span aria-hidden="true">${step===3?'↺':'→'}</span>`;};
    if(reduced){setStep(Number(figure.dataset.step)%3+1);return;}
    setStep(1);
    for(const [delay,step] of [[1400,2],[3200,3]]) {
      const timer=setTimeout(()=>{timers.delete(timer);setStep(step);},delay);timers.add(timer);
    }
  },{signal:lifetime.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();},{signal:lifetime.signal});
  return ()=>{stop();lifetime.abort();};
}
