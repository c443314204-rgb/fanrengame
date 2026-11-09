'use strict';
/* =============================================================
   引擎层：年度回合循环
   年初世界刷新 → 择年度行动 → 年中事件 → 年末结算
   ============================================================= */

/* ---------------- 开局 ---------------- */
function newGame(opts) {
  SEED = (Date.now() >> 0) || 1;
  W = newWorld();
  S = makePlayer(opts);
  refreshLifespan();
  refillVitals(S);
  seedEcology();
  S.history.push({ year: 0, text: `你自${ORIGINS.find((o) => o.id === S.origin).name}起身，踏入仙途。` });

  hide('screen-title');
  show('screen-game');
  renderHUD();
  renderPlacePanel();

  /* 出身钩子：开局一段小事件 */
  S.pendingEvents = [];
  const hook = prologueEvent(opts.origin);
  if (hook) S.pendingEvents.push(hook);
  S.eventIdx = 0;
  S.phase = 'prologue';
  if (S.pendingEvents.length) renderEvent(S.pendingEvents[0], 0, 1);
  else nextTurn();
}

/* 出身钩子事件（动态生成，取材于开局身世） */
function prologueEvent(originId) {
  const o = ORIGINS.find((x) => x.id === originId);
  if (!o) return null;
  return {
    id: 'prologue', kind: 'fate', title: '初入',
    text: PROLOGUES[originId] || o.hook,
    why: [{ n: 0, label: '身世' }],
    opts: [
      opt('照着图上的路子，试第一次引气', '机', () => {
        if (chk(0.6)) {
          S.tier = 1; S.sub = 0; S.progress = 0;
          S.life = Math.max(S.life, REALM_TIERS[1].life);
          refillVitals();
          addRoute('changsheng', 3);
          return `你照着图上的路子，把心念沉到丹田。起初什么都没有，坐到后半夜，忽然有一缕极细的凉气，从鼻端钻了进来，顺着经脉往下走。\n\n引气入体。你成了炼气一层的修士。`;
        }
        addMood(4);
        return `你照着图上的路子坐了一夜，什么也没感觉到。可你没有灰心——这世上的事，本就不是一夜能成的。`;
      }),
      opt('先把眼前的日子过下去', '稳', () => {
        addStones(8); addMood(3);
        return `你把手里的活计做完，把该收的东西收好。修仙的事急不得，先活下去。`;
      }),
      opt('带着东西就走，去更远的地方', '险', () => {
        S.region = 'yue'; S.place = pick(REGION_MAP.yue.places);
        addStones(5); addExposure(2);
        return `你收拾了随身的几件东西，趁着天没亮就出了门。去哪里还不知道，反正不回头。`;
      }),
    ],
  };
}

