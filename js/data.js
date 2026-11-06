// Heroes, foes, bosses, masters, food, gear and the road itself.
// stats: hp 體力 · sp 氣 · str 力 (fists and blades) · kick 腳 · tech 技 (techniques) · def 防 · spd 速
export const HEROES = {
  liubei:   { name: '劉備', zi: '玄德', look: 'liubei', arm: 'twin', d: '仁德之主。雙股劍攻守平均，氣多，最會用招式。', st: { hp: 120, sp: 60, str: 14, kick: 12, tech: 18, def: 12, spd: 13 }, techs: ['twinblade'], blade: 1 },
  guanyu:   { name: '關羽', zi: '雲長', look: 'guanyu', arm: 'guandao', d: '武聖。青龍偃月刀攻擊距離長、力量大，腳慢一點。', st: { hp: 135, sp: 45, str: 19, kick: 12, tech: 14, def: 14, spd: 11 }, techs: ['dragon'], blade: 1 },
  zhangfei: { name: '張飛', zi: '翼德', look: 'zhangfei', arm: 'snake', d: '萬人敵。體力最多、最耐打，擅長抓人摔人，一聲大吼能嚇住全場。', st: { hp: 150, sp: 45, str: 18, kick: 14, tech: 11, def: 16, spd: 10 }, techs: ['roar'], blade: 1, grip: 1.3 },
  zhaoyun:  { name: '趙雲', zi: '子龍', look: 'zhaoyun', arm: 'silver', d: '常山趙子龍。速度最快，長槍突刺，渾身是膽。', st: { hp: 120, sp: 50, str: 15, kick: 15, tech: 13, def: 12, spd: 16 }, techs: ['sevenfold'], blade: 1 },
};
// who can join the party (an ally fights beside you; the one you lead is the hero)
export const ALLY_OF = { liubei: ['guanyu', 'zhangfei'], guanyu: ['liubei', 'zhangfei'], zhangfei: ['liubei', 'guanyu'], zhaoyun: ['liubei', 'zhangfei'] };

