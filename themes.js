export const themes = [
  { id: 'afterlife', name: 'Afterlife', subtitle: 'A little voltage. A lot of restraint.', inspiration: 'The electric yellow of 2077, softened into a quiet signal.', motion: 'Thin signal paths carry occasional yellow and cyan pulses.', accent: '#d4d879', secondary: '#7aaeb1', text: '#e4e3d4', muted: '#b6b4a2', rgb: '212,216,121', secondaryRgb: '122,174,177' },
  { id: 'moonbound', name: 'Moonbound', subtitle: 'Somewhere far from Night City.', inspiration: 'Lucy’s quieter, lunar side: silver, pale blue, and distance.', motion: 'Fine orbital arcs drift around a handful of silver points.', accent: '#b8c3e8', secondary: '#90bcc8', text: '#e0e3ec', muted: '#adb0c0', rgb: '184,195,232', secondaryRgb: '144,188,200' },
  { id: 'sandevistan', name: 'Sandevistan', subtitle: 'The trace of a moment.', inspiration: 'Mint and amber afterimages, with the speed dial turned down.', motion: 'A moving line leaves a soft, slowly dissolving trail.', accent: '#a9d3aa', secondary: '#d2b478', text: '#e0e8dc', muted: '#a6b5a4', rgb: '169,211,170', secondaryRgb: '210,180,120' },
  { id: 'watson', name: 'Rain in Watson', subtitle: 'The city, after midnight.', inspiration: 'Blue rain and distant amber light, without the visual noise.', motion: 'Sparse rain marks descend; small ripples fade at the edges.', accent: '#8dbdc9', secondary: '#c1a47e', text: '#dce5e8', muted: '#a1b1b7', rgb: '141,189,201', secondaryRgb: '193,164,126' },
  { id: 'ghostwire', name: 'Ghost in the Wire', subtitle: 'A signal beneath the surface.', inspiration: 'Netrunner interfaces reduced to a few cyan and lilac connections.', motion: 'Small packets travel along a sparse angular network.', accent: '#b5a8d6', secondary: '#82bac0', text: '#e5dfed', muted: '#b2a8be', rgb: '181,168,214', secondaryRgb: '130,186,192' },
  { id: 'blackwall', name: 'Beyond the Blackwall', subtitle: 'Something on the other side.', inspiration: 'Smouldering red and controlled irregularity. No flashing.', motion: 'A fine red boundary bends as a slow disturbance passes.', accent: '#cb8883', secondary: '#a76f7a', text: '#e9dcda', muted: '#baa5a3', rgb: '203,136,131', secondaryRgb: '167,111,122' },
  { id: 'arasaka', name: 'Arasaka', subtitle: 'Precision. Silence. A red line.', inspiration: 'The corporate side of Night City: exact, austere, understated.', motion: 'A small red tracer follows an architectural perimeter.', accent: '#d18e86', secondary: '#bfbcb7', text: '#e7e3de', muted: '#b6adaa', rgb: '209,142,134', secondaryRgb: '191,188,183' },
  { id: 'pacifica', name: 'Pacifica, 5:40 AM', subtitle: 'The city finally exhales.', inspiration: 'A quieter coastal mood in dusty copper and faded violet.', motion: 'Long, low contours roll past each other like a distant tide.', accent: '#cfab93', secondary: '#ab9ebd', text: '#e8dfd7', muted: '#bbaea5', rgb: '207,171,147', secondaryRgb: '171,158,189' },
  { id: 'braindance', name: 'Braindance', subtitle: 'A memory, still playing.', inspiration: 'The recorded-signal aesthetic, slowed to an ambient rhythm.', motion: 'Three fine waveforms breathe around a quiet baseline.', accent: '#b5a2d3', secondary: '#8ebfb4', text: '#e3dfea', muted: '#b3a9bd', rgb: '181,162,211', secondaryRgb: '142,191,180' },
  { id: 'nocturne', name: 'Nocturne', subtitle: 'The last light left on.', inspiration: 'Warm gold, empty space, and the melancholy of Edgerunners.', motion: 'Tiny lights drift through an almost invisible field of dust.', accent: '#cbb98e', secondary: '#a7afc2', text: '#e9e3d7', muted: '#b9b1a0', rgb: '203,185,142', secondaryRgb: '167,175,194' },
];

export function findTheme(id) { return themes.find(theme => theme.id === id) || themes[0]; }

export function applyPalette(element, theme) {
  element.dataset.theme = theme.id;
  element.style.setProperty('--accent', theme.accent);
  element.style.setProperty('--accent-rgb', theme.rgb);
  element.style.setProperty('--secondary', theme.secondary);
  element.style.setProperty('--text', theme.text);
  element.style.setProperty('--muted', theme.muted);
}