/* ---------------- 年度行动 ---------------- */
function AVAILABLE_ACTIONS() {
  const maxY = Math.max(1, S.life - S.age - 1);
  return [
    { id: 'bihai', name: '闭关修炼', cls: 'safe',
      desc: '闭门苦修，修为涨得最快。可外头的事就顾不上了，坐久了还容易走火、积暗伤。',
      meta: `可选 ${maxY} 年以内 · 年得约 ${Math.round(yearGain())}` },
    { id: 'youli', name: '外出历练', desc: '走山访水，寻机缘、结人缘，也撞凶险。事件最多。',
      meta: '事件最多 · 修为增长较慢' },
    { id: 'lianzhi', name: '炼丹炼器', desc: '支起炉子，把灵药炼成丹药，把材料炼成法器。炸炉是常事。',
      meta: `需灵药/材料 · 丹术成算 ${Math.round((0.45 + traitEff('alchemy') + S.wits * 0.015) * 100)}%` },
    { id: 'shifang', name: '坊市经营', desc: '低买高卖、囤货居奇、结交主顾。灵石来得稳，名声与是非也来得快。',
      meta: `手头 ${Math.round(S.stones)} 灵石` },
    { id: 'sect', name: '宗门公务', desc: '领差事、攒贡献、在门里往上爬。',
      meta: S.sect ? `${S.sect} · ${S.rank || '外门'} · 贡献 ${S.contrib}` : '需先入宗门', disabled: !S.sect },
    { id: 'yinni', name: '隐匿蛰伏', cls: 'safe', desc: '什么都不做，只把踪迹抹干净。降关注、避仇家，几乎零收益。',
      meta: '降关注 · 降暴露' },
    { id: 'travel', name: '远行他国', desc: '换一处地方讨生活。不同的国度，不同的行情与凶险。',
      meta: `现处 ${REGION_MAP[S.region].name}` },
    { id: 'tupo', name: '冲关', cls: 'danger', desc: '修为已满，正面叩关。成则脱胎换骨，败则修为倒退。',
      meta: S.pendingBreak ? `成算 ${Math.round(breakthroughChance(S.pendingBreak) * 100)}%` : '',
      disabled: !S.pendingBreak },
    ...(S.tier >= MAX_TIER ? [{ id: 'dujie', name: '渡劫飞升', cls: 'danger',
      desc: '化神圆满，天门已开。此一去，要么超脱此界，要么形神俱灭。',
      meta: canAscend() ? '天劫成算 ' + Math.round(ascendChance() * 100) + '%' : '修为尚未圆满',
      disabled: !canAscend() }] : []),
  ];
}

function beginAction(id) {
  S.curAction = id;
  S.pendingEvents = [];
  S.eventIdx = 0;
  S.lastAction = id;
  S.stats.turns++;
  S.yearDelta = [];
  const label = { bihai: '闭关修炼', youli: '外出历练', lianzhi: '炼丹炼器', shifang: '坊市经营', sect: '宗门公务', yinni: '隐匿蛰伏', travel: '远行', tupo: '冲关' }[id] || id;
  S.history.push({ year: W.year, text: `第${cn(W.year)}年：${label}。` });

  const recap = applyActionBase(id);
  const events = generateEvents(id);
  S.pendingEvents = events;
  S.actionRecap = recap;

  if (!events.length) {
    finishYear(recap);
    return;
  }
  renderEvent(events[0], 0, events.length);
}

