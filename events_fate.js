'use strict';
/* =============================================================
   事件内容 · 因果清算与奇缘
   仇家寻仇 / 秘密暴露 / 通缉 / 天劫 / 传承 / 奇物
   ============================================================= */

/* ---------------- 仇家寻仇 ---------------- */
ev({
  id: 'nemesis', name: '寻仇', kind: 'nemesis', base: 2, cooldown: 3,
  weight(c) {
    const h = c.hunter();
    if (!h) return 0;
    let w = 4 + h.weight * 0.55;
    c.why(h.weight * 0.55, '仇家追索');
    if (c.S.hidden.exposure > 50) { w += 5; c.why(5, '秘密暴露'); }
    if (c.S.hidden.heat > 40) { w += 4; c.why(4, '行踪暴露'); }
    if (c.is('yinni')) { w *= 0.35; }
    return w;
  },
  build(c) {
    const h = c.hunter();
    if (!h) return null;
    const n = h.npc;
    return {
      title: '寻仇',
      text: `${n.name}站在你洞府门外，手里提着一柄已经出鞘的法器。他没有破门，只是站着，像是等了很久。「我找了你很多年。」他说，「你自己出来，还是我进去？」`,
      opts: [
        opt('开门，正面一战', '险', () => fightNpc(n, `${n.name}的法器在你面前亮起。`, { nemesis: true })),
        opt('从暗道遁走', '机', () => {
          if (chk(0.5 + traitEff('flee') + traitEff('escape'))) {
            fx.region(pick(['beiliang', 'zijin', 'yuanwu'])); fx.exposure(-10);
            if (S.hidden.enemyWeight[n.id]) S.hidden.enemyWeight[n.id] *= 0.5;
            return `你从洞府后头那条只有你知道的地道钻了出去，一口气遁出百里。等到确定没人跟来，才敢停下来喘气。`;
          }
          fx.hp(-0.2);
          return `你刚钻进地道，整座洞府就塌了半边。\n` + fightNpc(n, '碎石里，他的杀意紧追不舍。');
        }),
        opt('把身上的灵石都给他，求个了断', '稳', () => {
          const cost = Math.round(c.S.stones * 0.6);
          if (c.S.hidden.bloodDebt >= 8) {
            fx.hp(-0.15);
            return `他看都没看那袋灵石。「我兄弟的命，你拿什么还？」\n` + fightNpc(n, '他没有再说话，直接动了手。');
          }
          fx.stones(-cost);
          if (S.hidden.enemyWeight[n.id]) S.hidden.enemyWeight[n.id] *= 0.25;
          fx.fame(-3);
          return `你把大半身家推了过去。他看了很久，最后收下了。「这不算完。」他说完就走了。`;
        }),
        opt('亮出底牌，反杀', '险', () => {
          if (itemCount('talAtk') + itemCount('puppet') + itemCount('array') > 0) {
            addItem('talAtk', -1);
            fx.kill(n.id); fx.blood(1); fx.fame(-4); fx.stones(rndInt(60, 160));
            return `你把火弹符藏在了袖中。等他一脚踏进门槛，符纸已经贴上了他的胸口。\n他死的时候，眼睛还睁着。`;
          }
          return `你摸遍了全身，一件像样的底牌也没有。\n` + fightNpc(n, '「就这点本事？」');
        }),
      ],
    };
  },
});

