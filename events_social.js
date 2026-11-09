'use strict';
/* =============================================================
   事件内容 · 人情与道义
   ============================================================= */

/* ---------------- 被人追杀 ---------------- */
ev({
  id: 'rescue_flee', name: '负伤之人', kind: 'moral', base: 7, cooldown: 2,
  weight(c) {
    let w = 5 + (c.danger - 1) * 8;
    if (c.W.era === 'war') { w += 6; c.why(6, '战乱之年'); }
    if (c.is('bihai')) w -= 3;
    if (c.h().bloodDebt > 15) w += 2;
    return w;
  },
  build(c) {
    const victim = c.someNpc((n) => n.side !== '魔') || c.anyNpc((n) => n.side !== '魔');
    const chaser = c.someNpc((n) => n.side === '魔') || c.anyNpc();
    if (!victim) return null;
    victim.known = true;
    return {
      title: '负伤之人',
      text: `一道遁光跌跌撞撞落在你面前，是个浑身是血的女修。她一条手臂已经抬不起来，见了你却先亮出一柄短剑，嘶声道：「道友若是也想分一杯羹，尽管来。」远处天边，两道黑影正在逼近。`,
      opts: [
        opt('挡在她身前，替她拦下追兵', '险', () => {
          fx.fame(rndInt(4, 9)); fx.bond(victim.id, 18); fx.exposure(3);
          fx.route('changsheng', 2);
          return `你没说话，只是往她前面站了一步。追来的两个魔修对视一眼，其中一个狞笑着扑了上来。\n` +
            fightNpc(chaser, '魔修冷哼一声，祭出一柄血色短刀。', { onWin: { bond: [victim.id, 10], fame: 6 } });
        }),
        opt('替她指一条小路，自己抽身', '机', () => {
          fx.bond(victim.id, 8); fx.mood(1);
          return `你指了指东南方一条猎户走的窄道：「往那边，三里外有片瘴林，进去他们就追不上了。」她深深看你一眼，转身就走。`;
        }),
        opt('趁她重伤，夺了她的储物袋', '险', () => {
          fx.blood(1); fx.fame(-8); fx.route('liesha', 5); fx.stones(rndInt(30, 90));
          fx.bond(victim.id, -40); fx.grudge(victim.id, 30);
          return `你走近，她眼里的光一点点冷下去。储物袋里有几十块灵石和一枚还带着体温的玉简。你没有杀她，只是走了。她在背后看着你，一句话也没说。`;
        }),
      ],
    };
  },
});

/* ---------------- 宗门弟子 ---------------- */
ev({
  id: 'sect_disciple', name: '宗门弟子', kind: 'social', base: 6, cooldown: 3,
  weight(c) {
    let w = 4 + clamp(c.W.powers.huangFeng / 40, 0, 2);
    if (c.is('shifang')) w += 4;
    if (c.S.hidden.fame > 30) w += 3;
    if (c.S.sect) w -= 2;
    return w;
  },
  build(c) {
    const sect = pick(['黄枫谷', '清虚门', '天阙堡', '化刀坞', '巨剑门']);
    return {
      title: '宗门弟子',
      text: `一队${sect}的外门弟子从你身边经过，为首那个忽然停下，上下打量你：「散修？一个人在这荒山野岭里转，胆子不小。」他身后几个弟子笑了一声，笑得不太客气。`,
      opts: [
        opt('不卑不亢，报上名号', '稳', () => {
          if (chk(0.6 + traitEff('social'))) {
            fx.fame(3); fx.credit(4);
            return `你抱拳，语气不软不硬。那弟子愣了一下，反倒收了轻视，随口提了几句${sect}最近在招人的事，才带着人走了。`;
          }
          fx.fame(-2); fx.mood(-3);
          return `你的话里带了几分傲气。对方脸色一沉，斥了句「不知天高地厚」，扬长而去。`;
        }),
        opt('低头让路，少惹事端', '稳', () => {
          fx.mood(-2); fx.exposure(-3);
          return `你退到路边，垂手让行。他们大概觉得无趣，嘟囔了两句便走了。你看着他们的背影，把这一口气咽了下去。`;
        }),
        opt('出言讥讽，激他一激', '险', () => {
          if (chk(0.35)) {
            fx.fame(5); fx.route('liesha', 3);
            return `你只说了一句话，那弟子的脸就涨红了。他扑上来，被你一记不轻不重的手法卸了力道，跌坐在地。同门哗然，你却已经拱手退开：「承让。」`;
          }
          fx.fame(-6); return `话一出口，那几个弟子就围了上来。\n` + fight(mookPower(1.1), `${sect}弟子`, '几个人同时祭出法器，灵光在你眼前炸开。');
        }),
      ],
    };
  },
});