/* 行动的基础收益 */
function applyActionBase(id) {
  const L = [];
  const years = id === 'bihai' ? Math.max(1, Math.min(S.flags.seclusionYears || defaultSeclusion(), S.life - S.age - 1)) : 1;
  S.actionYears = years;

  /* 凡人阶段：先引气入体，才有修为可言 */
  if (S.tier === 0 && id !== 'tupo') {
    const p = (id === 'bihai' ? 0.5 : 0.3) + S.wits * 0.02 + rootInfo().speed * 0.12;
    if (chance(p)) {
      S.tier = 1; S.sub = 0; S.progress = 0;
      refreshLifespan(); refillVitals();
      L.push('你在这一年里摸到了引气入体的门径——一缕凉气自鼻端钻入，顺着经脉沉进丹田。炼气一层。');
      addRoute('changsheng', 3);
    } else {
      L.push(say('你照着图诀打坐，一坐就是一年，丹田里始终空空如也。',
        '灵气从指缝间流过，怎么也留不住。你有些灰心，却没有停下。',
        '这一年的功夫，只换来一句「根基未稳」。'));
      addMood(-3);

    }
    return L;
  }

  if (id === 'bihai') {
    const gain = yearGain() * years * (1 + Math.log2(Math.max(1, years)) * 0.12);
    const before = S.progress;
    S.progress += gain;
    addDao(Math.min(years, 10) * 0.35 + Math.max(0, years - 10) * 0.14);
    addPhysique(Math.min(years, 10) * 0.25 + Math.max(0, years - 10) * 0.1);
    addExposure(-years * 0.6);
    addHidden('heat', -years * 2);
    if (years >= 5) addMood(-Math.min(6, years * 0.4));
    L.push(`闭关${years}年，得修为 ${Math.round(S.progress - before)}。`);
    if (years >= 5) L.push('久坐洞府，暗伤与杂念都添了些。');
    checkAutoBreak();
  }
  else if (id === 'youli') {
    gainProgress(0.35);
    addMood(1);
    addHidden('heat', 2);
    L.push('你在外走了一年，修为稳步增长，也见了些世面。');
  }
  else if (id === 'lianzhi') {
    applyCraft(L);
  }
  else if (id === 'shifang') {
    applyMarket(L);
  }
  else if (id === 'sect') {
    gainProgress(0.22);
    S.contrib += rndInt(6, 12);
    addHidden('fame', 1);
    L.push(`在${S.sect}领了一年差事，贡献 ${S.contrib}。`);
  }
  else if (id === 'yinni') {
    gainProgress(0.12);
    addExposure(-12);
    addHidden('heat', -25);
    addDao(-3);
    addMood(-2);
    for (const k in S.hidden.enemyWeight) S.hidden.enemyWeight[k] = Math.max(0, S.hidden.enemyWeight[k] * 0.8);
    L.push('你蛰伏了一年，行踪淡了下去，仇家的线索也断了几分。');
  }
  else if (id === 'travel') {
    gainProgress(0.1);
    addHidden('heat', -20);
    addHidden('credit', 2);
    L.push(`你一路辗转，到了${REGION_MAP[S.region].name}。`);
  }
  else if (id === 'tupo') {
    /* 冲关本身不产生基础收益，事件里处理 */
  }
  return L;
}

function applyCraft(L) {
  const skill = 0.42 + traitEff('alchemy') + traitEff('craft') + S.wits * 0.012;
  const herb = itemCount('herb');
  const mat = itemCount('material');
  if (herb > 0) {
    addItem('herb', -1);
    fx.route('zongshi', 5);
    if (chance(skill)) {
      const n = rndInt(1, 2);
      addItem('heal', n);
      if (chance(0.25)) addItem('break', 1);
      L.push(`一炉丹成了，得疗伤丹${n}枚。`);
    } else {
      L.push('一炉丹废了，只剩满屋子的焦味。');
      addPhysique(2);
    }
  }
  if (mat > 0) {
    addItem('material', -1);
    fx.route('zongshi', 4);
    if (chance(skill * 0.85)) {
      addItem('talAtk', 1); addStones(rndInt(10, 30));
      L.push('炼成一张火弹符，顺带卖了些边角料。');
    } else {
      L.push('法器坯子炸了，材料打了水漂。');
    }
  }
  if (herb === 0 && mat === 0) L.push('炉子支起来了，可手头没有灵药与材料，只能空坐了一年。');
  gainProgress(0.2);
}

function applyMarket(L) {
  const skill = 0.5 + S.hidden.credit / 300 + traitEff('social') * 0.5;
  const base = Math.max(6, Math.round(S.stones * 0.12));
  const gain = Math.round(base * rnd(0.4, 1.3) * (0.6 + skill));
  addStones(gain - Math.round(base * 0.4));
  addHidden('credit', 2);
  fx.route('caifa', 5);
  gainProgress(0.1);
  L.push(`一年的买卖下来，净赚 ${Math.round(gain - base * 0.4)} 块灵石。`);
  if (S.flags.hasShop) {
    addStones(rndInt(20, 60));
    L.push('铺子里的流水又添了一笔。');
  }
}