/* ---------------- 秘密暴露 ---------------- */
ev({
  id: 'exposed', name: '怀璧其罪', kind: 'nemesis', base: 2, cooldown: 5,
  weight(c) {
    if (c.S.hidden.exposure < 45) return 0;
    let w = (c.S.hidden.exposure - 45) * 0.22;
    c.why(w, '秘密暴露');
    if (c.S.stones > 400) { w += 3; c.why(3, '身家颇丰'); }
    if (c.W.era === 'war') w += 3;
    return w;
  },
  build(c) {
    return {
      title: '怀璧其罪',
      text: `你身上有重宝的消息，不知从哪儿漏了出去。先是有人旁敲侧击，后来是明目张胆地跟，再后来，坊市的墙上出现了一张画着你侧影的悬赏。赏金高得离谱。`,
      opts: [
        opt('换个身份，远走他乡', '稳', () => {
          fx.exposure(-25); fx.heat(-20); fx.stones(-Math.round(c.S.stones * 0.15));
          fx.region(pick(['beiliang', 'zijin', 'tianluo']));
          fx.flag('newIdentity', true);
          return `你烧了原来的衣物，改了容貌，连走路的姿势都换了。新地方没人认识你，也没人关心你从哪来。`;
        }),
        opt('投靠一个大势力，换取庇护', '机', () => {
          if (chk(0.55 + c.S.hidden.fame / 200)) {
            S.sect = S.sect || pick(['黄枫谷', '掩月宗', '天阙堡']);
            S.rank = S.rank || '外门';
            S.contrib += 10;
            fx.exposure(-15); fx.route('quanshu', 8);
            return `你带着礼去见了${S.sect}的执事，把话说得很明白：借宗门的势，躲一躲风头。他收了礼，也收了你这个人。`;
          }
          fx.exposure(5);
          return `你求上门去，对方却把门关得很紧。这年头，没人愿意为一个来历不明的人得罪一票赏金客。`;
        }),
        opt('主动亮出来，把水搅浑', '险', () => {
          if (chk(0.4)) {
            fx.fame(8); fx.exposure(-10);
            const n = c.someNpc();
            if (n) { fx.kill(n.id); fx.blood(1); return `你在坊市最热闹的地方，把东西亮了出来。围上来的人眼睛都红了。第一个动手的，被你当场打死。剩下的，反倒退了。`; }
            return `你把东西亮了出来，冷冷扫了一圈。围上来的人犹豫了很久，最后散了。`;
          }
          fx.hp(-0.25); fx.exposure(6);
          return `你把东西亮出来，反倒成了众矢之的。\n` + fight(mookPower(1.3), '赏金客', '有人先动了手。');
        }),
      ],
    };
  },
});

/* ---------------- 通缉 ---------------- */
ev({
  id: 'wanted', name: '悬赏通缉', kind: 'nemesis', base: 2.5, cooldown: 5,
  weight(c) {
    if (c.S.hidden.bloodDebt < 12 && c.S.hidden.fame > -20) return 0;
    let w = 3 + c.S.hidden.bloodDebt * 0.2 + Math.max(0, -c.S.hidden.fame) * 0.1;
    c.why(w, '血债与恶名');
    if (c.S.hidden.heat > 30) w += 3;
    return w;
  },
  build(c) {
    return {
      title: '悬赏通缉',
      text: `坊市的告示墙上，贴着一张新的悬赏。画上的人有七八分像你，落款是「清虚门缉魔令」，赏格三百灵石。围观的人议论纷纷，有人已经在四下张望。`,
      opts: [
        opt('伸手把告示撕了', '险', () => {
          if (chk(0.45 + traitEff('hide'))) {
            fx.exposure(-8); fx.heat(4);
            return `你当着众人的面把告示撕了下来，揉成一团扔进阴沟。围观的人愣了一下，没人敢说话。`;
          }
          fx.fame(-6); fx.heat(10);
          return `你刚伸手，就有人在背后喊了一声：「是他！」\n` + fight(mookPower(1.2), '赏金客', '三个人同时扑了过来。');
        }),
        opt('找坊市管事，花钱把悬赏撤了', '机', () => {
          const cost = Math.round(300 * (c.S.hidden.credit > 20 ? 0.7 : 1));
          if (c.S.stones < cost) return `你凑不出这个数。只能看着那张告示继续贴着。`;
          fx.stones(-cost); fx.exposure(-12); fx.credit(-4);
          return `你把灵石递过去，管事看了一眼，把告示撕了。「三天内，」他说，「别让我再看见你。」`;
        }),
        opt('反过来猎杀来领赏的人', '险', () => {
          fx.blood(2); fx.fame(-5); fx.stones(rndInt(60, 140)); fx.route('liesha', 6);
          return `你在城外等了三天，来了两拨人。第一拨被你打跑了，第二拨没跑成。你从他们身上搜出了两百多块灵石，还有一份「缉魔令」的副本。`;
        }),
      ],
    };
  },
});

