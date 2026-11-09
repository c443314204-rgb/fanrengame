'use strict';
/* =============================================================
   世界层：独立推演，玩家不干预也会自己变
   时代阶段 / 区域行情 / 势力消长 / 公共事件 / 大事件浮动
   ============================================================= */

function newWorld() {
  /* 大事件锚点每局浮动：原著骨架 + 随机扰动 */
  const bloodTrial = rndInt(6, 12);
  const demonWar = bloodTrial + rndInt(5, 11);
  const secretRealm = rndInt(14, 26);
  const beastTide = rndInt(10, 30);
  const powers = {};
  for (const id in FACTIONS) powers[id] = FACTIONS[id].base;
  /* 每局的初始势力格局也略有不同 */
  for (const id of ZHENG_IDS) powers[id] += rndInt(-6, 6);
  for (const id of MO_IDS) powers[id] += rndInt(-6, 6);
  powers.sanxiu += rndInt(-8, 8);
  powers.fangshi += rndInt(-6, 6);

  const prices = {};
  for (const r of REGIONS) {
    prices[r.id] = {};
    for (const g in GOODS) prices[r.id][g] = 1;
  }

  return {
    year: 1,
    era: 'peace',
    eraYears: 0,
    timeline: {
      bloodTrial: { at: bloodTrial, done: false, name: '血色试炼' },
      demonWar: { at: demonWar, done: false, name: '魔道入侵' },
      secretRealm: { at: secretRealm, done: false, name: '秘境现世' },
      beastTide: { at: beastTide, done: false, name: '妖兽潮' },
    },
    warLeft: 0,
    scarLeft: 0,
    powers,
    relations: {
      zhengmo: 0,      // 正魔关系：负=敌对
      sanxiu: 30,
      fangshi: 20,
    },
    prices,
    news: [],
    publicEvent: null,
    ritual: 0,
    log: [],            // 世界大事记
    lastFactionShift: {},
  };
}

/* ---------------- 价格 ---------------- */
function priceOf(good, regionId) {
  const reg = REGION_MAP[regionId] || REGION_MAP.yue;
  const era = ERA_MAP[W.era] || ERAS[0];
  let p = reg.price[good] != null ? reg.price[good] : 1;
  p *= W.prices[regionId] && W.prices[regionId][good] != null ? W.prices[regionId][good] : 1;
  p *= era.price;
  /* 战乱时丹药、符箓、法器涨得最凶 */
  if (W.era === 'war' && (good === 'heal' || good === 'mana' || good === 'talisman')) p *= 1.25;
  if (W.era === 'recover' && good === 'material') p *= 0.85;
  if (good === 'life') p *= 1 + (S ? Math.max(0, (S.age - 60) / 200) : 0);
  return Math.max(0.3, p);
}
function buyPrice(good, regionId) {
  const base = GOODS[good].base * priceOf(good, regionId);
  /* 坊市信誉影响：高了拿进货价，低了被坐地起价 */
  const credit = S ? S.hidden.credit : 0;
  let mult = 1 - clamp(credit / 400, -0.25, 0.2);
  if (S && S.hidden.exposure > 60) mult *= 1.15;
  if (S && S.hidden.fame < -30) mult *= 1.12;
  return Math.max(1, Math.round(base * mult));
}
function sellPrice(good, regionId) {
  return Math.max(1, Math.round(buyPrice(good, regionId) * 0.62));
}
function lifeFactor() {
  return S ? clamp(1 + Math.max(0, S.age - 60) / 300, 1, 1.6) : 1;
}

/* ---------------- 势力消长 ---------------- */
function factionPowerName(p) {
  if (p >= 95) return '如日中天';
  if (p >= 80) return '强盛';
  if (p >= 65) return '安稳';
  if (p >= 50) return '式微';
  if (p >= 35) return '残破';
  return '名存实亡';
}
function factionDrift() {
  const shift = {};
  const war = ERA_MAP[W.era].war;
  for (const id of ZHENG_IDS) {
    /* 战乱中正道损耗；掩月宗底子厚，掉得慢 */
    let d = rnd(-1.6, 1.2) - war * (id === 'yanYue' ? 0.8 : 1.5);
    if (W.era === 'recover') d += 1.4;
    shift[id] = d;
    W.powers[id] = clamp(W.powers[id] + d, 8, 100);
  }
  for (const id of MO_IDS) {
    let d = rnd(-1.4, 1.6) + war * 1.1;
    if (W.era === 'recover') d -= 0.9;
    shift[id] = d;
    W.powers[id] = clamp(W.powers[id] + d, 10, 100);
  }
  W.powers.sanxiu = clamp(W.powers.sanxiu + rnd(-1.5, 1.5) - war * 0.8, 10, 100);
  W.powers.fangshi = clamp(W.powers.fangshi + rnd(-1, 1) + (W.era === 'recover' ? 1 : 0), 10, 100);
  W.powers.xingGong = clamp(W.powers.xingGong + rnd(-1, 1), 40, 100);
  W.powers.wanFa = clamp(W.powers.wanFa + rnd(-1, 1), 30, 100);

  const zheng = sum(ZHENG_IDS.map((i) => W.powers[i])) / ZHENG_IDS.length;
  const mo = sum(MO_IDS.map((i) => W.powers[i])) / MO_IDS.length;
  W.relations.zhengmo = Math.round(mo - zheng);
  W.lastFactionShift = shift;

  /* 记录最显著的位移 */
  const entries = Object.entries(shift).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top = entries[0];
  if (top && Math.abs(top[1]) > 1.4) {
    const f = FACTIONS[top[0]];
    worldLog(`${f.name}${top[1] > 0 ? '声势渐盛' : '元气有损'}（${factionPowerName(W.powers[top[0]])}）。`);
  }
}

