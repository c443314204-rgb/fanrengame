'use strict';
/* =============================================================
   玩家层：明面面板 + 隐藏因果属性
   ============================================================= */

let S = null;   // 玩家
let W = null;   // 世界

/* ---------------- 开局 ---------------- */
function makePlayer(opts) {
  const origin = ORIGINS.find((o) => o.id === opts.origin);
  const root = ROOTS.find((r) => r.id === opts.root);
  const p = {
    seed: SEED,
    name: opts.name || '无名',
    origin: origin.id,
    root: root.id,
    age: origin.age,
    life: 100,
    tier: 0,
    sub: 0,
    progress: 0,
    wits: 4 + (origin.wits || 0) + (root.mods.wits || 0),
    body: 4 + (origin.body || 0),
    agi: 4 + (origin.agi || 0),
    spirit: 4 + (origin.spirit || 0),
    mood: clamp(58 + (root.mods.mood || 0) + (origin.mood || 0), 10, 100),
    stones: origin.stones,
    hp: 0, mp: 0,
    items: {},
    arts: [],
    tech: null,
    manual: null,
    sect: origin.sect || null,
    rank: origin.rank || null,
    contrib: 0,
    region: origin.region,
    place: origin.place,
    hidden: {
      fame: origin.fame || 0,
      exposure: origin.exposure || 0,
      bloodDebt: origin.blood || 0,
      credit: origin.credit || 0,
      heat: 0,
      physique: 0,
      daoMind: 0,
      enemyWeight: {},
    },
    traits: { pos: opts.traitPos, neg: opts.traitNeg },
    routes: { changsheng: 0, caifa: 0, quanshu: 0, liesha: 0, zongshi: 0 },
    stats: { turns: 0, kills: 0, rob: 0, breakthroughs: 0, fails: 0, trade: 0, crafted: 0, quests: 0, disaster: 0 },
    flags: {},
    history: [],       // 逐年大事
    lastAction: null,
    muted: {},
    pending: 0,
    over: null,
    overText: '',
    curAction: null,
    battle: null,
    deathGuard: false,
    learned: [],
  };

  /* 特质即时修正 */
  applyTraitMods(p, opts.traitPos);
  applyTraitMods(p, opts.traitNeg);
  for (const k in origin.items) p.items[k] = origin.items[k];
  if (p.traits.neg === 'qiongkun') p.stones = 0;
  if (p.traits.neg === 'choudi') {
    /* 开局即有一人记恨 */
    const first = pick(CANON_NPCS.filter((n) => n.side === '魔' || n.side === '散'));
    p.hidden.enemyWeight[first.id] = 25;
  }
  /* 寿元：基础 100，负面特质可扣 */
  p.lifeBase = 100 + (p.traitLife || 0);
  p.lifeBonus = 0;
  p.life = p.lifeBase;
  refillVitals(p);
  return p;
}

function applyTraitMods(p, traitId) {
  const t = findTrait(traitId);
  if (!t) return;
  const m = t.mods || {};
  if (m.wits) p.wits += m.wits;
  if (m.body) p.body += m.body;
  if (m.agi) p.agi += m.agi;
  if (m.spirit) p.spirit += m.spirit;
  if (m.mood) p.mood = clamp(p.mood + m.mood, 5, 100);
  if (m.exposure) p.hidden.exposure += m.exposure;
  if (m.fame) p.hidden.fame += m.fame;
  if (m.credit) p.hidden.credit += m.credit;
  if (m.physique) p.hidden.physique += m.physique;
  if (m.daoMind) p.hidden.daoMind += m.daoMind;
  if (m.speed) p.traitSpeed = (p.traitSpeed || 0) + m.speed;
  if (m.life) p.traitLife = (p.traitLife || 0) + m.life;
}
function findTrait(id) {
  if (!id) return null;
  return TRAITS_POS.find((t) => t.id === id) || TRAITS_NEG.find((t) => t.id === id) || null;
}
function traitEff(key) {
  if (!S) return 0;
  let v = 0;
  for (const t of [findTrait(S.traits.pos), findTrait(S.traits.neg)]) {
    if (t && t.eff && t.eff[key] != null) v += t.eff[key];
  }
  return v;
}
function hasNegTrait(id) { return S && S.traits.neg === id; }
function hasPosTrait(id) { return S && S.traits.pos === id; }

