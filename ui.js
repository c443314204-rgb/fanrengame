'use strict';
/* =============================================================
   界面渲染层
   ============================================================= */

const TAGS = { 稳: 'wen', 险: 'xian', 机: 'ji', 耗: 'hao' };

/* ---------------- 通用 ---------------- */
function toast(text, kind) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = el('div', 'toast' + (kind === 'down' ? ' down' : ''), esc(text));
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2100);
}

function show(id) { const e = $(id); if (e) e.hidden = false; }
function hide(id) { const e = $(id); if (e) e.hidden = true; }

/* ---------------- HUD ---------------- */
function renderHUD() {
  const R = tier();
  $('hud-name').textContent = S.name;
  $('hud-sub').textContent = `${S.origin ? ORIGINS.find((o) => o.id === S.origin).name : ''}${S.sect ? ' · ' + S.sect : ''}`;
  $('hud-realm').textContent = realmLabel();
  $('hud-phase').textContent = R.phase || (S.tier === 0 ? '红尘' : '');
  $('hud-age').textContent = `${S.age} 岁`;
  const left = S.life - S.age;
  $('hud-lifespan').textContent = `寿元 ${Math.max(0, left)}`;
  $('hud-lifespan').className = left <= 15 ? 'danger' : '';
  const lifePct = clamp(left / Math.max(1, S.life) * 100, 0, 100);
  $('hud-life-bar').style.width = lifePct + '%';
  $('hud-life-bar').style.background = left <= 15 ? 'var(--red)' : '';

  const need = S.tier === 0 ? 100 : needForSub();
  const pct = S.tier === 0 ? clamp((S.age - 14) / 20 * 100, 0, 100) : clamp(S.progress / need * 100, 0, 100);
  $('hud-prog-bar').style.width = pct + '%';
  $('hud-prog-text').textContent = S.tier === 0 ? '凡骨未开' : `${Math.round(S.progress)} / ${Math.round(need)}`;

  $('hud-hp-bar').style.width = clamp(S.hp / maxHp() * 100, 0, 100) + '%';
  $('hud-mp-bar').style.width = clamp(S.mp / maxMp() * 100, 0, 100) + '%';
  $('hud-hp-text').textContent = `${Math.round(S.hp)} / ${maxHp()}`;
  $('hud-mp-text').textContent = `${Math.round(S.mp)} / ${maxMp()}`;
  $('hud-stones').textContent = fmt(S.stones);
  $('hud-items').textContent = fmt(Object.values(S.items).reduce((a, b) => a + b, 0));
  $('hud-mood').textContent = Math.round(S.mood);
  $('hud-tech').textContent = S.tech ? '所修 · ' + TECHS[S.tech].name : '尚未修习功法';
  $('hud-place').textContent = `${REGION_MAP[S.region].name} · ${S.place}`;
  $('hud-year').textContent = `第 ${cn(W.year)} 年`;
  $('hud-era').textContent = ERA_MAP[W.era].name;

  const rm = $('hud-route-mini');
  if (rm) rm.textContent = routeLabel();
  const wb = $('world-brief');
  if (wb) wb.innerHTML = makeBriefing();
  renderLeftPanel();
  renderRightPanel();
}

function attrRow(name, val, max, label, cls) {
  const w = clamp(val / max * 100, 0, 100);
  return `<div class="attr-row"><span class="attr-name">${name}</span>
    <span class="attr-bar"><i class="${cls || ''}" style="width:${w}%"></i></span>
    <span class="attr-val ${cls === 'hot' ? 'bad' : cls === 'gold' ? 'good' : ''}">${label}</span></div>`;
}

function renderLeftPanel() {
  const h = S.hidden;
  const box = $('left-attr');
  if (!box) return;
  box.innerHTML =
    attrRow('名声', Math.abs(h.fame), 100, fameLabel(), h.fame >= 0 ? '' : 'hot') +
    attrRow('暴露', h.exposure, 100, exposureLabel(), h.exposure > 55 ? 'hot' : '') +
    attrRow('血债', h.bloodDebt, 40, bloodLabel(), h.bloodDebt > 15 ? 'hot' : '') +
    attrRow('信誉', Math.abs(h.credit), 100, h.credit > 60 ? '一言九鼎' : h.credit > 25 ? '商誉不错' : h.credit > -10 ? '寻常' : '无人敢赊', 'gold') +
    attrRow('关注', h.heat, 100, heatLabel(), h.heat > 45 ? 'hot' : '') +
    attrRow('暗伤', h.physique, 100, physiqueLabel(), h.physique > 40 ? 'hot' : '') +
    attrRow('道心', h.daoMind, 100, daoLabel(), h.daoMind > 40 ? 'hot' : '');

  /* 仇家 */
  const enemies = Object.entries(h.enemyWeight)
    .filter(([id, v]) => v >= 8 && NPCS[id] && NPCS[id].alive)
    .sort((a, b) => b[1] - a[1]).slice(0, 4);
  const eb = $('left-enemies');
  if (eb) {
    if (!enemies.length) eb.innerHTML = '<div class="empty">暂无人记恨于你</div>';
    else eb.innerHTML = enemies.map(([id, v]) => {
      const n = NPCS[id];
      return `<div class="npc-row"><span class="npc-name">${esc(n.name)}</span>
        <span class="npc-rel rel-enemy">${v >= 50 ? '寻仇中' : v >= 25 ? '怀恨在心' : '有些过节'}</span>
        <span class="npc-last">${esc(n.place)}</span></div>`;
    }).join('');
  }
}

