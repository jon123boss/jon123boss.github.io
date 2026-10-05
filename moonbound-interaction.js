const clamp = value => Math.max(0, Math.min(1, value));

// Coordinates use the source artwork's top-left origin, independent of viewport cropping.
const figures = [
  { name: 'david', head: [.405, .508, .035, .065], shift: [.052, 0], body: [[.357,.559],[.448,.559],[.469,.733],[.505,.823],[.301,.828],[.331,.747]] },
  { name: 'lucy', head: [.594, .533, .033, .065], shift: [-.074, 0], body: [[.558,.590],[.632,.590],[.653,.724],[.683,.822],[.520,.827],[.541,.722]] },
];

export function moonImagePoint(point, aspect, artAspect, pointer = [.5, .5], pointerActive = 0) {
  const height = Math.min(1.04, Math.max(.56, aspect / (artAspect * .56)));
  const width = height * artAspect;
  return [
    (point[0] - .5) * aspect / width + .5 + (pointer[0] - .5) * .010 * pointerActive,
    1 - ((point[1] - (.08 + height * .5)) / height + .5 + (pointer[1] - .5) * .006 * pointerActive),
  ];
}

function insidePolygon([x, y], points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function moonCharacterAt(imagePoint, embrace = 0) {
  const progress = clamp(embrace);
  for (const figure of figures) {
    const p = [imagePoint[0] - figure.shift[0] * progress, imagePoint[1]];
    const [x, y, rx, ry] = figure.head;
    if (((p[0] - x) / rx) ** 2 + ((p[1] - y) / ry) ** 2 <= 1 || insidePolygon(p, figure.body)) return figure.name;
  }
  // The joined arms bridge the original gap during the embrace.
  if (progress > .3 && imagePoint[0] > .40 && imagePoint[0] < .565 && imagePoint[1] > .565 && imagePoint[1] < .66) return 'together';
  return null;
}

export class MoonboundEmbrace {
  constructor() { this.reset(); }
  reset() { this.started = null; }
  trigger(time) {
    if (this.started !== null) return false;
    this.started = time;
    return true;
  }
  progress(time) {
    if (this.started === null) return 0;
    const t = clamp((time - this.started) / 3.6);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  state(time) {
    return this.started === null ? 'apart' : this.progress(time) < 1 ? 'reaching' : 'embraced';
  }
}