/* ---------------- 事件推进 ---------------- */
function chooseOption(idx) {
  const evt = S.pendingEvents[S.eventIdx];
  if (!evt) return;
  const o = evt.opts[idx];
  if (!o) return;

  const before = snapshotStats();
  let text;
  try { text = o.run(); } catch (err) {
    console.error('event error', evt.id, err);
    text = '（此事后续有些模糊，你记不清了。）';
  }
  S.muted[evt.id] = W.year + 3;
  S.lastChoiceTag = o.tag;

  if (text === 'battle' || S.pendingBattle) {
    S.afterBattle = { evt, idx, before };
    const pb = S.pendingBattle || {};
    S.pendingBattle = null;
    const opts = pb.opts || {};
    startBattle(pb.power || 1, pb.name || '对手', pb.intro || '', opts);
    return;
  }
  showChoiceResult(text, before);
}

function showChoiceResult(text, before) {
  const deltas = diffStats(before, snapshotStats());
  S.lastResult = { text, deltas };
  /* 事件卡已完成使命，清掉，只留结果 */
  setStage('');
  renderHUD();
  const total = S.pendingEvents.length;
  const last = S.eventIdx >= total - 1;
  renderResult(text, deltas, last ? '收 束 此 年' : '再 看 下 文');
}

/* 把积攒的修为兑现成小境界（长年闭关可连破数层，一次失败即止） */
function resolveAutoBreak() {
  if (!S.pendingBreak || S.pendingBreak !== 'sub') return 0;
  let tries = 0, broke = 0;
  const maxTries = clamp(Math.floor((S.actionYears || 1) / 2) + 1, 1, 8);
  while (canSubBreak() && tries < maxTries) {
    const r = tryBreakthrough('sub');
    tries++;
    if (!r.ok) { toast('冲关未成，修为倒退', 'down'); continue; }
    broke++;
    S.history.push({ year: W.year, text: `修为精进，晋入${realmLabel()}。` });
  }
  if (broke > 0) toast(`连破 ${broke} 层，晋入${realmLabel()}`, 'up');
  S.pendingBreak = canSubBreak() ? 'sub' : null;
  return broke;
}

function advanceAfterResult() {
  /* 结果只结算一次，防止移动端 ghost click 重复推进 */
  if (!S.resultOpen) return;
  S.resultOpen = false;
  if (S.over) { gameOver(); return; }
  if (S.pendingBreak) {
    if (S.pendingBreak === 'sub') resolveAutoBreak();
  }
  S.eventIdx++;
  if (S.eventIdx < S.pendingEvents.length) {
    renderEvent(S.pendingEvents[S.eventIdx], S.eventIdx, S.pendingEvents.length);
    return;
  }
  finishYear(S.actionRecap || []);
}

/* 战斗结束后回到事件流 */
function battleFinished(result) {
  const ab = S.afterBattle;
  S.afterBattle = null;
  const before = ab ? ab.before : snapshotStats();
  let text = '';
  if (result === 'win') text = '你把对手解决掉了。';
  else if (result === 'flee') text = '你脱身了，虽然不算体面。';
  else text = '你伤得不轻，勉强捡回一条命。';
  if (ab) {
    showChoiceResult(text, before);
  } else {
    finishYear([]);
  }
}

/* ---------------- 年末结算 ---------------- */
function finishYear(recap) {
  /* 修为兑现：无论这一年有没有触发事件，都要结算小境界 */
  resolveAutoBreak();
  /* 寿元 */
  const yearsGone = S.actionYears || 1;
  S.age += yearsGone;
  S.hp = Math.min(maxHp(), S.hp + Math.round(maxHp() * 0.25));
  S.mp = Math.min(maxMp(), S.mp + Math.round(maxMp() * 0.2));
  addDao(0.4 * yearsGone);
  /* 日常吐纳：不闭关也有微薄进益，免得整年被虚度 */
  if (S.tier > 0) S.progress += yearGain() * 0.15 * yearsGone;
  heatDecay();

  /* 自然恢复与衰减 */
  if (S.hidden.physique > 0 && S.age < tier().life && chance(0.3)) addPhysique(-1);
  if (S.hidden.exposure > 0) addExposure(-0.6 * yearsGone);
  if (S.mood < 30) addDao(1);

  /* 寿元：突破时刷新，其余时候只减不增 */
  /* 寿元耗尽 */
  if (S.age >= S.life) {
    S.over = 'die';
    S.overText = S.hidden.daoMind > 60
      ? '你坐在蒲团上，没有等到下一次日出。心魔在最后一刻还在耳边低语。'
      : `寿元尽了。你在${S.place}合上了眼，窗外的天刚蒙蒙亮。\n修行一世，终究没能抵过这一关。`;
    renderHUD();
    renderYearEnd();
    return;
  }

  S.pending = false;
  saveGame();
  renderHUD();
  renderYearEnd();
}

