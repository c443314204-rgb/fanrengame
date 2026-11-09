'use strict';
/* =============================================================
   事件内容 · 宗门与权斗 / 夺舍奇祸
   ============================================================= */

/* ---------------- 宗门任务 ---------------- */
ev({
  id: 'sect_task', name: '宗门差事', kind: 'sect', base: 6, cooldown: 2,
  weight(c) {
    if (!c.S.sect) return 0;
    let w = 9;
    c.why(9, '身属宗门');
    if (c.is('sect')) { w += 10; c.why(10, '宗门公务'); }
    if (c.S.rank === '内门' || c.S.rank === '执事') w += 3;
    return w;
  },
  build(c) {
    const sect = c.S.sect;
    const job = pick([
      { name: '押送一批灵药去邻坊', power: 0.9, reward: 60, contrib: 12 },
      { name: '清剿山门外围的一窝妖鼠', power: 1.0, reward: 40, contrib: 15 },
      { name: '替长老守三日丹房', power: 0.3, reward: 30, contrib: 10 },
      { name: '追查一名失踪的外门弟子', power: 1.1, reward: 70, contrib: 18 },
    ]);
    return {
      title: '宗门差事',
      text: `${sect}的执事把一枚令牌拍在你面前：「${job.name}。办好了记功，办砸了自己担着。」`,
      opts: [
        opt('接下，尽力去办', '稳', () => {
          fx.sectWork(job.contrib); fx.route('quanshu', 6);
          if (chance(0.65)) {
            fx.stones(job.reward); fx.fame(2);
            return `差事办得不算漂亮，但没出岔子。回来交令时，执事在册子上记了一笔。${job.name}这一趟，你拿回了${job.reward}块灵石的贴补。`;
          }
          return `事情办到一半出了岔子。\n` + fight(mookPower(job.power), '捣乱的修士', '有人不想让你办成这趟差事。');
        }),
        opt('花钱雇人代劳', '机', () => {
          const cost = 30;
          if (c.S.stones < cost) return `你连雇人的钱都拿不出来，只好自己跑一趟。`;
          fx.stones(-cost); fx.sectWork(Math.round(job.contrib * 0.5)); fx.exposure(2);
          return `你花了三十块灵石，找了个散修替你把活儿干了。功劳记在你头上，只是这种把戏，宗门里也有人看得懂。`;
        }),
        opt('推说自己正在闭关', '稳', () => {
          fx.sectWork(-4); fx.mood(-1);
          return `你推了。执事没说什么，可你在册子上的名字，被往后挪了挪。`;
        }),
      ],
    };
  },
});

/* ---------------- 派系倾轧 ---------------- */
ev({
  id: 'faction_feud', name: '派系倾轧', kind: 'sect', base: 4, cooldown: 5,
  weight(c) {
    if (!c.S.sect) return 0;
    let w = 6 + Math.min(6, c.S.contrib / 25);
    if (c.S.rank === '内门' || c.S.rank === '执事') w += 4;
    c.why(6, '门中积功');
    return w;
  },
  build(c) {
    return {
      title: '派系倾轧',
      text: `门里两位长老的明争暗斗，终于烧到了你头上。大师兄把你叫到偏殿，话说得很直：「王长老那一系，最近在查你经手的那批药材。你要是聪明，就该知道站在哪一边。」`,
      opts: [
        opt('站大师兄这边', '险', () => {
          fx.sectWork(15); fx.route('quanshu', 10); fx.fame(3); fx.exposure(4);
          if (chance(0.55)) return `你在大师兄面前表了态。三日后，王长老那一系的人被调去了外山。大师兄拍着你的肩说：「往后有我一口，就有你一口。」`;
          fx.stones(-Math.round(c.S.stones * 0.1)); fx.mood(-4);
          return `你站了队，可风向变得比你想的快。王长老那边反手一击，你被扣了三个月的月例，还挨了一顿训。`;
        }),
        opt('两边都不站，只做事', '稳', () => {
          fx.sectWork(4); fx.mood(-2); fx.dao(2);
          return `你只说：「弟子愚钝，只想把手里的差事办好。」大师兄盯了你很久，最后摆摆手让你走了。这之后，两边的人都不太待见你，但也没人真拿你怎么样。`;
        }),
        opt('暗中把两边的话都卖出去', '险', () => {
          if (chk(0.45 + traitEff('social'))) {
            fx.stones(rndInt(40, 90)); fx.credit(-4); fx.route('caifa', 4); fx.flag('doubleAgent', true);
            return `你把大师兄的话，原封不动地递给了王长老。又把王长老的反应，添油加醋地回报给大师兄。两边都以为你是自己人，你从中拿了不少好处。`;
          }
          fx.fame(-8); fx.exposure(8); fx.sectWork(-10);
          return `你的两面三刀被撞破了。两位长老难得意见一致：这样的人，不能留。\n` +
            (chance(0.5) ? fight(mookPower(1.2), '执法弟子', '「拿下。」') : `你被逐出了内门，贬去守药圃。`);
        }),
      ],
    };
  },
});

