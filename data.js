'use strict';
/* =============================================================
   凡人修仙传 · 双状态纪元 —— 静态数据层
   境界 / 灵根 / 特质 / 出身 / 地域 / 宗门 / 物价 / 人物 / 功法
   ============================================================= */

/* ---------------- 境界 ----------------
   每个大境界分若干小境界；base 为每小境界基准修行量。
   突破大境界需渡「天关」，成功后寿元上限刷新为该境界寿数。
--------------------------------------- */
const REALM_TIERS = [
  { name: '凡人', short: '凡', phase: '红尘', subs: ['凡俗'], base: 0, gain: 0, life: 100,
    hp: 80, mp: 0, atk: 8, def: 2,
    desc: '血肉之躯，百年之寿。生老病死，无人可免。' },
  { name: '炼气期', short: '炼气', phase: '引气入体', subs: ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层', '十层', '十一层', '十二层', '十三层'],
    base: 45, gain: 8, life: 160, hp: 220, mp: 90, atk: 30, def: 6,
    desc: '引气入体，吐纳天地灵机。寿至一百五十，方算踏入仙途门槛。' },
  { name: '筑基期', short: '筑基', phase: '筑就道基', subs: ['初期', '中期', '后期', '大圆满'],
    base: 420, gain: 34, life: 250, hp: 900, mp: 420, atk: 110, def: 24,
    desc: '筑就道基，真元凝实。寿二百五十，可御器飞行，才算一方修士。' },
  { name: '结丹期', short: '结丹', phase: '结成金丹', subs: ['初期', '中期', '后期', '大圆满'],
    base: 1800, gain: 120, life: 550, hp: 3200, mp: 1800, atk: 420, def: 90,
    desc: '真元结丹，丹成则寿五百。举手投足之间，已有移山之威。' },
  { name: '元婴期', short: '元婴', phase: '元婴出窍', subs: ['初期', '中期', '后期', '大圆满'],
    base: 7000, gain: 420, life: 1200, hp: 11000, mp: 6800, atk: 1500, def: 320,
    desc: '元婴出窍，神游千里。寿一千二百，已是一国之中的擎天之柱。' },
  { name: '化神期', short: '化神', phase: '神游太虚', subs: ['初期', '中期', '后期', '大圆满'],
    base: 22000, gain: 1300, life: 3000, hp: 38000, mp: 24000, atk: 5200, def: 1100,
    desc: '神念化虚，法则初窥。寿三千，纵横一界，已是传说中人。' },
  { name: '渡劫飞升', short: '渡劫', phase: '破界', subs: ['飞升'], base: 0, gain: 0, life: 99999,
    hp: 99999, mp: 99999, atk: 99999, def: 99999,
    desc: '破界而去，超脱此方天地。' },
];
const MAX_TIER = REALM_TIERS.length - 2; // 化神为可玩最高层
const SUB_CN = ['初期', '中期', '后期', '大圆满'];

/* 每次小境界突破的基础成算（受灵根、丹药、心境、暗伤影响） */
const SUB_BREAK_BASE = [0.86, 0.76, 0.68, 0.60, 0.54, 0.48, 0.42, 0.37, 0.33, 0.29, 0.26, 0.23, 0.20];
/* 每次大境界天关的基础成算 */
const TIER_BREAK_BASE = [0.62, 0.54, 0.44, 0.34, 0.26, 0.18];
/* 突破失败损失修为比例 */
const BREAK_FAIL_LOSS = 0.2;

/* ---------------- 难度 ---------------- */
const DIFFS = [
  { name: '顺遂', desc: '天意眷顾。判定易成，凶险稍减，另赐一枚还魂丹。', check: -0.08, enemy: 0.8, revive: 1 },
  { name: '寻常', desc: '修仙本艰。成算与凶险皆如常理。', check: 0, enemy: 1, revive: 0 },
  { name: '艰险', desc: '步步杀机。判定艰难，对手强悍，稍有不慎即身死道消。', check: 0.1, enemy: 1.2, revive: 0 },
];