function renderRightPanel() {
  const rb = $('right-route');
  if (rb) {
    const top = routeTop();
    rb.innerHTML = Object.entries(ROUTES).map(([id, r]) => {
      const v = S.routes[id] || 0;
      const w = clamp(v / 60 * 100, 0, 100);
      return `<div class="route-row ${id === top.id && top.score >= 12 ? 'top' : ''}">
        <span class="rn">${r.name}</span><span class="rb"><i style="width:${w}%"></i></span>
        <span class="rv">${Math.round(v)}</span></div>`;
    }).join('');
  }
  const fb = $('right-faction');
  if (fb) {
    const list = [['zheng', '正道'], ['mo', '魔道']];
    const zheng = sum(ZHENG_IDS.map((i) => W.powers[i])) / 7;
    const mo = sum(MO_IDS.map((i) => W.powers[i])) / 6;
    fb.innerHTML =
      `<div class="fac-row"><span class="fn">正道七派</span><span class="fb"><i class="zheng" style="width:${clamp(zheng, 0, 100)}%"></i></span><span class="fv">${Math.round(zheng)}</span></div>
       <div class="fac-row"><span class="fn">魔道六宗</span><span class="fb"><i class="mo" style="width:${clamp(mo, 0, 100)}%"></i></span><span class="fv">${Math.round(mo)}</span></div>
       <div class="fac-row"><span class="fn">散修</span><span class="fb"><i class="zheng" style="width:${clamp(W.powers.sanxiu, 0, 100)}%"></i></span><span class="fv">${Math.round(W.powers.sanxiu)}</span></div>
       <div class="fac-row"><span class="fn">坊市</span><span class="fb"><i class="zheng" style="width:${clamp(W.powers.fangshi, 0, 100)}%"></i></span><span class="fv">${Math.round(W.powers.fangshi)}</span></div>`;
  }
  const nb = $('right-news');
  if (nb) {
    nb.innerHTML = W.news.slice(0, 4).map((n) => `<div class="log-row"><span class="ly">${n.year}</span>${esc(n.text)}</div>`).join('') || '<div class="empty">天下太平</div>';
  }
}

/* ---------------- 场所面板 ---------------- */
function renderPlacePanel() {
  const reg = REGION_MAP[S.region];
  const box = $('place-info');
  if (!box) return;
  const goods = ['heal', 'mana', 'talisman', 'herb'];
  box.innerHTML = `<div class="panel-title">坊市行情<span class="pt-extra">${reg.name}</span></div>` +
    goods.map((g) => {
      const p = priceOf(g, S.region);
      const cls = p >= 1.3 ? 'bad' : p <= 0.8 ? 'good' : '';
      const arrow = p >= 1.3 ? '↑' : p <= 0.8 ? '↓' : '·';
      return `<div class="fac-row"><span class="fn">${GOODS[g].name}</span>
        <span class="fb"><i class="zheng" style="width:${clamp(p / 2.6 * 100, 4, 100)}%"></i></span>
        <span class="fv ${cls}">${arrow}${Math.round(p * 100)}</span></div>`;
    }).join('') +
    `<div class="fac-row" style="margin-top:6px"><span class="fn">危险</span><span class="fb"><i class="mo" style="width:${clamp(reg.danger * 45, 10, 100)}%"></i></span><span class="fv">${'★'.repeat(Math.min(5, Math.round(reg.danger * 2.2)))}</span></div>`;
}

/* ---------------- 舞台 ---------------- */
function setStage(html) {
  const r = $('scene-result');
  if (r) r.hidden = true;
  const c = $('btn-continue');
  if (c) { c.hidden = true; c.onclick = null; }
  const n = $('btn-next-year');
  if (n) { n.hidden = true; n.onclick = null; }
  const d = $('stage-dyn');
  if (d) d.innerHTML = html;
}

function renderYearHeader(sub) {
  return `<div class="year-line"><span class="yl">第${cn(W.year)}年</span>
    <span class="yl-sub">${ERA_MAP[W.era].name} · ${S.age}岁 · ${REGION_MAP[S.region].name}</span></div>${sub || ''}`;
}

