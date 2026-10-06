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

// What a single thing is called when it's selected, by its type.
export const TYPE_LABELS = {
  torii: 'Torii gate',
  pagoda: 'Pagoda',
  bridge: 'Bridge',
  mountain: 'Mountain',
  waterfall: 'Waterfall',
  bamboo: 'Bamboo',
  cherry: 'Cherry tree',
  maple: 'Maple',
  pine: 'Pine',
  lantern: 'Stone lantern',
  deer: 'Doe',
  stag: 'Stag',
  boat: 'Floating lantern',
  rock: 'Rocks',
  pond: 'Pond',
};

// What the playground can add more of.
export const ADDABLE = [
  { type: 'cherry', label: 'Cherry tree' },
  { type: 'maple', label: 'Maple' },
  { type: 'pine', label: 'Pine' },
  { type: 'bamboo', label: 'Bamboo' },
  { type: 'lantern', label: 'Stone lantern' },
  { type: 'boat', label: 'Floating lantern' },
  { type: 'deer', label: 'Doe' },
  { type: 'stag', label: 'Stag' },
  { type: 'rock', label: 'Rocks' },
  { type: 'pond', label: 'Small pond' },
  { type: 'bigpond', label: 'Big pond' },
];
const MAX_ADDED = 60;

// A layout (what was moved, taken away and added, and the plate's size)
// <-> the `g` value of a link. Anything that doesn't read as a layout is
// dropped: links are typed and pasted by strangers.
export const emptyLayout = () => ({ move: {}, gone: [], add: [], plate: 0 });
export const isEmptyLayout = (layout) =>
  !Object.keys(layout.move).length && !layout.gone.length && !layout.add.length && !layout.plate;
export function encodeLayout(layout) {
  if (isEmptyLayout(layout)) return '';
  return btoa(JSON.stringify(layout)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeLayout(value) {
  const layout = emptyLayout();
  if (typeof value !== 'string' || !value || value.length > 6000) return layout;
  let data;
  try {
    data = JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return layout;
  }
  const number = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 50;
  const id = (v) => typeof v === 'string' && /^[a-z]+#\d{1,3}$/.test(v);
  if (data && typeof data === 'object') {
    if (data.move && typeof data.move === 'object') {
      for (const [key, at] of Object.entries(data.move).slice(0, 80)) {
        if (id(key) && Array.isArray(at) && number(at[0]) && number(at[1])) layout.move[key] = [at[0], at[1]];
      }
    }
    if (Array.isArray(data.gone)) layout.gone = data.gone.filter(id).slice(0, 80);
    if (Array.isArray(data.add)) {
      layout.add = data.add
        .filter((item) => Array.isArray(item) && ADDABLE.some((a) => a.type === item[0]) && number(item[1]) && number(item[2]))
        .slice(0, MAX_ADDED)
        .map(([type, x, z]) => [type, x, z]);
    }
    if (number(data.plate)) layout.plate = Math.min(Math.max(data.plate, 0), 4);
  }
  return layout;
}
