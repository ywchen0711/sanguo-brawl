// What everyone wears. A look: skin, hair, beard, hat (+ colours), robe/armour, pants, boots, belt, cape, weapon.
// size scales the whole figure; fat widens the body; bare shows the arms and chest.
const SK = { fair: '#f2c8a0', warm: '#e8b48a', tan: '#d49a6a', dark: '#b07a52', red: '#b8442e', pale: '#f6d8b8' };
export const LOOKS = {
  // ---- the four heroes
  liubei:   { key: 'liubei', skin: SK.fair, hair: '#1e1610', hat: 'crown', hatC: '#2a3a5a', robe: '#3e7a4a', robe2: '#e8d8a0', pants: '#2a3a2a', boots: '#3a2a20', belt: '#c89a3a', beltGold: 1, beard: 'goatee', cape: '#e6d6a8', wpn: 'sword', wpn2: 'sword', sleeveLong: 1, skirt: 0.62, sash: '#c89a3a' },
  guanyu:   { key: 'guanyu', skin: SK.red, hair: '#141010', hat: 'band', hatC: '#2a6a3a', robe: '#2e7a44', robe2: '#d8b850', armor: '#3a8a50', pants: '#203a26', boots: '#2a2018', belt: '#c8a040', beltGold: 1, beard: 'long', beardC: '#121010', cape: '#2a5a34', wpn: 'glaive', size: 1.1, fierce: 1, brow: 1.3, skirt: 0.6 },
  zhangfei: { key: 'zhangfei', skin: SK.tan, hair: '#100c0a', hat: 'band', hatC: '#1a1a1a', robe: '#2a2a34', robe2: '#6a5a8a', armor: '#3a3448', pants: '#1a1a22', boots: '#1a1412', belt: '#8a6a3a', beard: 'bushy', beardC: '#0c0a0a', wpn: 'snake', wpnC: '#1e1e1e', size: 1.12, fat: 1, fierce: 1, brow: 1.6, eyeW: 1, skirt: 0.5 },
  zhaoyun:  { key: 'zhaoyun', skin: SK.pale, hair: '#1a1410', hat: 'plume', hatC: '#c8ccd8', hatC2: '#e8e8f0', robe: '#e8eaf0', robe2: '#4a7ac8', armor: '#d6dae4', pants: '#3a4a6a', boots: '#2a3040', belt: '#4a6aa8', cape: '#f2f2f6', wpn: 'spear', wpnC: '#e0e0e6', skirt: 0.5, sash: '#4a7ac8', eyeC: '#3a2a20' },
  // ---- people met on the road (masters, companions)
  huangzhong: { key: 'huangzhong', skin: SK.warm, hair: '#e8e4dc', hat: 'helm', hatC: '#a88a3a', robe: '#a86a2a', armor: '#b8923a', beard: 'long', beardC: '#eeeae2', wpn: 'saber', pants: '#4a3a20', skirt: 0.5 },
  dianwei:  { key: 'dianwei', skin: SK.dark, hair: '#18120e', hat: 'band', hatC: '#8a2a1a', robe: '#4a2a1a', armor: '#5a3a26', beard: 'stubble', bare: 1, wpn: 'jis', wpn2: 'jis', size: 1.15, fat: 1, fierce: 1, brow: 1.6, skirt: 0.45 },
  xuchu:    { key: 'xuchu', skin: SK.tan, hair: '#1a1410', hat: 'bald', robe: '#5a4a3a', beard: 'stubble', bare: 1, wpn: 'mace', size: 1.18, fat: 1, fierce: 1, skirt: 0.45, belt: '#3a2a1a' },
  taishici: { key: 'taishici', skin: SK.warm, hair: '#1a1410', hat: 'helm', hatC: '#5a5a6a', robe: '#8a2a2a', armor: '#6a2a2a', beard: 'mustache', wpn: 'spear', wpn2: null, cape: '#5a1a1a', skirt: 0.5 },
  ganning:  { key: 'ganning', skin: SK.tan, hair: '#2a1a10', hat: 'band', hatC: '#e0b040', robe: '#2a5a8a', bare: 1, beard: 'stubble', wpn: 'saber', belt: '#e0b040', longHair: 1, skirt: 0.5, bracer: '#8a6a3a' },
  zuoci:    { key: 'zuoci', skin: SK.pale, hair: '#e4e0d8', hat: 'scholar', hatC: '#3a3a4a', robe: '#8a8a9a', robe2: '#2a2a3a', beard: 'long', beardC: '#f0ece4', wpn: 'staff', sleeveLong: 1, skirt: 0.9, longHair: 1 },
  huatuo:   { key: 'huatuo', skin: SK.warm, hair: '#9a948a', hat: 'bun', hatC: '#4a3a2a', robe: '#6a8a6a', robe2: '#3a4a3a', beard: 'goatee', beardC: '#a8a298', sleeveLong: 1, skirt: 0.9 },
  luzhi:    { key: 'luzhi', skin: SK.fair, hair: '#6a645a', hat: 'crown', hatC: '#2a2a2a', robe: '#3a4a6a', robe2: '#c8b880', beard: 'long', beardC: '#7a746a', wpn: 'sword', sleeveLong: 1, skirt: 0.85 },
  // ---- bosses
  chengyz:  { key: 'chengyz', skin: SK.tan, hair: '#1a1410', hat: 'turban', hatC: '#e0c020', robe: '#8a6a20', armor: '#7a5a2a', beard: 'bushy', wpn: 'axe', size: 1.1, fat: 1, fierce: 1, skirt: 0.5 },
  zhangjiao:{ key: 'zhangjiao', skin: SK.pale, hair: '#3a3430', hat: 'turban', hatC: '#f0d020', robe: '#e0c030', robe2: '#6a3a1a', beard: 'long', beardC: '#4a4440', wpn: 'staff', sleeveLong: 1, skirt: 0.92, cape: '#c8a020' },
  huaxiong: { key: 'huaxiong', skin: SK.warm, hair: '#1a1410', hat: 'helm', hatC: '#3a3a3a', robe: '#5a1a1a', armor: '#2a2a30', beard: 'bushy', wpn: 'glaive', wpnC: '#3a2a1a', size: 1.14, fierce: 1, cape: '#6a1a1a', skirt: 0.55 },
  lubu:     { key: 'lubu', skin: SK.fair, hair: '#1a1210', hat: 'feathers', hatC: '#d0a030', hatC2: '#c83a2a', robe: '#a82a2a', robe2: '#e0b040', armor: '#c8902a', pants: '#3a1a1a', wpn: 'halberd', wpnC: '#8a1a1a', size: 1.14, cape: '#c02828', fierce: 1, brow: 1.4, skirt: 0.55, beltGold: 1 },
  dongzhuo: { key: 'dongzhuo', skin: SK.warm, hair: '#2a2420', hat: 'crown', hatC: '#1a1a1a', robe: '#3a1a3a', robe2: '#d8a030', beard: 'bushy', beardC: '#2a2420', wpn: 'sword', size: 1.18, fat: 1, sleeveLong: 1, skirt: 0.85, beltGold: 1, cape: '#5a1a2a' },
  menghuo:  { key: 'menghuo', skin: SK.dark, hair: '#1a1410', hat: 'feathers', hatC: '#6a4a2a', hatC2: '#e8c040', robe: '#6a3a1a', bare: 1, beard: 'bushy', wpn: 'axe', size: 1.2, fat: 1, fierce: 1, skirt: 0.45, belt: '#e0b040', bareLeg: 1 },
};