/* ---------------- 灵根 ---------------- */
const ROOTS = [
  { id: 'tian', name: '天灵根', stars: 5, weight: 2, speed: 1.75, bb: 0.10, elem: '天', tag: '万中无一',
    desc: '单系纯净，灵气入体如百川归海。旁人苦修十载，你三月可成。只是天骄太盛，走到哪里都被人盯着。',
    mods: { exposure: 8, fame: 6, wits: 3 } },
  { id: 'lei', name: '变异雷灵根', stars: 5, weight: 3, speed: 1.42, bb: 0.06, elem: '雷', tag: '攻伐无双',
    desc: '雷光缠身，天生亲近雷霆。雷法威力大增，斗法时威势惊人，却也为正道所忌，被视作不祥。',
    mods: { exposure: 5, atk: 0.15, fame: -4 } },
  { id: 'bing', name: '变异冰灵根', stars: 5, weight: 3, speed: 1.38, bb: 0.05, elem: '冰', tag: '寒彻骨髓',
    desc: '寒气自生，心性易冷。冰系法术威力大增，道侣缘薄，于静室久坐亦不觉枯寂。',
    mods: { daoMind: -3, def: 0.12, mood: 4 } },
  { id: 'shuang', name: '双灵根', stars: 4, weight: 10, speed: 1.12, bb: 0.03, elem: null, tag: '资质上佳',
    desc: '两系相济，足以叩开大宗门墙。放在任何一处小国，都是要被人抢的弟子。',
    mods: { wits: 1 } },
  { id: 'san', name: '三灵根', stars: 3, weight: 24, speed: 0.86, bb: 0, elem: null, tag: '资质平平',
    desc: '三系驳杂，修行不进不退。可修仙一途，心性有时比灵根更重要——这话你听人说过很多次。',
    mods: {} },
  { id: 'si', name: '四灵根', stars: 2, weight: 30, speed: 0.68, bb: -0.02, elem: null, tag: '伪灵根',
    desc: '杂而不纯，世人称之为伪灵根。你从小就听惯了这句话，也从小就不服。',
    mods: { mood: 4 } },
  { id: 'wu', name: '五灵根', stars: 1, weight: 24, speed: 0.52, bb: -0.04, elem: null, tag: '五行俱全',
    desc: '五行俱全，修行奇慢，所得修为不及天灵根三成。可五行俱全，也意味着什么都能学。',
    mods: { mood: 8, exposure: -6 } },
  { id: 'wei', name: '伪灵根·五行杂驳', stars: 1, weight: 4, speed: 0.38, bb: -0.06, elem: null, tag: '修道废物',
    desc: '连五灵根都不如。测灵根的修士看了你一眼，连话都懒得多说。你偏要试一试。',
    mods: { mood: 12, exposure: -8, wits: -1 } },
];

/* ---------------- 隐藏特质（开局 1 正 1 负） ---------------- */
const TRAITS_POS = [
  { id: 'guomu', name: '过目不忘', desc: '看过的典籍、阵图过目成诵。参悟功法、研习阵道时成算大增。', mods: { wits: 2 }, eff: { learn: 0.12, alchemy: 0.05 } },
  { id: 'fuyuan', name: '福缘深厚', desc: '冥冥之中自有天意照拂。奇遇、秘境机缘出现得比旁人频繁。', mods: {}, eff: { luck: 0.14, event: 8 } },
  { id: 'yixiang', name: '身具异香', desc: '体有幽香，不施脂粉而自生。妖兽易被引来，却也易于驯服。', mods: {}, eff: { beast: 0.15, fame: 3 } },
  { id: 'baidu', name: '百毒不侵', desc: '幼时误食异草，从此诸毒难侵。毒物伤你不得，你反倒能尝毒辨药。', mods: {}, eff: { poison: 0.9, alchemy: 0.08 } },
  { id: 'lanku', name: '心志如铁', desc: '越是绝境，越是清醒。道心极难动摇，闭关走火之险大减。', mods: { daoMind: -4 }, eff: { dao: 0.5, mind: 0.1 } },
  { id: 'tiansheng', name: '天生神力', desc: '未修行时便能开三石硬弓。肉身根基极佳，近身缠斗不易吃亏。', mods: { body: 3 }, eff: { hp: 0.12, flee: 0.06 } },
  { id: 'yingu', name: '隐骨藏锋', desc: '天生不显山露水，神识探查到你时，总比实际低上一截。', mods: { exposure: -10 }, eff: { hide: 0.16 } },
  { id: 'tongling', name: '通灵之眼', desc: '能隐约看见灵气的颜色与流向，辨药材、识宝物的眼力远胜同侪。', mods: { wits: 1 }, eff: { appraise: 0.2, alchemy: 0.04 } },
  { id: 'shouze', name: '手泽温润', desc: '天生一双巧手，炼丹炼器时火候拿捏得极稳。', mods: {}, eff: { alchemy: 0.12, craft: 0.12 } },
  { id: 'xuanming', name: '玄冥之体', desc: '体质偏阴，最适合修炼阴寒属功法，于夜色中恢复更快。', mods: { exposure: -4 }, eff: { speed: 0.06, escape: 0.08 } },
  { id: 'shanbi', name: '善避凶险', desc: '对危险有种近乎野兽的直觉。遇伏、遭袭时往往能先一步察觉。', mods: {}, eff: { ambush: 0.2, flee: 0.05 } },
  { id: 'renyuan', name: '人缘极佳', desc: '天生一张讨人喜欢的脸和一张会说话的嘴。坊市、宗门里都吃得开。', mods: { fame: 4 }, eff: { credit: 12, social: 0.12 } },
];
const TRAITS_NEG = [
  { id: 'anji', name: '身有暗疾', desc: '幼年落下的病根，藏在经脉深处。修行久了便会隐隐作痛，突破成算受损。', mods: { physique: 12 }, eff: { bb: -0.05, life: -10 } },
  { id: 'zhaoxie', name: '招邪体质', desc: '阴气缠身，邪祟、鬼修、妖兽都格外容易寻到你。', mods: { exposure: 6 }, eff: { danger: 10 } },
  { id: 'loucai', name: '容易露财', desc: '藏不住东西。钱袋鼓一点、法宝亮一点，隔三条街都有人看出来。', mods: { exposure: 10, credit: -6 }, eff: { danger: 6 } },
  { id: 'shoubu', name: '寿元先天不足', desc: '娘胎里带出来的亏空，寿数比常人短上一截。', mods: { life: -20 }, eff: {} },
  { id: 'daoxin', name: '道心易乱', desc: '心思太多，杂念难消。闭关时极易走火，修炼杂功更甚。', mods: { daoMind: 10 }, eff: { dao: -0.3 } },
  { id: 'choudi', name: '命犯仇雠', desc: '不知怎的，你总是容易得罪人。开局便已有一人记恨于你。', mods: {}, eff: { enemy: 1 } },
  { id: 'jingji', name: '经脉瘀堵', desc: '两条经脉天生不畅，灵气运转总慢半拍。', mods: { speed: -0.08 }, eff: { speed: -0.08 } },
  { id: 'yinxing', name: '阴煞入体', desc: '幼时在乱葬岗待过一夜，煞气入体。伤愈极慢，暗伤积累更快。', mods: { physique: 6 }, eff: { heal: -0.2 } },
  { id: 'qiongkun', name: '出身贫寒', desc: '家里连一把像样的铁剑都没有。开局身无长物。', mods: {}, eff: { poor: 1 } },
  { id: 'chouming', name: '声名不佳', desc: '不知谁传的闲话，你走到哪里都被人指指点点。', mods: { fame: -12, credit: -8 }, eff: {} },
  { id: 'danqie', name: '生性怯懦', desc: '遇事先想退。斗法时手脚发软，逃跑时却格外利索。', mods: {}, eff: { atk: -0.08, flee: 0.1 } },
  { id: 'gudu', name: '孤星入命', desc: '亲近之人多不得善终。你渐渐不敢与谁走得太近。', mods: { mood: -8 }, eff: { bond: -0.3 } },
];