/* 行动选择 */
function renderActionChoice() {
  const list = AVAILABLE_ACTIONS();
  const cards = list.map((a) => {
    let extra = '';
    if (a.id === 'bihai') extra = `拟闭关 ${S.flags.seclusionYears || defaultSeclusion()} 年`;
    if (a.id === 'tupo') extra = S.pendingBreak ? `成算 ${Math.round(breakthroughChance(S.pendingBreak) * 100)}%` : '修为未满';
    return `<button class="action-card ${a.cls || ''}" data-act="${a.id}" ${a.disabled ? 'disabled' : ''}>
      <span class="label"><b>${a.name}</b><em>${a.desc}</em></span>
      <span class="ac-meta">${extra || a.meta || ''}</span></button>`;
  }).join('');

  setStage(renderYearHeader() + `
    <article class="scene">
      <div class="scene-head"><span class="scene-kicker">年 初</span>
        <span class="scene-badge jade">择一年之计</span></div>
      <h2 class="scene-title">今年，做什么？</h2>
      <div class="scene-text"><p>${esc(briefingText())}</p></div>
      <div class="action-grid">${cards}</div>
      ${S.pendingBreak ? '<div class="why-box"><b>修为圆满</b><span class="witem">你的修为已经修满，可择「冲关」一途。</span></div>' : ''}
    </article>`);

  $('stage-main').querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.act;
      if (id === 'bihai') { openSeclusion(); return; }
      if (id === 'tupo') { doBreakthroughAction(); return; }
      if (id === 'travel') { openTravel(); return; }
      beginAction(id);
    });
  });
}

function briefingText() {
  const era = ERA_MAP[W.era];
  const reg = REGION_MAP[S.region];
  const bits = [`${era.name}，${era.desc}`];
  if (W.publicEvent) bits.push(`今年${W.publicEvent.name}。${publicEventText(W.publicEvent.id)}`);
  const mo = sum(MO_IDS.map((i) => W.powers[i])) / 6;
  const zheng = sum(ZHENG_IDS.map((i) => W.powers[i])) / 7;
  if (W.era === 'war') bits.push(mo > zheng ? '魔道势大，正道节节败退。' : '战局胶着，谁也不敢说下一刻会怎样。');
  const hunters = Object.entries(S.hidden.enemyWeight).filter(([id, v]) => v >= 20 && NPCS[id] && NPCS[id].alive);
  if (hunters.length) bits.push(`你隐约觉得，${NPCS[hunters[0][0]].name}还在寻你。`);
  if (S.hidden.exposure >= 70) bits.push('你身上的东西，越来越藏不住了。');
  if (S.life - S.age <= 20) bits.push('寿元将尽，你夜里常常睡不着。');
  return bits.join('');
}

/* ---------------- 事件展示 ---------------- */
function renderEvent(evt, idx, total) {
  const steps = total > 1
    ? `<div class="event-steps">${Array.from({ length: total }, (_, i) =>
        `<span class="es ${i < idx ? 'done' : i === idx ? 'now' : ''}"></span>`).join('')}</div>`
    : '';
  const kindCls = ['combat', 'nemesis', 'danger', 'calamity', 'war'].includes(evt.kind) ? 'red' : 'jade';
  const opts = evt.opts.map((o, i) =>
    `<button class="opt" data-opt="${i}">
      <span class="num">${i + 1}</span>
      <span class="label">${esc(o.text)}</span>
      <span class="tag ${TAGS[o.tag] || 'wen'}">${o.tag || '稳'}</span>
    </button>`).join('');

  setStage(renderYearHeader(steps) + `
    <article class="scene">
      <div class="scene-head"><span class="scene-kicker">年 中</span>
        <span class="scene-badge ${kindCls}">${kindName(evt.kind)}</span></div>
      <h2 class="scene-title">${esc(evt.title)}</h2>
      <div class="scene-text">${evt.text.split('\n').map((p) => `<p>${p}</p>`).join('')}</div>
      <div class="options">${opts}</div>
      ${evt.why && evt.why.length ? `<div class="why-box"><b>天机</b><span class="witem">此事之所以发生：${whyText(evt.why)}</span></div>` : ''}
    </article>`);

  $('stage-main').querySelectorAll('[data-opt]').forEach((b) => {
    b.addEventListener('click', () => chooseOption(parseInt(b.dataset.opt, 10)));
  });
}

function kindName(k) {
  return {
    explore: '机缘', combat: '凶险', social: '人情', moral: '道义', trade: '买卖',
    market: '坊市', craft: '炉火', cultivate: '修行', hide: '蛰伏', sect: '宗门',
    war: '战乱', danger: '杀机', nemesis: '因果', calamity: '奇祸', fate: '奇缘', misc: '见闻',
  }[k] || '遭逢';
}

/* 结果：直接写进固定的结果区，避免按钮随舞台重建而丢失监听 */
function renderResult(text, deltas, contLabel) {
  const chips = (deltas || []).map((d) =>
    `<span class="chip ${d.cls || 'plain'}">${d.label}</span>`).join('');
  const t = $('result-text');
  if (t) t.innerHTML = text.split('\n').map((p) => `<p>${p}</p>`).join('');
  const d = $('result-deltas');
  if (d) d.innerHTML = chips;
  S.resultOpen = true;
  const b = $('btn-continue');
  if (b) {
    b.textContent = contLabel || '继 续';
    b.hidden = false;
    b.onclick = () => { b.hidden = true; advanceAfterResult(); };
  }
  const r = $('scene-result');
  if (r) r.hidden = false;
  const n = $('btn-next-year');
  if (n) { n.hidden = true; n.onclick = null; }
}

