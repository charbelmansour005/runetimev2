// The things on the plate a visitor can switch on and off in the playground.
// `code` is the one letter that stands for the part in a shared link. Kept
// free of three.js, so the page's controls can show before the 3D code loads.
export const PARTS = [
  { id: 'torii', code: 't', label: 'Torii gate', group: 'Structures' },
  { id: 'pagoda', code: 'p', label: 'Pagoda', group: 'Structures' },
  { id: 'bridge', code: 'b', label: 'Bridge', group: 'Structures' },
  { id: 'lanterns', code: 'l', label: 'Stone lanterns', group: 'Structures' },
  { id: 'mountain', code: 'm', label: 'Mountain', group: 'Nature' },
  { id: 'waterfall', code: 'w', label: 'Waterfall', group: 'Nature' },
  { id: 'bamboo', code: 'a', label: 'Bamboo', group: 'Nature' },
  { id: 'trees', code: 'r', label: 'Trees', group: 'Nature' },
  { id: 'rocks', code: 'k', label: 'Rocks and bushes', group: 'Nature' },
  { id: 'lilies', code: 'y', label: 'Lily pads', group: 'Nature' },
  { id: 'deer', code: 'd', label: 'Deer', group: 'Wildlife' },
  { id: 'koi', code: 'f', label: 'Koi', group: 'Wildlife' },
  { id: 'birds', code: 'i', label: 'Birds', group: 'Wildlife' },
  { id: 'fireflies', code: 'g', label: 'Fireflies', group: 'Wildlife' },
  { id: 'boats', code: 'o', label: 'Floating lanterns', group: 'Atmosphere' },
  { id: 'petals', code: 'e', label: 'Falling petals', group: 'Atmosphere' },
  { id: 'ripples', code: 's', label: 'Ripples', group: 'Atmosphere' },
  { id: 'mist', code: 'h', label: 'Mist', group: 'Atmosphere' },
];

export const PART_GROUPS = [...new Set(PARTS.map((part) => part.group))];

// A part that only makes sense with another one: no petals without trees.
export const NEEDS = { petals: 'trees' };

// Hidden parts <-> the `off` value of a link ("tpd"). Unknown letters are ignored.
export const encodeHidden = (hidden) => PARTS.filter((part) => hidden.has(part.id)).map((part) => part.code).join('');
export const decodeHidden = (value) =>
  new Set(PARTS.filter((part) => typeof value === 'string' && value.includes(part.code)).map((part) => part.id));