/* ---------------- 出身 ----------------
   决定：起始年龄、灵石、随身物、初始名声/秘密、宗门关系、初始位置、开局事件
--------------------------------------- */
const ORIGINS = [
  { id: 'qixuan', name: '七玄门杂役', tag: '山门之下',
    desc: '镜州青牛镇外的七玄门，一个连修仙门派都算不上的江湖门派。你在药园里做杂役，替墨大夫晒药、碾药、守炉。',
    age: 14, stones: 2, region: 'yue', place: '青牛镇',
    items: { heal: 1 }, fame: 0, exposure: 2, blood: 0, credit: 0,
    sect: '七玄门', rank: '杂役', wits: 1, body: 1, mood: 0,
    npcs: ['mojuren', 'hanye'], hook: '药香混着炉火的气味，是你对修行最初的全部印象。' },
  { id: 'yaopu', name: '凡城药铺学徒', tag: '市井烟火',
    desc: '越国边城一间小药铺的学徒。识得百草，会算斤两，也见过修士拿一株灵草换走半条街的银子。',
    age: 15, stones: 8, region: 'yue', place: '临安城',
    items: { heal: 2 }, fame: 2, exposure: -2, blood: 0, credit: 10,
    sect: null, rank: null, wits: 1, mood: 2,
    npcs: ['wangshouyi'], hook: '柜台后面挂着一排干枯的草药，风一吹就沙沙作响。' },
  { id: 'qitu', name: '小宗门弃徒', tag: '旧山门',
    desc: '你曾入过一个只有三十余人的小宗门，因灵根太差，三年后被客气地请下山。包袱里还剩半部吐纳诀和一枚旧令牌。',
    age: 17, stones: 5, region: 'yue', place: '岚州',
    items: { heal: 1, mana: 1 }, fame: -2, exposure: 0, blood: 0, credit: 0,
    sect: null, rank: null, wits: 2, mood: -4,
    npcs: ['lixiaoyao'], hook: '下山那天没人送。你回头看了一眼山门，把令牌塞进了怀里。' },
  { id: 'modao', name: '魔道旁支', tag: '血与火',
    desc: '魔道六宗之一的外围旁支，专替上头处理见不得光的事。你见过太多人死，也学会了怎么让别人先死。',
    age: 16, stones: 12, region: 'yue', place: '黑风岭',
    items: { heal: 2, poison: 1 }, fame: -14, exposure: 8, blood: 3, credit: -10,
    sect: '魔道旁支', rank: '外门', wits: 0, body: 2, mood: -6,
    npcs: ['xuehong'], hook: '蜡烛烧到一半，屋里的血腥味还没散。' },
  { id: 'liehu', name: '山野猎户', tag: '深山人家',
    desc: '黑山深处的猎户，一柄猎叉能捅穿野猪的脖子。你不识几个字，却知道山里的规矩——什么能碰，什么碰不得。',
    age: 16, stones: 1, region: 'yue', place: '黑山林',
    items: { heal: 1 }, fame: 0, exposure: -4, blood: 0, credit: 0,
    sect: null, rank: null, body: 3, wits: -1,
    npcs: ['zhangtie'], hook: '屋檐下挂着风干兽皮，弓弦上还留着上一次狩猎的血。' },
  { id: 'shuxiang', name: '书香门第', tag: '寒窗',
    desc: '祖上出过两个进士，家中藏书三千卷。你自小读的是圣贤书，却在《山海志》的夹页里翻出了一张残破的引气图。',
    age: 15, stones: 20, region: 'yue', place: '临安城',
    items: { heal: 1 }, fame: 6, exposure: -6, blood: 0, credit: 14,
    sect: null, rank: null, wits: 3, mood: 6,
    npcs: ['shenqinghe'], hook: '窗外的雨下了整夜，你对着那张引气图坐了一夜。' },
  { id: 'yizu', name: '越国遗族', tag: '旧国残影',
    desc: '越国故族的旁支后裔，家道早已中落。族里老人还留着半卷祖先从修士手里求来的功法。',
    age: 16, stones: 10, region: 'yue', place: '建州',
    items: { heal: 2, mana: 1 }, fame: 3, exposure: 0, blood: 0, credit: 6,
    sect: null, rank: null, wits: 1, spirit: 1,
    npcs: ['yueqing'], hook: '祠堂里的牌位落满灰尘，最上面那块没有名字。' },
  { id: 'liulang', name: '乱世孤儿', tag: '无根之人',
    desc: '不记得爹娘，不记得籍贯。从一个破庙走到另一个破庙，靠偷、靠抢、靠替人跑腿活到今天。',
    age: 13, stones: 3, region: 'yue', place: '青牛镇',
    items: { escape: 1 }, fame: -5, exposure: 2, blood: 1, credit: -4,
    sect: null, rank: null, wits: 0, agi: 2, mood: -6,
    npcs: ['awei'], hook: '你在破庙的泥胎后面数着铜钱，外面有人喊你的名字。' },
];