/* ---------------- 功法阁 ---------------- */
ev({
  id: 'tech_pavilion', name: '功法阁', kind: 'sect', base: 3, cooldown: 8,
  weight(c) {
    if (!c.S.sect) return 0;
    let w = 3 + Math.min(8, c.S.contrib / 30);
    if (c.is('sect')) { w += 6; c.why(6, '宗门公务'); }
    return w;
  },
  build(c) {
    return {
      title: '功法阁',
      text: `凭着你这些日子攒下的功劳，你换到了一次进入功法阁的机会。阁里三层，层数越高，功法越深，也越要拿贡献来换。执事在楼梯口看了你一眼：「上到哪一层，你自己掂量。」`,
      opts: [
        opt('换一门高一层的心法', '稳', () => {
          if (c.S.contrib < 40) return `你的贡献不够。执事摇了摇头，只让你在一层转了一圈。`;
          S.contrib -= 40;
          const t = pick(['dayan', 'xuangui', 'huoyan', 'qingyuan']);
          fx.setTech(t); fx.route('quanshu', 10);
          return `你把手里的贡献全换了出去，换到一门《${TECHS[t].name}》。${TECHS[t].desc}`;
        }),
        opt('不换功法，抄录些杂学', '机', () => {
          if (c.S.contrib < 15) return `贡献太少，连杂学都换不起。`;
          S.contrib -= 15;
          fx.item('break', 1); fx.item('mind', 1);
          fx.flag('lore', true);
          return `你没换功法，只抄了几篇丹方与阵法杂记。这些东西不能立竿见影，可往后总有用得着的时候。`;
        }),
        opt('留意阁中的禁制与暗格', '险', () => {
          if (chk(0.35 + c.S.wits * 0.03)) {
            const t = pick(['tianlei', 'xuelian']);
            fx.setTech(t); fx.exposure(10); fx.fame(-4);
            return `你在二层最里侧的书架后，摸到了一处松动的砖。夹层里藏着一卷没有编号的功法——《${TECHS[t].name}》。你抄完放回原处，手心全是汗。`;
          }
          fx.exposure(12); fx.fame(-8); fx.sectWork(-20);
          return `你的手刚摸到禁制，整座功法阁的警钟就响了。\n` + (chance(0.5) ? `你被关了三个月禁闭。` : fight(mookPower(1.3), '守阁长老', '「好大的胆子。」'));
        }),
      ],
    };
  },
});

/* ---------------- 同门相残 ---------------- */
ev({
  id: 'rival_disciple', name: '同门', kind: 'sect', base: 5, cooldown: 3,
  weight(c) {
    if (!c.S.sect) return 0;
    return 7;
  },
  build(c) {
    return {
      title: '同门',
      text: `一个平日里就与你不睦的同门拦在路上。他修为比你差一线，可背后有人——这一点，他自己也很清楚。「听说你最近得了些好东西？」他笑着，「分师兄一点，往后在门里，我保你少些麻烦。」`,
      opts: [
        opt('给他，破财免灾', '稳', () => {
          fx.stones(-Math.min(c.S.stones, 40)); fx.mood(-4); fx.credit(2);
          return `你分了他些灵石。他掂了掂，笑着走了。你知道这种人喂不饱，可眼下还不到撕破脸的时候。`;
        }),
        opt('当场把他打服', '险', () => {
          if (chk(0.7)) {
            fx.fame(5); fx.sectWork(6); fx.route('quanshu', 5);
            return `你没废话，一掌把他拍翻在雪地里。他爬起来时，脸比雪还白。这之后，门里再没人敢当面拦你的路。`;
          }
          fx.hp(-0.15); fx.fame(-4); fx.sectWork(-8);
          return `你出手太重，被执事撞了个正着。各打五十大板，你还多赔了一份丹药钱。`;
        }),
        opt('把他背后那人一并挖出来', '机', () => {
          if (chk(0.5 + traitEff('social'))) {
            fx.sectWork(12); fx.fame(4); fx.credit(4);
            return `你没有动手，反而请他喝了顿酒。酒过三巡，他吐出了背后那人的名字。你把这事原原本本报给了执事——借刀杀人，比自己动手干净。`;
          }
          fx.mood(-3); fx.exposure(3);
          return `你套了半天话，他嘴严得很。最后不欢而散。`;
        }),
      ],
    };
  },
});