/* ---------------- 天劫 ---------------- */
ev({
  id: 'tribulation', name: '天关', kind: 'calamity', base: 30, cooldown: 2,
  weight(c) {
    if (!c.S.pendingBreak) return 0;
    c.why(30, '修为圆满');
    return 30;
  },
  build(c) {
    const kind = c.S.pendingBreak;
    return {
      title: kind === 'tier' ? '天关' : '瓶颈',
      text: kind === 'tier'
        ? `修为已经到了这一步的尽头。丹田里的真元满得几乎要溢出来，每一次呼吸都在发烫。再往前，就是${REALM_TIERS[c.S.tier + 1] ? REALM_TIERS[c.S.tier + 1].name : '下一境'}的天关。成，则脱胎换骨；不成，轻则修为倒退，重则身死道消。`
        : `这一层修为已经修满了。丹田里的真元开始往一处聚，像是自己要凝成什么东西。你知道，该冲关了。`,
      opts: [
        opt(kind === 'tier' ? '闭关冲关，正面硬撼天关' : '静心凝神，冲这一层瓶颈', '险', () => {
          const r = tryBreakthrough(kind);
          S.pendingBreak = null;
          return r.text + (r.ok ? `\n\n（成算 ${Math.round(r.chance * 100)}%，成了。）` : `\n\n（成算 ${Math.round(r.chance * 100)}%，终究差了一线。）`);
        }),
        opt('先服破障丹，再冲关', '机', () => {
          if (itemCount('break') < 1) return `你摸遍了储物袋，一枚破障丹也没有。只能硬来。\n` + (() => { const r = tryBreakthrough(kind); S.pendingBreak = null; return r.text; })();
          const r = tryBreakthrough(kind);
          S.pendingBreak = null;
          return r.text + `\n\n（借助丹药，成算 ${Math.round(r.chance * 100)}%。）`;
        }),
        opt('压住修为，再等等', '稳', () => {
          fx.dao(3); fx.mood(-2);
          S.pendingBreak = null;
          return `你把那股快要溢出来的真元重新压了回去。修为不会退，可这股劲憋着，总归难受。`;
        }),
      ],
    };
  },
});

/* ---------------- 传承 ---------------- */
ev({
  id: 'inheritance', name: '前人传承', kind: 'fate', base: 1.6, cooldown: 12,
  weight(c) {
    let w = 1.4 + (c.is('youli') ? 1 : 0);
    if (traitEff('luck')) w += 1.5;
    if (c.S.hidden.fame > 30) w += 0.8;
    if (c.S.hidden.exposure > 60) w -= 0.8;
    return w;
  },
  build(c) {
    return {
      title: '前人传承',
      text: `你在洞府深处找到一面石壁。壁上刻满了字，最后一行写着：「余坐化于此三百载，所修功法未传于人。后世有缘者，可取之。取之，亦当承其因果。」字迹很淡，像是写的人已经没什么力气了。`,
      opts: [
        opt('叩首三次，取走传承', '机', () => {
          fx.learnTech(pick(['tianlei', 'dayan', 'xuangui']));
          fx.progress(0.25); fx.exposure(6);
          fx.flag('inheritance', true);
          const t = S.learned[S.learned.length - 1];
          return `你依言叩了三次。石壁后头滑开一格，里面是一卷功法、一瓶丹药，还有一枚旧玉简。功法是《${TECHS[t].name}》。${TECHS[t].desc}`;
        }),
        opt('只抄功法，不动其余之物', '稳', () => {
          fx.learnTech(pick(['changchun', 'huoyan', 'qingyuan'])); fx.dao(-4);
          return `你没有动那瓶丹药，也没有碰玉简，只把功法抄了下来。临走时对着石壁又拜了一拜。`;
        }),
        opt('不取，原样退出', '稳', () => {
          fx.mood(4); fx.dao(-8); fx.route('changsheng', 2);
          return `你看了很久，最后退了出去，把洞口重新封好。有些因果，不是你这个修为担得起的。`;
        }),
      ],
    };
  },
});