/* ---------------- 地域 ----------------
   price：各类货物在本地的价格系数；danger：遭遇强度；goods：本地特产
--------------------------------------- */
const GOODS = {
  heal: { name: '疗伤丹', kind: '丹药', base: 12, desc: '疗伤续命，行走在外必备。' },
  mana: { name: '聚灵丹', kind: '丹药', base: 22, desc: '吐纳时服下，可快速补足法力。' },
  break: { name: '破障丹', kind: '丹药', base: 120, desc: '冲击瓶颈时服下，成算大增。' },
  herb: { name: '灵药', kind: '灵药', base: 8, desc: '炼丹之本。年份越久，价钱越高。' },
  talisman: { name: '符箓', kind: '符箓', base: 18, desc: '攻、防、遁，各有用处。' },
  material: { name: '炼器材料', kind: '材料', base: 30, desc: '妖兽骨、精铁、灵木，法器之基。' },
  art: { name: '法器', kind: '法器', base: 180, desc: '一件趁手的法器，抵得上十年苦修。' },
  life: { name: '延寿灵物', kind: '奇物', base: 900, desc: '能添寿元的灵药奇珍，可遇不可求。' },
};

const REGIONS = [
  { id: 'yue', name: '越国', short: '越', danger: 1.0, price: { heal: 1, mana: 1, break: 1, herb: 0.9, talisman: 1, material: 1, art: 1, life: 1.2 },
    desc: '天南腹地的小国，七派并立，凡人城池与修士坊市错落。灵脉尚可，是许多散修起步的地方。',
    places: ['青牛镇', '镜州', '岚州', '建州', '临安城', '太南谷', '黄枫谷外', '黑山林', '嘉元城', '元武边境'] },
  { id: 'yuanwu', name: '元武国', short: '元武', danger: 1.08, price: { heal: 1.05, mana: 1.05, break: 1.1, herb: 1, talisman: 0.95, material: 1.1, art: 1.05, life: 1.15 },
    desc: '越国西邻，修真世家林立，最重血脉与门第。此地灵矿极丰，炼器之风盛行。',
    places: ['元武城', '紫金岭', '天星宗外', '铁壁坊'] },
  { id: 'zijin', name: '紫金国', short: '紫金', danger: 1.15, price: { heal: 1.1, mana: 1.1, break: 1.2, herb: 1.1, talisman: 1, material: 0.95, art: 1.1, life: 1.3 },
    desc: '多山多瘴，宗门林立却少有能镇国者。最不缺的是秘境传闻与失踪的散修。',
    places: ['金源城', '瘴雾泽', '玉田山'] },
  { id: 'tianluo', name: '天罗国', short: '天罗', danger: 1.2, price: { heal: 1.15, mana: 1.2, break: 1.25, herb: 1.05, talisman: 1.1, material: 1.05, art: 1.15, life: 1.35 },
    desc: '西陲大国，凡人国度与修士宗门杂处。边境长年有妖兽出没，马帮与修士同行。',
    places: ['天罗城', '落雁关', '万兽原'] },
  { id: 'beiliang', name: '北凉国', short: '北凉', danger: 1.3, price: { heal: 1.3, mana: 1.3, break: 1.4, herb: 1.15, talisman: 1.2, material: 1.1, art: 1.25, life: 1.5 },
    desc: '苦寒之地，正魔大战之后，北迁的六派在此重新扎根。风雪里埋着无数残破的洞府。',
    places: ['北凉城', '雪岭', '断魂谷'] },
  { id: 'luanxing', name: '乱星海', short: '乱星', danger: 1.7, price: { heal: 1.6, mana: 1.55, break: 1.8, herb: 1.4, talisman: 1.3, material: 1.5, art: 1.4, life: 2.0 },
    desc: '海外散修的天下。岛屿星罗棋布，星宫与万法门并立，杀人夺宝是这里的通行规矩。海图比功法还贵。',
    places: ['天星城', '魁星岛', '碧灵岛', '鬼雾海域', '虚天殿外'] },
  { id: 'dajin', name: '大晋', short: '晋', danger: 1.9, price: { heal: 1.5, mana: 1.5, break: 1.6, herb: 1.5, talisman: 1.4, material: 1.35, art: 1.5, life: 1.7 },
    desc: '此界第一等的修仙大国，十大宗门并立，藏龙卧虎。化神修士在此也不过是一方長老。',
    places: ['晋京', '昆吾山', '天机阁', '万丈原'] },
];
const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/* ---------------- 势力 ---------------- */
const FACTIONS = {
  yanYue: { name: '掩月宗', side: '正', power: 92, base: 92, desc: '越国第一大宗，女修为主，功法阴柔。' },
  lingShou: { name: '灵兽山', side: '正', power: 82, base: 82, desc: '御兽为道，与御灵宗渊源极深。' },
  huangFeng: { name: '黄枫谷', side: '正', power: 74, base: 74, desc: '越国老牌大宗，功法驳杂，弟子最多。' },
  qingXu: { name: '清虚门', side: '正', power: 71, base: 71, desc: '道门正宗，最重戒律。' },
  huaDao: { name: '化刀坞', side: '正', power: 70, base: 70, desc: '刀修一脉，性子最烈。' },
  tianQue: { name: '天阙堡', side: '正', power: 69, base: 69, desc: '炼体与阵法并重，守御无双。' },
  juJian: { name: '巨剑门', side: '正', power: 68, base: 68, desc: '一剑破万法，弟子皆修剑。' },
  yuLing: { name: '御灵宗', side: '魔', power: 88, base: 88, desc: '魔道六宗之首，驭使妖物。' },
  heHuan: { name: '合欢宗', side: '魔', power: 80, base: 80, desc: '双修采补之法，最善惑人心智。' },
  guiLing: { name: '鬼灵门', side: '魔', power: 78, base: 78, desc: '养鬼炼尸，行事最是诡秘。' },
  moYan: { name: '魔焰门', side: '魔', power: 74, base: 74, desc: '魔火焚天，攻伐最猛。' },
  tianSha: { name: '天煞宗', side: '魔', power: 72, base: 72, desc: '以杀证道，门人多为杀星。' },
  qianHuan: { name: '千幻宗', side: '魔', power: 70, base: 70, desc: '幻术易容，最擅渗透。' },
  sanxiu: { name: '散修', side: '散', power: 55, base: 55, desc: '无门无派，各谋生路。' },
  fangshi: { name: '坊市行会', side: '商', power: 48, base: 48, desc: '管着各坊市的买卖与规矩。' },
  xingGong: { name: '星宫', side: '海', power: 86, base: 86, desc: '乱星海第一大势力，执掌天星城。' },
  wanFa: { name: '万法门', side: '海', power: 66, base: 66, desc: '乱星海的老牌宗门，与星宫分庭抗礼。' },
};
const ZHENG_IDS = ['yanYue', 'lingShou', 'huangFeng', 'qingXu', 'huaDao', 'tianQue', 'juJian'];
const MO_IDS = ['yuLing', 'heHuan', 'guiLing', 'moYan', 'tianSha', 'qianHuan'];