/* ---------------- 坊市骗子 ---------------- */
ev({
  id: 'swindler', name: '坊市骗局', kind: 'social', base: 6, cooldown: 4,
  weight(c) {
    let w = 3;
    if (c.is('shifang')) { w += 7; c.why(7, '坊市经营'); }
    if (c.S.hidden.credit < 0) w += 2;
    return w;
  },
  build(c) {
    return {
      title: '坊市骗局',
      text: `坊市角落里，一个獐头鼠目的修士正在向几个凡俗富商兜售「续命丹」，说得天花乱坠，一枚要价五十两黄金。你一眼就看出来，那不过是掺了朱砂的草木丸，吃不死人，也续不了命。`,
      opts: [
        opt('当场揭穿他', '机', () => {
          if (chk(0.7)) {
            fx.fame(6); fx.credit(8); fx.mood(3);
            return `你走过去，只说了三味药的药性，那修士的脸就白了。富商们千恩万谢，坊市管事也赶了过来，对你拱手道谢，说日后在坊市里有什么事尽管找他。`;
          }
          fx.heat(4); fx.mood(1);
          return `你揭穿了他，他却反咬一口，说你是同行来砸场子的。管事和了半天稀泥，最后不了了之。那修士临走时狠狠瞪了你一眼。`;
        }),
        opt('私下找他，要一份封口费', '险', () => {
          fx.stones(rndInt(20, 55)); fx.credit(-6); fx.fame(-4); fx.route('caifa', 5);
          return `你把人拉到巷子里，说了三句话。他脸色变了三次，最后乖乖掏出一袋灵石。这种事，你知道不该做，可灵石是真的。`;
        }),
        opt('不关我事，走开', '稳', () => {
          fx.mood(-1);
          return `你看了两眼，转身走了。这世上骗人的和被偏的太多，轮不到你一个个去管。`;
        }),
      ],
    };
  },
});