/* ---------------- 云游高人 ---------------- */
ev({
  id: 'sage', name: '云游高人', kind: 'fate', base: 1.2, cooldown: 14,
  weight(c) {
    let w = 1.2;
    if (c.S.tier >= 2) w += 0.8;
    if (c.S.hidden.fame > 20) w += 0.5;
    return w;
  },
  build(c) {
    return {
      title: '云游高人',
      text: `茶棚里坐着个不起眼的老头，穿着一双破了口的草鞋，面前摆着一壶最便宜的粗茶。他抬头看了你一眼，忽然说：「你这修为，走岔了半步。」`,
      opts: [
        opt('起身行礼，请教', '机', () => {
          if (chk(0.65 + traitEff('luck'))) {
            fx.progress(0.3); fx.learnTech(pick(['dayan', 'changchun']));
            fx.mood(6); fx.exposure(-4);
            return `你恭恭敬敬地行了一礼。老头伸手在你眉心点了一下，你只觉一股清凉的东西流进识海，很多想不通的地方忽然就通了。等你回过神来，茶棚里已经没有人了。`;
          }
          fx.mood(2);
          return `你行了礼。老头摆摆手，说了几句不着边际的话，起身走了。`;
        }),
        opt('警惕地退开，怕是圈套', '稳', () => {
          fx.exposure(-2); fx.mood(-1);
          return `你后退半步，手按在储物袋上。老头看了你一眼，笑了笑，不再说话。`;
        }),
        opt('反过来请他喝茶，套些话', '机', () => {
          if (chk(0.55 + traitEff('social'))) {
            fx.stones(rndInt(20, 60));
            const tip = pick(['一处尚未被人发现的灵矿', '某个大宗门即将内乱的消息', '一条通往秘境的旧路']);
            return `你替他续了一壶茶。老头喝了，话也多了起来，随口提了${tip}。等你再抬头，那壶茶还温着，人已经不见了。`;
          }
          return `你坐下陪他喝了半壶茶，他一句有用的话也没说。`;
        }),
      ],
    };
  },
});

/* ---------------- 奇物小瓶 ---------------- */
ev({
  id: 'bottle_find', name: '无名小瓶', kind: 'fate', base: 1, cooldown: 99,
  weight(c) {
    if (c.S.flags.gotBottle) return 0;
    if (c.S.tier > 2) return 0;
    let w = 0.8 + (traitEff('luck') ? 0.8 : 0);
    if (c.is('youli')) w += 0.6;
    return w;
  },
  build(c) {
    return {
      title: '无名小瓶',
      text: `在一处干涸的河床里，你捡到一只拇指大的小瓶。瓶身暗绿，不起眼，可你把它贴在掌心时，能感觉到里面有一丝若有若无的灵气在动——像是有活物。`,
      opts: [
        opt('收起来，仔细琢磨', '机', () => {
          fx.item('bottle', 1); fx.flag('gotBottle', true);
          return `你把小瓶收进了最里层的衣袋。夜里，你试着往里面滴了一滴露水，第二天早上，那滴露水变成了一小汪，还带着淡淡的灵气。`;
        }),
        opt('拿去坊市，找个识货的看看', '险', () => {
          if (chk(0.5)) {
            fx.stones(rndInt(80, 200)); fx.flag('gotBottle', false);
            return `坊市的老掌柜看了半天，脸色变了几变，最后出了个高价收走了。你拿着灵石走出门，心里空落落的。`;
          }
          fx.exposure(8);
          return `你刚把瓶子拿出来，周围就有几道目光黏了上来。你赶紧收了回去，连夜离开了那座坊市。`;
        }),
        opt('扔了，来路不明的东西不要碰', '稳', () => {
          fx.mood(1); fx.dao(-2);
          return `你把瓶子扔回了河床里。走出很远，又忍不住回头看了一眼。`;
        }),
      ],
    };
  },
});

/* ---------------- 家书 ---------------- */
ev({
  id: 'hometown', name: '家书', kind: 'fate', base: 1.4, cooldown: 10,
  weight(c) {
    let w = 1.2 + Math.max(0, (c.S.age - 30) / 40);
    if (c.is('yinni')) w += 1;
    return w;
  },
  build(c) {
    return {
      title: '家书',
      text: `一个跑商的凡人找到你，递来一封皱巴巴的信。信封上的字迹你认得——是家里人的。信里说，老屋漏了雨，弟弟的孩子已经会走路了，问你什么时候回去看看。落款是三年前。`,
      opts: [
        opt('回去一趟', '稳', () => {
          fx.stones(-20); fx.mood(10); fx.dao(-6); fx.exposure(-4);
          return `你回了一趟。老屋确实漏了雨，弟弟的孩子不认识你，躲在门后头偷看。你留下些银钱，住了三天就走了。`;
        }),
        opt('托人捎些银钱回去', '稳', () => {
          fx.stones(-Math.min(c.S.stones, 30)); fx.mood(4);
          return `你托那商人带了银钱和一封短信回去。信上只写了四个字：一切安好。`;
        }),
        opt('烧了信，不回', '险', () => {
          fx.dao(8); fx.mood(-10);
          return `你把信烧了。火光里那些字一个个卷起来，没了。修行修到这一步，回头路早就断了。`;
        }),
      ],
    };
  },
});

