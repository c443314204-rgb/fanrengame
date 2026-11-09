'use strict';
/* =============================================================
   事件内容 · 战乱与凶险（世界时代越乱，这一批越容易撞上）
   ============================================================= */

/* ---------------- 征召 ---------------- */
ev({
  id: 'conscript', name: '征召令', kind: 'war', base: 4, cooldown: 4,
  weight(c) {
    if (!c.war) return 0;
    let w = 6 + (c.W.era === 'war' ? 8 : 0);
    c.why(6, '战乱之年');
    if (c.S.sect) { w += 6; c.why(6, '身属宗门'); }
    if (c.S.hidden.fame > 20) { w += 4; c.why(4, '小有名气'); }
    return w;
  },
  build(c) {
    const sect = pick(['黄枫谷', '天阙堡', '清虚门', '化刀坞']);
    return {
      title: '征召令',
      text: `${sect}的执事带着两名弟子堵在坊市口，手里一叠名册：「战事吃紧，凡在越国境内的散修，炼气五层以上者，一律随军听调。有异议的，现在可以说。」他身后那两名弟子，都已经把手按在了法器上。`,
      opts: [
        opt('应召随军', '险', () => {
          fx.fame(8); fx.stones(rndInt(20, 60));
          fx.route('quanshu', 6); fx.exposure(4);
          if (!S.sect) { S.sect = '军中'; S.rank = '征召散修'; }
          return `你被编进了后队，负责巡守一段城墙。三个月里，你见过三次夜袭，杀了两个摸上城的魔修斥候。军功记在册上，也记在了某些人的眼里。\n` +
            (chance(0.45) ? '守城最险的那一夜，你差点没挺过来。\n' + fight(mookPower(1.2), '魔修斥候', '几条黑影翻上城墙，刀光在月色下亮得刺眼。') : '万幸，你没有撞上真正的高手。');
        }),
        opt('塞灵石打点，求个免征', '机', () => {
          const cost = Math.max(20, Math.round(buyPrice('heal', c.S.region) * 3));
          if (c.S.stones < cost) return `你摸了摸储物袋，凑不出这个数。执事的目光已经落在你身上了。`;
          fx.stones(-cost); fx.credit(-4); fx.fame(-3);
          return `你把一名弟子拉到一边，往他袖里塞了个袋子。他掂了掂，冲执事摇了摇头：「此人修为不够，不堪大用。」名册翻过去，你的名字没了。`;
        }),
        opt('连夜出城，避往他国', '险', () => {
          if (chk(0.55 + traitEff('flee'))) {
            fx.region('beiliang'); fx.heat(6); fx.mood(-4);
            return `你连夜出了城，一路向北。走出越国边境时，回头看见南边的天是红的。你换了地方，也换了活法。`;
          }
          fx.fame(-8); fx.exposure(6); fx.heat(10);
          return `城门口盘查极严。你被拦下时，那执事盯着你的脸看了很久：「就是你，昨夜翻墙的那个。」\n` + fight(mookPower(1.3), '宗门执法弟子', '两人一左一右围了上来。');
        }),
      ],
    };
  },
});

/* ---------------- 逃难的凡人 ---------------- */
ev({
  id: 'refugee', name: '逃难的人群', kind: 'war', base: 5, cooldown: 3,
  weight(c) {
    if (!c.war && c.W.era !== 'scar') return 0;
    let w = 8;
    c.why(8, '战乱流民');
    if (c.S.hidden.fame > 0) w += 2;
    return w;
  },
  build(c) {
    return {
      title: '逃难的人群',
      text: `官道上全是人。推车的、抱孩子的、背着一口破锅的。有人倒在路边就没再起来，也没人多看一眼。一个老妇拽住你的衣角，问：「仙师，往北还走得通吗？」`,
      opts: [
        opt('给他们指一条安全的道', '稳', () => {
          fx.fame(4); fx.mood(5); fx.dao(-2);
          return `你蹲下来，用树枝在地上画了个图，告诉他们哪条山路没有魔修。老妇千恩万谢，你摆摆手走了。走出很远，还听见有人在念你的好。`;
        }),
        opt('施舍些灵石与丹药', '稳', () => {
          fx.stones(-Math.min(c.S.stones, 30)); fx.item('heal', -1); fx.fame(6); fx.mood(6);
          return `你把身上的丹药分了，又留下几十块灵石。在这乱世里，这些东西够几十口人活上一年。`;
        }),
        opt('这片地方待不得了，快走', '稳', () => {
          fx.mood(-3); fx.heat(-2);
          return `你从人群边上绕过去，一路向北。身后是哭声和火光，你没有回头。`;
        }),
      ],
    };
  },
});