/* ---------------- 时代阶段 ---------------- */
const ERAS = [
  { id: 'peace', name: '太平年月', desc: '四方无事，坊市安稳。灵药慢慢长，修士慢慢修。',
    price: 1, danger: 0.9, war: 0 },
  { id: 'tense', name: '山雨欲来', desc: '边境频频告警，各派征调弟子，坊市里开始有人囤积丹药。',
    price: 1.15, danger: 1.05, war: 0.3 },
  { id: 'war', name: '正魔战乱', desc: '战火连年。城池易主，丹药法器一日三价，散修的命比草贱。',
    price: 1.6, danger: 1.35, war: 1 },
  { id: 'scar', name: '战后残局', desc: '尸骨未寒，废墟里已经有人在翻找法宝。机缘与死人一样多。',
    price: 1.2, danger: 1.1, war: 0.5 },
  { id: 'recover', name: '休养生息', desc: '百废待兴。宗门重开山门，坊市重修，活下来的人开始分地盘。',
    price: 1.0, danger: 0.95, war: 0.15 },
];
const ERA_MAP = Object.fromEntries(ERAS.map((e) => [e.id, e]));

/* 大事件锚点：这些是原著的骨架，但时间、规模、胜负每局浮动 */
const TIMELINE_ANCHORS = {
  bloodTrial: { name: '血色试炼', desc: '七派联手开启血色禁地，以灵石与灵药换取弟子搏命采药。' },
  demonWar: { name: '魔道入侵', desc: '魔道六宗越境，七派仓促应战，越国山河一夜之间换了颜色。' },
  secretRealm: { name: '秘境开启', desc: '一处上古修士的遗府现世，散修与宗门蜂拥而入。' },
  beastTide: { name: '妖兽潮', desc: '荒原深处的妖兽成群南下，沿途村镇十室九空。' },
};