/* 岁末 */
function renderYearEnd() {
  const rows = S.history.slice(-5).map((h) => `<div><span class="cy">${h.year}</span>${esc(h.text)}</div>`).join('');
  setStage(renderYearHeader() + `
    <article class="scene">
      <div class="scene-head"><span class="scene-kicker">年 末</span>
        <span class="scene-badge">岁月不居</span></div>
      <h2 class="scene-title">又是一年</h2>
      <div class="scene-text">
        <p>这一年过去了。你的修为有${S.tier === 0 ? '些微长进' : '所精进'}，寿元又少了一载。</p>
        <p>${S.hidden.physique > 40 ? '旧伤在阴雨天里隐隐作痛。' : ''}${S.hidden.daoMind > 40 ? '心绪总也静不下来。' : ''}</p>
        <p class="em">${realmLabel()} · ${S.age} 岁 · 余寿 ${Math.max(0, S.life - S.age)} 年</p>
      </div>
      <div class="chronicle">${rows || '<div>尚无记事</div>'}</div>
    </article>`);
  const b = $('btn-next-year');
  if (b) { b.hidden = false; b.onclick = () => { b.hidden = true; if (S.over) { gameOver(); return; } nextTurn(); }; }
}

/* ---------------- 闭关弹层 ---------------- */
function openSeclusion() {
  const maxY = Math.max(1, S.life - S.age - 1);
  const def = Math.min(defaultSeclusion(), maxY);
  const all = [def, 1, 3, 5, 10, 20, 50, 100].filter((y, i, arr) => y <= maxY && arr.indexOf(y) === i);
  const html = `<div class="sec-title">闭关年数</div>
    <p class="empty" style="padding:0 0 10px">修为不足时闭关是正途；但坐得越久，暗伤与心魔积得越深，外界也会变。</p>
    <div class="action-grid">${all.map((y) =>
      `<button class="action-card ${y === def ? 'safe' : ''}" data-y="${y}"><span class="label"><b>${y} 年${y === def ? '（推荐）' : ''}</b>
        <em>得修为约 ${Math.round(yearGain() * y * (1 + Math.log2(y) * 0.1))}；${y >= 20 ? '长关易生心魔、错过大事' : '风险较小'}</em></span></button>`).join('')}</div>`;
  openModal('闭 关', html);
  $('modal-body').querySelectorAll('[data-y]').forEach((b) => {
    b.addEventListener('click', () => {
      S.flags.seclusionYears = parseInt(b.dataset.y, 10);
      closeModal();
      beginAction('bihai');
    });
  });
}

/* ---------------- 行旅弹层 ---------------- */
function openTravel() {
  const html = `<div class="sec-title">去往何处</div><div class="action-grid">${REGIONS.map((r) =>
    `<button class="action-card ${r.id === S.region ? 'safe' : ''}" data-reg="${r.id}" ${r.id === S.region ? 'disabled' : ''}>
      <span class="label"><b>${r.name}</b><em>${r.desc}</em></span>
      <span class="ac-meta">凶险 ${'★'.repeat(Math.min(5, Math.round(r.danger * 2.2)))} · 物价 ${Math.round(priceOf('heal', r.id) * 100)}%</span></button>`).join('')}</div>`;
  openModal('行 旅', html);
  $('modal-body').querySelectorAll('[data-reg]').forEach((b) => {
    b.addEventListener('click', () => {
      S.region = b.dataset.reg;
      S.place = pick(REGION_MAP[S.region].places);
      S.hidden.heat = Math.max(0, S.hidden.heat * 0.3);
      addHidden('credit', 0);
      closeModal();
      beginAction('travel');
    });
  });
}