/* ---------------- 战场余烬 ---------------- */
ev({
  id: 'war_loot', name: '战场余烬', kind: 'war', base: 5, cooldown: 3,
  weight(c) {
    if (c.W.era !== 'war' && c.W.era !== 'scar') return 0;
    let w = 9;
    c.why(9, '战场废墟');
    if (c.S.hidden.fame < -20) { w += 4; c.why(4, '恶名在外'); }
    if (c.is('youli')) w += 3;
    return w;
  },
  build(c) {
    return {
      title: '战场余烬',
      text: `这里三天前还是两军对垒的地方。现在只剩焦土和横七竖八的尸首，有几具还保持着斗法的姿势。灵光早已散尽，可散落的储物袋、断掉的法器、没烧完的丹药，都还在。远处有乌鸦在叫。`,
      opts: [
        opt('翻检尸首，能拿的都拿走', '险', () => {
          const gain = rndInt(40, 140);
          fx.stones(gain); fx.item('material', 2); fx.item('herb', 1);
          fx.fame(-3); fx.blood(2); fx.route('liesha', 5); fx.dao(3);
          return `你像捡柴一样，一具具翻过去。有些尸体还温着。你摸到两只储物袋、几块炼器材料，还有半瓶没洒完的丹药。走到最后，你发现自己已经不再数这是第几具了。`;
        }),
        opt('只找还活着的人', '稳', () => {
          if (chk(0.4)) {
            const n = c.someNpc((x) => x.side !== '魔') || c.anyNpc();
            if (n) {
              n.known = true; fx.bond(n.id, 25); fx.fame(5); fx.mood(4);
              return `焦土下压着一个人，还有气。你把他刨出来，喂了药。他睁开眼看着你，嘴唇动了动，说了半句「我欠你一条命」。`;
            }
          }
          fx.fame(3); fx.mood(3); fx.dao(-2);
          return `你找了一圈，只找到一个还有气的，救到一半就断了气。你替他合上眼，把人埋了。`;
        }),
        opt('谨慎些，先布个警戒阵', '机', () => {
          if (chk(0.55 + c.S.wits * 0.02)) {
            fx.stones(rndInt(60, 120)); fx.item('material', 1); fx.insight ? 0 : 0;
            fx.route('zongshi', 2);
            return `你在四周布了一圈简易的警戒阵，这才放心翻找。果然有人来——两个同样来捡便宜的，被阵法惊动，远远看见你就退了。你从容拿走了最值钱的东西。`;
          }
          fx.hp(-0.15);
          return `阵还没布完，背后就挨了一记闷棍。\n` + fight(mookPower(1.1), '同行', '「见者有份。」那人咧嘴一笑。');
        }),
      ],
    };
  },
});

/* ---------------- 魔修 ---------------- */
ev({
  id: 'demon_cultivator', name: '魔修', kind: 'combat', base: 5, cooldown: 2,
  weight(c) {
    let w = 3 + (c.war ? 6 : 0) + (c.danger - 1) * 8;
    if (c.S.hidden.exposure > 50) { w += 5; c.why(5, '秘密暴露'); }
    if (c.S.hidden.fame < -30) { w += 3; }
    if (c.P && c.P.mo) w += 2;
    c.why(c.war ? 6 : 0, c.war ? '正魔交战' : '');
    return w;
  },
  build(c) {
    const n = c.someNpc((x) => x.side === '魔') || c.anyNpc((x) => x.side === '魔');
    if (!n) return null;
    n.known = true;
    return {
      title: '魔修',
      text: `${n.name}拦在山谷口，一身黑袍，脸上浮着不正常的青气。他上下打量你，像在看一件货：「修为不高，气血倒是干净。跟你商量个事——把储物袋留下，我放你走。」`,
      opts: [
        opt('「阁下不妨试试。」', '险', () => fightNpc(n, '他舔了舔嘴唇，一柄骨刀无声出鞘。')),
        opt('扔出储物袋，乘机遁走', '机', () => {
          if (chk(0.65 + traitEff('flee'))) {
            const lost = Math.min(c.S.stones, rndInt(20, 60));
            fx.stones(-lost); fx.exposure(-4); fx.mood(-3);
            return `你把储物袋往他脸上一扔，转身就催动遁光。他接袋子的那一瞬，你已经窜出百丈。袋里只有些灵石和杂物，值不了几个钱——可还是心疼。`;
          }
          fx.stones(-Math.min(c.S.stones, 80)); fx.hp(-0.15);
          return `他根本没去接袋子。你刚转身，后背就被一道黑气抽中，整个人扑倒在地。\n` + fightNpc(n, '「跑？」他笑起来，「我就喜欢会跑的。」');
        }),
        opt('亮出血债与恶名，与他论「同道」', '机', () => {
          if (c.S.hidden.bloodDebt >= 8 || c.S.hidden.fame <= -20) {
            fx.fame(-2); fx.exposure(3); fx.route('liesha', 4);
            return `你把手上的血债亮了出来。他眯起眼看了片刻，忽然哈哈一笑：「原来也是个手上有人的。早说。」他侧身让开了路，临走还拍了拍你的肩。`;
          }
          fx.hp(-0.2);
          return `你话还没说完，他就动了。「同道？」他冷笑，「你也配。」\n` + fightNpc(n, '骨刀已至面门。');
        }),
      ],
    };
  },
});

