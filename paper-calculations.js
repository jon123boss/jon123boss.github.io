// Small, deterministic teaching calculations; these do not simulate training.
export const softmax = values => {
  const peak = Math.max(...values);
  const exp = values.map(x => Math.exp(x - peak));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(x => x / sum);
};
export const rms = (values, epsilon = 1e-6) => {
  const scale = Math.sqrt(values.reduce((a, x) => a + x * x, 0) / values.length + epsilon);
  return values.map(x => x / scale);
};
export function routeToy({ rank = 2, firstValue = 4, strength = 1 } = {}) {
  if (!Number.isInteger(rank) || rank < 1 || rank > 4) throw new RangeError('Routing width must be 1–4.');
  const values = [[firstValue, 0, 1, 0], [0, 4, 0, 1]];
  const query = [0.35, -0.2, Math.log(3) / Math.sqrt(2), 0].slice(-rank).map(x => x * strength);
  const keys = values.map(row => rms(row.slice(-rank)));
  const scores = keys.map(row => row.reduce((a, x, j) => a + x * query[j], 0));
  const weights = softmax(scores);
  const output = values[0].map((_, j) => values.reduce((a, row, i) => a + weights[i] * row[j], 0));
  return { values, query, keys, scores, weights, output };
}
export function mixToy({ anchorWeight = 0.75, currentWeight = 0.25, normalize = true } = {}) {
  const anchor = [3, 4], current = [1, -1];
  const reference = normalize ? rms(anchor) : anchor;
  const output = reference.map((x, i) => anchorWeight * x + currentWeight * current[i]);
  return { anchor, current, reference, output };
}