/* ---------------- 功法 ----------------
   kind: 剑/法/体/丹/器/魔；speed 修行加成；bb 突破加成
--------------------------------------- */
const TECHS = {
  changchun: { name: '长春功', kind: '法', tier: 1, speed: 0.06, bb: 0.02, hp: 0.08,
    desc: '木属性基础功法，中正平和，最宜打熬根基。韩立初入七玄门时所修者。' },
  qingyuan: { name: '青元剑诀', kind: '剑', tier: 2, speed: 0.12, bb: 0.03, atk: 0.14,
    desc: '青元剑派传承，以剑意御锋芒。剑修一脉的正统源头。' },
  dayan: { name: '大衍诀', kind: '法', tier: 2, speed: 0.08, bb: 0.06, mp: 0.15,
    desc: '推演天机之术，神识增长远胜常法。修至深处可观气运、避凶趋吉。' },
  huoyan: { name: '火炎功', kind: '法', tier: 2, speed: 0.1, bb: 0.02, atk: 0.1,
    desc: '火属性攻伐功法，性烈。炼丹者多兼修此功。' },
  tianlei: { name: '天雷正法', kind: '法', tier: 3, speed: 0.14, bb: 0.02, atk: 0.2,
    desc: '引天雷入体，攻伐无双。雷灵根修之，事半功倍。' },
  xuangui: { name: '玄龟诀', kind: '体', tier: 2, speed: 0.05, bb: 0.04, def: 0.18, hp: 0.15,
    desc: '炼体功法，以龟息之法熬炼筋骨。慢，但极稳。' },
  danding: { name: '丹鼎真解', kind: '丹', tier: 2, speed: 0.05, bb: 0.02, alchemy: 0.2,
    desc: '丹道正统，讲火候、药性、炉鼎三法。' },
  tianji: { name: '天机谱', kind: '器', tier: 2, speed: 0.04, bb: 0.02, craft: 0.2,
    desc: '炼器图谱与阵道合参，善制傀儡、法器。' },
  xuanyin: { name: '玄阴魔功', kind: '魔', tier: 2, speed: 0.18, bb: 0.04, atk: 0.16, exposure: 12,
    desc: '魔道功法，进境极快，却阴气缠身，易被正道察觉。' },
  xuelian: { name: '血炼大法', kind: '魔', tier: 3, speed: 0.24, bb: 0.05, atk: 0.24, exposure: 18,
    desc: '以血为引，以杀养功。进境快得骇人，代价是再也回不了头。' },
};

/* ---------------- 消耗品/底牌 ---------------- */
const ITEMS = {
  heal: { name: '疗伤丹', cat: 'pills', desc: '恢复四成气血。', price: 12 },
  mana: { name: '聚灵丹', cat: 'pills', desc: '恢复四成法力。', price: 22 },
  break: { name: '破障丹', cat: 'pills', desc: '突破时服下，成算 +14%。', price: 120 },
  mind: { name: '定神丹', cat: 'pills', desc: '压下心魔杂念，道心 +8。', price: 60 },
  marrow: { name: '洗髓丹', cat: 'pills', desc: '涤荡暗伤，暗伤 -20。', price: 240 },
  life: { name: '延寿丹', cat: 'pills', desc: '寿元 +10。', price: 900 },
  escape: { name: '遁地符', cat: 'talisman', desc: '斗法时必能脱身。', price: 30 },
  talAtk: { name: '火弹符', cat: 'talisman', desc: '斗法底牌：直接重创对手。', price: 45 },
  talDef: { name: '金刚符', cat: 'talisman', desc: '斗法底牌：挡下一次重击。', price: 40 },
  talThunder: { name: '雷遁符', cat: 'talisman', desc: '斗法底牌：重伤对手并脱身。', price: 160 },
  poison: { name: '腐骨毒', cat: 'talisman', desc: '斗法底牌：开局使对手中毒，攻防俱降。', price: 55 },
  puppet: { name: '傀儡', cat: 'treasure', desc: '斗法底牌：替你挡三次攻击。', price: 260 },
  array: { name: '阵盘', cat: 'treasure', desc: '斗法底牌：开战布阵，己方减伤增攻。', price: 300 },
  bottle: { name: '小瓶', cat: 'treasure', desc: '神秘小瓶，可催熟灵药。每次使用耗一年。', price: 0 },
};