/* ---------------- 区域行情波动 ---------------- */
function priceDrift() {
  const era = ERA_MAP[W.era];
  for (const r of REGIONS) {
    const row = W.prices[r.id];
    for (const g in GOODS) {
      let target = 1 + rnd(-0.12, 0.12);
      if (W.era === 'war') target *= g === 'herb' ? 0.95 : rnd(1.25, 1.9);
      if (W.era === 'tense') target *= rnd(1.05, 1.3);
      if (W.era === 'recover') target *= rnd(0.9, 1.08);
      /* 妖兽潮与秘境会短时拉高某些货品 */
      if (W.publicEvent && W.publicEvent.id === 'beastTide') target *= (g === 'material' ? 1.4 : 1.05);
      if (W.publicEvent && W.publicEvent.id === 'secretRealm') target *= (g === 'talisman' ? 1.35 : 1.05);
      row[g] = clamp(row[g] * 0.55 + target * 0.45, 0.5, 2.6);
    }
  }
}

/* ---------------- 时代推进 ---------------- */
function eraTick() {
  W.eraYears += 1;
  const era = ERA_MAP[W.era];
  const tl = W.timeline;

  if (W.era === 'peace' && W.year >= tl.demonWar.at - 3) {
    setEra('tense', '边境传来消息：魔道六宗在越国之外集结。');
  }
  if (W.era === 'tense' && W.year >= tl.demonWar.at) {
    setEra('war', '魔道六宗越境。七派仓促应战，血色染红了越国的半边天。');
    W.warLeft = rndInt(6, 12);
    tl.demonWar.done = true;
    worldLog('魔道入侵爆发。越国七派与魔道六宗全面开战。');
  }
  if (W.era === 'war') {
    W.warLeft -= 1;
    if (W.warLeft <= 0) {
      const zheng = sum(ZHENG_IDS.map((i) => W.powers[i])) / 7;
      const mo = sum(MO_IDS.map((i) => W.powers[i])) / 6;
      if (mo > zheng * 1.15) {
        setEra('scar', '七派败退，北迁北凉。越国境内，魔道宗门换了山门匾额。');
        worldLog('正魔大战落幕：魔道胜。越国七派北迁北凉国。');
        W.relations.zhengmo = -40;
      } else if (zheng > mo * 1.1) {
        setEra('recover', '魔道退去。七派在废墟上重立山门，只是死的人再也回不来了。');
        worldLog('正魔大战落幕：正道胜。魔道六宗退回境外。');
        W.relations.zhengmo = -15;
      } else {
        setEra('scar', '两败俱伤。越国十室九空，散修成了这片土地上唯一还在活动的人。');
        worldLog('正魔大战落幕：两败俱伤。');
        W.relations.zhengmo = -25;
      }
      W.scarLeft = rndInt(3, 6);
    }
  }
  if ((W.era === 'scar' || W.era === 'recover') && W.eraYears > (W.scarLeft || 4)) {
    /* 战后自愈：正道慢慢回血，或魔道扎根 */
    for (const id of ZHENG_IDS) W.powers[id] = clamp(W.powers[id] + rnd(0, 2), 8, 100);
    if (W.era === 'scar') setEra('recover', '战火熄了几年，废墟上开始有人重新开张。');
    else if (rnd() < 0.5) setEra('peace', '太平年月又回来了。只是没人再提当年的事。');
  }
}

function setEra(id, text) {
  if (W.era === id) return;
  W.era = id;
  W.eraYears = 0;
  if (text) worldLog(text);
}