/* ---------------- 路边尸骨 ---------------- */
ev({
  id: 'corpse', name: '路边尸骨', kind: 'moral', base: 6, cooldown: 3,
  weight(c) {
    let w = 4 + (c.danger - 1) * 10;
    if (c.W.era === 'war' || c.W.era === 'scar') { w += 7; c.why(7, '战乱遗尸'); }
    if (c.is('youli')) w += 2;
    return w;
  },
  build(c) {
    return {
      title: '路边尸骨',
      text: `道旁的草窠里躺着一个人，还没死透，胸口微微起伏。看衣着是个散修，储物袋还挂在腰上，袋口露着半截玉简。他听见你的脚步声，眼珠艰难地转了转。`,
      opts: [
        opt('救人，喂他一枚疗伤丹', '稳', () => {
          if (itemCount('heal') > 0) {
            addItem('heal', -1);
            const n = c.someNpc((x) => x.realm <= c.S.tier) || c.anyNpc();
            if (n) {
              n.known = true; fx.bond(n.id, 20); fx.fame(4); fx.mood(4);
              return `你撬开他的牙关，把丹药喂了进去。半个时辰后，他咳出一口黑血，活了过来。他叫${n.name}，说什么也要把身上一半的灵石塞给你。`;
            }
            fx.fame(4); fx.mood(4);
            return `你救了他。他喘匀了气，千恩万谢地走了，临走前告诉你一个去处——说那里或许有你要的东西。`;
          }
          fx.mood(-2);
          return `你摸了摸袖袋，疗伤丹早就用完了。只能眼看着他的呼吸一点点弱下去。`;
        }),
        opt('取走储物袋，给他个痛快', '险', () => {
          fx.blood(1); fx.fame(-6); fx.stones(rndInt(20, 60)); fx.item('herb', 1); fx.route('liesha', 4);
          return `他没有反抗，只是看着你。你取走储物袋，一掌按在他天灵上。玉简里是一门残缺的功法，还有几块灵石。你起身走了，没有回头。`;
        }),
        opt('只取走玉简，替他合上眼', '机', () => {
          fx.learnTech(pick(['changchun', 'huoyan', 'xuangui'])); fx.mood(2); fx.fame(1);
          return `你把玉简收进袖里，又伸手替他把眼皮抹了下来。「借你功法一用，来世还你。」你在心里说。`;
        }),
      ],
    };
  },
});

/* ---------------- 讨价还价 ---------------- */
ev({
  id: 'haggle', name: '讨价还价', kind: 'trade', base: 7, cooldown: 2,
  weight(c) {
    let w = 4;
    if (c.is('shifang')) { w += 10; c.why(10, '坊市经营'); }
    if (c.S.hidden.credit > 20) { w += 3; c.why(3, '坊市信誉'); }
    return w;
  },
  build(c) {
    const g = pick(['herb', 'material', 'talisman', 'heal']);
    const qty = g === 'herb' ? rndInt(3, 8) : rndInt(1, 3);
    const ask = Math.round(buyPrice(g, c.S.region) * qty * 1.3);
    return {
      title: '讨价还价',
      text: `一个收货的客商拦住你，指着你袋里的${GOODS[g].name}，开价${ask}块灵石，说是「看在同道的份上」。你心里清楚，这价钱压得有点狠。`,
      opts: [
        opt('咬死价钱，一分不让', '机', () => {
          if (chk(0.5 + traitEff('social') + c.S.hidden.credit / 300)) {
            const gain = Math.round(ask * 1.5);
            fx.stones(gain); fx.credit(4); fx.route('caifa', 3);
            return `你报了个价，他摇头；你转身就走，走出七步，他在后面喊住了你。最后成交的价钱，比他开的多了五成。`;
          }
          fx.stones(Math.round(ask * 0.7)); fx.mood(-2);
          return `客商见你不松口，冷笑一声，转头去问别人了。你站了一会儿，最后还是按他的价卖了——东西压久了会跌。`;
        }),
        opt('按他的价卖了，图个爽快', '稳', () => {
          fx.stones(ask); fx.credit(2); fx.route('caifa', 1);
          return `你点头，交易干净利落。客商眉开眼笑，说以后有好货尽管来找他。`;
        }),
        opt('不卖了，留着等涨价', '稳', () => {
          fx.item(g, qty); fx.flag('hoard', c.W.era === 'war');
          return `你把东西收了回去。战乱年月，这类货只会越来越贵。`;
        }),
      ],
    };
  },
});