/* ---------------- 战斗界面 ---------------- */
function openBattleUI() {
  show('battle');
  renderBattle();
}
function renderBattle() {
  const B = S.battle;
  if (!B) return;
  const e = B.enemy;
  const gap = realmGap();
  const trumps = availableTrumps();
  const ended = B.over;

  $('battle').innerHTML = `<div class="battle-inner">
    <div class="battle-top">
      <span class="battle-tag">斗 法</span>
      <span>攻 克 闪 · 闪 克 守 · 守 克 攻</span>
      <span class="battle-turn">第 ${cnSafe(B.round)} 回合</span>
    </div>
    <div class="enemy-card">
      <div class="enemy-head"><span class="enemy-name">${esc(e.name)}</span>
        <span class="enemy-realm">${realmLabel(e.realm, 0)}${gap >= 2 ? ' · 境界碾压' : gap === 1 ? ' · 高你一阶' : gap === 0 ? ' · 同阶' : ' · 逊你一筹'}</span></div>
      <div class="bar enemy-hp"><i style="width:${clamp(e.hp / e.maxHp * 100, 0, 100)}%"></i></div>
      <div class="enemy-nums"><span>气血 ${Math.round(e.hp)} / ${e.maxHp}</span>
        <span>${B.enemyPoison > 0 ? '中毒 ' + B.enemyPoison + ' 回合' : ''}${B.puppet > 0 ? ' · 傀儡 ' + B.puppet : ''}${e.enraged ? ' · 狂暴' : ''}</span></div>
    </div>
    <div class="battle-self">
      <div class="self-row"><b>${esc(S.name)}</b><span>${realmLabel()}</span>
        <span class="bar hp"><i style="width:${clamp(S.hp / maxHp() * 100, 0, 100)}%"></i></span>
        <span>${Math.round(S.hp)}/${maxHp()}</span></div>
      <div class="self-row"><span>法力</span>
        <span class="bar mp"><i style="width:${clamp(S.mp / maxMp() * 100, 0, 100)}%"></i></span>
        <span>${Math.round(S.mp)}/${maxMp()}</span></div>
    </div>
    <div class="battle-log">${B.log.slice(-8).map((l) => `<p class="${l.cls}">${l.t}</p>`).join('')}</div>
    ${ended ? battleResultHTML() : `
    <div class="battle-actions">
      <button data-st="attack" class="ba-danger">攻</button>
      <button data-st="defend">守</button>
      <button data-st="dodge">闪</button>
    </div>
    <div class="trumps">
      ${trumps.map((t) => `<button class="trump" data-trump="${t.id}">${t.name} ×${itemCount(t.id)}</button>`).join('')}
      <button class="trump" data-flee="1">${itemCount('escape') > 0 ? '遁地符 ×' + itemCount('escape') : '走'}</button>
    </div>
    <div class="battle-hint">${gap >= 2
      ? '境界相差太远，正面相搏几乎必死。用底牌，或者走。'
      : gap === 1
        ? '对方境界高你一阶，硬拼凶多吉少。底牌是你唯一的机会。'
        : '同阶相争，攻守闪各有所克。'}</div>`}
  </div>`;

  if (!ended) {
    $('battle').querySelectorAll('[data-st]').forEach((b) =>
      b.addEventListener('click', () => { if (!S.battle.over) resolveRound(b.dataset.st); }));
    $('battle').querySelectorAll('[data-trump]').forEach((b) =>
      b.addEventListener('click', () => { if (!S.battle.over) useTrump(b.dataset.trump); }));
    const fl = $('battle').querySelector('[data-flee]');
    if (fl) fl.addEventListener('click', () => { if (!S.battle.over) tryFlee(); });
  } else {
    const btn = $('battle').querySelector('#btn-battle-end');
    if (btn) btn.addEventListener('click', () => {
      const r = S.battle.result;
      S.battle = null;
      hide('battle');
      if (r === 'die') { S.over = 'die'; gameOver(); return; }
      battleFinished(r);
    });
  }
}
function cnSafe(n) { return n > 10 ? String(n) : CN_NUM[n] || String(n); }

function battleResultHTML() {
  const B = S.battle;
  const e = B.enemy;
  if (B.result === 'win') {
    return `<div class="battle-result">
      <div class="result-body"><p>${esc(e.name)}倒下了。你收起法器，喘了几口气。袖中多了${B.rewardStones || 0}块灵石。</p></div>
      <button class="btn btn-primary next" id="btn-battle-end">收 拾 残 局</button></div>`;
  }
  if (B.result === 'flee') {
    return `<div class="battle-result">
      <div class="result-body"><p>你脱身了。${esc(e.name)}没有追来——也许是不屑，也许是追不上。</p></div>
      <button class="btn btn-primary next" id="btn-battle-end">离 开</button></div>`;
  }
  if (B.result === 'survive') {
    return `<div class="battle-result">
      <div class="result-body"><p class="warn">你活了下来，可这一战伤得不轻。暗伤又添了一层。</p></div>
      <button class="btn btn-primary next" id="btn-battle-end">勉 强 起 身</button></div>`;
  }
  return `<div class="battle-result">
    <div class="result-body"><p class="warn">眼前一黑。你听见自己的血在流。</p></div>
    <button class="btn btn-primary next" id="btn-battle-end">……</button></div>`;
}

/* ---------------- 玩法说明 ---------------- */
function openHelp() {
  openModal('玩 法', `
    <div class="sec-title">一局怎么走</div>
    <div class="bag-item"><span class="bi-desc">先卜卦定身世、灵根与两个隐藏特质。之后每回合是一年：选一项年度行动 → 年中撞上 0~2 件事 → 年末结算。寿元耗尽、战死、走火都会结束这一局。</span></div>
    <div class="sec-title">事件不是抽卡</div>
    <div class="bag-item"><span class="bi-desc">每件事的触发概率由「世界状态 × 你的状态」算出。你安分守己，遇上的多是采药、偶遇；你杀人夺宝、露财炫富，仇家、通缉、夺宝袭击就会接踵而至。事件下方「天机」一行写着它为什么找上你。</span></div>
    <div class="sec-title">左侧的因果</div>
    <div class="bag-item"><span class="bi-desc">名声、暴露、血债、信誉、关注、暗伤、道心，只给模糊标签。它们决定你会遇到什么，也决定突破成算与别人对你的态度。</span></div>
    <div class="sec-title">右侧的道途</div>
    <div class="bag-item"><span class="bi-desc">没有职业选择。你做什么，道途就往哪边偏：坊市经营涨财阀，宗门公务涨权斗，杀人夺宝涨猎杀，炼丹炼器涨宗师。结局会告诉你这一生活成了什么样。</span></div>
    <div class="sec-title">斗法</div>
    <div class="bag-item"><span class="bi-desc">境界差两阶以上，正面硬拼必死，只能靠底牌或跑。同阶才拼攻守闪。符箓、傀儡、毒、阵盘，提前备好，比临场搏命有用。</span></div>
    <div class="sec-title">其他</div>
    <div class="bag-item"><span class="bi-desc">「囊」看储物袋与功法，「人」看自身，「缘」看识得的人，「市」买卖货物，「世」看天下大势。进度自动存档。</span></div>`);
}

