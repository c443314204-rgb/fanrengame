'use strict';
/* =============================================================
   NPC 生态层：20~30 个独立散修 + 原著人物
   各有修为、目标、行踪、生死；会自己修炼、结仇、杀人、被反杀
   ============================================================= */

const NPCS = {};        // id -> npc
let NPC_ORDER = [];
const NPC_MEMORY = [];  // 已死之人

function realmWeightPool(year) {
  /* 越往后，世上修为高的人越多（也因战乱死得越多） */
  const late = clamp(year / 120, 0, 1);
  return [
    { w: 30 - late * 16, r: 0 },   // 凡人
    { w: 34, r: 1 },               // 炼气
    { w: 20 + late * 6, r: 2 },    // 筑基
    { w: 7 + late * 8, r: 3 },     // 结丹
    { w: 1 + late * 4, r: 4 },     // 元婴
    { w: late * 1.2, r: 5 },       // 化神
  ];
}

function randomRealm() {
  const p = weightedPick(realmWeightPool(W ? W.year : 1));
  return p ? p.r : 1;
}

function spawnNPC(opts = {}) {
  let name = opts.name;
  if (!name) {
    for (let i = 0; i < 30; i++) {
      name = pick(SURNAMES) + pick(GIVEN);
      if (!Object.values(NPCS).some((n) => n.name === name)) break;
    }
  }
  const r = opts.realm != null ? opts.realm : randomRealm();
  const id = opts.id || 'n' + (Object.keys(NPCS).length + 1) + '_' + Math.floor(Math.random() * 900 + 100);
  const npc = {
    id, name, canon: !!opts.canon,
    realm: r,
    sub: r === 0 ? 0 : rndInt(0, REALM_TIERS[r].subs.length - 1),
    region: opts.region || pick(REGIONS).id,
    place: opts.place || pick((REGION_MAP[opts.region || 'yue'] || REGIONS[0]).places),
    side: opts.side || (chance(0.18) ? '魔' : '散'),
    tag: opts.tag || pick(NPC_TAGS),
    temper: opts.temper || pick(NPC_TEMPERS),
    goal: opts.goal || pick(NPC_GOALS),
    desc: opts.desc || pick(NPC_DESC),
    alive: true,
    age: r === 0 ? rndInt(20, 50) : rndInt(16, 60) + r * 12,
    life: REALM_TIERS[r].life + rndInt(-10, 20),
    power: REALM_TIERS[r].atk * (1 + (rndInt(0, 20) / 100)),
    bond: 0,
    grudge: 0,
    kills: 0,
    fame: rndInt(-5, 25),
    wealth: Math.round(REALM_TIERS[r].atk * rnd(0.8, 2.2) + 10),
    factionPower: opts.factionPower || null,
    lastSeen: 0,
    note: opts.note || '',
    known: false,          // 玩家是否识得其名
  };
  NPCS[id] = npc;
  NPC_ORDER.push(id);
  return npc;
}

function npcById(id) { return NPCS[id] || null; }
function livingNPCs() { return NPC_ORDER.map((id) => NPCS[id]).filter((n) => n && n.alive); }
function livingInRegion(regionId) { return livingNPCs().filter((n) => n.region === regionId); }

/* ---------------- 初始化生态 ---------------- */
function seedEcology() {
  /* 原著人物 */
  for (const c of CANON_NPCS) {
    const npc = spawnNPC({
      id: c.id, name: c.name, realm: c.realm, region: c.region, place: c.place,
      side: c.side, tag: c.tag, temper: c.temper, goal: c.goal, desc: c.desc, canon: true,
      note: c.desc,
    });
    npc.sub = c.sub != null ? Math.min(c.sub, REALM_TIERS[c.realm].subs.length - 1) : npc.sub;
    npc.known = c.realm >= 2 || chance(0.4);
  }
  /* 随机散修 26 人 */
  const n = rndInt(24, 30);
  for (let i = 0; i < n; i++) spawnNPC({});
  /* 让一部分散修分布在玩家所在国，便于偶遇 */
  const pool = livingNPCs().filter((x) => !x.canon);
  pickMany(pool, 8).forEach((x) => { x.region = S ? S.region : 'yue'; x.place = pick((REGION_MAP[x.region]).places); });
}