/* ---------------- 原著人物（会随世界演化的 NPC 原型） ---------------- */
const CANON_NPCS = [
  { id: 'hanli', name: '韩立', realm: 1, sub: 5, region: 'yue', place: '青牛镇', side: '散',
    tag: '四灵根', temper: '谨慎', goal: '求长生', desc: '黑瘦少年，寡言，眼神却沉静得不像这个年纪。' },
  { id: 'mojuren', name: '墨居仁', realm: 1, sub: 9, region: 'yue', place: '青牛镇', side: '散',
    tag: '七玄门供奉', temper: '阴鸷', goal: '夺舍续命', desc: '七玄门的墨大夫，医术极高，看人的眼神像在看一具躯壳。' },
  { id: 'licheng', name: '李化元', realm: 2, sub: 3, region: 'yue', place: '黄枫谷', side: '正',
    tag: '黄枫谷长老', temper: '护短', goal: '为弟子讨个公道', desc: '黄枫谷筑基后期修士，一把年纪仍是个急性子。' },
  { id: 'nangong', name: '南宫婉', realm: 3, sub: 2, region: 'yue', place: '掩月宗', side: '正',
    tag: '掩月宗结丹', temper: '清冷', goal: '结婴', desc: '掩月宗女修，冷若冰霜，一柄月华剑从不轻易出鞘。' },
  { id: 'yanli', name: '严氏', realm: 3, sub: 1, region: 'yue', place: '掩月宗', side: '正',
    tag: '掩月宗长老', temper: '老辣', goal: '守住宗门', desc: '掩月宗长老，算盘打得比剑还快。' },
  { id: 'chenqiaoqian', name: '陈巧倩', realm: 1, sub: 8, region: 'yue', place: '黄枫谷', side: '正',
    tag: '黄枫谷弟子', temper: '爽利', goal: '筑基', desc: '黄枫谷女弟子，说话直来直去，剑却使得极稳。' },
  { id: 'dongxuan', name: '董萱儿', realm: 1, sub: 6, region: 'yue', place: '黄枫谷', side: '正',
    tag: '黄枫谷弟子', temper: '倨傲', goal: '进内门', desc: '生得好皮相，也生得好家世，看人时下巴总是微微抬着。' },
  { id: 'wuxuan', name: '吴炫', realm: 2, sub: 2, region: 'yue', place: '太南谷', side: '散',
    tag: '太南谷修士', temper: '市侩', goal: '攒灵石', desc: '常年混迹坊市的老散修，什么消息都能从他嘴里问出半句。' },
  { id: 'wangshouyi', name: '王守义', realm: 0, sub: 0, region: 'yue', place: '临安城', side: '凡',
    tag: '药铺掌柜', temper: '精明', goal: '把生意做下去', desc: '临安城药铺的掌柜，算盘珠子拨得比谁都快。' },
  { id: 'zhangtie', name: '张铁', realm: 0, sub: 0, region: 'yue', place: '黑山林', side: '凡',
    tag: '猎户', temper: '憨直', goal: '养家', desc: '黑山里的猎户，一双手粗糙得像树皮。' },
  { id: 'liyue', name: '厉飞雨', realm: 1, sub: 7, region: 'yue', place: '镜州', side: '散',
    tag: '刀客', temper: '狠戾', goal: '扬名', desc: '腰挎一柄窄刀的散修，笑起来牙齿很白，眼神很冷。' },
  { id: 'yuanyao', name: '元瑶', realm: 2, sub: 4, region: 'luanxing', place: '魁星岛', side: '散',
    tag: '乱星海女修', temper: '深沉', goal: '复活师姐', desc: '乱星海的女修，眉眼温婉，下手却从不容情。' },
  { id: 'ziwei', name: '紫灵', realm: 2, sub: 3, region: 'luanxing', place: '天星城', side: '散',
    tag: '妙音门', temper: '通透', goal: '撑起妙音门', desc: '妙音门门主，一身紫衣，说话总留三分余地。' },
  { id: 'wansan', name: '万三姑', realm: 3, sub: 3, region: 'luanxing', place: '鬼雾海域', side: '魔',
    tag: '鬼修', temper: '阴毒', goal: '炼成鬼婴', desc: '乱星海凶名最盛的鬼修之一，所过之处寸草不生。' },
  { id: 'lingyuling', name: '凌玉灵', realm: 2, sub: 1, region: 'luanxing', place: '天星城', side: '海',
    tag: '星宫', temper: '端方', goal: '继任星宫', desc: '星宫嫡传，行事有板有眼，眼里揉不得沙子。' },
  { id: 'xiangzhili', name: '向之礼', realm: 4, sub: 0, region: 'dajin', place: '昆吾山', side: '正',
    tag: '化神修士', temper: '淡泊', goal: '寻飞升之路', desc: '大晋化神修士，一副寻常老者模样，眼里却有山河。' },
  { id: 'chelao', name: '车老妖', realm: 4, sub: 1, region: 'dajin', place: '万丈原', side: '魔',
    tag: '万妖谷主', temper: '狂放', goal: '统御万妖', desc: '万妖谷的老妖，笑起来整个山谷都在抖。' },
  { id: 'xuanti', name: '玄天', realm: 3, sub: 3, region: 'dajin', place: '天机阁', side: '正',
    tag: '天机阁主', temper: '莫测', goal: '推演天机', desc: '天机阁主人，据说能算出三百年后的雨。' },
];

/* 生成散修用的名字库 */
const SURNAMES = ['林', '沈', '顾', '苏', '陆', '谢', '裴', '温', '江', '柳', '楚', '燕', '秦', '卫', '卓', '石',
  '田', '钟', '霍', '常', '雷', '米', '洪', '蓝', '尹', '苗', '何', '游', '戚', '乐', '席', '季'];