/* ---------------- 坊市 ---------------- */
const SHOP_GOODS = ['heal', 'mana', 'break', 'mind', 'marrow', 'life',
  'escape', 'talAtk', 'talDef', 'poison', 'puppet', 'array', 'herb', 'material'];

function openShop() {
  const rows = SHOP_GOODS.map((id) => {
    const it = ITEMS[id] || GOODS[id] || { name: id, desc: '' };
    const price = buyPrice(id, S.region);
    const own = itemCount(id);
    const can = S.stones >= price;
    return `<div class="bag-item"><span class="bi-name">${it.name || id}</span>
      <span class="bi-count">${own ? '×' + own : ''}</span>
      <span class="bi-desc">${it.desc || ''}　价 ${price} 灵石</span>
      <button class="bi-use" data-buy="${id}" ${can ? '' : 'disabled'}>买</button>
      <button class="bi-use" data-sell="${id}" ${own ? '' : 'disabled'}>卖 ${own ? sellPrice(id, S.region) : ''}</button>
    </div>`;
  }).join('');
  openModal('坊 市', `<div class="sec-title">${REGION_MAP[S.region].name} · 坊市</div>
    <div class="bag-item"><span class="bi-desc">手头灵石 ${Math.round(S.stones)}。信誉 ${Math.round(S.hidden.credit)}，露财 ${Math.round(S.hidden.exposure)}。买得越多，越容易被人盯上。</span></div>
    ${rows}<div class="sec-title">行情（以平常年为十成）</div>
    <div class="bag-item"><span class="bi-desc">丹药 ${Math.round(priceOf('heal', S.region) * 100)}% · 灵药 ${Math.round(priceOf('herb', S.region) * 100)}% · 符箓 ${Math.round(priceOf('talisman', S.region) * 100)}% · 法器 ${Math.round(priceOf('art', S.region) * 100)}%</span></div>`);
  $('modal-body').querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.buy;
    const p = buyPrice(id, S.region);
    if (S.stones < p) { toast('灵石不够', 'down'); return; }
    addStones(-p); addItem(id, 1);
    addExposure(2); addHidden('heat', 1);
    toast(`买下${(ITEMS[id] || GOODS[id]).name}`);
    renderHUD(); openShop();
  }));
  $('modal-body').querySelectorAll('[data-sell]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.sell;
    if (itemCount(id) < 1) return;
    addItem(id, -1); addStones(sellPrice(id, S.region)); addRoute('caifa', 1);
    toast(`卖出${(ITEMS[id] || GOODS[id]).name}`);
    renderHUD(); openShop();
  }));
}

/* ---------------- 弹层 ---------------- */
function openModal(title, html) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = html;
  show('modal');
}
function closeModal() { hide('modal'); }

function openBag() {
  const items = Object.keys(S.items).filter((k) => S.items[k] > 0);
  const usable = { heal: 1, mana: 1, break: 0, mind: 1, marrow: 1, life: 1 };
  const html = `<div class="sec-title">储物袋</div>` + (items.length ? items.map((id) => {
    const it = ITEMS[id] || GOODS[id] || { name: id, desc: '' };
    const can = usable[id];
    return `<div class="bag-item"><span class="bi-name">${it.name || id}</span>
      <span class="bi-count">×${S.items[id]}</span>
      <span class="bi-desc">${it.desc || ''}</span>
      ${can ? `<button class="bi-use" data-use="${id}">用</button>` : '<span class="bi-desc">（非即时可用）</span>'}</div>`;
  }).join('') : '<div class="empty">囊中空空</div>') +
    `<div class="sec-title">已修功法</div>` + (S.learned.length ? S.learned.map((t) =>
      `<div class="bag-item"><span class="bi-name">${TECHS[t].name}</span><span class="bi-count">${t === S.tech ? '主修' : ''}</span>
        <span class="bi-desc">${TECHS[t].desc}</span>
        ${t !== S.tech ? `<button class="bi-use" data-tech="${t}">改修</button>` : ''}</div>`).join('') : '<div class="empty">尚未得授功法</div>') +
    `<div class="sec-title">法宝</div>` + (S.arts.length ? S.arts.map((a) =>
      `<div class="bag-item"><span class="bi-name">${TREASURES[a].name}</span><span class="bi-desc">${TREASURES[a].desc}</span></div>`).join('') : '<div class="empty">尚无趁手之物</div>') +
    `<div class="sec-title">存档</div><div class="bag-item"><span class="bi-desc">进度自动保存在浏览器本地</span>
      <button class="bi-use" data-save="export">导出</button><button class="bi-use" data-save="import">导入</button></div>`;
  openModal('储 物 袋', html);

  $('modal-body').querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => {
    useItem(b.dataset.use); openBag(); renderHUD();
  }));
  $('modal-body').querySelectorAll('[data-tech]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.tech;
    S.tech = t; toast(`改修《${TECHS[t].name}》`); openBag(); renderHUD();
  }));
  $('modal-body').querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.save === 'export') { exportSave(); }
    else { importSave(); }
  }));
}

