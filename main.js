'use strict';
/* =============================================================
   入口：标题页 · 开局 roll · 界面事件绑定
   ============================================================= */

let DIFF = 1;
let ROLL = null;

const DIFF_TIP = [
  '天意眷顾。判定易成，对手偏弱，另赐一枚还魂丹。',
  '修仙本艰。成算与凶险皆如常理。',
  '步步杀机。判定艰难，对手强悍，稍有不慎即身死道消。',
];

/* ---------------- 卜卦 ---------------- */
function rollFate() {
  const origin = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
  /* 身世影响灵根概率：书香/大宗门旁支更容易出好灵根 */
  const pool = ROOTS.map((r) => {
    let w = r.weight;
    if (origin.id === 'shuxiang') w *= r.stars >= 3 ? 1.8 : 0.7;
    if (origin.id === 'yizu') w *= r.stars >= 3 ? 1.5 : 0.8;
    if (origin.id === 'liehu' || origin.id === 'liulang') w *= r.stars <= 2 ? 1.4 : 0.6;
    if (origin.id === 'modao') w *= (r.id === 'lei' || r.id === 'wu') ? 1.6 : 1;
    if (origin.id === 'qixuan') w *= (r.id === 'si' || r.id === 'san') ? 1.5 : 1;
    return { r, w };
  });
  const root = weightedPick(pool).r;
  const pos = pick(TRAITS_POS);
  let neg = pick(TRAITS_NEG);
  let guard = 0;
  while (neg.id === pos.id && guard++ < 30) neg = pick(TRAITS_NEG);
  ROLL = { origin, root, pos, neg };
  renderRoll();
}

function renderRoll() {
  if (!ROLL) return;
  const { origin, root, pos, neg } = ROLL;
  $('roll-grid').innerHTML = `
    <div class="roll-card">
      <div class="rk">身 世</div>
      <div class="rv">${origin.name}</div>
      <div class="stars">${origin.tag}</div>
      <div class="rd">${origin.desc}</div>
    </div>
    <div class="roll-card">
      <div class="rk">灵 根</div>
      <div class="rv">${root.name}</div>
      <div class="stars">${'★'.repeat(root.stars)}${'☆'.repeat(5 - root.stars)}</div>
      <div class="rd">${root.desc}</div>
    </div>
    <div class="roll-card">
      <div class="rk">根 基</div>
      <div class="rv">${origin.age} 岁</div>
      <div class="stars">灵石 ${origin.stones} · 所在 ${REGION_MAP[origin.region].name}</div>
      <div class="rd">${origin.hook}</div>
    </div>`;
  $('trait-chips').innerHTML =
    `<span class="trait-chip good">${pos.name} · ${pos.desc}</span>
     <span class="trait-chip bad">${neg.name} · ${neg.desc}</span>`;
}

/* ---------------- 开始 ---------------- */
function enterGame() {
  if (!ROLL) return;
  const name = ($('input-name').value || '').trim() || '无名';
  const root = ROLL.root;
  newGame({
    name,
    origin: ROLL.origin.id,
    root: root.id,
    traitPos: ROLL.pos.id,
    traitNeg: ROLL.neg.id,
    diff: DIFF,
  });
}

/* ---------------- 引导 ---------------- */
/* 运行时错误直接显示在页面顶部，便于排查（也避免静默卡死） */
window.addEventListener('error', (ev) => {
  try {
    const d = document.createElement('div');
    d.id = 'err-banner';
    d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#3a1210;color:#ffb4a8;' +
      'padding:10px 14px;font:12px/1.6 monospace;white-space:pre-wrap;border-bottom:1px solid #a33';
    d.textContent = '脚本错误：' + ev.message + '\n' + ((ev.error && ev.error.stack) || '');
    document.body.appendChild(d);
  } catch (e) {}
});