// ---------------------------------------------------------------- the people of the road
// a foe type: look type, names, base stats at level 1 and growth, behaviour
export const FOES = {
  bandit:  { look: 'bandit', names: ['山賊', '盜匪', '惡棍', '地痞'], hp: 40, str: 9, kick: 8, def: 6, spd: 10, grow: 1, moves: ['jab', 'kick', 'slash'], ai: { aggro: 0.6, guard: 0.05, range: 1.4 }, gold: 6, exp: 6 },
  thug:    { look: 'boss_bandit', names: ['山賊頭目', '寨主'], hp: 110, str: 14, kick: 12, def: 10, spd: 9, grow: 1.2, moves: ['slash', 'thrust', 'round', 'dash'], ai: { aggro: 0.75, guard: 0.15, range: 1.6 }, gold: 30, exp: 24, big: 1 },
  turban:  { look: 'turban', names: ['黃巾賊', '黃巾兵', '太平道徒'], hp: 46, str: 10, kick: 9, def: 7, spd: 10, grow: 1, moves: ['jab', 'kick', 'slash', 'thrust'], ai: { aggro: 0.65, guard: 0.08, range: 1.5 }, gold: 7, exp: 8 },
  t_brute: { look: 't_brute', names: ['黃巾力士'], hp: 120, str: 15, kick: 12, def: 12, spd: 8, grow: 1.2, moves: ['slash', 'round', 'headbutt'], ai: { aggro: 0.6, guard: 0.1, range: 1.6, grab: 0.25 }, gold: 24, exp: 22, big: 1, armor: 0.4 },
  t_mage:  { look: 't_mage', names: ['黃巾術士', '妖道'], hp: 50, str: 8, kick: 7, tech: 14, def: 7, spd: 10, grow: 1, moves: ['slash', 'fire'], ai: { aggro: 0.4, guard: 0.05, range: 6, ranged: 'fire' }, gold: 14, exp: 14 },
  soldier: { look: 'soldier', names: ['官兵', '士卒', '槍兵'], hp: 60, str: 12, kick: 10, def: 10, spd: 10, grow: 1.1, moves: ['slash', 'thrust', 'kick'], ai: { aggro: 0.6, guard: 0.22, range: 1.8 }, gold: 9, exp: 10 },
  archer:  { look: 'archer', names: ['弓兵', '弩手'], hp: 46, str: 9, kick: 8, tech: 12, def: 7, spd: 10, grow: 1, moves: ['kick', 'arrow'], ai: { aggro: 0.4, guard: 0.05, range: 8, ranged: 'arrow' }, gold: 10, exp: 10 },
  guard:   { look: 'guard', names: ['飛熊軍', '虎賁', '親衛'], hp: 110, str: 16, kick: 13, def: 15, spd: 11, grow: 1.25, moves: ['slash', 'thrust', 'round', 'dash'], ai: { aggro: 0.7, guard: 0.35, range: 2 }, gold: 22, exp: 22, big: 1 },
  pirate:  { look: 'pirate', names: ['江賊', '水寇'], hp: 54, str: 12, kick: 11, def: 8, spd: 12, grow: 1.1, moves: ['slash', 'kick', 'dash'], ai: { aggro: 0.7, guard: 0.1, range: 1.6 }, gold: 11, exp: 11 },
  nanman:  { look: 'nanman', names: ['蠻兵', '藤甲兵'], hp: 70, str: 13, kick: 12, def: 12, spd: 11, grow: 1.15, moves: ['slash', 'thrust', 'headbutt'], ai: { aggro: 0.7, guard: 0.25, range: 1.8 }, gold: 12, exp: 13 },
  monk:    { look: 'monk', names: ['武僧', '山中隱士'], hp: 70, str: 13, kick: 15, tech: 13, def: 11, spd: 13, grow: 1.15, moves: ['jab', 'kick', 'chain', 'kiball'], ai: { aggro: 0.6, guard: 0.3, range: 1.5 }, gold: 14, exp: 16 },
};
// the great ones met as bosses (and later as sparring partners): fixed looks, their own techniques
export const BOSSES = {
  chengyz:  { name: '程遠志', look: 'chengyz', lv: 4, hp: 380, str: 18, kick: 14, tech: 10, def: 12, spd: 10, moves: ['slash', 'thrust', 'round', 'dash', 'quake'], ai: { aggro: 0.7, guard: 0.15, range: 1.8 }, teach: 'quake', line: ['哪裡來的小子，敢闖我黃巾大營！', '大賢良師……不會放過你們的……'], gold: 200, exp: 160 },
  zhangjiao:{ name: '張角', look: 'zhangjiao', lv: 8, hp: 560, str: 14, kick: 12, tech: 26, def: 13, spd: 11, moves: ['slash', 'fire', 'thunder', 'ghost'], ai: { aggro: 0.5, guard: 0.15, range: 5, ranged: 'thunder' }, teach: 'thunder', line: ['蒼天已死，黃天當立！', '天命……終究不在我……'], gold: 500, exp: 380, summon: 't_mage' },
  huaxiong: { name: '華雄', look: 'huaxiong', lv: 11, hp: 760, str: 26, kick: 18, tech: 14, def: 18, spd: 12, moves: ['slash', 'slash2', 'thrust', 'dash', 'dragon', 'diamond'], ai: { aggro: 0.8, guard: 0.3, range: 2.2 }, teach: 'diamond', line: ['關東鼠輩，誰敢與我一戰！', '怎……怎麼可能……'], gold: 700, exp: 560 },
  lubu:     { name: '呂布', look: 'lubu', lv: 16, hp: 1300, str: 34, kick: 26, tech: 22, def: 24, spd: 16, moves: ['slash', 'slash2', 'thrust', 'dash', 'halberd', 'rising', 'swallow'], ai: { aggro: 0.85, guard: 0.45, range: 2.6 }, teach: 'halberd', line: ['人中呂布，馬中赤兔。你們一起上吧！', '哼……今天就到這裡。下次見面，你就沒這麼好運了！'], gold: 1500, exp: 1200, flee: 1 },
  dongzhuo: { name: '董卓', look: 'dongzhuo', lv: 20, hp: 1700, str: 32, kick: 24, tech: 20, def: 26, spd: 10, moves: ['slash', 'round', 'bodyslam', 'headbutt', 'quake'], ai: { aggro: 0.7, guard: 0.3, range: 2 }, teach: 'bodyslam', line: ['天下是我的！誰敢跟我搶？', '我……我是相國……'], gold: 3000, exp: 2400, summon: 'guard', final: 1 },
  lubu2:    { name: '呂布', look: 'lubu', lv: 22, hp: 1800, str: 40, kick: 30, tech: 24, def: 28, spd: 17, moves: ['slash', 'slash2', 'thrust', 'dash', 'halberd', 'rising', 'swallow'], ai: { aggro: 0.9, guard: 0.5, range: 2.6 }, teach: null, line: ['義父……不，董卓已經不配了。來吧，這次我不會再走！', '天下無雙……也有輸的一天嗎……'], gold: 2000, exp: 2000 },
  menghuo:  { name: '孟獲', look: 'menghuo', lv: 18, hp: 1500, str: 34, kick: 24, tech: 14, def: 26, spd: 12, moves: ['slash', 'round', 'headbutt', 'tigercharge', 'quake'], ai: { aggro: 0.8, guard: 0.2, range: 2 }, teach: 'tigercharge', line: ['南中是我們的地方！外人滾出去！', '這次不算！……好吧，我服了。'], gold: 1600, exp: 1300, summon: 'nanman' },
};
// masters who teach for gold once you have proven yourself against them
export const MASTERS = {
  luzhi:     { name: '盧植', look: 'luzhi', lv: 3, hp: 260, str: 14, kick: 16, tech: 16, def: 12, spd: 12, moves: ['slash', 'kick', 'chain', 'kiball'], teaches: ['chain', 'kiball', 'heal'], line: '想學武藝，先讓我看看你的本事。' },
  dianwei:   { name: '典韋', look: 'dianwei', lv: 9, hp: 620, str: 26, kick: 18, tech: 12, def: 20, spd: 11, moves: ['slash', 'round', 'twinji', 'headbutt'], teaches: ['twinji', 'headbutt', 'hundred'], line: '嘿！打得贏我，這雙戟的用法就教你！' },
  xuchu:     { name: '許褚', look: 'xuchu', lv: 10, hp: 700, str: 28, kick: 16, tech: 10, def: 22, spd: 10, moves: ['jab', 'straight', 'tigercharge', 'quake'], teaches: ['tigercharge', 'quake', 'diamond'], line: '來來來，跟我比力氣！' },
  huangzhong:{ name: '黃忠', look: 'huangzhong', lv: 12, hp: 640, str: 24, kick: 16, tech: 22, def: 18, spd: 13, moves: ['slash', 'thrust', 'arrow', 'backspear'], teaches: ['arrow', 'backspear', 'rising'], line: '別看老夫年紀大，手上的弓箭可不老！' },
  taishici:  { name: '太史慈', look: 'taishici', lv: 13, hp: 700, str: 26, kick: 20, tech: 18, def: 18, spd: 15, moves: ['thrust', 'kick', 'swallow', 'chain'], teaches: ['swallow', 'whirl', 'chain'], line: '大丈夫生於亂世，當帶三尺劍立不世之功！來吧！' },
  ganning:   { name: '甘寧', look: 'ganning', lv: 11, hp: 600, str: 24, kick: 20, tech: 14, def: 16, spd: 17, moves: ['slash', 'kick', 'bellrush', 'whirl'], teaches: ['bellrush', 'whirl', 'ghost'], line: '聽到鈴聲了嗎？那就是錦帆賊來了！' },
  zuoci:     { name: '左慈', look: 'zuoci', lv: 18, hp: 900, str: 20, kick: 20, tech: 34, def: 20, spd: 16, moves: ['kiball', 'fire', 'ghost', 'mist', 'thunder'], teaches: ['ghost', 'mist', 'fire', 'thunder', 'kiball'], line: '凡人，你為何來到這座山上？讓貧道看看你的心。' },
};