/* ---------------- 正道巡查 ---------------- */
ev({
  id: 'patrol', name: '正道巡查', kind: 'danger', base: 4, cooldown: 3,
  weight(c) {
    let w = 0;
    if (c.W.publicEvent && c.W.publicEvent.id === 'patrol') { w += 10; c.why(10, '正道巡查'); }
    if (c.S.hidden.bloodDebt > 10) { w += Math.min(12, c.S.hidden.bloodDebt * 0.4); c.why(Math.min(12, c.S.hidden.bloodDebt * 0.4), '血债在身'); }
    if (c.S.hidden.exposure > 50) { w += 6; c.why(6, '秘密暴露'); }
    if (c.S.hidden.fame < -30) { w += 3; }
    if (c.is('yinni')) w *= 0.4;
    return w;
  },
  build(c) {
    const sect = pick(['清虚门', '掩月宗', '黄枫谷']);
    return {
      title: '正道巡查',
      text: `三名${sect}的巡查弟子拦住去路，为首的是个筑基修士，手里托着一面照影镜：「例行盘查。姓名、出身、修习何功，报上来。」镜子一转，光晕扫过你的周身。你袖中的东西，似乎都无所遁形。`,
      opts: [
        opt('坦然受查，报个清白出身', '机', () => {
          if (chk(0.5 + traitEff('hide') + traitEff('social'))) {
            fx.exposure(-8); fx.heat(-4);
            return `你报了个假名和一处早已破落的小宗门。照影镜没照出什么，那筑基修士点点头，递给你一枚记名的木牌：「战乱期间，安分些。」`;
          }
          fx.exposure(5); fx.heat(6);
          return `你报的名字太生，照影镜又在你的袖袋上停了一瞬。那修士的眼神变了，却没当场发难，只是把你的样貌记进了玉简。这比被抓更糟。`;
        }),
        opt('亮出宗门令牌，攀扯关系', '机', () => {
          if (c.S.sect) {
            fx.exposure(-6); fx.credit(4); fx.fame(2);
            return `你亮出${c.S.sect}的令牌。那修士看了看，脸色缓和下来：「原来是同道。魔道猖獗，师弟也多加小心。」`;
          }
          fx.exposure(4);
          return `你根本没有宗门令牌。话说到一半，对方已经按住了法器。\n` + fight(mookPower(1.2), `${sect}巡查弟子`, '「冒充宗门弟子，拿下。」');
        }),
        opt('不答话，直接遁走', '险', () => {
          if (chk(0.45 + traitEff('flee'))) {
            fx.exposure(6); fx.heat(8); fx.fame(-4);
            return `你一言不发，转身就遁。身后传来惊呼和破空声，你专往山深林密处钻，绕了一整夜才把追兵甩掉。`;
          }
          fx.hp(-0.2); fx.exposure(8);
          return `你刚动，那面照影镜就照了过来。一股巨力压得你动弹不得。\n` + fight(mookPower(1.35), `${sect}巡查弟子`, '「果然有问题。」');
        }),
      ],
    };
  },
});