/* ---------------- 境界与基础数值 ---------------- */
function tier() { return REALM_TIERS[S.tier]; }
function realmLabel(t = S.tier, sub = S.sub) {
  const R = REALM_TIERS[t];
  if (t === 0) return '凡人';
  if (t >= MAX_TIER + 1) return R.name;
  const i = Math.min(sub, R.subs.length - 1);
  return R.name + R.subs[i];
}
function maxHp() {
  const R = tier();
  let v = R.hp * (1 + (S.tech ? TECHS[S.tech].hp || 0 : 0)) * (1 + (traitEff('hp') || 0));
  v *= 1 + (S.sub / Math.max(1, tier().subs.length)) * 0.12;
  return Math.round(v);
}
function maxMp() {
  const R = tier();
  let v = R.mp * (1 + (S.tech ? TECHS[S.tech].mp || 0 : 0));
  v *= 1 + (S.sub / Math.max(1, tier().subs.length)) * 0.15;
  return Math.round(v);
}
function refillVitals(p) {
  p = p || S;
  p.hp = Math.round(REALM_TIERS[p.tier].hp * (1 + (p.tech ? TECHS[p.tech].hp || 0 : 0)));
  p.mp = Math.round(REALM_TIERS[p.tier].mp * (1 + (p.tech ? TECHS[p.tech].mp || 0 : 0)));
}
/* 供开局使用（此时 S 尚未赋值） */
function maxHpFor(p) {
  const R = REALM_TIERS[p.tier];
  return Math.round(R.hp * (1 + (p.tech ? TECHS[p.tech].hp || 0 : 0)));
}
function maxMpFor(p) {
  const R = REALM_TIERS[p.tier];
  return Math.round(R.mp * (1 + (p.tech ? TECHS[p.tech].mp || 0 : 0)));
}

function addHp(n) {
  S.hp = clamp(S.hp + n, 0, maxHp());
  if (S.hp <= 0) die('气血耗尽，倒在了无人知晓的地方。');
}
function addMp(n) { S.mp = clamp(S.mp + n, 0, maxMp()); }
function addLife(n) {
  if (!S) return;
  if (n > 0) {
    S.lifeBonus = (S.lifeBonus || 0) + n;
    S.life += n;
  } else {
    S.life = Math.max(S.age + 1, S.life + n);
  }
  if (n !== 0) toast(n > 0 ? `寿元 +${n} 年` : `寿元 ${n} 年`, n > 0 ? 'up' : 'down');
}

/* 突破大境界：寿元上限刷新为新的境界寿数，并保留丹药带来的增益 */
function refreshLifespan() {
  S.lifeBase = Math.max(S.lifeBase || 100, tier().life);
  S.life = S.lifeBase + (S.lifeBonus || 0);
}
function addStones(n) {
  S.stones = Math.max(0, Math.round(S.stones + n));
}
function addItem(id, n = 1) {
  S.items[id] = (S.items[id] || 0) + n;
  if (S.items[id] <= 0) delete S.items[id];
}
function itemCount(id) { return S.items[id] || 0; }
function addMood(n) { S.mood = clamp(S.mood + n, 0, 100); }
function addHidden(k, n) {
  S.hidden[k] = clamp((S.hidden[k] || 0) + n, -999, 999);
}
function addEnemy(npcId, n) {
  if (!npcId) return;
  S.hidden.enemyWeight[npcId] = clamp((S.hidden.enemyWeight[npcId] || 0) + n, 0, 999);
}
function addExposure(n) { addHidden('exposure', n); }
function addFame(n) { addHidden('fame', n); }
function addBlood(n) { S.hidden.bloodDebt = Math.max(0, S.hidden.bloodDebt + n); }
function addDao(n) { S.hidden.daoMind = clamp(S.hidden.daoMind + n, 0, 100); }
function addPhysique(n) { S.hidden.physique = clamp(S.hidden.physique + n, 0, 100); }
function addRoute(route, n) {
  if (!S.routes[route]) S.routes[route] = 0;
  S.routes[route] += n;
}