function useItem(id) {
  if (itemCount(id) < 1) return;
  if (id === 'heal') { addItem('heal', -1); addHp(Math.round(maxHp() * 0.4)); toast('服下疗伤丹，气血恢复'); }
  else if (id === 'mana') { addItem('mana', -1); addMp(Math.round(maxMp() * 0.4)); toast('服下聚灵丹，法力恢复'); }
  else if (id === 'mind') { addItem('mind', -1); addDao(-12); addMood(6); toast('定神丹入腹，心绪渐平'); }
  else if (id === 'marrow') { addItem('marrow', -1); addPhysique(-20); toast('洗髓丹化开，暗伤稍解'); }
  else if (id === 'life') { addItem('life', -1); addLife(10); toast('延寿丹，寿元 +10'); }
  else if (id === 'break') { toast('破障丹留到冲关时用'); }
}

function openNpcs() {
  const list = livingNPCs().filter((n) => n.known || n.bond !== 0 || (S.hidden.enemyWeight[n.id] || 0) > 5)
    .sort((a, b) => Math.abs(b.bond) + (S.hidden.enemyWeight[b.id] || 0) - Math.abs(a.bond) - (S.hidden.enemyWeight[a.id] || 0));
  const html = `<div class="sec-title">你识得的人（${list.length}）</div>` + (list.length ? list.map((n) => {
    const g = S.hidden.enemyWeight[n.id] || 0;
    const rel = g >= 25 ? 'rel-enemy' : n.bond >= 15 ? 'rel-ally' : 'rel-known';
    const relTxt = g >= 25 ? npcRelLabel(-g) : n.bond ? npcRelLabel(n.bond) : '点头之交';
    return `<div class="npc-row"><span class="npc-name">${esc(n.name)}</span>
      <span class="npc-realm">${realmLabel(n.realm, n.sub)}</span>
      <span class="npc-rel ${rel}">${relTxt}</span>
      <span class="npc-last">${n.canon ? '' : esc(n.tag) + ' · '}${esc(n.place)} · ${esc(n.goal)}</span></div>`;
  }).join('') : '<div class="empty">你还未识得什么人</div>') +
    `<div class="sec-title">天下人（存活 ${livingNPCs().length}）</div>
     <div class="empty">这世上还有许多你不认得的人，正在你不知道的地方活着、争斗、死去。</div>`;
  openModal('人 脉', html);
}

function openWorld() {
  const rows = W.log.slice(0, 40).map((l) =>
    `<div class="log-row"><span class="ly">${l.year}</span>${esc(l.text)}</div>`).join('');
  const facs = ['yanYue', 'lingShou', 'huangFeng', 'qingXu', 'huaDao', 'tianQue', 'juJian', 'yuLing', 'heHuan', 'guiLing', 'moYan', 'tianSha', 'qianHuan']
    .map((id) => `<div class="fac-row"><span class="fn" style="width:62px">${FACTIONS[id].name}</span>
      <span class="fb"><i class="${FACTIONS[id].side === '魔' ? 'mo' : 'zheng'}" style="width:${W.powers[id]}%"></i></span>
      <span class="fv">${Math.round(W.powers[id])}</span></div>`).join('');
  openModal('世 界', `<div class="sec-title">势力消长</div>${facs}<div class="sec-title">天下大事</div>${rows || '<div class="empty">尚无大事</div>'}`);
}