/* ---------------- 魔道招揽 ---------------- */
ev({
  id: 'demon_recruit', name: '魔道招揽', kind: 'danger', base: 3, cooldown: 6,
  weight(c) {
    let w = 0;
    if (c.S.hidden.bloodDebt > 12) { w += 6; c.why(6, '血债累累'); }
    if (c.S.hidden.fame < -25) { w += 5; c.why(5, '恶名昭彰'); }
    if (c.S.hidden.exposure > 60) { w += 4; c.why(4, '底细外露'); }
    if (c.war) { w += 4; }
    return w;
  },
  build(c) {
    return {
      title: '魔道招揽',
      text: `一个穿灰袍的中年人在茶棚里坐到你的对面，替你倒了一碗茶：「我看了你很久。你这样的人，留在外头可惜了。」他推过来一只储物袋，袋口敞着，里面的灵石堆得发亮，「六宗正在用人之际。入了门，功法、灵石、丹药，都有人替你安排。」`,
      opts: [
        opt('收下储物袋，跟他走', '险', () => {
          fx.stones(rndInt(80, 200)); fx.exposure(10); fx.blood(2);
          fx.setTech('xuanyin'); fx.route('liesha', 10); fx.fame(-10);
          return `你收下了。三日后，你在一处地下的石殿里按了血手印，成了一名魔道外门弟子。功法确实来得快，只是每次运功，经脉里都像有虫子在爬。`;
        }),
        opt('把茶泼了，起身就走', '稳', () => {
          fx.fame(3); fx.mood(2);
          return `你把那碗茶泼在地上，转身走出茶棚。那中年人没有拦你，只在背后叹了口气：「可惜。」`;
        }),
        opt('虚与委蛇，套些消息', '机', () => {
          if (chk(0.5 + traitEff('social'))) {
            fx.stones(rndInt(20, 50)); fx.exposure(4);
            fx.flag('demonContact', true);
            return `你含糊其辞，拖了他半个时辰，套出了六宗在附近的三处暗桩和一次近期的调兵。临走时他还握着你的手说「考虑考虑」。`;
          }
          fx.exposure(8);
          return `你演得太用力。他忽然笑了，笑意里有几分寒意：「你当我这双眼睛是摆设？」他起身走了，临走留下一句：「你会来找我的。」`;
        }),
      ],
    };
  },
});

/* ---------------- 邪祟缠身 ---------------- */
ev({
  id: 'haunt', name: '阴煞缠身', kind: 'danger', base: 4, cooldown: 4,
  weight(c) {
    let w = 2 + (c.S.hidden.daoMind > 30 ? 4 : 0) + (c.S.hidden.physique > 30 ? 3 : 0);
    if (hasNegTrait('zhaoxie')) { w += 7; c.why(7, '招邪体质'); }
    if (c.W.publicEvent && c.W.publicEvent.id === 'evilTide') { w += 10; c.why(10, '阴煞作祟'); }
    if (c.S.tier >= 3) w *= 0.6;
    return w;
  },
  build(c) {
    return {
      title: '阴煞缠身',
      text: `夜里打坐时，你听见有人在耳边说话。声音很轻，像是有个人贴在你后颈上，一字一句地念着你的名字。你睁眼，屋里什么都没有；你闭眼，那声音又来了，这次还带着笑。`,
      opts: [
        opt('运转功诀，以真元逼出邪祟', '机', () => {
          if (chk(0.55 + c.S.wits * 0.02 - c.S.hidden.daoMind / 300)) {
            fx.dao(-8); fx.mood(4); fx.progress(0.03);
            return `你把真元凝成一线，从识海一路逼到百会。那声音尖啸了一声，散了。窗外的月光重新变得干净。`;
          }
          fx.dao(10); fx.mood(-8); fx.hp(-0.1);
          return `真元一入识海，那东西就缠了上来。你看见了很多不属于自己的画面——有人在你这个年纪死了，死得很难看。你咬破舌尖才醒过来。`;
        }),
        opt('取出定神丹服下', '稳', () => {
          if (itemCount('mind') > 0) { addItem('mind', -1); fx.dao(-10); fx.mood(5); return `丹药入腹，一股清凉从丹田升起。耳边的声音像被水浇灭的炭火，渐渐没了。`; }
          fx.dao(3); fx.mood(-4);
          return `你翻遍了储物袋，定神丹早就吃完了。只能硬熬了一夜。`;
        }),
        opt('任它去说，只当没听见', '险', () => {
          if (chk(0.45 + traitEff('dao'))) { fx.dao(4); fx.mood(-2); return `你不理它。它念了整整一夜，天亮时自己停了。你睁开眼，发现自己出了一身冷汗，可心却是静的。`; }
          fx.dao(12); fx.physique(5);
          return `那声音在你脑子里住了下来。此后很长一段时间，你运功时总会听见它在笑。`;
        }),
      ],
    };
  },
});

