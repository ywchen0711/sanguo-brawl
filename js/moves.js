// Every attack in the game. A move plays an animation frame by frame; on given frames it hits what is in front
// (range along x in front of the attacker, dz in depth, h the heights it reaches), throws a projectile, strikes all
// round (area), or carries the attacker forward (vel). dmg is scaled by one of the attacker's stats.
//   kb: knockback speed · up: lift on hit · down: knocks down · launch: sends flying up · stun: hit-stun seconds
//   cost: 氣 (spirit) a special needs · armor: not flinching while doing it · air: done in the air
export const MOVES = {
  // ---- fists and feet: everybody
  jab:     { anim: 'jab', hits: [{ f: 1, range: [0.1, 1.55], dz: 0.6, h: [0.6, 2.4], dmg: 5, stat: 'str', kb: 1.2, stun: 0.3 }], next: 'jab2', sfx: 'punch' },
  jab2:    { anim: 'jab', hits: [{ f: 1, range: [0.1, 1.6], dz: 0.6, h: [0.6, 2.4], dmg: 5, stat: 'str', kb: 1.4, stun: 0.32 }], next: 'straight', sfx: 'punch' },
  straight:{ anim: 'straight', hits: [{ f: 1, range: [0.1, 1.85], dz: 0.6, h: [0.6, 2.4], dmg: 9, stat: 'str', kb: 6, up: 5, down: 1, stun: 0.5 }], vel: { f: 1, vx: 3 }, sfx: 'smash' },
  kick:    { anim: 'kick', hits: [{ f: 1, range: [0.2, 1.9], dz: 0.6, h: [0.3, 1.8], dmg: 7, stat: 'kick', kb: 2, stun: 0.34 }], next: 'round', sfx: 'kick' },
  round:   { anim: 'round', hits: [{ f: 1, range: [0.1, 2.1], dz: 0.7, h: [0.6, 2.4], dmg: 10, stat: 'kick', kb: 7, up: 4, down: 1, stun: 0.5 }], sfx: 'smash' },
  // ---- with a blade or pole in hand (heroes and soldiers who carry one)
  slash:   { anim: 'slash', hits: [{ f: 1, range: [0.1, 2.2], dz: 0.7, h: [0.3, 2.8], dmg: 6, stat: 'str', kb: 1.4, stun: 0.32, fx: 'slash' }], next: 'slash2', sfx: 'blade' },
  slash2:  { anim: 'slash2', hits: [{ f: 1, range: [0.1, 2.2], dz: 0.7, h: [0.3, 3], dmg: 6, stat: 'str', kb: 1.6, stun: 0.34, fx: 'slash' }], next: 'thrust', sfx: 'blade' },
  thrust:  { anim: 'thrust', hits: [{ f: 1, range: [0.3, 2.9], dz: 0.6, h: [0.6, 2.4], dmg: 10, stat: 'str', kb: 7, up: 4, down: 1, stun: 0.5, fx: 'slash' }], vel: { f: 1, vx: 4 }, sfx: 'blade2' },
  // ---- on the move and in the air
  dash:    { anim: 'straight', dur: [0.05, 0.28, 0.12], hits: [{ f: 1, range: [0, 1.8], dz: 0.6, h: [0.4, 2.4], dmg: 9, stat: 'str', kb: 7, up: 5, down: 1, stun: 0.5 }], vel: { f: 0, vx: 9, keep: 1 }, sfx: 'smash' },
  flykick: { anim: 'jkick', dur: [0.42], hits: [{ f: 0, range: [0, 1.9], dz: 0.6, h: [0.2, 2.6], dmg: 10, stat: 'kick', kb: 8, up: 5, down: 1, stun: 0.5 }], vel: { f: 0, vx: 10, vy: 5 }, air: 1, sfx: 'kick' },
  jkick:   { anim: 'jkick', dur: [0.5], hits: [{ f: 0, range: [0, 1.8], dz: 0.6, h: [-0.6, 2.2], dmg: 8, stat: 'kick', kb: 5, up: 3, down: 1, stun: 0.45 }], air: 1, sfx: 'kick' },
  jslash:  { anim: 'slash', dur: [0.06, 0.18, 0.2], hits: [{ f: 1, range: [0, 2.2], dz: 0.7, h: [-0.6, 2.6], dmg: 8, stat: 'str', kb: 5, up: 2, down: 1, stun: 0.45, fx: 'slash' }], air: 1, sfx: 'blade' },
  upper:   { anim: 'upper', hits: [{ f: 1, range: [0, 1.6], dz: 0.6, h: [0.4, 3.4], dmg: 8, stat: 'str', kb: 1.5, launch: 11, stun: 0.6 }], sfx: 'smash' },
  // ---- holding someone
  knee:    { anim: 'knee', dur: [0.18], hits: [{ f: 0, range: [-0.2, 1.3], dz: 0.5, h: [0, 2.5], dmg: 6, stat: 'kick', kb: 0, stun: 0.4, grab: 1 }], sfx: 'punch' },
  toss:    { anim: 'throw', dur: [0.12, 0.25], sfx: 'throw' },

  // ================================================================ techniques (learned, put in the four slots)
  whirl:   { n: '旋風腿', d: '原地轉身連踢，打倒四周的敵人', anim: 'round', dur: [0.07, 0.07, 0.07], loop: 3, hits: [{ f: 1, range: [-2, 2.1], dz: 1, h: [0.3, 2.4], dmg: 5, stat: 'kick', kb: 4, up: 2, stun: 0.35, each: 1 }], last: { down: 1, kb: 7, up: 4 }, cost: 14, armor: 1, sfx: 'kick' },
  hundred: { n: '百裂拳', d: '快拳連打，最後一擊把敵人打飛', anim: 'jab', dur: [0.03, 0.05, 0.03], loop: 6, hits: [{ f: 1, range: [0, 1.7], dz: 0.6, h: [0.5, 2.4], dmg: 3, stat: 'str', kb: 0.6, stun: 0.3, each: 1 }], last: { down: 1, kb: 8, up: 4, dmg: 8 }, cost: 12, sfx: 'punch' },
  rising:  { n: '衝天拳', d: '跳起來的上勾拳，把敵人打上天，也能打下空中的敵人', anim: 'upper', dur: [0.05, 0.3, 0.12], hits: [{ f: 1, range: [0, 1.7], dz: 0.7, h: [0, 4], dmg: 12, stat: 'str', kb: 2, launch: 14, stun: 0.6 }], vel: { f: 1, vy: 8, vx: 2 }, cost: 10, inv: [0, 1], sfx: 'smash' },
  swallow: { n: '飛燕踢', d: '飛身一踢，衝過一長段路', anim: 'jkick', dur: [0.5], hits: [{ f: 0, range: [0, 1.9], dz: 0.7, h: [0, 2.6], dmg: 12, stat: 'kick', kb: 9, up: 5, down: 1, stun: 0.5, each: 0 }], vel: { f: 0, vx: 14, vy: 4 }, air: 1, ground: 1, cost: 10, sfx: 'kick' },
  headbutt:{ n: '鐵頭功', d: '低頭猛衝，不怕敵人的拳腳', anim: 'run', dur: [0.09, 0.09, 0.09, 0.09], hits: [{ f: 1, range: [0, 1.5], dz: 0.7, h: [0.4, 2.4], dmg: 11, stat: 'str', kb: 9, up: 5, down: 1, stun: 0.5 }, { f: 3, range: [0, 1.5], dz: 0.7, h: [0.4, 2.4], dmg: 11, stat: 'str', kb: 9, up: 5, down: 1, stun: 0.5 }], vel: { f: 0, vx: 11, keep: 1 }, armor: 1, cost: 12, sfx: 'smash' },
  quake:   { n: '地裂震', d: '一拳打在地上，震倒身邊地上的每一個敵人', anim: 'slash', dur: [0.18, 0.12, 0.3], area: { f: 1, r: 3.8, dmg: 12, stat: 'str', down: 1, up: 6, kb: 5, ground: 1, kind: 'quake' }, armor: 1, cost: 18, sfx: 'quake' },
  kiball:  { n: '氣功彈', d: '把氣聚在掌心打出去', anim: 'straight', dur: [0.12, 0.2, 0.12], proj: { f: 1, kind: 'ki', speed: 13, dmg: 12, stat: 'tech', life: 1.2, h: 1.5, down: 1 }, cost: 10, sfx: 'ki' },
  heal:    { n: '回春功', d: '運氣療傷，回復體力', anim: 'cast', dur: [0.6], buff: { heal: 0.3 }, cost: 20, sfx: 'heal' },
  diamond: { n: '金剛體', d: '十秒內不會被打退，受到的傷害減半', anim: 'shout', dur: [0.5], buff: { iron: 10 }, cost: 18, sfx: 'buff' },
  ghost:   { n: '鬼神步', d: '一瞬間閃到最近的敵人背後', anim: 'jump', dur: [0.18], blink: 1, inv: [0, 1], cost: 8, sfx: 'whoosh' },
  chain:   { n: '連環腳', d: '前進中連踢三腳', anim: 'kick', dur: [0.05, 0.08, 0.05], loop: 3, hits: [{ f: 1, range: [0, 1.9], dz: 0.6, h: [0.3, 2.2], dmg: 6, stat: 'kick', kb: 2.5, stun: 0.4, each: 1 }], last: { down: 1, kb: 7, up: 5 }, vel: { f: 0, vx: 3.5, keep: 1 }, cost: 10, sfx: 'kick' },
  backspear:{ n: '迴馬槍', d: '假裝逃走，突然回身一槍', anim: 'thrust', dur: [0.2, 0.18, 0.12], turn: 1, hits: [{ f: 1, range: [0.3, 3.2], dz: 0.7, h: [0.4, 2.6], dmg: 16, stat: 'str', kb: 10, up: 6, down: 1, stun: 0.6, fx: 'slash' }], vel: { f: 0, vx: -6 }, cost: 10, sfx: 'blade2' },
  // ---- the heroes' own
  twinblade:{ n: '雙股劍舞', d: '雙劍飛舞，前進中斬過敵陣', anim: 'spin', dur: [0.05, 0.05, 0.05, 0.05], loop: 3, hits: [{ f: 0, range: [-1.2, 2.2], dz: 0.9, h: [0.3, 2.6], dmg: 5, stat: 'str', kb: 2, up: 2, stun: 0.35, each: 1, fx: 'slash' }], last: { down: 1, kb: 7, up: 5 }, vel: { f: 0, vx: 4.5, keep: 1 }, armor: 1, cost: 14, sfx: 'blade' },
  dragon:  { n: '青龍斬', d: '大刀一揮，劈出一道青色的刀氣', anim: 'slash', dur: [0.2, 0.14, 0.24], hits: [{ f: 1, range: [0, 2.6], dz: 0.8, h: [0.2, 3], dmg: 14, stat: 'str', kb: 8, up: 5, down: 1, stun: 0.5, fx: 'slash' }], proj: { f: 1, kind: 'wave', speed: 14, dmg: 16, stat: 'str', life: 0.9, h: 1.4, pierce: 1, down: 1 }, cost: 16, armor: 1, sfx: 'blade2' },
  roar:    { n: '燕人吼', d: '一聲大吼，四周的敵人都嚇得站不穩', anim: 'shout', dur: [0.7], area: { f: 0, r: 5.5, dmg: 4, stat: 'tech', dizzy: 2.4, kind: 'roar' }, cost: 16, armor: 1, voice: '燕人張翼德在此！', sfx: 'roar' },
  sevenfold:{ n: '七進七出', d: '提槍連衝，來回穿過敵陣', anim: 'thrust', dur: [0.05, 0.12, 0.04], loop: 4, hits: [{ f: 1, range: [0, 2.8], dz: 0.8, h: [0.3, 2.6], dmg: 6, stat: 'str', kb: 3, up: 2, stun: 0.4, each: 1, fx: 'slash' }], last: { down: 1, kb: 8, up: 5 }, vel: { f: 0, vx: 9, keep: 1, zig: 1 }, inv: [0, 99], cost: 16, sfx: 'blade2' },
  // ---- taught by masters
  arrow:   { n: '百步穿楊', d: '拉弓一箭，射穿一排敵人', anim: 'shoot', dur: [0.3, 0.1], proj: { f: 0, kind: 'arrow', speed: 24, dmg: 15, stat: 'tech', life: 1, h: 1.7, pierce: 1, down: 0, stun: 0.5 }, cost: 8, sfx: 'bow', wpn: 'bow' },
  twinji:  { n: '雙戟風暴', d: '雙戟狂舞，像旋風一樣捲過敵人', anim: 'spin', dur: [0.05, 0.05, 0.05, 0.05], loop: 4, hits: [{ f: 0, range: [-1.8, 2], dz: 1, h: [0.3, 2.6], dmg: 6, stat: 'str', kb: 3, up: 3, stun: 0.4, each: 1, fx: 'slash' }], last: { down: 1, kb: 8, up: 6 }, armor: 1, cost: 18, sfx: 'blade' },
  tigercharge:{ n: '虎癡衝', d: '猛虎般撞過去，抓住敵人摔在地上', anim: 'run', dur: [0.08, 0.08, 0.08, 0.08], hits: [{ f: 1, range: [0, 1.4], dz: 0.6, h: [0.3, 2.4], dmg: 18, stat: 'str', kb: 4, up: 9, down: 1, stun: 0.6 }], vel: { f: 0, vx: 12, keep: 1 }, armor: 1, cost: 14, sfx: 'smash' },
  bellrush:{ n: '錦帆突', d: '帶著鈴聲衝刺，連斬兩刀', anim: 'thrust', dur: [0.06, 0.12, 0.06], loop: 2, hits: [{ f: 1, range: [0, 2.4], dz: 0.6, h: [0.4, 2.4], dmg: 9, stat: 'str', kb: 3, stun: 0.45, each: 1, fx: 'slash' }], last: { down: 1, kb: 8, up: 4 }, vel: { f: 0, vx: 12, keep: 1 }, cost: 12, sfx: 'bell' },
  fire:    { n: '火計', d: '在前方燒起一道火牆', anim: 'cast', dur: [0.45], proj: { f: 0, kind: 'fire', speed: 7, dmg: 8, stat: 'tech', life: 1.6, h: 0.9, pierce: 1, ticks: 3, down: 1 }, cost: 16, sfx: 'fire' },
  thunder: { n: '五雷正法', d: '召來落雷，劈中附近的敵人', anim: 'cast', dur: [0.55], bolt: { n: 3, r: 9, dmg: 16, stat: 'tech', down: 1 }, cost: 22, sfx: 'thunder' },
  halberd: { n: '方天亂舞', d: '畫戟橫掃千軍，天下無雙的武藝', anim: 'spin', dur: [0.045, 0.045, 0.045, 0.045], loop: 5, hits: [{ f: 0, range: [-2.4, 2.6], dz: 1.1, h: [0.2, 3], dmg: 7, stat: 'str', kb: 3, up: 3, stun: 0.45, each: 1, fx: 'slash' }], last: { down: 1, kb: 10, up: 7 }, armor: 1, cost: 24, sfx: 'blade2' },
  bodyslam:{ n: '泰山壓頂', d: '跳起來用全身壓下去，壓倒一片', anim: 'jump', dur: [0.5, 0.2], vel: { f: 0, vy: 10, vx: 4 }, land: { r: 3, dmg: 18, stat: 'str', down: 1, up: 6, kb: 6, kind: 'quake' }, armor: 1, cost: 16, sfx: 'quake' },
  mist:    { n: '奇門遁甲', d: '化作一陣煙霧，躲過所有攻擊並回復一點氣', anim: 'cast', dur: [0.4], buff: { vanish: 2.5, sp: 10 }, inv: [0, 1], cost: 6, sfx: 'whoosh' },
};
// the techniques a hero can learn, and where
export const TECHS = ['whirl', 'hundred', 'rising', 'swallow', 'headbutt', 'quake', 'kiball', 'heal', 'diamond', 'ghost', 'chain', 'backspear', 'twinblade', 'dragon', 'roar', 'sevenfold', 'arrow', 'twinji', 'tigercharge', 'bellrush', 'fire', 'thunder', 'halberd', 'bodyslam', 'mist'];
// every move's frame times: the animation's own, unless the move says otherwise
import { ANIMS } from './art.js?v=9';
export function durs(m) { return m.dur || ANIMS[m.anim].map((f) => f.t); }
