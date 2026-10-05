import { routeToy, mixToy } from './paper-calculations.js';
import { highlightPython } from './syntax-highlight.js';

const number = x => Math.abs(x) < .0005 ? '0.000' : x.toFixed(3);
const vector = xs => `[${xs.map(number).join(', ')}]`;
const codeLine = (step, text) => `<span class="lab-code-line" data-code-step="${step}"><code class="language-python">${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</code></span>`;
const slider = (name, label, min, max, step, value) => `<label class="lab-control">${label}<output data-value="${name}">${value}</output><input type="range" aria-label="${label}" name="${name}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
const stepButton = (step, formula) => `<button type="button" class="lab-step" data-step="${step}" aria-pressed="false">${formula}</button>`;

function routingMarkup() {
  return `<p class="lab-intro">a small key chooses a full-width value.</p>
    <div class="lab-controls">${slider('rank', 'routing width r', 1, 4, 1, 2)}${slider('firstValue', 'first feature of source A', 0, 8, .5, 4)}${slider('strength', 'query strength', 0, 2, .1, 1)}</div>
    <div class="lab-metrics" data-metrics></div>
    <div class="lab-data"><div><h3>source values · 2 × 4</h3><p class="lab-caption">outlined cells also supply the keys</p><div data-source-matrix></div></div><div><h3>source weights</h3><div data-weights></div></div></div>
    <div class="lab-output"><span>full-width output</span><div data-output-matrix></div></div>
    <p class="lab-caption">select a step to connect the equation, numbers, and code.</p>
    <div class="lab-steps">${stepButton('keys', 'k = rms(v[−r:])')}${stepButton('scores', 'z = k · q')}${stepButton('weights', 'α = softmax(z)')}${stepButton('output', 'h = Σ αᵢvᵢ')}</div>
    <p class="lab-live" data-live role="status" aria-live="polite"></p>
    <pre class="lab-code">${codeLine('keys', 'keys = rms(values[..., -r:])')}${codeLine('scores', 'scores = (keys * query).sum(-1)')}${codeLine('weights', 'weights = scores.softmax(dim=0)')}${codeLine('output', 'output = (weights[:, None] * values).sum(0)')}</pre>
    <p class="lab-note">For r &lt; 4, changing the first feature of A changes the output but not the weights. With r = 4, that feature participates in routing too. The query uses the final r entries of one fixed four-number vector. <a href="https://arxiv.org/pdf/2607.09694v2#page=4" target="_blank" rel="noopener noreferrer">Paper §3.2</a></p>`;
}

function mixingMarkup() {
  return `<p class="lab-intro">a reference and a current interpretation, mixed independently.</p>
    <div class="lab-controls">${slider('anchorWeight', 'anchor coefficient λ₁', -1, 2, .05, .75)}${slider('currentWeight', 'current coefficient λ₂', -1, 2, .05, .25)}<label class="lab-check"><input type="checkbox" name="normalize" checked> normalize the anchor</label></div>
    <div class="lab-data"><div><h3>one token · one value head</h3><dl class="lab-vectors"><dt>raw anchor</dt><dd>[3, 4]</dd><dt>reference</dt><dd data-reference></dd><dt>current value</dt><dd>[1, −1]</dd></dl><p class="lab-caption">2 scalar mixing parameters for this head.</p></div><div class="vector-plot" data-vector-plot></div></div>
    <div class="lab-output"><span>mixed value</span><div data-output-matrix></div></div>
    <p class="lab-caption">select a step to connect the equation, numbers, and code.</p>
    <div class="lab-steps">${stepButton('reference', 'a = rms(anchor)')}${stepButton('anchor', 'λ₁ · a')}${stepButton('current', 'λ₂ · current')}${stepButton('output', 'v̂ = λ₁a + λ₂v')}</div>
    <p class="lab-live" data-live role="status" aria-live="polite"></p>
    <pre class="lab-code">${codeLine('reference', 'reference = rms(anchor) if normalize else anchor')}${codeLine('anchor', 'anchor_part = lambda_1 * reference')}${codeLine('current', 'current_part = lambda_2 * current')}${codeLine('output', 'mixed = anchor_part + current_part')}</pre>
    <p class="lab-note">The coefficients may be negative and do not have to sum to one. This shows value-projection mixing before attention. RMS gains are fixed to one; the model learns them. Switching normalization off is an ablation. <a href="https://arxiv.org/pdf/2601.08131v4#page=4" target="_blank" rel="noopener noreferrer">Paper Eq. 10</a></p>`;
}

const cells = (row, keyStart = Infinity) => `<div class="matrix-row">${row.map((x, j) => `<span class="matrix-cell${j >= keyStart ? ' key-cell' : ''}">${number(x)}</span>`).join('')}</div>`;
function vectorPlot(reference, current, output) {
  const extent = Math.max(2, ...[reference, current, output].flat().map(Math.abs)) * 1.15;
  const scale = 95 / extent;
  const point = v => [120 + v[0] * scale, 115 - v[1] * scale];
  const arrow = (v, color, label) => {
    const [x, y] = point(v);
    return `<line x1="120" y1="115" x2="${x}" y2="${y}" stroke="${color}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4" fill="${color}"/><text x="${x > 180 ? x - 7 : x + 7}" y="${y - 7}" text-anchor="${x > 180 ? 'end' : 'start'}" fill="${color}">${label}</text>`;
  };
  return `<svg viewBox="0 0 280 230" role="img" aria-label="Vector directions: normalized reference ${vector(reference)}, current ${vector(current)}, mixed ${vector(output)}"><path d="M20 115H260M120 15V215" fill="none" stroke="#ffffff24"/>${arrow(reference, '#cb8883', 'reference')}${arrow(current, '#92bac5', 'current')}${arrow(output, '#f4eee8', 'mixed')}</svg>`;
}

export function mountPlayground(root, slug) {
  const routing = slug === 'lr-attnres';
  root.innerHTML = `${routing ? routingMarkup() : mixingMarkup()}<div class="lab-footer"><span>illustrative numbers · no training or benchmark prediction</span><button type="button" class="quiet-button" data-reset-lab>reset</button></div>`;
  // Preserve line wrappers so each formula can select its actual code line.
  root.querySelectorAll('code.language-python').forEach(code => {
    const pre = document.createElement('pre'); code.replaceWith(pre); pre.append(code);
    highlightPython(pre); pre.replaceWith(code);
  });
  let step = 'output';
  function update() {
    const parameters = {};
    root.querySelectorAll('input').forEach(input => {
      parameters[input.name] = input.type === 'checkbox' ? input.checked : Number(input.value);
      const output = root.querySelector(`[data-value="${input.name}"]`);
      if (output) output.value = input.value;
    });
    let descriptions;
    if (routing) {
      const { values, query, keys, scores, weights, output } = routeToy(parameters);
      root.querySelector('[data-metrics]').innerHTML = `<span>keys <strong>2 × ${parameters.rank}</strong></span><span>values <strong>2 × 4</strong></span><span>learned query <strong>${parameters.rank} parameters</strong></span>`;
      root.querySelector('[data-source-matrix]').innerHTML = values.map((row, i) => `<div class="matrix-label">${i ? 'B' : 'A'}</div>${cells(row, 4 - parameters.rank)}`).join('');
      root.querySelector('[data-weights]').innerHTML = weights.map((w, i) => `<div class="weight-row"><span>${i ? 'B' : 'A'}</span><div class="weight-track"><span style="width:${w * 100}%"></span></div><output>${(100 * w).toFixed(1)}%</output></div>`).join('');
      root.querySelector('[data-output-matrix]').innerHTML = cells(output);
      descriptions = {
        keys: `Normalize only the last ${parameters.rank} coordinates. Key A = ${vector(keys[0])}; key B = ${vector(keys[1])}.`,
        scores: `Dot each key with q = ${vector(query)}. Scores = ${vector(scores)}.`,
        weights: `Softmax over the two sources: ${vector(weights)}. Their weights sum to 1.`,
        output: `Carry all four value coordinates: ${number(weights[0])} × A + ${number(weights[1])} × B = ${vector(output)}.`,
      };
    } else {
      const { reference, current, output } = mixToy(parameters);
      root.querySelector('[data-reference]').textContent = vector(reference);
      root.querySelector('[data-vector-plot]').innerHTML = vectorPlot(reference, current, output);
      root.querySelector('[data-output-matrix]').innerHTML = cells(output);
      descriptions = {
        reference: parameters.normalize ? `RMS([3, 4]) ≈ 3.536. The normalized reference is ${vector(reference)}.` : 'Normalization is off: the reference remains [3, 4].',
        anchor: `The anchor contributes ${vector(reference.map(x => x * parameters.anchorWeight))}.`,
        current: `The current projection contributes ${vector(current.map(x => x * parameters.currentWeight))}.`,
        output: `${number(parameters.anchorWeight)} × ${vector(reference)} + ${number(parameters.currentWeight)} × [1, −1] = ${vector(output)}.`,
      };
    }
    root.querySelector('[data-live]').textContent = descriptions[step];
    root.querySelectorAll('[data-step]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.step === step)));
    root.querySelectorAll('[data-code-step]').forEach(line => line.classList.toggle('active-line', line.dataset.codeStep === step));
  }
  root.addEventListener('input', update);
  root.addEventListener('click', event => {
    if (event.target.closest('[data-step]')) { step = event.target.closest('[data-step]').dataset.step; update(); }
    if (event.target.closest('[data-reset-lab]')) {
      root.querySelectorAll('input').forEach(input => { input.value = input.defaultValue; input.checked = input.defaultChecked; });
      step = 'output'; update();
    }
  });
  update();
}