// ---------------------------------------------------------------- food (heals at once; some dishes make you stronger for good)
export const FOOD = {
  mantou:  { n: '饅頭', price: 8, heal: 30, d: '回復體力 30' },
  baozi:   { n: '肉包子', price: 18, heal: 70, d: '回復體力 70' },
  noodle:  { n: '牛肉麵', price: 30, heal: 120, d: '回復體力 120' },
  tea:     { n: '熱茶', price: 12, sp: 30, d: '回復氣 30' },
  wine:    { n: '燒酒', price: 25, sp: 60, heal: 20, d: '回復氣 60、體力 20' },
  duck:    { n: '烤鴨', price: 60, heal: 200, gain: { str: 1 }, d: '回復體力 200，力 +1' },
  fish:    { n: '松鼠魚', price: 60, heal: 150, gain: { spd: 1 }, d: '回復體力 150，速 +1' },
  tofu:    { n: '麻婆豆腐', price: 55, heal: 120, gain: { tech: 1 }, d: '回復體力 120，技 +1' },
  ribs:    { n: '紅燒排骨', price: 70, heal: 220, gain: { kick: 1 }, d: '回復體力 220，腳 +1' },
  soup:    { n: '人參雞湯', price: 120, heal: 999, sp: 999, gain: { hp: 5 }, d: '全部回復，體力上限 +5' },
  feast:   { n: '滿漢大餐', price: 260, heal: 999, sp: 999, gain: { str: 1, kick: 1, def: 1 }, d: '全部回復，力、腳、防各 +1' },
  bun_t:   { n: '桃包', price: 40, heal: 90, gain: { sp: 3 }, d: '回復體力 90，氣上限 +3' },
};
// items carried (used from the bag: Q, or the menu)
export const ITEMS = {
  salve:   { n: '金創藥', price: 40, heal: 120, d: '回復體力 120（Q 使用）' },
  pill:    { n: '大還丹', price: 180, heal: 999, sp: 999, d: '全部回復（Q 使用）' },
  elixir:  { n: '還魂丹', price: 400, revive: 1, d: '倒下時自動復活一次' },
};
// gear: a slot each for a weapon, armour, boots and a charm
export const GEAR = {
  a1: { slot: 'a', n: '皮甲', price: 100, def: 3 }, a2: { slot: 'a', n: '鎖子甲', price: 340, def: 7 }, a3: { slot: 'a', n: '鐵甲', price: 820, def: 12, hp: 20 }, a4: { slot: 'a', n: '明光鎧', price: 2200, def: 18, hp: 40 }, a5: { slot: 'a', n: '獸面吞頭鎧', price: 4000, def: 26, hp: 70 },
  b1: { slot: 'b', n: '草鞋', price: 60, spd: 1 }, b2: { slot: 'b', n: '快靴', price: 300, spd: 3, kick: 2 }, b3: { slot: 'b', n: '虎皮靴', price: 900, spd: 5, kick: 5 }, b4: { slot: 'b', n: '赤兔蹄鐵', price: 3000, spd: 8, kick: 9 },
  c1: { slot: 'c', n: '護身符', price: 150, hp: 20 }, c2: { slot: 'c', n: '玉珮', price: 420, sp: 15, tech: 3 }, c3: { slot: 'c', n: '虎符', price: 1100, str: 4, kick: 4, def: 4 }, c4: { slot: 'c', n: '孟德新書', price: 2600, tech: 12, sp: 30 }, c5: { slot: 'c', n: '太平要術', price: 5000, tech: 20, sp: 50 },
};
// What a hero holds. Anyone can take up any of them: every one bought is kept and can be swapped in the menu
// (裝備), for the hero and for the sworn brother alike. kind: how it is drawn; twin: one in each hand; reach: how far
// the weapon's blows carry (times the blow's own reach); color: the haft.
export const WEAPONS = {
  fist:  { n: '空手', kind: null, reach: 1, d: '赤手空拳，出拳最快' },
  twin:  { n: '雙股劍', kind: 'sword', twin: 1, reach: 1, str: 4, tech: 2, spd: 1, d: '一雌一雄兩把劍，攻守平均' },
  guandao: { n: '青龍偃月刀', kind: 'glaive', color: '#2a5a3a', reach: 1.3, str: 7, spd: -1, d: '八十二斤的大刀，打得遠、打得重' },
  snake: { n: '丈八蛇矛', kind: 'snake', color: '#1e1e1e', reach: 1.32, str: 6, d: '一丈八尺的長矛，矛頭彎如蛇' },
  silver: { n: '亮銀槍', kind: 'spear', color: '#e0e0e6', reach: 1.28, str: 5, spd: 1, d: '銀白長槍，快而準' },
  w1:    { n: '精鐵刀', kind: 'saber', reach: 1, str: 3, price: 120, d: '一把好用的環首刀' },
  wstaff: { n: '齊眉棍', kind: 'staff', reach: 1.22, str: 3, spd: 1, price: 110, d: '和眉毛一樣高的木棍，又長又輕' },
  wspear: { n: '長槍', kind: 'spear', reach: 1.25, str: 4, price: 160, d: '軍中最常見的長槍' },
  waxe:  { n: '開山斧', kind: 'axe', reach: 0.95, str: 8, spd: -1, price: 300, d: '又短又重，一斧下去不得了' },
  w2:    { n: '百煉鋼刀', kind: 'saber', reach: 1, str: 7, price: 380, d: '千錘百煉的鋼刀' },
  wmace: { n: '鐵骨朵', kind: 'mace', reach: 0.95, str: 10, spd: -1, price: 460, d: '頭上一顆鐵球，砸得人頭昏眼花' },
  wjis:  { n: '雙鐵戟', kind: 'jis', twin: 1, reach: 0.95, str: 8, spd: 1, price: 520, d: '兩手各一把短戟，像典韋那樣' },
  w3:    { n: '龍紋鋼劍', kind: 'sword', reach: 1.05, str: 12, price: 900, d: '劍身上浮著龍紋' },
  whalb: { n: '方天畫戟', kind: 'halberd', color: '#8a1a1a', reach: 1.3, str: 15, price: 1500, d: '戟上兩片月牙，像呂布用的那種' },
  w4:    { n: '倚天劍', kind: 'sword', reach: 1.05, str: 18, tech: 4, price: 2400, d: '曹操的寶劍，削鐵如泥' },
  w5:    { n: '青釭劍', kind: 'sword', reach: 1.05, str: 26, spd: 2, price: 4200, d: '趙雲在長坂坡奪來的寶劍' },
};
export const SLOT_N = { w: '兵器', a: '鎧甲', b: '靴', c: '飾品' };