/* ---------------- 晋升 ---------------- */
ev({
  id: 'promotion', name: '晋升之机', kind: 'sect', base: 3, cooldown: 10,
  weight(c) {
    if (!c.S.sect) return 0;
    if (c.S.contrib < 30) return 0;
    if (c.S.rank === '长老') return 0;
    let w = 4 + Math.min(8, c.S.contrib / 25);
    c.why(4, '门中积功');
    return w;
  },
  build(c) {
    return {
      title: '晋升之机',
      text: `宗门三年一次的考评到了。执事把你的名字从册子里点出来：「按你的功劳，够得上往上升一升。不过——想升的人不止你一个。」他顿了顿，「门里给了两个名额。」`,
      opts: [
        opt('凭真本事去考', '机', () => {
          fx.route('quanshu', 12);
          if (chk(0.55 + c.S.wits * 0.02 + c.S.contrib / 400)) {
            fx.rank(c.S.rank === '外门' ? '内门' : c.S.rank === '内门' ? '执事' : '长老');
            fx.stones(60); fx.fame(4);
            return `考评那日，你一套功法使得滴水不漏。主考的长老点了点头。三日后，你的名牌换了新的——${c.S.rank}。`;
          }
          fx.mood(-5); fx.sectWork(-6);
          return `你差了一线。名额给了别人。执事拍拍你的肩：「再攒攒。」`;
        }),
        opt('给主考的长老送一份厚礼', '机', () => {
          const cost = Math.round(c.S.stones * 0.25);
          if (cost < 20) return `你连一份像样的礼都备不齐，只好作罢。`;
          fx.stones(-cost); fx.exposure(4);
          if (chk(0.7)) {
            fx.rank(c.S.rank === '外门' ? '内门' : c.S.rank === '内门' ? '执事' : '长老');
            fx.fame(2);
            return `礼送出去了。考评那日，主考的问题简单得像是提前对过。你的名牌换了，只是门里有些话，开始悄悄传。`;
          }
          fx.mood(-4); fx.credit(-4);
          return `礼送出去了，名额还是没你的。那位长老收得心安理得，回你一句「下次」。`;
        }),
        opt('主动让给更需要的人', '稳', () => {
          fx.sectWork(8); fx.fame(3); fx.credit(4); fx.dao(-2);
          return `你主动让了。执事看了你很久，什么也没说。可往后的差事，他开始先想着你。`;
        }),
      ],
    };
  },
});

/* ---------------- 战前点将 ---------------- */
ev({
  id: 'war_call', name: '战前点将', kind: 'sect', base: 4, cooldown: 4,
  weight(c) {
    if (!c.S.sect) return 0;
    if (!c.war) return 0;
    let w = 8;
    c.why(8, '战事吃紧');
    return w;
  },
  build(c) {
    return {
      title: '战前点将',
      text: `宗门大殿里灯火通明。掌门坐在上首，几位长老分列两旁。你被叫到阶下，掌门开口：「前线的阵眼缺人守。这一趟，九死一生，可守住了，宗门记你的大功。」殿里的人都在看你。`,
      opts: [
        opt('领命，去守阵眼', '险', () => {
          fx.sectWork(30); fx.fame(10); fx.blood(2);
          fx.route('quanshu', 15); fx.route('liesha', 4);
          return `你在阵眼守了七日七夜。魔道攻了三次，最后一次几乎破阵。你身上添了三道伤口，可阵眼没丢。\n` +
            fight(mookPower(1.3), '魔道先锋', '第八日，对方派了一个筑基修士来破阵。');
        }),
        opt('举荐他人，自己留守', '稳', () => {
          fx.sectWork(2); fx.fame(-3); fx.mood(-2);
          return `你举荐了另一个同门。掌门看了你一眼，准了。那人走的时候没看你。`;
        }),
        opt('趁乱带走宗门一批资源远遁', '险', () => {
          if (chk(0.4 + traitEff('flee'))) {
            fx.stones(rndInt(200, 400)); fx.item('break', 2); fx.flag('deserter', true);
            fx.region('beiliang'); S.sect = null; S.rank = null; S.contrib = 0;
            fx.fame(-15); fx.exposure(10); fx.route('liesha', 8);
            return `你在出发前夜卷走了一箱灵药和两瓶破障丹，连夜出了城。走到边境时，身后的天已经红了。`;
          }
          fx.fame(-10); fx.exposure(8);
          return `你刚摸进库房，就撞上了巡夜的执事。\n` + fight(mookPower(1.35), '执事', '「叛徒！」');
        }),
      ],
    };
  },
});

