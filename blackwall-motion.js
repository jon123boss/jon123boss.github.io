const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const empty = () => ({ field: [0,0,0,0], pose: [0,1,1,0], model: 0, mode: 0, arrival: 0 });

export function separated(a, b, gap = .045) {
  // Positions and half-extents are measured in viewport-height units.
  return Math.abs(a.x - b.x) >= a.rx + b.rx + gap ||
    Math.abs(a.y - b.y) >= a.ry + b.ry + gap;
}

export class BlackwallMotion {
  constructor(random = Math.random) {
    this.random = random;
    this.bags = { face: [], hand: [] };
    this.lastFace = null;
    this.aspect = 1;
    this.suspended = false;
    this.roguesEnabled = true;
    this.slots = [
      { name: 'face', next: this.between(50,70), gap: [54,78], duration: [10,14] },
      { name: 'handA', next: this.between(1,4), gap: [17,28], duration: [10,16] },
      { name: 'handB', next: this.between(8,13), gap: [20,32], duration: [11,17] },
      { name: 'riftA', next: 2, gap: [9,18], duration: [8,13] },
      { name: 'riftB', next: 9, gap: [12,23], duration: [9,15] },
    ];
  }

  between(a, b) { return a + this.random() * (b - a); }

  model(kind) {
    if (!this.bags[kind].length) {
      this.bags[kind] = kind === 'face' ? [0,1,2,3,4] : [0,1,2,3,4,5]; // Models 1 and 3 use separate front-facing reliefs.
      for (let i = this.bags[kind].length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bags[kind][i], this.bags[kind][j]] = [this.bags[kind][j], this.bags[kind][i]];
      }
      // No repeated model at the boundary between two shuffled decks.
      if (this.bags[kind].at(-1) === this.lastModel?.[kind]) this.bags[kind].reverse();
    }
    const model = this.bags[kind].pop();
    this.lastModel ??= {};
    this.lastModel[kind] = model;
    return model;
  }

  bounds(event, aspect) {
    const c = Math.abs(Math.cos(event.angle)), s = Math.abs(Math.sin(event.angle));
    const height = Math.min(event.size * (.70 + .30 * smooth(.6,1.5,aspect)),
      (aspect-.08) / ((event.width*c+s)*1.06));
    const w = height * event.width;
    // Reserve for the full silhouette, small rotation changes, and drift.
    const rx = (w * c + height * s) * .53 + .025;
    const ry = (height * c + w * s) * .53 + .025;
    return { x: event.x * aspect, y: event.y, rx, ry, height };
  }

  place(event, time, aspect, slot, reflow = false) {
    const peers = this.slots.filter(other => other !== slot && !other.name.startsWith('rift') &&
      other.event && time < other.event.start + other.event.duration).map(other => this.bounds(other.event, aspect));
    for (let attempt = 0; attempt < 36; attempt++) {
      const shape = this.bounds(event, aspect);
      if (shape.rx * 2 > aspect - .025 || shape.ry * 2 > .85) return false;
      event.x = this.between(shape.rx + .012, aspect - shape.rx - .012) / aspect;
      event.y = this.between(shape.ry + .035, .91 - shape.ry);
      const box = this.bounds(event, aspect);
      const farFromLastFace = slot.name !== 'face' || !this.lastFace || reflow ||
        Math.hypot((event.x - this.lastFace.x) * aspect, event.y - this.lastFace.y) > Math.min(.30,aspect*.42);
      if (farFromLastFace && peers.every(peer => separated(box, peer))) return true;
    }
    return false;
  }

  begin(slot, time, aspect) {
    const face = slot.name === 'face', rift = slot.name.startsWith('rift');
    const event = {
      start: time, duration: this.between(...slot.duration),
      x: this.between(.08,.92), y: this.between(.15,.75),
      size: this.between(face ? .53 : .46, face ? .65 : .61),
      strength: this.between(.65,.96), angle: this.between(face ? -.16 : -.55, face ? .16 : .55),
      mirror: this.random() < .5 ? -1 : 1, width: this.between(.83,1.03),
      drift: this.between(-.012,.012), mode: Math.floor(this.between(0,3)),
      model: 0,
    };
    const faceDue = this.slots[0].next;
    if (!face && !rift && time + event.duration > faceDue - 1 && time < faceDue) {
      slot.next = faceDue + 16; return;
    }
    if (!rift && !this.place(event, time, aspect, slot)) { slot.next = time + 2; return; }
    if (!rift) event.model = this.model(face ? 'face' : 'hand');
    if (face) this.lastFace = { x: event.x, y: event.y };
    slot.event = event;
    slot.next = time + this.between(...slot.gap);
  }

  repel(name, time) {
    const event = this.slots.find(slot => slot.name === name)?.event;
    if (!event || event.repelAt !== undefined || time >= event.start + event.duration) return null;
    event.repelAt = time;
    return `${name}:${event.start}`;
  }

  clear(time) {
    for (const slot of this.slots) {
      slot.event = null;
      slot.next = time + (slot.name === 'face' ? this.between(50,70) : this.between(3,14));
    }
  }

  setRoguesEnabled(enabled, time) {
    if (this.roguesEnabled === enabled) return;
    this.roguesEnabled = enabled;
    for (const slot of this.slots) {
      if (slot.name.startsWith('rift')) continue;
      if (enabled) slot.next = time + (slot.name === 'face' ? this.between(50,70) : this.between(3,14));
      else this.repel(slot.name, time);
    }
  }

  update(time, aspect) {
    // A resize may invalidate the old packing. Repack before displaying a frame.
    if (Math.abs(this.aspect - aspect) > .02) {
      for (const slot of this.slots) {
        if (slot.event && !slot.name.startsWith('rift') && time < slot.event.start + slot.event.duration) {
          if (!this.place(slot.event, time, aspect, slot, true)) slot.event = null;
        }
      }
      this.aspect = aspect;
    }
    const result = {};
    for (const slot of this.slots) {
      const canAppear = this.roguesEnabled || slot.name.startsWith('rift');
      if (!this.suspended && canAppear && time >= slot.next) this.begin(slot, time, aspect);
      const event = slot.event;
      if (!event || this.suspended) { result[slot.name] = empty(); continue; }
      const p = clamp((time - event.start) / event.duration);
      const rift = slot.name.startsWith('rift');
      // Arrival is independent of strength and is frozen if repelled mid-emergence.
      const arrivalAge=(Math.min(time,event.repelAt??time)-event.start)/event.duration;
      const arrival=rift?0:smooth(0,.34,arrivalAge);
      const retreat = Math.max(smooth(.67,1,p),event.repelAt===undefined?0:smooth(0,1.35,time-event.repelAt));
      // Slow pressure, two strained pushes, then a faster pull back into the wall.
      const pressure = smooth(0,.30,p) * (1 - retreat);
      const struggle = 1 - .10 * (1 + Math.sin(p * 39)) * smooth(.2,.4,p) * (1 - retreat);
      const amplitude = (rift ? Math.pow(Math.sin(p * Math.PI),1.7) : pressure * struggle) * event.strength;
      const height = this.bounds(event, aspect).height * (.97 + .03 * pressure);
      result[slot.name] = {
        field: [event.x + event.drift * p, event.y - retreat * .012, rift ? p : height, p === 1 ? 0 : amplitude],
        pose: [event.angle + event.drift * p, event.mirror, event.width, retreat],
        model: event.model, mode: event.mode, arrival,
      };
    }
    return result;
  }
}
