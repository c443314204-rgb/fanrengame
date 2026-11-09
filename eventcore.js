'use strict';
/* =============================================================
   事件引擎：双状态碰撞 → 权重匹配 → 动态生成
   不再从固定池抽卡；每条「事件原型」自带权重公式，
   由 世界状态（时代/行情/势力/公共事件/NPC）+ 玩家状态
   （行动/境界/隐藏因果/所在区域）共同决定今年会不会撞上。
   ============================================================= */

const EVENTS = [];       // 全部事件原型
const EVENT_MAP = {};

/* 注册一条事件原型
   { id, name, kind, base, cooldown, worldOnly, minTier, maxTier,
     weight(c) -> number|false, build(c) -> { title, text, opts[] } }
*/
function ev(def) {
  const e = Object.assign({ base: 10, cooldown: 3, kind: 'misc' }, def);
  EVENTS.push(e);
  EVENT_MAP[e.id] = e;
  return e;
}

/* ---------------- 生成上下文 ---------------- */
function makeCtx(action) {
  const era = ERA_MAP[W.era];
  const reg = REGION_MAP[S.region];
  const c = {
    W, S, action, era, reg,
    year: W.year,
    tier: S.tier,
    /* 地区危险系数 */
    danger: reg.danger * era.danger,
    /* 常用判断 */
    is: (k) => action === k,
    at: (place) => S.place === place,
    inRegion: (id) => S.region === id,
    war: era.id === 'war' || era.id === 'tense',
    peace: era.id === 'peace' || era.id === 'recover',
    /* 最近 6 回合是否触发过某原型 */
    seen: (id) => (S.muted[id] || 0) > W.year,
    /* 隐藏值快捷 */
    h: () => S.hidden,
    /* 随机事件人物 */
    someNpc: (filter) => {
      const list = livingNPCs().filter((n) => (!filter || filter(n)) && n.region === S.region);
      return list.length ? pick(list) : null;
    },
    anyNpc: (filter) => {
      const list = livingNPCs().filter((n) => !filter || filter(n));
      return list.length ? pick(list) : null;
    },
    npc: (id) => NPCS[id] || null,
    hunter: () => nearestHunter(),
    price: (g) => priceOf(g, S.region),
    /* 权重理由收集器 */
    reasons: [],
    why: function (n, label) { if (n) this.reasons.push({ n, label }); return this; },
  };
  return c;
}

/* 评估所有原型，返回按权重排序的候选 */
function evaluateEvents(action) {
  const c = makeCtx(action);
  const out = [];
  for (const e of EVENTS) {
    if (e.worldOnly) continue;
    if (e.minTier != null && S.tier < e.minTier) continue;
    if (e.maxTier != null && S.tier > e.maxTier) continue;
    if (e.cond && !e.cond(c)) continue;
    if (c.seen(e.id) && !e.repeatable) continue;
    c.reasons = [];
    let w;
    try { w = e.weight ? e.weight(c) : e.base; } catch (err) { w = 0; }
    if (!w || w <= 0) continue;
    out.push({ id: e.id, def: e, w, why: c.reasons.slice() });
  }
  out.sort((a, b) => b.w - a.w);
  return out;
}

/* 生成本回合的 1~2 个事件 */
function generateEvents(action) {
  const cands = evaluateEvents(action);
  const chosen = [];
  const n = pickEventCount(action);
  const pool = cands.slice();
  for (let i = 0; i < n && pool.length; i++) {
    /* 从前 8 个里按权重抽，保留随机性 */
    const head = pool.slice(0, 8);
    const picked = weightedPick(head);
    if (!picked) break;
    const idx = pool.indexOf(picked);
    pool.splice(idx, 1);
    /* 同一次里不重复触发同族事件 */
    if (chosen.some((x) => x.def.kind === picked.def.kind && picked.def.kind !== 'misc')) continue;
    chosen.push(picked);
  }
  return chosen.map((ch) => {
    const c = makeCtx(action);
    c.reasons = ch.why;
    const built = ch.def.build(c);
    if (!built) return null;
    return {
      id: ch.def.id, kind: ch.def.kind,
      title: built.title,
      text: built.text,
      opts: built.opts,
      weight: ch.w,
      why: ch.why,
    };
  }).filter(Boolean);
}

function pickEventCount(action) {
  if (action === 'bihai') return chance(0.35) ? 1 : 0;
  if (action === 'youli' || action === 'sect' || action === 'heishi') return chance(0.42) ? 2 : 1;
  return chance(0.25) ? 2 : 1;
}

/* ---------------- 权重记账：让玩家看见「为什么」 ---------------- */
function whyText(why) {
  if (!why || !why.length) return '';
  const top = why.filter((r) => Math.abs(r.n) >= 1).sort((a, b) => Math.abs(b.n) - Math.abs(a.n)).slice(0, 3);
  return top.map((r) => `${r.label}${r.n > 0 ? '+' : ''}${Math.round(r.n)}`).join(' · ');
}