/* ---------------- 执法队 ---------------- */
ev({
  id: 'law_enforcer', name: '执法队', kind: 'sect', base: 3, cooldown: 6,
  weight(c) {
    if (!c.S.sect) return 0;
    let w = 4;
    if (c.S.hidden.bloodDebt > 10) { w += 6; c.why(6, '血债在身'); }
    if (c.S.hidden.exposure > 50) w += 4;
    return w;
  },
  build(c) {
    return {
      title: '执法队',
      text: `执法队的弟子找上门来，说是「例行问话」，可三个人站位很讲究，把门口堵得死死的。为首那个摊开一卷玉简：「半年前城南那桩事，有人看见你在场。」`,
      opts: [
        opt('如实说，该认的认', '机', () => {
          if (c.S.hidden.bloodDebt < 15) {
            fx.sectWork(-6); fx.exposure(-4); fx.fame(2);
            return `你把知道的都说了。执法队查了半个月，没查出你手上有人命，只罚了你半年月例。`;
          }
          fx.exposure(10); fx.sectWork(-20); fx.heat(8);
          return `你说了一半。执法队的人听得极仔细，临走时留了一句：「这半年，别离开山门。」`;
        }),
        opt('咬死不知道，反咬他们诬陷', '险', () => {
          if (chk(0.5 + c.S.hidden.credit / 300 + traitEff('social'))) {
            fx.fame(4); fx.credit(6);
            return `你把嗓门提了起来，把事情闹到了大殿上。最后执法队拿不出实证，只得作罢。经此一遭，门里都知道你不好惹。`;
          }
          fx.exposure(12); fx.sectWork(-30); fx.heat(10);
          return `你越说越急，说漏了嘴。执法队当场扣下了你的令牌。\n` + (chance(0.5) ? `你被押进了后山的石牢，关了半年。` : fight(mookPower(1.25), '执法弟子', '「带走。」'));
        }),
        opt('连夜出逃，脱离宗门', '险', () => {
          if (chk(0.5 + traitEff('flee'))) {
            S.sect = null; S.rank = null; fx.region('beiliang'); fx.flag('deserter', true);
            fx.fame(-10); fx.exposure(6);
            return `你连夜下山，连那点家当都没带全。走到半路回头看，山门的灯火还在，只是再也与你无关了。`;
          }
          fx.fame(-12); fx.exposure(10);
          return `你刚翻出后山，就被守山的弟子截住了。\n` + fight(mookPower(1.3), '守山弟子', '「早就知道你要跑。」');
        }),
      ],
    };
  },
});

/* =============================================================
   夺舍 / 奇祸
   ============================================================= */

ev({
  id: 'possession', name: '借体', kind: 'calamity', base: 1.2, cooldown: 14, minTier: 1,
  weight(c) {
    let w = 1.2 + (c.S.hidden.exposure > 60 ? 2 : 0) + (c.S.hidden.physique > 40 ? 1.5 : 0);
    if (c.S.tier >= 3) w -= 0.6;
    return w;
  },
  build(c) {
    return {
      title: '借体',
      text: `你在一片陌生的山谷里醒来，不记得自己是怎么来的。识海深处，有个苍老的声音在笑：「这具身子虽差了些，倒也干净。」你低头，看见自己的手正在结一个你从未学过的法印。`,
      opts: [
        opt('守住识海，与他一搏', '险', () => {
          if (chk(0.4 + c.S.wits * 0.03 + traitEff('dao'))) {
            fx.dao(-10); fx.progress(0.3); fx.exposure(6);
            return `你咬破舌尖，把神识凝成一根针，狠狠扎进那道残魂里。苍老的声音惨叫着散了，留下一大堆陌生的记忆——是一门被你吞下来的功法。`;
          }
          fx.hp(-0.4); fx.dao(20);
          return `那一搏你输了半招，气息被压得几乎断绝。等你抢回身体时，发现自己已经在那山谷里躺了三年。`;
        }),
        opt('假意顺从，套出他的来历', '机', () => {
          if (chk(0.5 + c.S.wits * 0.02)) {
            fx.exposure(8); fx.stones(rndInt(100, 260)); fx.flag('ghostTeaching', true);
            return `你装作认命，一口一个「前辈」。那残魂得意忘形，把生前的事说了个七七八八，还透了几处藏宝的地方。`;
          }
          fx.dao(15); fx.mood(-10);
          return `你演得不像。那残魂起了疑心，在你识海里翻了起来，翻走了你不少记忆。`;
        }),
        opt('以死相逼，赌他不敢', '险', () => {
          if (chk(0.45 + c.S.hidden.daoMind / -200 + c.S.wits * 0.02)) {
            fx.mood(-8); fx.progress(0.12);
            return `你把神识往自己的命门上一撞。那残魂慌了——他要的是活人，不是尸体，只得退让，答应只借住三年。`;
          }
          fx.hp(-0.35); fx.dao(15);
          return `你赌错了。他冷笑一声：「那就一起死。」你抢回身体时，经脉已经碎了小半。`;
        }),
      ],
    };
  },
});