// rank and file, with a few colours each so a crowd is not all one person
const pick = (a, r) => a[Math.floor(r * a.length) % a.length];
const TYPES = {
  bandit:  (r) => ({ skin: pick([SK.warm, SK.tan, SK.dark], r()), hair: '#1a1410', hat: pick(['band', 'band', 'bald', 'hood'], r()), hatC: pick(['#6a2a1a', '#3a3a2a', '#5a4a2a', '#2a2a2a'], r()), robe: pick(['#6a5236', '#5a4a3a', '#7a5a3a', '#4a4a3a'], r()), pants: pick(['#3a2e22', '#2e2a24'], r()), beard: pick(['stubble', 'mustache', 'none', 'bushy'], r()), wpn: pick(['club', 'knife', 'club', null], r()), skirt: 0.35, bare: r() < 0.3 ? 1 : 0 }),
  boss_bandit: (r) => ({ skin: SK.tan, hair: '#1a1410', hat: 'band', hatC: '#8a1a1a', robe: '#4a3a2a', bare: 1, beard: 'bushy', wpn: 'axe', size: 1.12, fat: 1, fierce: 1, skirt: 0.4 }),
  turban:  (r) => ({ skin: pick([SK.warm, SK.tan], r()), hair: '#1a1410', hat: 'turban', hatC: pick(['#e8c820', '#f0d030', '#d8b818'], r()), robe: pick(['#9a7a3a', '#8a6a2a', '#a8884a'], r()), pants: '#4a3a1a', beard: pick(['stubble', 'none', 'mustache'], r()), wpn: pick(['club', 'spear', 'knife'], r()), skirt: 0.45 }),
  t_brute: (r) => ({ skin: SK.tan, hair: '#1a1410', hat: 'turban', hatC: '#e8c820', robe: '#8a6a2a', bare: 1, beard: 'bushy', wpn: 'mace', size: 1.15, fat: 1, fierce: 1, skirt: 0.45 }),
  t_mage:  (r) => ({ skin: SK.pale, hair: '#3a3430', hat: 'turban', hatC: '#f0d020', robe: '#c8a830', robe2: '#5a2a1a', beard: 'goatee', wpn: 'staff', sleeveLong: 1, skirt: 0.9 }),
  soldier: (r) => ({ skin: pick([SK.fair, SK.warm], r()), hair: '#1a1410', hat: 'helm', hatC: pick(['#5a5a62', '#4a4a52'], r()), robe: '#7a2a2a', armor: pick(['#6a3a2a', '#5a3a2a'], r()), pants: '#3a2420', beard: pick(['none', 'mustache', 'stubble'], r()), wpn: pick(['spear', 'spear', 'saber'], r()), skirt: 0.5 }),
  archer:  (r) => ({ skin: SK.warm, hair: '#1a1410', hat: 'band', hatC: '#4a2a1a', robe: '#6a4a2a', armor: '#5a4a32', beard: 'none', wpn: 'bow', skirt: 0.45 }),
  guard:   (r) => ({ skin: SK.fair, hair: '#1a1410', hat: 'plume', hatC: '#2a2a32', hatC2: '#a82020', robe: '#3a1a1a', armor: '#2a2a30', pants: '#1a1418', beard: pick(['mustache', 'stubble'], r()), wpn: pick(['halberd', 'saber'], r()), size: 1.06, cape: '#5a1414', skirt: 0.55 }),
  pirate:  (r) => ({ skin: SK.tan, hair: '#2a1a10', hat: 'band', hatC: pick(['#e0b040', '#c83a2a'], r()), robe: '#2a4a6a', bare: 1, beard: pick(['stubble', 'none'], r()), wpn: pick(['saber', 'knife'], r()), skirt: 0.35, bracer: '#6a4a2a' }),
  nanman:  (r) => ({ skin: SK.dark, hair: '#1a1410', hat: pick(['feathers', 'band'], r()), hatC: '#5a3a1a', hatC2: '#e0a030', robe: '#6a4a1a', bare: 1, bareLeg: 1, beard: 'none', wpn: pick(['spear', 'club'], r()), shield: r() < 0.4 ? '#8a5a2a' : null, skirt: 0.35, paint: '#e8e0d0' }),
  monk:    (r) => ({ skin: SK.warm, hair: '#1a1410', hat: 'bald', robe: '#c87a2a', robe2: '#8a3a1a', beard: 'none', wpn: 'staff', skirt: 0.75 }),
  villager:(r) => ({ skin: pick([SK.fair, SK.warm, SK.tan], r()), hair: pick(['#1a1410', '#3a2a1a', '#8a847a'], r()), hat: pick(['bun', 'bun', 'hood', 'band'], r()), hatC: pick(['#4a6a8a', '#8a4a3a', '#6a6a4a'], r()), robe: pick(['#6a8aa8', '#a86a5a', '#8aa86a', '#c8b07a', '#9a7aa8'], r()), robe2: pick(['#e8dcc0', '#4a3a2a'], r()), beard: pick(['none', 'none', 'goatee', 'mustache'], r()), sleeveLong: 1, skirt: pick([0.6, 0.85], r()) }),
  lady:    (r) => ({ skin: SK.pale, hair: '#1a1410', hat: 'bun', hatC: '#e0b040', robe: pick(['#d87a8a', '#8ab0d8', '#e0a878', '#b898d0'], r()), robe2: '#f4ecd8', beard: 'none', sleeveLong: 1, skirt: 0.95, longHair: 1, size: 0.94, lashes: 1, lips: '#c8847a', blush: 1 }),
};
// a seeded random, so the same soldier always looks the same
export function rnd(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
export function lookOf(type, seed = 1) {
  if (LOOKS[type]) return LOOKS[type];
  const v = seed % 6, L = TYPES[type](rnd(v * 7919 + type.length * 31 + 17)); L.key = type + ":" + v; return L;
}
