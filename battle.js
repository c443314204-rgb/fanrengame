'use strict';
/* =============================================================
   战斗层：境界判定优先，底牌结算其次，小游戏只用于同阶对决
   ============================================================= */

/* 由 power 反推对手境界层数 */
function enemyTierFromPower(power) {
  let best = 0, bd = Infinity;
  for (let t = 0; t <= MAX_TIER; t++) {
    const v = REALM_TIERS[t].atk / REALM_TIERS[1].atk;
    const d = Math.abs(Math.log(Math.max(0.05, power) / Math.max(0.05, v)));
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

function buildEnemy(power, name, opts = {}) {
  const realm = opts.realm != null ? opts.realm : enemyTierFromPower(power);
  const R = REALM_TIERS[realm];
  const mult = opts.realm != null ? (power / Math.max(0.2, R.atk / REALM_TIERS[1].atk)) : 1;
  const hp = Math.round(R.hp * clamp(mult, 0.5, 1.8) * 0.85);
  return {
    name: name || '无名修士',
    realm,
    sub: 0,
    hp, maxHp: hp,
    atk: Math.round(R.atk * clamp(mult, 0.6, 1.6) * 0.55),
    def: Math.round(R.def * 0.8),
    shield: 0,
    poison: 0,
    puppet: 0,
    rage: 0,
    npcId: opts.npcId || null,
    nemesis: !!opts.nemesis,
    onWin: opts.onWin || null,
  };
}

/* 玩家战斗数值 */
function playerAtk() {
  const R = REALM_TIERS[S.tier];
  let v = R.atk * (1 + (S.sub / Math.max(1, R.subs.length)) * 0.1);
  v *= 1 + (S.tech ? TECHS[S.tech].atk || 0 : 0);
  v *= 1 + (traitEff('atk') || 0);
  for (const id of S.arts) v *= 1 + (TREASURES[id] && TREASURES[id].atk ? TREASURES[id].atk * 0.5 : 0);
  return Math.round(v);
}
function playerDef() {
  const R = REALM_TIERS[S.tier];
  let v = R.def;
  v *= 1 + (S.tech ? TECHS[S.tech].def || 0 : 0);
  for (const id of S.arts) v *= 1 + (TREASURES[id] && TREASURES[id].def ? TREASURES[id].def * 0.5 : 0);
  return Math.round(v);
}

/* 底牌清单 */
function availableTrumps() {
  const list = [];
  if (itemCount('talAtk') > 0) list.push({ id: 'talAtk', name: '火弹符', desc: '直接重创对手' });
  if (itemCount('talThunder') > 0) list.push({ id: 'talThunder', name: '雷遁符', desc: '重伤并脱身' });
  if (itemCount('talDef') > 0) list.push({ id: 'talDef', name: '金刚符', desc: '挡下一次重击' });
  if (itemCount('poison') > 0) list.push({ id: 'poison', name: '腐骨毒', desc: '使对手中毒，攻防俱降' });
  if (itemCount('puppet') > 0) list.push({ id: 'puppet', name: '傀儡', desc: '替你挡三次攻击' });
  if (itemCount('array') > 0) list.push({ id: 'array', name: '阵盘', desc: '布阵：减伤增攻' });
  return list;
}

/* ---------------- 开战 ---------------- */
function startBattle(power, name, intro, opts = {}) {
  const enemy = buildEnemy(power, name, opts);
  S.battle = {
    enemy,
    round: 1,
    log: [],
    intro: intro || '',
    buffAtk: 0,
    buffDef: 0,
    shield: 0,
    enemyPoison: 0,
    playerPoison: 0,
    escaped: false,
    over: false,
    result: '',
    canAct: true,
  };
  if (opts.npcId && NPCS[opts.npcId]) NPCS[opts.npcId].known = true;
  battleLog(intro || `${enemy.name}挡在了你面前。`);
  openBattleUI();
}

function battleLog(t, cls) {
  if (!S.battle) return;
  S.battle.log.push({ t, cls: cls || '' });
  if (S.battle.log.length > 40) S.battle.log.shift();
}

/* 境界压制判定 */
function realmGap() {
  if (!S.battle) return 0;
  return S.battle.enemy.realm - S.tier;
}

/* ---------------- 推演一回合 ---------------- */
function resolveRound(playerStance) {
  const B = S.battle;
  if (!B || B.over) return;
  const e = B.enemy;

  /* 敌人选择架势：看性格与血量 */
  let eStance;
  const lowHp = e.hp / e.maxHp < 0.35;
  if (lowHp && chance(0.45)) eStance = 'defend';
  else if (chance(0.4)) eStance = 'attack';
  else if (chance(0.5)) eStance = 'dodge';
  else eStance = 'defend';

  const beats = { attack: 'dodge', dodge: 'defend', defend: 'attack' };
  const pWin = beats[playerStance] === eStance;
  const eWin = beats[eStance] === playerStance;

  const pAtk = playerAtk() * (1 + B.buffAtk);
  const pDef = playerDef() * (1 + B.buffDef);
  const eAtk = e.atk * (1 - (B.enemyPoison > 0 ? 0.25 : 0));
  const gap = realmGap();

  /* 玩家伤害 */
  let dmg = 0, crit = false;
  if (playerStance === 'attack') {
    let base = pAtk * rnd(0.85, 1.15);
    if (pWin) { base *= 1.7; crit = true; }
    else if (eStance === 'defend') base *= 0.55;
    base -= e.def * 0.4;
    dmg = Math.max(1, Math.round(base));
  } else if (playerStance === 'dodge' && pWin) {
    dmg = Math.max(1, Math.round(pAtk * 0.35));
  }

  /* 敌人伤害 */
  let eDmg = 0;
  if (eStance === 'attack') {
    let base = eAtk * rnd(0.85, 1.15);
    if (eWin) base *= 1.6;
    else if (playerStance === 'defend') base *= 0.5;
    base -= pDef * 0.45;
    eDmg = Math.max(1, Math.round(base));
    if (gap >= 2) eDmg = Math.round(eDmg * 1.5);
  } else if (eStance === 'dodge' && eWin) {
    eDmg = Math.max(1, Math.round(eAtk * 0.3));
  }

  /* 傀儡挡刀 */
  if (eDmg > 0 && B.puppet > 0) {
    B.puppet -= 1;
    battleLog(`傀儡横在你身前，替你挡下了这一击。（剩余 ${B.puppet} 次）`, 'good');
    eDmg = Math.round(eDmg * 0.25);
  }
  /* 护盾 */
  if (eDmg > 0 && B.shield > 0) {
    const absorbed = Math.min(B.shield, eDmg);
    B.shield -= absorbed;
    eDmg -= absorbed;
    if (absorbed > 0) battleLog(`护体灵光化去 ${absorbed} 点伤害。`, 'good');
  }

  /* 结算 */
  if (dmg > 0) {
    e.hp = Math.max(0, e.hp - dmg);
    battleLog(`你${playerStance === 'attack' ? '挺剑直取' : '侧身游斗'}，${crit ? '正中要害' : '击中对手'}，造成 <b>${dmg}</b> 点伤害。`, crit ? 'good' : '');
  } else if (playerStance === 'defend') {
    battleLog(`你收势守御，将真元护住周身。`);
  } else {
    battleLog(`你身形一晃，避开了对手的锋芒。`);
  }
  if (eDmg > 0) {
    S.hp = Math.max(0, S.hp - eDmg);
    battleLog(`${e.name}${eStance === 'attack' ? '欺身而进' : '反手一击'}，你受了 <b>${eDmg}</b> 点伤。`, 'warn');
  }

  /* 毒 */
  if (B.enemyPoison > 0) B.enemyPoison -= 1;
  if (B.playerPoison > 0) {
    B.playerPoison -= 1;
    const pd = Math.round(e.atk * 0.08);
    S.hp = Math.max(0, S.hp - pd);
    battleLog(`毒气攻心，你损失 ${pd} 点气血。`, 'warn');
  }

  /* 敌人回血/狂暴：血少时攻击上升 */
  if (e.hp / e.maxHp < 0.3 && !e.enraged) {
    e.enraged = true;
    e.atk = Math.round(e.atk * 1.2);
    battleLog(`${e.name}目露凶光，气势陡然拔高。`, 'warn');
  }

  S.battle.round += 1;

  /* 胜负 */
  if (e.hp <= 0) { winBattle(); return; }
  if (S.hp <= 0) { loseBattle(); return; }
  renderBattle();
}

/* ---------------- 底牌 ---------------- */
function useTrump(id) {
  const B = S.battle;
  if (!B || B.over) return;
  if (itemCount(id) < 1) return;
  addItem(id, -1);
  const e = B.enemy;
  const pAtk = playerAtk();

  if (id === 'talAtk') {
    const dmg = Math.round(pAtk * rnd(2.2, 3.2));
    e.hp = Math.max(0, e.hp - dmg);
    battleLog(`火弹符炸开，烈焰吞没了对手，造成 <b>${dmg}</b> 点伤害。`, 'good');
  } else if (id === 'talThunder') {
    const dmg = Math.round(pAtk * rnd(3, 4.5));
    e.hp = Math.max(0, e.hp - dmg);
    battleLog(`雷遁符引下天雷，击中对手（<b>${dmg}</b> 点伤害），你借雷光遁出百丈。`, 'good');
    B.escaped = true;
    endBattle('flee');
    return;
  } else if (id === 'talDef') {
    B.shield += Math.round(playerDef() * 4);
    battleLog(`金刚符化作一层金光，护住周身。`, 'good');
  } else if (id === 'poison') {
    B.enemyPoison = 3;
    e.atk = Math.round(e.atk * 0.75);
    e.def = Math.round(e.def * 0.7);
    battleLog(`腐骨毒顺着伤口渗了进去。对手脸色发青，攻势缓了下来。`, 'good');
  } else if (id === 'puppet') {
    B.puppet += 3;
    battleLog(`你放出一具傀儡，它沉默地挡在了你的身前。`, 'good');
  } else if (id === 'array') {
    B.buffAtk += 0.25;
    B.buffDef += 0.3;
    battleLog(`阵盘落地，灵光沿着刻纹铺开。你站在阵眼，攻守之间多了几分从容。`, 'good');
  } else if (id === 'escape') {
    
    B.escaped = true;
    battleLog(`遁地符燃尽，你的身形没入土中。`, 'good');
    endBattle('flee');
    return;
  }

  if (e.hp <= 0) { winBattle(); return; }
  /* 用底牌也算一回合，敌人趁机出手 */
  resolveRound('defend');
}

/* ---------------- 逃跑 ---------------- */
function tryFlee() {
  const B = S.battle;
  if (!B || B.over) return;
  if (itemCount('escape') > 0) { useTrump('escape'); return; }
  const gap = realmGap();
  let p = 0.5 + traitEff('flee') + traitEff('escape') - gap * 0.15;
  if (B.enemy.nemesis) p -= 0.12;
  p = clamp(p, 0.08, 0.92);
  if (chance(p)) {
    battleLog(`你虚晃一招，转身遁走。${B.enemy.name}追了一段，到底没能追上。`, 'good');
    endBattle('flee');
    return;
  }
  battleLog(`你转身欲走，却被${B.enemy.name}抢先截住了去路。`, 'warn');
  resolveRound('dodge');
}

/* ---------------- 结束 ---------------- */
function winBattle() {
  const B = S.battle;
  if (!B || B.over) return;
  B.over = true;
  B.result = 'win';
  const e = B.enemy;
  battleLog(`${e.name}倒了下去。`, 'good');

  /* 奖励 */
  const tierAhead = Math.max(0, e.realm - S.tier);
  const stones = Math.round(rnd(12, 40) * (1 + e.realm * 0.8) * (1 + tierAhead * 0.4));
  addStones(stones);
  if (chance(0.4)) addItem('heal', 1);
  if (chance(0.2)) addItem('material', 1);
  addExposure(3 + e.realm);
  S.stats.kills++;

  if (e.npcId && NPCS[e.npcId]) {
    const npc = NPCS[e.npcId];
    npc.alive = false;
    npc.deadByPlayer = W.year;
    S.hidden.bloodDebt += 1;
    addFame(-2);
    worldLog(`你杀了${npc.name}。`);
    if (e.nemesis) {
      /* 仇家死了，仇恨清零 */
      delete S.hidden.enemyWeight[npc.id];
      addBlood(1);
    }
  }
  if (e.onWin) {
    if (e.onWin.bond) fx.bond(e.onWin.bond[0], e.onWin.bond[1]);
    if (e.onWin.fame) addFame(e.onWin.fame);
  }
  S.battle.rewardStones = stones;
  renderBattle();
}

function loseBattle() {
  const B = S.battle;
  if (!B || B.over) return;
  B.over = true;
  B.result = 'lose';
  const e = B.enemy;
  battleLog(`你再也撑不住了。`, 'warn');

  /* 死里逃生：有还魂丹 / 气运 */
  if (itemCount('life') > 0 && chance(0.5)) {
    addItem('life', -1);
    S.hp = Math.max(1, Math.round(maxHp() * 0.2));
    battleLog(`延寿丹在你胸中化开，一股暖意硬生生把你从鬼门关拉了回来。`, 'good');
    B.result = 'survive';
    endBattle('survive');
    return;
  }
  if (itemCount('heal') > 0) { addItem('heal', -1); S.hp = Math.max(1, Math.round(maxHp() * 0.15)); battleLog('你摸出最后一枚疗伤丹塞进嘴里，勉强吊住了一口气。', 'good'); B.result = 'survive'; endBattle('survive'); return; }
  if (chance((B.enemy.nemesis ? 0.12 : 0.34) + traitEff('luck'))) {
    S.hp = 1;
    S.hidden.physique = clamp(S.hidden.physique + 25, 0, 100);
    addLife(-Math.max(1, Math.round(S.life * 0.05)));
    addStones(-Math.round(S.stones * 0.5));
    battleLog(`${e.name}以为你死了，踢了你一脚就走了。你在血泊里躺了很久，才慢慢爬起来。`, 'warn');
    B.result = 'survive';
    endBattle('survive');
    return;
  }
  if (S.hidden.bloodDebt > 25) {
    addBlood(0);
  }
  S.over = 'die';
  S.overText = `你死在了${S.place}。杀你的人是${e.name}。\n修行一世，到最后连一句话都没能留下。`;
  endBattle('die');
}

function endBattle(result) {
  const B = S.battle;
  if (!B) return;
  B.over = true;
  B.result = result;
  B.canAct = false;
  renderBattle();
}