/* ---------------- 稚子 ---------------- */
ev({
  id: 'child', name: '测灵根的孩子', kind: 'moral', base: 4, cooldown: 6,
  weight(c) {
    let w = 2;
    if (c.W.publicEvent && c.W.publicEvent.id === 'sectRecruit') { w += 8; c.why(8, '宗门招新'); }
    if (c.S.hidden.fame > 40) w += 3;
    if (c.is('shifang')) w += 2;
    return w;
  },
  build(c) {
    return {
      title: '测灵根的孩子',
      text: `镇口围了一圈人。一个宗门执事模样的修士坐在长桌后，面前摆着一面铜镜。一个瘦小的孩子把手按上去，镜面半天没有动静。执事摇头：「无灵根，下一个。」孩子不肯走，被他娘拽着，眼泪在眼眶里打转。`,
      opts: [
        opt('上前替孩子说几句话', '稳', () => {
          fx.fame(4); fx.mood(3); fx.route('changsheng', 1);
          return `你蹲下来，替那孩子把袖子撸好，说了句：「灵根是老天给的，路是自己走的。」执事看了你一眼，没再赶人。孩子冲你磕了个头。`;
        }),
        opt('给那孩子留几块灵石', '稳', () => {
          fx.stones(-10); fx.fame(3); fx.mood(4); fx.credit(2);
          return `你把十块灵石塞进孩子他娘手里，说：「让他读点书，学门手艺。」那妇人愣住了，回过神来，已经找不到你的影子。`;
        }),
        opt('看看那面铜镜，动了心思', '机', () => {
          if (chk(0.55 + traitEff('appraise'))) {
            fx.item('material', 1); fx.stones(rndInt(10, 30));
            return `你借着看热闹凑近，发现那铜镜其实是件旧法器，镜背刻着半幅测灵阵。你记下了阵纹的走向——这东西对你有用。`;
          }
          fx.exposure(2); fx.heat(2);
          return `你在铜镜前站得太久，执事抬眼打量了你一下，眼神里有几分警惕。你不动声色地退开了。`;
        }),
      ],
    };
  },
});

/* ---------------- 故人重逢 ---------------- */
ev({
  id: 'old_friend', name: '故人重逢', kind: 'social', base: 3, cooldown: 7,
  weight(c) {
    const bonded = livingNPCs().filter((n) => n.bond >= 10);
    if (!bonded.length) return 0;
    let w = 3 + bonded.length * 1.5;
    if (c.is('shifang') || c.is('youli')) w += 3;
    return w;
  },
  build(c) {
    const n = livingNPCs().filter((x) => x.bond >= 10 && x.region === S.region)[0]
      || livingNPCs().filter((x) => x.bond >= 10).sort((a, b) => b.bond - a.bond)[0];
    if (!n) return null;
    return {
      title: '故人重逢',
      text: `${n.name}在人群中一眼认出了你。比起上次见面，他${n.realm > 1 ? '修为似乎又精进了' : '气色好了些'}，只是眉宇间多了些风霜。「道友，」他走过来，压低声音，「我正有一件事，想找个人搭把手。」`,
      opts: [
        opt('听他细说，答应帮忙', '机', () => {
          fx.bond(n.id, 10); fx.stones(rndInt(15, 40)); fx.route('quanshu', 2); fx.progress(0.04);
          return `他说的是一件不算太凶险的差事：替他去一处旧洞府取一箱东西。事成之后，他分了你三成。散修之间，这样的交情已经难得。`;
        }),
        opt('婉言谢绝，只叙旧', '稳', () => {
          fx.bond(n.id, 3); fx.mood(2);
          return `你摇了摇头，说最近不便远行。他倒也理解，两人在茶棚里坐了一会儿，说了些旧事，各自散了。`;
        }),
        opt('反过来问他，有没有什么消息能卖', '机', () => {
          if (chk(0.6)) {
            fx.stones(rndInt(10, 25)); fx.credit(3);
            return `他想了想，说了一条：某处坊市最近在收一批妖兽材料，价钱比外头高两成。你把消息记下，回头跑了一趟。`;
          }
          fx.bond(n.id, -5);
          return `他脸上的笑意淡了几分，说：「道友还是老样子。」聊了没几句就告辞了。`;
        }),
      ],
    };
  },
});