/* ---------------- 黑市 ---------------- */
ev({
  id: 'black_market', name: '黑市', kind: 'market', base: 3, cooldown: 6,
  weight(c) {
    let w = 2;
    if (c.S.hidden.fame < -15 || c.S.hidden.bloodDebt > 5) w += 4;
    if (c.is('shifang')) w += 3;
    if (c.W.era === 'war') w += 2;
    return w;
  },
  build(c) {
    return {
      title: '黑市',
      text: `有人在你门口放了一枚黑色木牌，牌上只有一个地址。你按时去了，是一间没有窗户的地窖。里头摆着几张桌子，桌上放着东西，桌后坐着人。没人说话，交易只用手势。`,
      opts: [
        opt('买一枚来路不明的功法玉简', '险', () => {
          const cost = Math.round(buyPrice('break', c.S.region) * 1.6);
          if (c.S.stones < cost) return `你摸了摸袋子，连最便宜的东西都买不起。`;
          fx.stones(-cost); fx.learnTech(pick(['xuanyin', 'dayan', 'tianji']));
          fx.exposure(4);
          return `你付了灵石，把玉简收进袖里。走出地窖时，你才敢看里面的内容——${TECHS[S.learned[S.learned.length - 1]].name}。`;
        }),
        opt('把自己见不得光的东西出手', '机', () => {
          const gain = rndInt(60, 180);
          fx.stones(gain); fx.exposure(-6); fx.fame(-3); fx.route('liesha', 3);
          return `你把身上几件说不清来路的东西换成了灵石。在这种地方，没人问东西是从哪来的。`;
        }),
        opt('只看不买，摸清门路', '稳', () => {
          fx.credit(3); fx.flag('knowBlackMarket', true);
          return `你什么也没买，只在角落里坐了一夜。天亮时，你已经知道了这里的规矩：不问来历，不认面孔，出了门就忘。`;
        }),
      ],
    };
  },
});

/* ---------------- 天象 ---------------- */
ev({
  id: 'omen', name: '天有异象', kind: 'misc', base: 3, cooldown: 5,
  weight(c) {
    let w = 2;
    if (c.W.era === 'tense') w += 3;
    return w;
  },
  build(c) {
    return {
      title: '天有异象',
      text: pick([
        '半夜里，南边的天忽然亮了一下，像是有人在极远处点燃了一片天。亮光只持续了一瞬，可整个越国的修士都看见了。',
        '连续七日，每天黄昏都有一道血色的云气从西边横过来。有老人说，这是兵戈之兆。',
        '山里的野兽这些天异常躁动，连平日里最胆小的兔子都敢往人前凑。有经验的猎户说，要出事。',
      ]),
      opts: [
        opt('去坊市听听风声', '稳', () => {
          fx.credit(2);
          return `你在坊市里转了一圈，听到的说法各不相同。有人说是魔道在试什么大阵，有人说是上古禁制要开了。`;
        }),
        opt('趁乱去荒山找找机缘', '险', () => {
          if (chk(0.5 + traitEff('luck'))) { fx.progress(0.06); fx.stones(rndInt(20, 60)); return `你在荒山里转了几日，在一处被雷火犁过的地方捡到几块带着余温的灵石。`; }
          fx.hp(-0.1); return `你在山里转了几天，什么也没找到，反倒被一头受惊的妖兽撞了一下。`;
        }),
        opt('关起门来，不闻不问', '稳', () => {
          fx.dao(2); fx.mood(1);
          return `你把门关上，继续修你的行。天塌下来，也先压死高个子。`;
        }),
      ],
    };
  },
});