/* ---------------- 新一年 ---------------- */
function nextTurn() {
  W.year += 1;
  eraTick();
  factionDrift();
  priceDrift();
  publicEventTick();
  npcTick();

  /* 若玩家所在地有大事件，记一条 */
  renderHUD();
  renderPlacePanel();
  if (S.over) { gameOver(); return; }
  renderActionChoice();
}

/* ---------------- 冲关行动 ---------------- */
function doBreakthroughAction() {
  S.curAction = 'tupo';
  S.actionYears = 1;
  S.eventIdx = 0;
  S.pendingEvents = [];
  const kind = S.pendingBreak;
  const ch = breakthroughChance(kind);
  const text = kind === 'tier'
    ? '你封了洞府，在石门前坐了三日，才把心静下来。丹田里的真元满得要溢出来，像一锅烧到极处的水。'
    : '你把心念沉进丹田，一点点去撞那层看不见的壁。';
  const evt = {
    id: 'tupo', kind: 'calamity', title: kind === 'tier' ? '叩天关' : '冲瓶颈',
    text: text + `\n成算 ${Math.round(ch * 100)}%。`,
    why: [{ n: 30, label: '修为圆满' }],
    opts: [
      opt('叩关', '险', () => {
        const r = tryBreakthrough(kind);
        S.pendingBreak = null;
        if (r.ok) { S.history.push({ year: W.year, text: `叩关成功，晋${realmLabel()}。` }); return r.text; }
        S.history.push({ year: W.year, text: '冲关失败，修为倒退。' });
        return r.text;
      }),
      opt('再等等，先压一压修为', '稳', () => {
        S.pendingBreak = null;
        addDao(4); addMood(-2);
        return '你把那股快要溢出来的真元重新压了回去。心里知道，这一压，又不知要压到什么时候。';
      }),
    ],
  };
  S.pendingEvents = [evt];
  S.actionRecap = [];
  renderEvent(evt, 0, 1);
}

/* ---------------- 数值快照与差异 ---------------- */
function snapshotStats() {
  return {
    stones: S.stones, progress: S.progress, hp: S.hp, mp: S.mp, mood: S.mood,
    life: S.life, fame: S.hidden.fame, exposure: S.hidden.exposure,
    blood: S.hidden.bloodDebt, credit: S.hidden.credit, heat: S.hidden.heat,
    physique: S.hidden.physique, dao: S.hidden.daoMind,
    tier: S.tier, sub: S.sub, kills: S.stats.kills, contrib: S.contrib,
  };
}

/* ---------------- 渡劫飞升 ---------------- */
function ascendChance() {
  let p = 0.28;
  if (S.hidden.daoMind < 25) p += 0.08;
  p += (S.mood - 50) / 400;
  p -= S.hidden.physique / 500;
  p += Math.min(0.2, S.arts.length * 0.04);
  if (S.tech === 'tianlei' || S.tech === 'dayan') p += 0.05;
  if (itemCount('life') > 0) p += 0.05;
  if (hasPosTrait('lanku')) p += 0.04;
  return clamp(p, 0.08, 0.85);
}