function openChar() {
  const h = S.hidden;
  const pos = findTrait(S.traits.pos), neg = findTrait(S.traits.neg);
  const html = `<div class="sec-title">${esc(S.name)}</div>
    <div class="bag-item"><span class="bi-name">出身</span><span class="bi-desc">${ORIGINS.find((o) => o.id === S.origin).name}</span></div>
    <div class="bag-item"><span class="bi-name">灵根</span><span class="bi-desc">${rootInfo().name} · ${rootInfo().stars}星 · 修行速度 ${Math.round(rootInfo().speed * 100)}%</span></div>
    <div class="bag-item"><span class="bi-name">境界</span><span class="bi-desc">${realmLabel()} · ${S.age}岁 · 余寿 ${S.life - S.age}</span></div>
    <div class="bag-item"><span class="bi-name">宗门</span><span class="bi-desc">${S.sect ? S.sect + (S.rank ? ' · ' + S.rank : '') + ' · 贡献 ' + S.contrib : '无门无派'}</span></div>
    <div class="sec-title">资质</div>
    <div class="bag-item"><span class="bi-name">悟性</span><span class="bi-desc">${S.wits}</span></div>
    <div class="bag-item"><span class="bi-name">根骨</span><span class="bi-desc">${S.body}</span></div>
    <div class="bag-item"><span class="bi-name">身法</span><span class="bi-desc">${S.agi}</span></div>
    <div class="bag-item"><span class="bi-name">神识</span><span class="bi-desc">${S.spirit}</span></div>
    <div class="sec-title">天赋</div>
    ${pos ? `<div class="bag-item"><span class="bi-name" style="color:var(--jade)">${pos.name}</span><span class="bi-desc">${pos.desc}</span></div>` : ''}
    ${neg ? `<div class="bag-item"><span class="bi-name" style="color:var(--red)">${neg.name}</span><span class="bi-desc">${neg.desc}</span></div>` : ''}
    <div class="sec-title">因果</div>
    <div class="bag-item"><span class="bi-name">名声</span><span class="bi-desc">${fameLabel()}（${Math.round(h.fame)}）</span></div>
    <div class="bag-item"><span class="bi-name">秘密</span><span class="bi-desc">${exposureLabel()}（${Math.round(h.exposure)}）</span></div>
    <div class="bag-item"><span class="bi-name">血债</span><span class="bi-desc">${bloodLabel()}（${Math.round(h.bloodDebt)}）</span></div>
    <div class="bag-item"><span class="bi-name">信誉</span><span class="bi-desc">坊市信誉 ${Math.round(h.credit)}</span></div>
    <div class="bag-item"><span class="bi-name">道心</span><span class="bi-desc">${daoLabel()}</span></div>
    <div class="bag-item"><span class="bi-name">道途</span><span class="bi-desc">${routeLabel()}</span></div>
    <div class="sec-title">生平</div>
    ${S.history.slice(-8).reverse().map((x) => `<div class="log-row"><span class="ly">${x.year}</span>${esc(x.text)}</div>`).join('') || '<div class="empty">尚无生平</div>'}`;
  openModal('人 物', html);
}

/* ---------------- 结局 ---------------- */
function gameOver() {
  hide('battle');
  closeModal();
  hide('screen-game');
  show('screen-end');
  const top = routeTop();
  const isAscend = S.over === 'ascend';
  const route = top.score >= 12 ? ROUTES[top.id] : null;
  $('end').className = 'end-inner ' + (isAscend ? 'win' : 'dark');
  $('end-kicker').textContent = isAscend ? '道 成' : '身 死 道 消';
  $('end-title').textContent = isAscend ? '飞升' : (S.over === 'die' ? '身死' : '坐化');
  $('end-text').textContent = S.overText || '';
  $('end-route').innerHTML = route ? `一生道途：<b>${route.name}</b>　${route.desc}` : '一生道途：<b>未定之途</b>';
  $('end-stats').innerHTML = `
    <div><span>享年</span><b>${S.age} 岁</b></div>
    <div><span>境界</span><b>${realmLabel()}</b></div>
    <div><span>阅历</span><b>${W.year} 年</b></div>
    <div><span>手上人命</span><b>${S.stats.kills}</b></div>`;
}

/* ---------------- 存档 ---------------- */
function saveGame() {
  try {
    const copy = Object.assign({}, S);
    /* 事件里含函数，不能入档；读档后从「择一年之计」重新开始 */
    copy.pendingEvents = [];
    copy.pendingBattle = null;
    copy.afterBattle = null;
    copy.battle = null;
    copy.eventIdx = 0;
    copy.pendingBreak = null;
    const data = { S: copy, W, npcs: NPCS, order: NPC_ORDER, v: 13 };
    localStorage.setItem('fanren_v13_save', JSON.stringify(data));
  } catch (e) { /* 忽略 */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem('fanren_v13_save');
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d.S || d.v !== 13) return false;
    S = d.S; W = d.W;
    S.battle = null;
    S.pendingEvents = [];
    S.pendingBattle = null;
    S.afterBattle = null;
    for (const k in NPCS) delete NPCS[k];
    Object.assign(NPCS, d.npcs || {});
    NPC_ORDER = d.order || Object.keys(NPCS);
    return true;
  } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem('fanren_v13_save'); } catch (e) { return false; } }
function exportSave() {
  const raw = localStorage.getItem('fanren_v13_save');
  if (!raw) { toast('尚无存档'); return; }
  const b64 = btoa(unescape(encodeURIComponent(raw)));
  prompt('存档码（复制保存）：', b64);
}
function importSave() {
  const b64 = prompt('粘贴存档码：');
  if (!b64) return;
  try {
    const raw = decodeURIComponent(escape(atob(b64.trim())));
    localStorage.setItem('fanren_v13_save', raw);
    toast('导入成功，请刷新页面');
  } catch (e) { toast('存档码无效', 'down'); }
}