// ---------------------------------------------------------------- the road: stretches of country and the towns between
// kind: town | field. exits left/right lead along the road; forks are signposts you walk up (or down) to.
// foes: groups placed along the stretch ([x, type, count, lvBonus]); boss: met at the far end in a closed arena.
export const ZONES = {
  zhuo:     { name: '涿縣', kind: 'town', lv: 1, len: 70, ground: 'grass', road: 'pave', mood: 'day', right: 'zhuo_out', shops: { food: ['mantou', 'baozi', 'tea', 'duck', 'bun_t'], items: ['salve'], gear: ['w1', 'wstaff', 'wspear', 'a1', 'b1', 'c1'], books: [] }, master: 'luzhi', allyHere: 1,
              back: [{ k: 'house', x: 7, w: 7, sign: '客棧', shop: 'inn', curtain: '#3a5a8a' }, { k: 'house', x: 16, w: 6, sign: '飯館', shop: 'food', curtain: '#a83a2a', roof: '#3a4a3a' }, { k: 'house', x: 24.5, w: 6.5, sign: '兵器鋪', shop: 'gear', curtain: '#4a4a4a', wall: 'boards', col: '#8a6a4a' }, { k: 'well', x: 30.5 }, { k: 'house', x: 37, w: 6.5, sign: '藥舖', shop: 'items', curtain: '#4a7a4a', roof: '#5a4a3a' }, { k: 'house', x: 46, w: 8, sign: '盧植道場', shop: 'dojo', roof: '#7a2a20', col: '#e8d8b8' }, { k: 'house', x: 55, w: 6, sign: '酒館', shop: 'tavern', curtain: '#8a5a2a', thatch: 1 }, { k: 'tree', x: 61, kind: 'peach' }, { k: 'sign', x: 64, t: '往桃園 ↑', z: -0.4 }],
              forks: [{ x: 64, to: 'taoyuan', label: '桃園' }], npcs: 7 },
  taoyuan:  { name: '桃園', kind: 'field', lv: 1, len: 50, ground: 'meadow', mood: 'day', trees: ['peach', 'peach', 'broad'], back: [{ k: 'trees', x0: 5, x1: 45, kind: 'peach', gap: 3 }, { k: 'fence', x0: 18, x1: 34, z: -0.8 }, { k: 'house', x: 26, w: 6, thatch: 1, door: false, col: '#d8c8a8' }], forks: [{ x: 8, to: 'zhuo', label: '涿縣', down: 1 }, { x: 44, to: 'tianzhu', label: '天柱山' }], foes: [[30, 'bandit', 2, 0]], oath: 1 },
  zhuo_out: { name: '涿郡郊外', kind: 'field', lv: 2, len: 110, ground: 'grass', left: 'zhuo', right: 'jizhou', trees: ['broad', 'pine'], back: [{ k: 'fence', x0: 12, x1: 26 }, { k: 'rock', x: 40 }, { k: 'fire', x: 70, z: -0.8 }, { k: 'tent', x: 74, col: '#8a7a5a', w: 3.4 }], foes: [[22, 'bandit', 2, 0], [45, 'bandit', 3, 0], [72, 'bandit', 3, 1], [96, 'thug', 1, 0]] },
  jizhou:   { name: '冀州大道', kind: 'field', lv: 4, len: 130, ground: 'grass', left: 'zhuo_out', right: 'camp', trees: ['broad', 'autumn'], mood: 'day', back: [{ k: 'flag', x: 30, t: '黃' }, { k: 'tent', x: 52, col: '#d8c060' }, { k: 'rock', x: 70 }, { k: 'sign', x: 90, t: '往陳留 ↑', z: -0.4 }, { k: 'fence', x0: 100, x1: 118 }], forks: [{ x: 90, to: 'chenliu', label: '陳留' }], foes: [[20, 'turban', 3, 0], [44, 'turban', 3, 0], [62, 't_mage', 1, 0], [64, 'turban', 2, 0], [108, 't_brute', 1, 0], [110, 'turban', 2, 1]] },
  camp:     { name: '黃巾營寨', kind: 'field', lv: 5, len: 110, ground: 'dirt', road: 'dirt', mood: 'dusk', left: 'jizhou', right: 'guangzong', trees: ['dead', 'broad'], back: [{ k: 'palisade', x0: -10, x1: 120, z: -2.6 }, { k: 'tent', x: 20, col: '#d8c060' }, { k: 'tent', x: 34, col: '#c8a840' }, { k: 'flag', x: 27, t: '黃' }, { k: 'fire', x: 42, z: -0.8 }, { k: 'tent', x: 60, col: '#d8c060' }, { k: 'flag', x: 66, t: '天' }, { k: 'fire', x: 80, z: -0.8 }, { k: 'tent', x: 92, col: '#e0c860', w: 5 }], foes: [[16, 'turban', 3, 0], [36, 'turban', 3, 1], [38, 't_mage', 1, 0], [56, 't_brute', 1, 0], [58, 'turban', 2, 1], [74, 'turban', 4, 1]], boss: 'chengyz' },
  guangzong:{ name: '廣宗', kind: 'field', lv: 8, len: 100, ground: 'red', road: 'dirt', mood: 'fire', left: 'camp', hills: 'red', trees: ['dead'], back: [{ k: 'wall', z: -4, col: '#8a6a5a', gate: 70, sign: '廣宗' }, { k: 'flag', x: 20, t: '黃' }, { k: 'flag', x: 40, t: '天' }, { k: 'fire', x: 30, z: -0.8 }, { k: 'fire', x: 55, z: -0.8 }], foes: [[16, 'turban', 4, 2], [32, 't_mage', 2, 1], [46, 't_brute', 2, 1], [50, 'turban', 2, 2]], boss: 'zhangjiao' },
  chenliu:  { name: '陳留', kind: 'town', lv: 6, len: 76, ground: 'dirt', road: 'pave', mood: 'day', forks: [{ x: 6, to: 'jizhou', label: '冀州', down: 1 }, { x: 70, to: 'qiao', label: '譙郡' }], right: 'sishui_rd', shops: { food: ['baozi', 'noodle', 'tea', 'wine', 'duck', 'tofu'], items: ['salve', 'pill'], gear: ['w1', 'wspear', 'waxe', 'w2', 'wmace', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'], books: ['whirl', 'kiball'] }, master: 'dianwei', allyHere: 1,
              back: [{ k: 'house', x: 10, w: 7, sign: '悅來客棧', shop: 'inn', curtain: '#5a3a7a', roof: '#3a3a4a' }, { k: 'house', x: 19, w: 6, sign: '麵館', shop: 'food', curtain: '#a84a2a' }, { k: 'house', x: 27, w: 7, sign: '鐵匠鋪', shop: 'gear', wall: 'brick', col: '#9a5a4a' }, { k: 'house', x: 36, w: 6, sign: '書肆', shop: 'books', curtain: '#3a5a3a', roof: '#4a3a2a' }, { k: 'house', x: 44, w: 6, sign: '藥舖', shop: 'items', curtain: '#4a7a4a' }, { k: 'house', x: 54, w: 8, sign: '曹營招兵', shop: 'dojo', roof: '#2a2a3a', col: '#d0c8b8' }, { k: 'house', x: 63, w: 6, sign: '酒館', shop: 'tavern', thatch: 1 }, { k: 'sign', x: 70, t: '往譙郡 ↑', z: -0.4 }, { k: 'sign', x: 6, t: '往冀州 ↓', z: -0.4 }], npcs: 9 },
  sishui_rd:{ name: '汜水關道', kind: 'field', lv: 9, len: 120, ground: 'dirt', mood: 'day', left: 'chenliu', right: 'sishui', trees: ['pine', 'autumn'], hills: 'green', back: [{ k: 'rock', x: 18 }, { k: 'flag', x: 40, t: '董', col: '#3a3a3a' }, { k: 'fire', x: 62, z: -0.8 }, { k: 'tent', x: 66, col: '#5a4a4a' }, { k: 'rack', x: 86 }], foes: [[20, 'soldier', 3, 0], [42, 'archer', 2, 0], [44, 'soldier', 2, 0], [68, 'soldier', 3, 1], [92, 'guard', 1, 0], [94, 'soldier', 2, 1]] },
  sishui:   { name: '汜水關', kind: 'field', lv: 11, len: 80, ground: 'dirt', road: 'pave', mood: 'dusk', left: 'sishui_rd', right: 'hulao', hills: 'dark', fill: 'none', back: [{ k: 'wall', z: -3.2, gate: 60, sign: '汜水關', col: '#7a746a' }, { k: 'flag', x: 20, t: '董', col: '#3a3a3a' }, { k: 'flag', x: 44, t: '華', col: '#8a1a1a' }, { k: 'lamp', x: 30 }, { k: 'lamp', x: 50 }], foes: [[16, 'soldier', 3, 1], [30, 'archer', 2, 1], [34, 'guard', 1, 0]], boss: 'huaxiong' },
  hulao:    { name: '虎牢關', kind: 'field', lv: 15, len: 90, ground: 'dirt', road: 'pave', mood: 'dusk', left: 'sishui', right: 'luoyang', hills: 'dark', fill: 'none', back: [{ k: 'wall', z: -3.2, gate: 70, sign: '虎牢關', col: '#6a645c', h: 9 }, { k: 'flag', x: 16, t: '呂', col: '#c02828' }, { k: 'flag', x: 40, t: '董', col: '#3a3a3a' }, { k: 'flag', x: 56, t: '呂', col: '#c02828' }, { k: 'lamp', x: 26 }, { k: 'lamp', x: 48 }], foes: [[16, 'guard', 2, 0], [30, 'archer', 2, 2], [44, 'guard', 2, 1]], boss: 'lubu' },
  luoyang:  { name: '洛陽', kind: 'town', lv: 14, len: 84, ground: 'dirt', road: 'pave', mood: 'dusk', left: 'hulao', right: 'hangu', shops: { food: ['noodle', 'wine', 'duck', 'fish', 'tofu', 'ribs', 'soup', 'feast'], items: ['salve', 'pill', 'elixir'], gear: ['w2', 'wmace', 'wjis', 'w3', 'whalb', 'w4', 'a2', 'a3', 'a4', 'b2', 'b3', 'c2', 'c3', 'c4'], books: ['hundred', 'diamond', 'rising', 'heal'] },
              back: [{ k: 'pillars', x0: 4, x1: 80, gap: 12, z: -0.9 }, { k: 'house', x: 10, w: 8, sign: '洛陽客棧', shop: 'inn', curtain: '#8a2a2a', roof: '#2a3a2a', col: '#e8dcc8' }, { k: 'house', x: 21, w: 7, sign: '酒樓', shop: 'food', curtain: '#a82a2a', roof: '#6a2a20', h: 4 }, { k: 'house', x: 31, w: 7, sign: '名匠坊', shop: 'gear', wall: 'brick', col: '#8a4a3a' }, { k: 'house', x: 41, w: 6, sign: '書肆', shop: 'books', curtain: '#2a4a2a' }, { k: 'house', x: 50, w: 6, sign: '藥舖', shop: 'items', curtain: '#4a7a4a' }, { k: 'house', x: 62, w: 10, sign: '皇城', door: false, roof: '#c8a030', col: '#a83a2a', h: 4.5, wall: 'boards' }, { k: 'house', x: 75, w: 7, sign: '酒館', shop: 'tavern', thatch: 0, curtain: '#5a3a2a' }], npcs: 10 },
  hangu:    { name: '函谷古道', kind: 'field', lv: 18, len: 130, ground: 'dirt', mood: 'mist', left: 'luoyang', right: 'meiwu', trees: ['pine', 'dead'], hills: 'snow', back: [{ k: 'rock', x: 14, s: 2.4 }, { k: 'rock', x: 50, s: 2 }, { k: 'flag', x: 70, t: '董', col: '#3a3a3a' }, { k: 'fire', x: 88, z: -0.8 }], foes: [[18, 'guard', 2, 0], [40, 'archer', 3, 1], [62, 'soldier', 4, 3], [84, 'guard', 3, 1], [108, 'guard', 2, 3], [110, 'archer', 2, 3]] },
  meiwu:    { name: '郿塢', kind: 'field', lv: 21, len: 100, ground: 'pave', road: 'pave', mood: 'night', left: 'hangu', hills: 'dark', fill: 'none', back: [{ k: 'wall', z: -3.2, gate: 80, sign: '郿塢', col: '#6a5a5a', h: 8 }, { k: 'pillars', x0: 10, x1: 70, gap: 10, z: -1 }, { k: 'lamp', x: 15 }, { k: 'lamp', x: 35 }, { k: 'lamp', x: 55 }], foes: [[14, 'guard', 3, 2], [32, 'guard', 3, 3], [36, 'archer', 2, 3]], boss: 'dongzhuo', boss2: 'lubu2' },
  qiao:     { name: '譙郡山林', kind: 'field', lv: 9, len: 110, ground: 'dark', mood: 'mist', forks: [{ x: 6, to: 'chenliu', label: '陳留', down: 1 }], right: 'jiangxia', trees: ['pine', 'broad', 'bamboo'], back: [{ k: 'house', x: 60, w: 7, thatch: 1, sign: '許家莊', shop: 'dojo', col: '#c8b890', id: 'xuchu' }, { k: 'fence', x0: 52, x1: 68 }, { k: 'rock', x: 30, s: 2 }], foes: [[22, 'bandit', 4, 4], [40, 'thug', 1, 3], [84, 'bandit', 4, 5], [96, 'thug', 1, 4]], master: 'xuchu' },
  jiangxia: { name: '江夏水寨', kind: 'field', lv: 11, len: 120, ground: 'sand', road: 'dirt', mood: 'day', water: 'back', left: 'qiao', right: 'changsha', trees: ['willow'], fill: 'field', back: [{ k: 'boat', x: 20, z: -9 }, { k: 'boat', x: 52, z: -10, sail: '#c83a2a' }, { k: 'crates', x: 36 }, { k: 'house', x: 80, w: 7, wall: 'boards', col: '#7a5a3a', sign: '錦帆寨', shop: 'dojo', id: 'ganning', roof: '#4a3a2a' }, { k: 'flag', x: 88, t: '錦', col: '#e0b040' }], foes: [[18, 'pirate', 3, 0], [40, 'pirate', 4, 1], [62, 'pirate', 3, 2], [104, 'pirate', 4, 2]], master: 'ganning' },
  changsha: { name: '長沙', kind: 'town', lv: 12, len: 74, ground: 'grass', road: 'pave', mood: 'day', left: 'jiangxia', right: 'jiang', shops: { food: ['noodle', 'tea', 'fish', 'tofu', 'ribs', 'soup'], items: ['salve', 'pill', 'elixir'], gear: ['waxe', 'w2', 'wjis', 'w3', 'a2', 'a3', 'b2', 'b3', 'c2', 'c3'], books: ['heal', 'swallow', 'hundred'] }, master: 'huangzhong',
              back: [{ k: 'house', x: 9, w: 7, sign: '湘江客棧', shop: 'inn', curtain: '#3a6a6a', roof: '#3a4a5a' }, { k: 'house', x: 18, w: 6, sign: '湘菜館', shop: 'food', curtain: '#c83a2a' }, { k: 'house', x: 27, w: 7, sign: '兵器鋪', shop: 'gear', wall: 'boards', col: '#8a6a4a' }, { k: 'house', x: 36, w: 6, sign: '華佗醫館', shop: 'items', curtain: '#6a8a6a', roof: '#4a5a4a' }, { k: 'house', x: 45, w: 6, sign: '書肆', shop: 'books' }, { k: 'house', x: 56, w: 8, sign: '黃忠射場', shop: 'dojo', roof: '#6a4a2a', col: '#e0d0b0' }, { k: 'house', x: 66, w: 6, sign: '酒館', shop: 'tavern', thatch: 1 }, { k: 'tree', x: 4, kind: 'willow' }], npcs: 8 },
  jiang:    { name: '長江岸', kind: 'field', lv: 13, len: 120, ground: 'sand', mood: 'dusk', water: 'back', left: 'changsha', right: 'jianye', trees: ['willow', 'bamboo'], back: [{ k: 'boat', x: 30, z: -9, sail: '#e8e0c8' }, { k: 'boat', x: 76, z: -11 }, { k: 'sign', x: 60, t: '往南中 ↑', z: -0.4 }, { k: 'rock', x: 98 }], forks: [{ x: 60, to: 'nanzhong', label: '南中' }], foes: [[20, 'pirate', 4, 2], [44, 'soldier', 3, 2], [86, 'pirate', 4, 3], [100, 'monk', 2, 1]] },
  jianye:   { name: '建業', kind: 'town', lv: 14, len: 76, ground: 'dirt', road: 'pave', mood: 'day', left: 'jiang', shops: { food: ['noodle', 'wine', 'fish', 'ribs', 'soup', 'feast'], items: ['salve', 'pill', 'elixir'], gear: ['w3', 'whalb', 'w4', 'w5', 'a3', 'a4', 'a5', 'b3', 'b4', 'c3', 'c4', 'c5'], books: ['backspear', 'rising', 'diamond', 'quake'] }, master: 'taishici',
              back: [{ k: 'house', x: 9, w: 7, sign: '江東客棧', shop: 'inn', curtain: '#2a4a8a', roof: '#2a3a5a' }, { k: 'house', x: 19, w: 7, sign: '魚米酒樓', shop: 'food', curtain: '#a82a2a', h: 4 }, { k: 'house', x: 29, w: 7, sign: '名劍閣', shop: 'gear', wall: 'brick', col: '#7a4a3a' }, { k: 'house', x: 39, w: 6, sign: '書肆', shop: 'books' }, { k: 'house', x: 48, w: 6, sign: '藥舖', shop: 'items', curtain: '#4a7a4a' }, { k: 'house', x: 59, w: 8, sign: '太史慈武館', shop: 'dojo', roof: '#2a3a6a', col: '#e0d8c8' }, { k: 'house', x: 69, w: 6, sign: '酒館', shop: 'tavern', curtain: '#5a3a2a' }], npcs: 9 },
  nanzhong: { name: '南中密林', kind: 'field', lv: 17, len: 130, ground: 'jungle', mood: 'mist', forks: [{ x: 6, to: 'jiang', label: '長江', down: 1 }], trees: ['jungle', 'bamboo', 'jungle'], hills: 'jungle', back: [{ k: 'tent', x: 70, col: '#8a5a2a' }, { k: 'fire', x: 76, z: -0.8 }, { k: 'flag', x: 82, t: '蠻', col: '#8a4a1a' }], foes: [[20, 'nanman', 3, 0], [40, 'nanman', 4, 1], [60, 'nanman', 3, 2], [86, 'nanman', 4, 3]], boss: 'menghuo' },
  tianzhu:  { name: '天柱山', kind: 'field', lv: 16, len: 100, ground: 'snow', mood: 'mist', forks: [{ x: 6, to: 'taoyuan', label: '桃園', down: 1 }], trees: ['pine'], hills: 'snow', back: [{ k: 'rock', x: 20, snow: 1, s: 2.4 }, { k: 'rock', x: 44, snow: 1 }, { k: 'house', x: 80, w: 6, thatch: 1, sign: '左慈草廬', shop: 'dojo', id: 'zuoci', col: '#d8d0c0' }], foes: [[24, 'monk', 2, 2], [46, 'monk', 3, 3], [64, 'monk', 3, 4]], master: 'zuoci' },
};
// who teaches where (dojo doors with an id name the master; otherwise the town's master)
export const QUEST = [
  { boss: 'chengyz', t: '擊敗黃巾營寨的程遠志' }, { boss: 'zhangjiao', t: '在廣宗打倒黃巾之首張角' }, { boss: 'huaxiong', t: '在汜水關斬華雄' },
  { boss: 'lubu', t: '在虎牢關擋住呂布' }, { boss: 'dongzhuo', t: '攻入郿塢，討伐董卓' },
];
export const RUMORS = [
  '聽說冀州大道往北拐，可以到陳留。那裡有個叫典韋的猛人，力氣大得嚇人。',
  '黃巾賊的大營就在冀州大道的盡頭，他們的頭目程遠志可兇了。',
  '張角在廣宗作法，聽說能呼風喚雨，還會落雷！',
  '桃園後面有條山路，上去是天柱山。山上住著一位會法術的老神仙。',
  '從陳留往南走，是譙郡的山林。許褚就住在那裡的莊子上。',
  '呂布守在虎牢關。天下沒有人打得贏他……至少現在沒有。',
  '饅頭吃不飽的話就去吃烤鴨，吃多了力氣會變大喔。',
  '江夏水寨的錦帆賊老大甘寧，腰上掛著鈴鐺，聽到鈴聲就快跑吧。',
  '長沙的黃忠老將軍箭法如神，聽說肯教有本事的年輕人。',
  '建業的名劍閣有一把青釭劍，可惜貴得要命。',
  '長江岸邊有路通往南中。蠻王孟獲在密林裡稱王。',
  '被打得站不穩的敵人，走過去就能抓住他。抓住了可以用膝蓋撞，也可以把他扔出去砸別人。',
  '路邊的木桶、石頭都能撿起來砸人（E）。',
  '跑起來的時候出拳是衝撞，出腳是飛踢。',
  '在客棧住一晚可以存檔，還會回滿體力和氣。',
  '招式最多能裝四個，在選單（Esc）的「招式」裡換。',
];