/* =============================================================
   基础效果 API —— 供各事件书写选项时调用
   ============================================================= */
const fx = {
  stones(n) { addStones(n); return n; },
  item(id, n = 1) { addItem(id, n); },
  hp(frac) { addHp(Math.round(maxHp() * frac)); },
  mp(frac) { addMp(Math.round(maxMp() * frac)); },
  mood(n) { addMood(n); },
  fame(n) { addFame(n); },
  exposure(n) { addExposure(n); },
  blood(n) { addBlood(n); },
  credit(n) { addHidden('credit', n); },
  heat(n) { addHidden('heat', n); },
  physique(n) { addPhysique(n); },
  dao(n) { addDao(n); },
  life(n) { addLife(n); },
  route(id, n) { addRoute(id, n); },
  progress(frac) { gainProgress(frac); },
  enemy(id, n) { addEnemy(id, n); },
  bond(id, n) {
    const npc = NPCS[id];
    if (npc) { npc.bond = clamp(npc.bond + n, -100, 100); npc.known = true; }
  },
  grudge(id, n) {
    const npc = NPCS[id];
    if (npc) { npc.grudge = clamp(npc.grudge + n, -100, 100); addEnemy(id, n * 0.7); npc.known = true; }
  },
  kill(id) {
    const npc = NPCS[id];
    if (npc && npc.alive) {
      npc.alive = false;
      S.stats.kills++;
      addBlood(1);
      addFame(-3);
      addExposure(4);
      addStones(npc.wealth ? Math.round(npc.wealth * 0.4) : 0);
      npc.deadByPlayer = W.year;
      worldLog(`${npc.name}死了。死在你的手里。`);
    }
  },
  move(place) {
    S.place = place;
    S.hidden.heat = Math.max(0, S.hidden.heat * 0.5);
  },
  region(id) { if (REGION_MAP[id]) { S.region = id; S.place = pick(REGION_MAP[id].places); S.hidden.heat = 0; } },
  flag(k, v = true) { S.flags[k] = v; },
  learnTech(id) {
    if (TECHS[id] && !S.learned.includes(id)) {
      S.learned.push(id);
      if (!S.tech) S.tech = id;
    }
  },
  setTech(id) { if (TECHS[id]) { S.tech = id; if (!S.learned.includes(id)) S.learned.push(id); } },
  art(id) {
    const t = TREASURES[id];
    if (t && !S.arts.includes(id)) { S.arts.push(id); }
  },
  sectWork(n) { S.contrib += n; },
  rank(r) {
    S.rank = r;
    if (r === '外门') addRoute('quanshu', 8);
    if (r === '内门') addRoute('quanshu', 14);
    if (r === '执事') addRoute('quanshu', 20);
    if (r === '长老') addRoute('quanshu', 30);
  },
};

/* 按比例获得修为（1 = 当前小境界所需） */
function gainProgress(frac) {
  const need = needForSub();
  if (!isFinite(need)) return;
  S.progress += need * frac;
  checkAutoBreak();
}
function checkAutoBreak() {
  if (canTierBreak()) {
    S.pendingBreak = 'tier';
  } else if (canSubBreak()) {
    S.pendingBreak = 'sub';
  }
}

/* 战斗入口：返回给引擎处理 */
function fight(power, name, intro, opts) {
  S.pendingBattle = { power, name, intro, opts: opts || {} };
  return 'battle';
}
function fightNpc(npc, intro, opts) {
  if (!npc) return fight(1, '无名修士', '一个看不清面目的修士挡在路前。', opts);
  const p = npcPower(npc);
  return fight(p, npc.name + '（' + realmLabel(npc.realm, npc.sub) + '）', intro,
    Object.assign({ npcId: npc.id, realm: npc.realm }, opts));
}
function npcPower(n) {
  const R = REALM_TIERS[n.realm];
  return (R.atk / REALM_TIERS[1].atk) * (1 + (n.sub / Math.max(1, R.subs.length)) * 0.2);
}

/* 授予法宝，返回其名（供文案使用） */
function grantArt(id) {
  const t = TREASURES[id];
  if (!t) return '一件古物';
  if (S.arts.includes(id)) { addStones(60); return t.name + '（已有，换成了灵石）'; }
  S.arts.push(id);
  addExposure(4);
  return t.name;
}

/* 随机低阶对手 */
function mookPower(scale = 1) {
  const base = REALM_TIERS[Math.max(0, S.tier - 1)].atk;
  const same = REALM_TIERS[S.tier].atk;
  return (base + (same - base) * rnd(0.2, 1.1)) / REALM_TIERS[1].atk * scale * REGION_MAP[S.region].danger;
}