/* ---------------- 恩将仇报 ---------------- */
ev({
  id: 'betray', name: '同行者', kind: 'danger', base: 5, cooldown: 5,
  weight(c) {
    let w = 2 + (c.S.hidden.bloodDebt > 10 ? 2 : 0);
    const greedy = c.someNpc((n) => n.temper === '狠戾' || n.temper === '市侩');
    if (greedy) w += 3;
    if (c.S.stones > 150) { w += 4; c.why(4, '身家颇丰'); }
    return w;
  },
  build(c) {
    const n = c.someNpc((x) => x.temper === '狠戾' || x.temper === '市侩' || x.temper === '狂妄') || c.someNpc() || c.anyNpc();
    if (!n) return null;
    n.known = true;
    return {
      title: '同行者',
      text: `路上遇到${n.name}，说是同路，问能不能结伴走一程。荒山野岭，两个人总比一个人强，你答应了。走了半日，他忽然停下，指着前方一处岔口说：「道友先请。」`,
      opts: [
        opt('让他先走', '机', () => {
          if (chk(0.6 + traitEff('ambush'))) {
            fx.bond(n.id, 4); fx.mood(1);
            return `你侧身让路，手却一直没离开储物袋。他犹豫了一下，到底还是先走了。转过山坳，他回头冲你笑了笑，那笑意里有种说不清的东西。`;
          }
          fx.hp(-0.15);
          return `他走过你身边时，袖中忽然寒光一闪。你早有防备，堪堪侧身，肩头还是被划开一道口子。\n` + fightNpc(n, '他见偷袭不成，索性撕破脸皮。');
        }),
        opt('直接翻脸，先下手为强', '险', () => {
          fx.fame(-3); fx.blood(1);
          return `你二话不说，一掌拍在他后心。\n` + fightNpc(n, '他踉跄转身，眼中满是惊怒：「你——」');
        }),
        opt('笑着说：就在此处分手吧', '稳', () => {
          fx.bond(n.id, -8); fx.exposure(2);
          return `你抱了抱拳：「前面路不同，就此别过。」他盯着你看了两眼，也抱拳，转身走了。你等他走远，才从另一条路绕行。`;
        }),
      ],
    };
  },
});

/* ---------------- 红颜 / 道侣之缘 ---------------- */
ev({
  id: 'romance', name: '月下相逢', kind: 'social', base: 2.5, cooldown: 10, minTier: 1,
  weight(c) {
    let w = 2;
    if (hasNegTrait('gudu')) w *= 0.5;
    if (c.S.hidden.fame > 20) w += 1.5;
    if (c.is('yinni')) w -= 1;
    return w;
  },
  build(c) {
    const n = c.someNpc((x) => x.side !== '魔' && x.realm >= 1) || c.anyNpc((x) => x.realm >= 1);
    if (!n) return null;
    n.known = true;
    return {
      title: '月下相逢',
      text: `月色很好。你在溪边打坐，听见对岸有琴声，断断续续的，弹到一半又停了。抬头时，看见${n.name}坐在对岸的石头上，也正看着你。`,
      opts: [
        opt('踏水过去，坐一坐', '机', () => {
          fx.bond(n.id, 16); fx.mood(8); fx.dao(-3);
          return `你们隔着一臂的距离坐着，谁也没说几句话。月亮偏西时，她起身走了，临去时留了一句话：「道友的心，太静了。」`;
        }),
        opt('远远抱拳，继续打坐', '稳', () => {
          fx.dao(2); fx.mood(2);
          return `你冲对岸拱了拱手，重新阖上眼。琴声再响时，你已经入了定。`;
        }),
        opt('以琴音试探她的修为', '机', () => {
          if (chk(0.5 + c.S.wits * 0.02)) {
            fx.bond(n.id, 6); fx.exposure(-2);
            return `你随手拨了两下溪水，水声里带了一丝真元。对岸的琴声顿了顿，随即也掺了几分灵力回应。一来一往，彼此都摸到了对方的底。`;
          }
          fx.bond(n.id, -6);
          return `你的试探太露。琴声戛然而止，对岸的人已经不见了。`;
        }),
      ],
    };
  },
});