/* ---------------- NPC 年度推演 ---------------- */
function npcTick() {
  const alive = livingNPCs();
  const chatty = [];

  for (const n of alive) {
    n.age += 1;

    /* 寿元耗尽 */
    if (n.age >= n.life) {
      n.alive = false;
      if (n.known) chatty.push(`${n.name}寿元耗尽，坐化于${n.place}。`);
      continue;
    }

    /* 修为增长 */
    const R = REALM_TIERS[n.realm];
    if (n.realm > 0 && n.realm < MAX_TIER && chance(0.34)) {
      n.power *= 1 + rnd(0.02, 0.07);
      if (chance(0.1 - n.realm * 0.012)) {
        if (n.sub >= R.subs.length - 1) {
          n.realm += 1; n.sub = 0;
          n.life = Math.max(n.life, REALM_TIERS[n.realm].life);
          n.fame += rndInt(4, 14);
          if (n.known) chatty.push(`${n.name}冲关成功，晋入${REALM_TIERS[n.realm].name}。`);
        } else n.sub += 1;
      }
    }

    /* 行踪：偶有迁徙 */
    if (chance(0.18)) {
      const dest = chance(0.7) ? n.region : pick(REGIONS).id;
      n.region = dest;
      n.place = pick((REGION_MAP[dest] || REGIONS[0]).places);
    }

    /* 独立行动：夺宝、结仇、被杀 */
    if (chance(0.1)) {
      const others = alive.filter((x) => x !== n && x.alive && x.region === n.region);
      if (others.length && chance(0.5)) {
        const foe = pick(others);
        const nWin = n.power * (1 + rnd(0, 0.5)) > foe.power * (1 + rnd(0, 0.5));
        if (nWin) {
          foe.alive = false;
          n.kills++; n.fame += 3; n.wealth += foe.wealth;
          if (n.known || foe.known) chatty.push(`${n.name}在${n.place}杀了${foe.name}，夺其储物袋。`);
          else if (chance(0.4)) chatty.push(`${n.region === (S && S.region) ? n.place : '外地'}传来消息：有散修因夺宝身死。`);
        } else {
          n.alive = false;
          foe.kills++; foe.fame += 3; foe.wealth += n.wealth;
          if (n.known || foe.known) chatty.push(`${foe.name}反杀了${n.name}。`);
        }
        if (!n.alive) continue;
      } else if (chance(0.4)) {
        n.wealth += rndInt(5, 40);
      }
    }

    /* 若与玩家结仇，则循迹追索 */
    const grudge = (S && S.hidden.enemyWeight[n.id]) || 0;
    if (grudge > 0) {
      const exposureBonus = S ? Math.min(30, S.hidden.exposure / 3) : 0;
      const trail = grudge + exposureBonus - (S && S.hidden.heat < 10 ? 5 : 0);
      if (chance(clamp(trail / 260, 0.02, 0.4))) {
        n.region = S.region;
        n.place = S.place;
        n.hunterReady = true;
        n.lastSeen = W.year;
      }
    }
  }

  /* 只保留最要紧的 3 条世界消息，避免刷屏 */
  const seen = new Set();
  for (const t of chatty) {
    if (seen.size >= 3) break;
    if (seen.has(t)) continue;
    seen.add(t);
    worldLog(t);
  }

  /* 调控人口 */
  const pop = livingNPCs();
  if (pop.length > 44) {
    const weakest = pop.filter((x) => !x.canon).sort((a, b) => a.power - b.power).slice(0, pop.length - 44);
    weakest.forEach((x) => { x.alive = false; });
  } else if (pop.length < 16) {
    for (let i = 0; i < 3; i++) spawnNPC({});
  }
}

/* 玩家在该区域的“被关注度”每年衰减 */
function heatDecay() {
  S.hidden.heat = Math.max(0, S.hidden.heat * 0.78 - 1);
}

/* 找出当前追得最紧的仇家 */
function nearestHunter() {
  const list = Object.entries(S.hidden.enemyWeight)
    .filter(([id, v]) => v >= 25 && NPCS[id] && NPCS[id].alive)
    .sort((a, b) => b[1] - a[1]);
  if (!list.length) return null;
  const n = NPCS[list[0][0]];
  if (n.region !== S.region) return null;
  return { npc: n, weight: list[0][1] };
}

function npcRelLabel(v) {
  if (v >= 40) return '生死之交';
  if (v >= 15) return '有几分交情';
  if (v > -10) return '点头之交';
  if (v > -30) return '有些过节';
  if (v > -60) return '结了大仇';
  return '不死不休';
}