/* ---------------- 判定 ----------------
   所有事件里的「成算」都走这里：难度、心境、悟性、暗伤、道心共同修正
--------------------------------------- */
function chk(p) {
  if (!S) return chance(p);
  const diff = (DIFFS[S.diff] || DIFFS[1]).check;
  const moodMod = (S.mood - 50) / 100 * 0.08;
  const witsMod = clamp((S.wits - 5) * 0.008, -0.04, 0.08);
  const physiqueMod = -S.hidden.physique / 500;
  const daoMod = -S.hidden.daoMind / 600;
  return chance(clamp(p - diff + moodMod + witsMod + physiqueMod + daoMod, 0.02, 0.97));
}

/* ---------------- 修行速度 ---------------- */
function rootInfo() { return ROOTS.find((r) => r.id === S.root); }
function cultSpeed() {
  const root = rootInfo();
  let v = root.speed;
  v += S.tech ? TECHS[S.tech].speed : 0;
  v += traitEff('speed');
  /* 心境 */
  v *= 0.7 + (S.mood / 100) * 0.6;
  /* 暗伤折损 */
  v *= 1 - S.hidden.physique / 420;
  /* 年岁渐长，气血衰败 */
  if (S.age > 80) v *= clamp(1 - (S.age - 80) / 500, 0.5, 1);
  return clamp(v, 0.15, 2.4);
}
/* 一年专修可得修行量 */
function yearGain() {
  const R = tier();
  return R.base * 0.72 * cultSpeed();
}
function defaultSeclusion() { return [1, 3, 6, 15, 30, 60][S.tier] || 3; }
function needForSub() {
  const R = tier();
  if (!R.base) return Infinity;
  return R.base * (1 + S.sub * 0.12);
}

/* ---------------- 突破 ---------------- */
function breakthroughChance(kind) {
  let base;
  if (kind === 'tier') base = TIER_BREAK_BASE[S.tier] || 0.15;
  else base = SUB_BREAK_BASE[Math.min(S.sub, SUB_BREAK_BASE.length - 1)] || 0.12;
  base += rootInfo().bb;
  base += S.tech ? TECHS[S.tech].bb : 0;
  base -= Math.min(0.18, S.hidden.physique / 420);
  base += (S.mood - 50) / 500;
  base -= Math.min(0.12, S.hidden.daoMind / 900);
  base += (S.wits - 5) * 0.012;
  if (itemCount('break') > 0) base += 0.14;
  if (hasPosTrait('lanku')) base += 0.05;
  if (hasNegTrait('daoxin')) base -= 0.04;
  if (hasNegTrait('anji')) base -= 0.04;
  if (S.diff != null && DIFFS[S.diff]) base += DIFFS[S.diff].check;
  return clamp(base, 0.05, 0.95);
}

function tryBreakthrough(kind) {
  const ch = breakthroughChance(kind);
  const usePill = itemCount('break') > 0;
  if (usePill) addItem('break', -1);
  const ok = chance(ch);
  if (ok) {
    S.stats.breakthroughs++;
    if (kind === 'tier') {
      S.tier += 1;
      S.sub = 0;
      S.progress = 0;
      refreshLifespan();
      refillVitals();
      addRoute('changsheng', 6);
      addExposure(6 + S.tier * 3);
      return { ok: true, kind, chance: ch, text: tierBreakText() };
    }
    const need = needForSub();
    S.sub += 1;
    S.progress = Math.max(0, S.progress - need * (0.82 + rnd(0, 0.36)));
    if (S.sub >= tier().subs.length - 1) {
      /* 到本境界大圆满，下一步就是天关 */
      S.sub = tier().subs.length - 1;
    }
    refillVitals();
    addLife(Math.max(2, Math.round(tier().life * 0.02)));
    return { ok: true, kind, chance: ch, text: subBreakText() };
  }
  S.stats.fails++;
  S.progress = Math.round(S.progress * (1 - BREAK_FAIL_LOSS));
  addMood(-6);
  addPhysique(3);
  addDao(2);
  /* 冲关失败可能受伤 */
  if (chance(0.3)) addHp(-Math.round(maxHp() * 0.15));
  return { ok: false, kind, chance: ch, text: failBreakText() };
}