/* ---------------- 公共事件 ---------------- */
const PUBLIC_EVENTS = [
  { id: 'beastTide', name: '妖兽潮', weight: (era) => (era === 'war' ? 6 : era === 'peace' ? 4 : 8) },
  { id: 'alchemyMeet', name: '丹道大会', weight: (era) => (era === 'war' ? 2 : 5) },
  { id: 'secretRealm', name: '秘境开启', weight: (era) => (era === 'war' ? 3 : 5) },
  { id: 'sectRecruit', name: '宗门招新', weight: (era) => (era === 'war' ? 2 : 6) },
  { id: 'patrol', name: '正道巡查', weight: (era) => (era === 'war' ? 9 : 4) },
  { id: 'auction', name: '大型拍卖会', weight: (era) => (era === 'war' ? 3 : 6) },
  { id: 'plague', name: '凡俗疫病', weight: (era) => (era === 'war' ? 6 : 2) },
  { id: 'evilTide', name: '阴煞作祟', weight: (era) => (era === 'war' ? 5 : 2) },
];

function publicEventTick() {
  const era = W.era;
  if (W.publicEvent) {
    W.publicEvent.left -= 1;
    if (W.publicEvent.left > 0) return;
    W.publicEvent = null;
  }
  /* 约每 4 年一次公共事件，战乱时更频繁 */
  const p = era === 'war' ? 0.42 : era === 'tense' ? 0.34 : 0.26;
  if (!chance(p)) return;
  const w = PUBLIC_EVENTS.map((e) => ({ e, w: e.weight(era) }));
  const picked = weightedPick(w);
  if (!picked) return;
  const e = picked.e;
  W.publicEvent = { id: e.id, name: e.name, year: W.year, left: rndInt(1, 3) };
  worldLog(publicEventText(e.id));
}
function publicEventText(id) {
  switch (id) {
    case 'beastTide': return '荒原深处妖兽成群南下，沿途村镇十室九空，猎妖人与散修蜂拥而至。';
    case 'alchemyMeet': return '丹道大会召开，四方丹师携丹方赴会，药市一时火爆。';
    case 'secretRealm': return '有人在深山中寻到一处上古遗府，入口只开数月。';
    case 'sectRecruit': return '七派大开山门，广招弟子。凡城之中，处处可见测灵根的修士。';
    case 'patrol': return '正道联盟遣巡查使下山，缉拿魔修与邪祟，坊市盘查极严。';
    case 'auction': return '附近最大的一处坊市要办拍卖会，据说压轴之物来头不小。';
    case 'plague': return '凡俗城池起了瘟疫，药价飞涨，修士避之不及。';
    case 'evilTide': return '阴煞之气自地脉涌出，夜半常有鬼哭，鬼修频频出没。';
    default: return '';
  }
}

/* ---------------- 年度简报 ---------------- */
function makeBriefing() {
  const era = ERA_MAP[W.era];
  const reg = REGION_MAP[S.region];
  const bits = [];

  bits.push(`<b>${era.name}</b> · 第${W.year}年`);

  if (W.publicEvent) bits.push(`今年${W.publicEvent.name}，${publicEventText(W.publicEvent.id)}`);

  /* 行情 */
  const rows = ['heal', 'mana', 'break', 'herb', 'talisman', 'material'];
  const moves = [];
  for (const g of rows) {
    const p = priceOf(g, S.region);
    if (p >= 1.35) moves.push(`${GOODS[g].name}涨至${(p * 100).toFixed(0)}成`);
    else if (p <= 0.75) moves.push(`${GOODS[g].name}跌至${(p * 100).toFixed(0)}成`);
  }
  if (moves.length) bits.push(`${reg.name}坊市：` + moves.join('，') + '。');

  /* 势力 */
  const zheng = sum(ZHENG_IDS.map((i) => W.powers[i])) / 7;
  const mo = sum(MO_IDS.map((i) => W.powers[i])) / 6;
  if (W.era === 'war') bits.push(zheng > mo ? '战局胶着，正道勉强支撑。' : '魔道节节推进，正道退守。');
  else if (W.era === 'tense') bits.push('山雨欲来，各派都在暗中调兵。');
  else if (W.era === 'scar') bits.push('大战刚歇，废墟里还有人在翻找东西。');

  /* 仇家 */
  const hunters = Object.entries(S.hidden.enemyWeight).filter(([, v]) => v >= 20);
  if (hunters.length) {
    const npc = npcById(hunters.sort((a, b) => b[1] - a[1])[0][0]);
    if (npc) bits.push(`<span class="warn">${npc.name}似乎还在寻你的下落。</span>`);
  }
  if (S.hidden.exposure >= 70) bits.push('<span class="warn">你身上的东西，已经藏不太住了。</span>');

  return bits.join('　');
}

function worldLog(text) {
  W.log.unshift({ year: W.year, text });
  if (W.log.length > 120) W.log.length = 120;
  W.news.unshift({ year: W.year, text });
  if (W.news.length > 40) W.news.length = 40;
}