function boot() {
  /* 难度 */
  document.querySelectorAll('.diff-btn').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      DIFF = parseInt(b.dataset.diff, 10);
      $('diff-tip').textContent = DIFF_TIP[DIFF];
    });
  });

  $('btn-roll').addEventListener('click', () => {
    rollFate();
    hide('title-start');
    show('roll-panel');
  });
  $('btn-reroll').addEventListener('click', () => rollFate());
  $('btn-enter').addEventListener('click', enterGame);

  /* 续档 */
  if (hasSave()) {
    const b = $('btn-resume');
    b.hidden = false;
    b.addEventListener('click', () => {
      if (!loadGame()) { toast('存档读取失败', 'down'); return; }
      hide('screen-title');
      show('screen-game');
      renderHUD();
      renderPlacePanel();
      if (S.over) { gameOver(); return; }
      if (S.pendingEvents && S.pendingEvents.length && S.eventIdx < S.pendingEvents.length) {
        renderEvent(S.pendingEvents[S.eventIdx], S.eventIdx, S.pendingEvents.length);
      } else {
        renderActionChoice();
      }
    });
  }

  /* 侧栏按钮 */
  $('btn-bag').addEventListener('click', () => { if (S) openBag(); });
  $('btn-char').addEventListener('click', () => { if (S) openChar(); });
  $('btn-npc').addEventListener('click', () => { if (S) openNpcs(); });
  $('btn-world').addEventListener('click', () => { if (S) openWorld(); });
  $('btn-shop').addEventListener('click', () => { if (S) openShop(); });
  $('btn-help').addEventListener('click', () => { if (S) openHelp(); });
  $('modal-close').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  $('btn-again').addEventListener('click', () => {
    hide('screen-end');
    hide('screen-game');
    show('screen-title');
    show('title-start');
    hide('roll-panel');
    ROLL = null;
    S = null; W = null;
    if (hasSave()) $('btn-resume').hidden = false;
    $('input-name').value = '';
  });

  /* 键盘 */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'b' || e.key === 'B') { if (S && !S.over) openBag(); }
    if (e.key === 'c' || e.key === 'C') { if (S && !S.over) openChar(); }
  });

  /* 调试：?auto=20 自动跑，检查报错 */
  const q = new URLSearchParams(location.search);
  if (q.get('demo')) {
    DIFF = 1;
    rollFate();
    hide('title-start');
    show('roll-panel');
    const dm = q.get('demo');
    if (['game','event','battle','action','end'].indexOf(dm) >= 0) {
      enterGame();
      if (dm === 'event') setTimeout(() => beginAction('youli'), 80);
      if (dm === 'action') setTimeout(() => { try { chooseOption(0); advanceAfterResult(); setTimeout(() => { try { nextTurn(); } catch (e) {} }, 80); } catch (e) {} }, 100);
      if (dm === 'battle') setTimeout(() => { try { startBattle(mookPower(1), '拦路的散修', '那人把法器横在路前：「留下储物袋。」'); } catch (e) {} }, 120);
      if (dm === 'end') setTimeout(() => { try { S.over = 'die'; S.overText = '寿元尽了。你合上眼时，窗外正下着雨。'; gameOver(); } catch (e) {} }, 120);
    }
  }
  if (q.get('auto')) autoRun(parseInt(q.get('auto'), 10) || 5);
}

/* ---------------- 自动跑局（调试用） ---------------- */
function autoRun(n) {
  let done = 0, guard = 0;
  const tick = () => {
    if (++guard > 4000) { console.log('AUTO: guard stop'); return; }
    if (done >= n) { console.log('AUTO: finished', done); return; }
    if ($('screen-end') && !$('screen-end').hidden) {
      console.log(`AUTO 局${done + 1}: ${S.name} 享年${S.age} 境界${realmLabel()} 年${W.year} 结局${S.over} 道途${routeLabel()}`);
      done++;
      $('btn-again').click();
      rollFate();
      hide('title-start'); show('roll-panel');
      enterGame();
      setTimeout(tick, 30);
      return;
    }
    if (S && S.over) { gameOver(); setTimeout(tick, 20); return; }
    const battleBtn = $('battle') && !$('battle').hidden ? $('battle').querySelector('[data-st]') : null;
    if (battleBtn) { battleBtn.click(); setTimeout(tick, 10); return; }
    const endBtn = $('battle') && !$('battle').hidden ? $('battle').querySelector('#btn-battle-end') : null;
    if (endBtn) { endBtn.click(); setTimeout(tick, 10); return; }
    const cont = $('btn-continue');
    if (cont) { cont.click(); setTimeout(tick, 10); return; }
    const nextYear = $('btn-next-year');
    if (nextYear) { nextYear.click(); setTimeout(tick, 10); return; }
    const opt2 = document.querySelector('.opt');
    if (opt2) { opt2.click(); setTimeout(tick, 10); return; }
    const act = document.querySelector('.action-card');
    if (act) { act.click(); setTimeout(tick, 10); return; }
    setTimeout(tick, 30);
  };
  setTimeout(tick, 300);
}

document.addEventListener('DOMContentLoaded', boot);