function tierBreakText() {
  const t = S.tier;
  const names = {
    1: '一股温热的灵气自丹田涌起，顺着经脉流遍四肢百骸。你听见自己骨节里传来细密的响声——引气入体，成了。',
    2: '丹田中的灵气忽然塌陷、收缩，再猛然炸开。一团温润的道基在气海深处缓缓凝成，你睁开眼时，天地好像比昨日更清楚了一层。',
    3: '真元如浆，在丹田里一圈圈压缩、旋转。不知过了多少个日夜，那团气忽然「叮」的一声——一枚浑圆的金丹悬在气海中央，映得满室生辉。',
    4: '金丹裂开一道缝。你几乎是咬着牙，把十年苦修的真元全部灌了进去。裂缝里伸出一只小小的、与你一般模样的手——元婴成了。',
    5: '元神出窍的那一刻，你看见了自己的身体盘坐在蒲团上。山川在你脚下，云海在你掌中。化神，原来是这样一种孤单。',
  };
  return names[t] || '境界又进了一层。';
}
function subBreakText() {
  return say(
    '这一次没有惊动任何人。你在蒲团上睁开眼，只觉得体内灵气又厚实了几分。',
    '瓶颈松动了。像是堵了很久的沟渠忽然被水冲开，灵气在经脉里流得顺畅起来。',
    '你在洞府里静坐了不知多久，再起身时，骨头都在响。修为，又进了一层。'
  );
}
function failBreakText() {
  return say(
    '灵气行到一半，忽然散了。你喷出一口血，扶着石壁缓了很久。',
    '那层瓶颈纹丝不动。你再冲一次，经脉里传来针扎似的疼，只好收功。',
    '心口一闷，真元倒卷。你强行压下翻腾的气血，知道这一次又白费了。'
  );
}

/* ---------------- 死亡 / 结局 ---------------- */
function die(text) {
  if (!S || S.over) return;
  S.over = 'die';
  S.overText = text;
  gameOver();
}
function ascend() {
  if (!S || S.over) return;
  S.over = 'ascend';
  S.overText = '灵界之门在你面前打开。你回头看了一眼这片天地——山、河、人与妖，都小得像一场梦。\n然后你一步跨了进去。';
}

/* 路线评分：行为自动定义道途 */
function routeTop() {
  let best = null, bv = -1;
  for (const k in ROUTES) {
    const v = S.routes[k] || 0;
    if (v > bv) { bv = v; best = k; }
  }
  return { id: best, score: bv };
}
function routeLabel() {
  const t = routeTop();
  if (t.score < 12) return '未定之途';
  return ROUTES[t.id].name;
}

/* ---------------- 面板描述 ---------------- */
function fameLabel() {
  const f = S.hidden.fame;
  if (f >= 90) return '名动一方';
  if (f >= 50) return '小有名气';
  if (f >= 20) return '略有薄名';
  if (f > -20) return '籍籍无名';
  if (f > -50) return '风评不佳';
  if (f > -90) return '恶名昭彰';
  return '人人得而诛之';
}
function exposureLabel() {
  const e = S.hidden.exposure;
  if (e >= 85) return '如怀璧行于市';
  if (e >= 60) return '已有人盯上你';
  if (e >= 35) return '底细渐露';
  if (e >= 15) return '尚可遮掩';
  return '深藏不露';
}
function bloodLabel() {
  const b = S.hidden.bloodDebt;
  if (b >= 40) return '血债累累';
  if (b >= 20) return '手上有不少人命';
  if (b >= 8) return '杀过人';
  if (b >= 1) return '沾过血';
  return '手是干净的';
}
function daoLabel() {
  const d = S.hidden.daoMind;
  if (d >= 70) return '心魔缠身';
  if (d >= 45) return '杂念丛生';
  if (d >= 20) return '道心微乱';
  return '心如止水';
}
function physiqueLabel() {
  const p = S.hidden.physique;
  if (p >= 70) return '暗伤缠身';
  if (p >= 45) return '旧疾未愈';
  if (p >= 20) return '有些暗伤';
  return '筋骨完好';
}
function heatLabel() {
  const h = S.hidden.heat;
  if (h >= 70) return '此地不宜久留';
  if (h >= 40) return '有人在此地见过你';
  if (h >= 15) return '略有痕迹';
  return '无人留意';
}

/* 突破所需的满值判定 */
function canSubBreak() {
  return S.tier > 0 && S.tier <= MAX_TIER && S.progress >= needForSub() && S.sub < tier().subs.length - 1;
}
function canAscend() {
  return S.tier === MAX_TIER && S.progress >= needForSub() * 1.3;
}
function canTierBreak() {
  return S.tier > 0 && S.tier < MAX_TIER && S.progress >= needForSub() * 1.05 && S.sub >= tier().subs.length - 1;
}