const GIVEN = ['清和', '照野', '青崖', '长风', '未晚', '知寒', '白露', '怀瑾', '听雪', '无咎', '望舒', '扶光',
  '行舟', '渡舟', '石川', '云生', '子墨', '重山', '问津', '归远', '疏影', '寒山', '孤云', '南星',
  '弘文', '伯阳', '季札', '子期', '仲卿', '叔夜', '元亮', '景行', '守拙', '抱朴', '含章', '若谷'];
const NPC_TAGS = ['散修', '游方道人', '落魄书生', '刀客', '剑修', '药贩', '阵师', '炼器匠', '猎妖人', '采药人'];
const NPC_GOALS = ['攒灵石筑基', '寻杀兄仇人', '找一部残卷', '寻一处洞府闭关', '闯秘境搏一场富贵',
  '投靠大宗门', '替师门报仇', '寻一味千年灵药', '赎回被夺的法器', '查明师父死因'];
const NPC_TEMPERS = ['谨慎', '爽直', '阴沉', '市侩', '狂妄', '多疑', '憨厚', '狠戾', '寡言', '油滑'];
const NPC_DESC = ['一身洗得发白的青袍，袖口磨出了毛边。', '满脸风霜，腰间挂着三只鼓囊囊的储物袋。',
  '眉眼生得极好，只是眼底总有一层倦色。', '缺了半只耳朵，说话时总下意识侧过头。',
  '背上背着一柄用布条缠死的长条物事。', '瘦得像根竹竿，笑起来露出一口黄牙。'];

/* ---------------- 开局事件（身世钩子，不进随机池） ---------------- */
const PROLOGUES = {
  qixuan: '青牛镇外三十里，七玄门的山门在半山腰上。你不是弟子，只是药园里的杂役。墨大夫说，晒药的人要识得药性，便丢了一本《草药纲目》给你。你翻到第七页时，发现夹层里有一张引气图。',
  yaopu: '临安城的雨下了三天。药铺里没什么客人，你趴在柜台上看那本翻烂了的《百草谱》。门帘一响，进来一个浑身湿透的修士，把一株通体发青的灵草拍在柜上，说要换十块灵石。掌柜的手在抖。',
  qitu: '下山已经三个月了。你在岚州的破庙里住着，白天帮人写信，夜里照着那半部吐纳诀打坐。什么都没有发生。可你还是每晚都坐。',
  modao: '黑风岭的夜总是红的。上头的人叫你处理一具尸体，你处理完了，在尸体的储物袋里摸到一本没有封皮的册子。翻开第一页，是一行血字：玄阴入体，百脉逆行。',
  liehu: '黑山的雪来得早。你追一头受伤的獐子追到了山阴，獐子没找着，倒在一处塌了半边的山洞里，看见一具盘膝坐着的枯骨。枯骨面前摆着一只石匣。',
  shuxiang: '临安城沈家，三代书香。你在藏书楼最里层的《山海志》夹页里，翻出了一张薄如蝉翼的绢图。图上画着一条蛇行般的气脉走向，旁边蝇头小楷批着四个字：引气入体。',
  yizu: '建州越氏，早已不是当年的越氏。祠堂里最上面那块无字牌位，族老说那是先祖。先祖留下半卷功法，说等一个「有缘的后人」。昨夜，那半卷功法自己发出了光。',
  liulang: '青牛镇的破庙里，你数完了今天的铜钱，一共七枚。泥胎后面睡着个老乞丐，半夜忽然坐起来，盯着你看了很久，说：你这娃儿，眼里有灵光。',
};

/* 传承/机缘类法宝（可在事件中获得） ---------------- */
const TREASURES = {
  qingzhufeng: { name: '青竹蜂云剑', desc: '以青竹为骨、蜂云为锋的本命飞剑，可分化万千。', atk: 0.25 },
  zhangtian: { name: '掌天瓶', desc: '能催熟灵药的神秘小瓶，瓶身古朴，无人识得其来历。', life: 0 },
  yanyue: { name: '月华剑', desc: '掩月宗传承之宝，剑身如月华流转。', atk: 0.2 },
  wulei: { name: '五雷轰顶符', desc: '一次性大威力符箓，可伤结丹。', atk: 0.3 },
  xuanwu: { name: '玄龟甲', desc: '上古玄龟蜕下的甲片，防御惊人。', def: 0.3 },
  lingmu: { name: '万年灵木心', desc: '一段生机盎然的木心，可续寿元。', life: 30 },
};

/* 结局阈值 */
const ROUTES = {
  changsheng: { name: '苟道长生', desc: '不争一时之长短，只求一世的安稳。藏锋、换名、换洞府，把底牌压到最后一刻。' },
  caifa: { name: '坊市财阀', desc: '灵石是这世上最实在的东西。低买高卖，囤货居奇，黑白两道都要给你几分薄面。' },
  quanshu: { name: '宗门权斗', desc: '山门之内，比山门之外更险。抱对了大腿，站对了队，资源自然滚滚而来。' },
  liesha: { name: '魔道猎杀', desc: '杀人夺宝，以战养战。血债堆得越高，路走得越快，也越窄。' },
  zongshi: { name: '丹器宗师', desc: '一炉丹，一柄器，换尽天下资源。不靠刀剑，靠的是别人离不开你。' },
};