function doAscend() {
  S.curAction = 'dujie';
  S.actionYears = 1;
  S.eventIdx = 0;
  S.pendingEvents = [];
  const ch = ascendChance();
  const evt = {
    id: 'dujie', kind: 'calamity', title: '天门',
    text: '化神圆满的那一夜，你站在山巅，忽然听见头顶传来一声极轻的响——像是什么东西裂开了一道缝。\n'
      + '云层之上，有紫金色的雷光在缓慢聚拢。天门开了。跨过去，就是灵界；跨不过去，就是灰飞烟灭。\n'
      + `天劫成算 ${Math.round(ch * 100)}%。`,
    why: [{ n: 40, label: '化神圆满' }],
    opts: [
      opt('迎雷而上，硬闯天门', '险', () => {
        if (chance(ch)) {
          ascend();
          return '第一道天雷落下时，你以为自己会死。\n第二道、第三道……到第七道时，你已经感觉不到疼了。\n'
            + '雷光散尽，你站在一片从未见过的星空之下。身后那道门，正在缓缓合上。';
        }
        S.hp = 0;
        S.over = 'die';
        S.overText = '天雷一道接一道地落下。你撑到了第六道。\n第七道落下时，你连最后一句遗言都没能说出口。';
        return '雷光吞没了一切。';
      }),
      opt('再闭关百年，把暗伤与心魔都养好', '稳', () => {
        S.progress = Math.max(0, S.progress - needForSub() * 0.2);
        addDao(-8); addPhysique(-10); addMood(5);
        return '你转身下了山。天门还开着，只是不知还开多久。你告诉自己：再等等，再稳一稳。';
      }),
      opt('散去修为，隐于凡俗', '耗', () => {
        S.over = 'die';
        S.overText = '你把金丹、元婴、化神一层层散了个干净，最后成了一个凡人。\n'
          + '很多年后，山下的孩子都叫你「老神仙」，没人知道你曾经离天只差一步。';
        return '你散去了修为，走下山去。';
      }),
    ],
  };
  S.pendingEvents = [evt];
  S.actionRecap = [];
  renderEvent(evt, 0, 1);
}

function diffStats(a, b) {
  const out = [];
  const push = (label, v, cls) => { if (Math.abs(v) >= 1) out.push({ label: `${label} ${v > 0 ? '+' : ''}${Math.round(v)}`, cls }); };
  push('灵石', b.stones - a.stones, b.stones >= a.stones ? 'gold' : 'down');
  if (b.progress !== a.progress) out.push({ label: `修为 +${Math.round(b.progress - a.progress)}`, cls: 'up' });
  push('气血', b.hp - a.hp, b.hp >= a.hp ? 'up' : 'down');
  push('心境', b.mood - a.mood, b.mood >= a.mood ? 'up' : 'down');
  push('寿元', b.life - a.life, b.life >= a.life ? 'up' : 'down');
  push('名声', b.fame - a.fame, b.fame >= a.fame ? 'up' : 'down');
  push('秘密', b.exposure - a.exposure, b.exposure <= a.exposure ? 'up' : 'down');
  push('血债', b.blood - a.blood, b.blood <= a.blood ? 'up' : 'down');
  push('信誉', b.credit - a.credit, b.credit >= a.credit ? 'up' : 'down');
  push('关注', b.heat - a.heat, b.heat <= a.heat ? 'up' : 'down');
  push('暗伤', b.physique - a.physique, b.physique <= a.physique ? 'up' : 'down');
  push('道心', b.dao - a.dao, b.dao <= a.dao ? 'up' : 'down');
  push('贡献', b.contrib - a.contrib, 'gold');
  if (b.tier !== a.tier) out.push({ label: `晋入 ${realmLabel(b.tier, b.sub)}`, cls: 'up' });
  else if (b.sub !== a.sub) out.push({ label: `${realmLabel(b.tier, b.sub)}`, cls: 'up' });
  if (b.kills > a.kills) out.push({ label: '手上多了一条人命', cls: 'down' });
  return out;
}


















