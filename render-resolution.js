// Render more samples without changing the procedural pattern's visual scale.
export function renderResolution(width, height, pixelRatio = 1, limits = [Infinity, Infinity]) {
  width = Math.max(1, width);
  height = Math.max(1, height);
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const scale = Math.min(ratio, 2, 3200 / width, 2400 / height,
    Math.sqrt(5_000_000 / (width * height)), limits[0] / width, limits[1] / height);
  // The previous resolution defined strand density and relief sampling distances.
  const patternScale = Math.min(ratio, 1.25, 1600 / width, 1200 / height);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    patternWidth: Math.max(1, Math.round(width * patternScale)),
    patternHeight: Math.max(1, Math.round(height * patternScale)),
    scale,
  };
}