/* ---------------- 空间裂隙 ---------------- */
ev({
  id: 'rift', name: '天象异变', kind: 'danger', base: 2, cooldown: 8,
  weight(c) {
    let w = 1.5 + (c.reg.danger - 1) * 6;
    if (c.S.tier >= 3) w += 2;
    if (c.W.era === 'war') w += 2;
    return w;
  },
  build(c) {
    return {
      title: '天象异变',
      text: `天色忽然暗了。云层里裂开一道口子，紫白色的光从裂缝里漏下来，落在离你不到百丈的山头上。整座山都在抖。你听见远处有人在尖叫，也听见某种庞然大物翻身的声音。`,
      opts: [
        opt('冒险靠近，看看裂缝里落下什么', '险', () => {
          if (chk(0.4 + traitEff('luck'))) {
            const name = grantArt(pick(['wulei', 'xuanwu', 'lingmu']));
            fx.exposure(10);
            return `裂缝合拢前，有件东西从里面掉了出来，砸进山石里。你刨出来一看——${name}。你抱着它跑出老远，才敢回头。`;
          }
          fx.hp(-0.3); fx.physique(8);
          return `你还没走近，一股无形的力量就当头压了下来。你被掀翻在地，滚出去十几丈，耳朵里全是嗡嗡声。`;
        }),
        opt('转身就跑，越远越好', '稳', () => {
          fx.mood(-2); fx.heat(-3);
          return `你连头都没回，一口气跑出三十里。等天重新亮起来时，你站在一座陌生的山谷里，腿还在抖。`;
        }),
        opt('就地打坐，借异象引动天机', '机', () => {
          if (chk(0.45 + c.S.wits * 0.03)) {
            fx.progress(0.2); fx.mood(6);
            return `你背对那片紫光坐下，任由那股磅礴的灵气撞在背上。这一坐，你竟摸到了一丝说不清的道韵，修为猛涨了一截。`;
          }
          fx.dao(10); fx.hp(-0.15);
          return `你妄图借天机入道，结果识海被那股力量冲得七零八落。醒来时，已是三天之后。`;
        }),
      ],
    };
  },
});

/* ---------------- 妖兽潮 ---------------- */
ev({
  id: 'beast_tide', name: '妖兽潮', kind: 'war', base: 2, cooldown: 6,
  weight(c) {
    if (c.W.publicEvent && c.W.publicEvent.id === 'beastTide') {
      c.why(18, '妖兽潮');
      return 18 + (c.danger - 1) * 10;
    }
    return 0;
  },
  build(c) {
    return {
      title: '妖兽潮',
      text: `地平线上起了尘。起初只是一条黄线，很快就变成了一片黑——成千上万的妖兽正从荒原深处涌来，低阶的、高阶的、成群结队的，什么都不管，只是往前冲。前方的村镇，已经在冒烟了。`,
      opts: [
        opt('冲上去，猎杀妖兽取材料', '险', () => {
          fx.stones(rndInt(50, 130)); fx.item('material', 3); fx.route('liesha', 5); fx.exposure(4);
          return `你逆着兽潮冲了一段，专挑落单的下手。三头低阶妖兽换了三块内丹和一堆材料，身上也添了几道口子。\n` +
            (chance(0.4) ? fight(mookPower(1.25), '高阶妖兽', '一头比人还高的妖兽盯上了你。') : '好在没撞上真正的大家伙。');
        }),
        opt('组织凡人撤离', '稳', () => {
          fx.fame(8); fx.mood(6); fx.dao(-3); fx.blood(-0);
          return `你御器飞到村镇上空，扯着嗓子喊了半日，才把大部分人赶上了北边的官道。兽潮过后，那里只剩一片瓦砾，可人活了。`;
        }),
        opt('躲进地窖，等兽潮过去', '稳', () => {
          fx.hp(-0.05); fx.mood(-3);
          return `你找了个地窖钻进去，听着头顶万马奔腾似的声响过了一夜。第二天出来，四野全是断肢和血。`;
        }),
      ],
    };
  },
});
