'use strict';
/* =============================================================
   事件内容 · 炉火 · 闭关 · 蛰伏
   ============================================================= */

/* ---------------- 炸炉 ---------------- */
ev({
  id: 'furnace_boom', name: '炸炉', kind: 'craft', base: 5, cooldown: 3,
  weight(c) {
    let w = 0;
    if (c.is('lianzhi')) { w += 12; c.why(12, '炼丹炼器'); }
    if (c.S.hidden.daoMind > 40) { w += 5; c.why(5, '心浮气躁'); }
    if (c.S.tier >= 3) w -= 4;
    return w;
  },
  build(c) {
    return {
      title: '炸炉',
      text: `丹炉里的火忽然变了颜色。你伸手去压，火苗「轰」地一下窜起三尺高，炉盖被顶得嗡嗡作响。药香里混进了一丝焦味——这一炉，怕是保不住了。`,
      opts: [
        opt('拼着受伤也要把火压下去', '险', () => {
          if (chk(0.45 + traitEff('alchemy') + c.S.wits * 0.02)) {
            fx.item('break', 1); fx.progress(0.03); fx.route('zongshi', 4);
            return `你硬生生把火压了下去。炉盖揭开，里头躺着三枚成色极好的丹药——这一炉不但没废，反倒成了。`;
          }
          fx.hp(-0.2); fx.physique(4);
          return `火压住了，人也伤了。炉底焦黑一片，什么都没剩下，手臂上还添了一道烫伤。`;
        }),
        opt('立刻撤火，保炉子', '稳', () => {
          fx.item('heal', 1); fx.stones(-10);
          return `你果断撤了火。炉子保住了，药材废了，只从炉底刮出一点药渣，勉强捏了枚疗伤丹。`;
        }),
        opt('管它呢，把最后那味药投进去', '险', () => {
          if (chk(0.35)) {
            fx.item('life', 1); fx.exposure(6); fx.route('zongshi', 6);
            return `你把那味药投了进去。炉子震了七次，最后安静下来。炉中躺着一枚通体莹白的丹药，香气古怪——那是延寿丹才有的味道。`;
          }
          fx.hp(-0.3); fx.mood(-5);
          return `药一进去，炉子就炸了。你被气浪掀翻在地，半边屋子都黑了。`;
        }),
      ],
    };
  },
});

/* ---------------- 客单 ---------------- */
ev({
  id: 'commission', name: '上门客单', kind: 'craft', base: 4, cooldown: 4,
  weight(c) {
    let w = 0;
    if (c.is('lianzhi')) { w += 8; c.why(8, '炼丹炼器'); }
    if (c.S.flags.hasShop) { w += 5; }
    if (c.S.hidden.credit > 25) { w += 3; }
    return w;
  },
  build(c) {
    return {
      title: '上门客单',
      text: `一个修士找上门，说要订一批特定成色的丹药，给的价钱是市价的一倍半，但要得急。「三天，」他伸出三根手指，「三天后我来取。做不出来，定金不退。」`,
      opts: [
        opt('接单，连夜赶工', '险', () => {
          fx.route('zongshi', 6);
          if (chk(0.55 + traitEff('alchemy'))) {
            fx.stones(rndInt(80, 160)); fx.credit(8);
            return `你三天没合眼。交货那天，对方验了货，挑起大拇指，当场把余款结了，还多给了些。`;
          }
          fx.stones(-Math.round(c.S.stones * 0.1)); fx.credit(-5); fx.hp(-0.1);
          return `你赶了三天，成色始终差着一线。对方来了，看了一眼，把货推回来，定金照扣。`;
        }),
        opt('把单子转给靠得住的同行，抽个成', '机', () => {
          fx.stones(rndInt(20, 50)); fx.credit(4); fx.route('caifa', 4);
          return `你把单子转了出去，自己抽了两成。钱不多，可落得清闲，也不担风险。`;
        }),
        opt('回绝，说自己火候不到', '稳', () => {
          fx.credit(2);
          return `你摇了摇头，说这单接不了。对方有些失望，却也因此记住了你的实在。`;
        }),
      ],
    };
  },
});

/* ---------------- 奇药 ---------------- */
ev({
  id: 'rare_herb', name: '奇药', kind: 'craft', base: 3.5, cooldown: 6,
  weight(c) {
    let w = 2.5 + (c.is('lianzhi') ? 6 : 0) + (c.is('shifang') ? 3 : 0);
    if (traitEff('appraise')) w += 2;
    return w;
  },
  build(c) {
    const herb = pick(['一株七叶的紫芝', '一段色如赤玉的灵参', '一株开在水边的墨兰', '一枚不知名的青色果实']);
    return {
      title: '奇药',
      text: `你在药市上看见${herb}，摆在最不起眼的角落，摊主标价不高，似乎自己也不认得。你凑近闻了闻，那股灵气虽淡，却纯得不像话。`,
      opts: [
        opt('不动声色地买下来', '机', () => {
          const cost = Math.round(buyPrice('herb', c.S.region) * 4);
          if (c.S.stones < cost) return `你摸了摸储物袋，凑不齐这个数。摊主见你犹豫，把东西收了回去。`;
          fx.stones(-cost); fx.item('herb', 3); fx.route('zongshi', 4);
          if (chk(0.55 + traitEff('appraise'))) {
            fx.item('life', 1); fx.exposure(4);
            return `你把东西买下，回到住处才敢细看——这是一味能入延寿丹的主药。你连夜把它收进了最里层的玉盒。`;
          }
          return `你买下了它。虽认不出具体是什么，可那股灵气假不了，留着总有用处。`;
        }),
        opt('当场指出它的来历，压价', '机', () => {
          if (chk(0.6 + traitEff('appraise'))) {
            fx.stones(-Math.round(buyPrice('herb', c.S.region) * 2)); fx.item('herb', 2);
            fx.credit(3);
            return `你只说了两句，摊主的脸色就变了。最后你以极低的价钱把药买下，摊主还一个劲儿地谢你「指点」。`;
          }
          fx.exposure(3);
          return `你说得太明白，摊主反倒起了疑，把价钱抬了上去。`;
        }),
        opt('不买，把消息卖给识货的人', '机', () => {
          fx.stones(rndInt(15, 40)); fx.credit(2); fx.route('caifa', 4);
          return `你把这株药的消息卖给了坊市里的一个丹师，换了几十块灵石。他后来买没买，你就不知道了。`;
        }),
      ],
    };
  },
});

/* ---------------- 闭关走火 ---------------- */
ev({
  id: 'qi_deviation', name: '走火入魔', kind: 'cultivate', base: 5, cooldown: 4,
  weight(c) {
    let w = 0;
    if (c.is('bihai')) { w += 5; c.why(5, '闭关苦修'); }
    if (c.S.hidden.daoMind > 25) { w += (c.S.hidden.daoMind - 25) * 0.25; c.why((c.S.hidden.daoMind - 25) * 0.25, '道心不稳'); }
    if (hasNegTrait('daoxin')) { w += 6; c.why(6, '道心易乱'); }
    if (hasPosTrait('lanku')) { w *= 0.5; }
    if (c.S.hidden.physique > 30) w += 3;
    return w;
  },
  build(c) {
    return {
      title: '走火入魔',
      text: `行功到第三十六周天时，丹田里的真元忽然不受控了。它像一匹脱缰的野马，顺着经脉乱窜，所过之处又冷又痛。你听见自己牙关咯咯作响，眼前开始出现一些不该有的画面。`,
      opts: [
        opt('强行收功，稳住心神', '机', () => {
          if (chk(0.55 + traitEff('dao') + c.S.wits * 0.02)) {
            fx.dao(-12); fx.hp(-0.05);
            return `你死死守住灵台一点清明，一点点把真元导回正轨。收功时天已经亮了，你浑身湿透，可修为没退。`;
          }
          fx.hp(-0.25); fx.dao(12); fx.physique(5);
          return `你没能收住。真元冲破了三处经脉，你喷出一口血，昏了过去。醒来时，丹田空了一大块。`;
        }),
        opt('顺势而为，赌一把突破', '险', () => {
          if (chk(0.35 + c.S.wits * 0.02)) {
            fx.progress(0.35); fx.dao(8);
            return `你索性放开了。真元在体内横冲直撞，撞开了几处平时无论如何也冲不开的关窍。疼得几乎昏死过去，可修为实打实地涨了一截。`;
          }
          fx.hp(-0.35); fx.dao(18); fx.physique(8); fx.mood(-8);
          return `你赌输了。真元逆行，气血倒涌。你昏死过去，再醒来时，连自己是谁都想了好一会儿。`;
        }),
        opt('服下定神丹压住', '稳', () => {
          if (itemCount('mind') > 0) {
            addItem('mind', -1); fx.dao(-15); fx.mood(4);
            return `丹药化开的清凉压住了翻腾的真元。你在蒲团上坐到半夜，才敢睁开眼睛。`;
          }
          fx.dao(6); fx.mood(-4);
          return `你翻遍了储物袋，一颗定神丹也没有。只能硬扛。`;
        }),
      ],
    };
  },
});

/* ---------------- 心魔 ---------------- */
ev({
  id: 'inner_demon', name: '心魔', kind: 'cultivate', base: 3, cooldown: 6,
  weight(c) {
    if (c.S.hidden.daoMind < 30) return 0;
    let w = (c.S.hidden.daoMind - 30) * 0.3;
    if (c.is('bihai')) { w += 4; c.why(4, '闭关苦修'); }
    if (c.S.hidden.bloodDebt > 15) { w += 4; c.why(4, '血债缠身'); }
    c.why(w, '心魔深重');
    return w;
  },
  build(c) {
    const ghost = c.S.hidden.bloodDebt > 15
      ? '一个你杀过的人，站在你面前，脸上干干净净，没有血，就那么看着你。'
      : '一个年轻时的你，站在你面前，问你：「你还记得当初为什么要修仙吗？」';
    return {
      title: '心魔',
      text: `入定时，你看见${ghost}你下意识地想躲，却发现自己动弹不得。这间洞府忽然变得很大，大得不像话。`,
      opts: [
        opt('直视它，与它把话说清楚', '机', () => {
          if (chk(0.5 + c.S.wits * 0.02 + traitEff('dao'))) {
            fx.dao(-20); fx.mood(8); fx.progress(0.08);
            return `你看着它，把那些年没敢想的事一件件说了出来。说到最后，那影子淡了。你睁开眼，洞府还是那么大，可心是空的、静的。`;
          }
          fx.dao(12); fx.mood(-10);
          return `你说了很多，它一句也没听。它只是笑，笑得你心里发毛。你惊醒时，出了一身冷汗。`;
        }),
        opt('强行斩断念头，不去看它', '险', () => {
          if (chk(0.45 + c.S.wits * 0.02)) { fx.dao(-8); fx.mood(2); return `你斩断念头。那影子像被风吹散的烟，没了。`; }
          fx.dao(15); fx.hp(-0.12);
          return `你斩不断。念头越压越重，最后反噬回来，把你的定境搅得稀碎。`;
        }),
        opt('暂时出关，去做点别的事', '稳', () => {
          fx.dao(-6); fx.mood(-2); fx.heat(2);
          return `你收了功，走出洞府。外面的风很冷，吹得人清醒了些。有些事，是想不明白的，得先放一放。`;
        }),
      ],
    };
  },
});

/* ---------------- 错过 ---------------- */
ev({
  id: 'missed', name: '出关之后', kind: 'cultivate', base: 4, cooldown: 5,
  weight(c) {
    if (!c.is('bihai')) return 0;
    let w = 5;
    c.why(5, '闭关错过');
    return w;
  },
  build(c) {
    const ev = pick([
      '一场席卷越国的战事已经打完了',
      '某个大宗门换了掌门，连山门的匾额都换了',
      '一处秘境开了又关，进去的人出来不到三成',
      '一位你认得的老修士坐化了，没能等到你出关',
    ]);
    return {
      title: '出关之后',
      text: `你推开洞府的石门，阳光刺得眼睛发疼。山下的人说，${ev}。你在洞府里只坐了一坐，外头已经过了这些年。`,
      opts: [
        opt('去人多的地方，把消息打听清楚', '稳', () => {
          fx.credit(3); fx.progress(0);
          const n = c.someNpc();
          if (n) { n.known = true; fx.bond(n.id, 4); return `你在坊市里坐了一整天，听人把这些年的事说了一遍。有个叫${n.name}的，还托人给你留了口信。`; }
          return `你在坊市里坐了一整天，听人把这些年的事说了一遍。有些名字已经听不见了。`;
        }),
        opt('不管这些，回去继续闭关', '稳', () => {
          fx.dao(4); fx.mood(-2);
          return `你在洞口站了一会儿，转身回去，重新合上了石门。`;
        }),
        opt('去凭吊故人，顺便看看留下了什么', '机', () => {
          if (chk(0.5)) {
            fx.stones(rndInt(40, 120)); fx.item('break', 1); fx.mood(-3);
            return `你去了老修士的洞府。东西早被人分光了，只剩一只压在石下的旧盒子，里面还有点灵石和一枚丹药。`;
          }
          fx.mood(-6); fx.dao(3);
          return `你去了。洞府已经塌了半边，什么都没留下。你在废墟前站了很久。`;
        }),
      ],
    };
  },
});

/* ---------------- 反追踪 ---------------- */
ev({
  id: 'cover_tracks', name: '反追踪', kind: 'hide', base: 5, cooldown: 3,
  weight(c) {
    if (c.S.hidden.heat < 15 && c.S.hidden.exposure < 25) return 0;
    let w = 0;
    if (c.is('yinni')) { w += 8; c.why(8, '隐匿蛰伏'); }
    w += c.S.hidden.heat * 0.15;
    c.why(c.S.hidden.heat * 0.15, '被人盯着');
    return w;
  },
  build(c) {
    return {
      title: '反追踪',
      text: `你发现有人在跟着你——不是修士，是凡人。一个卖炊饼的老头，在你住的巷口摆了三天摊，眼睛却总往你窗户上瞟。这种人最难办，杀不得，赶不走。`,
      opts: [
        opt('换个身份，连夜搬走', '稳', () => {
          fx.exposure(-10); fx.heat(-15); fx.stones(-20); fx.mood(-2);
          fx.flag('newIdentity', true);
          return `你连夜搬了家，连招牌都换了。新住处简陋，可巷子里没有人卖炊饼。`;
        }),
        opt('反过来盯住他，看他背后是谁', '机', () => {
          if (chk(0.55 + traitEff('hide') + c.S.wits * 0.02)) {
            fx.exposure(-6);
            const n = c.someNpc();
            if (n) { n.known = true; fx.bond(n.id, -6); return `你跟了那老头两天，最后跟到一间茶铺。坐在里头等消息的人，是${n.name}。你把这张脸记住了，没让他看见你。`; }
            return `你跟了两天，发现他只是个拿钱办事的。给钱的人很小心，没露过面。`;
          }
          fx.exposure(4); fx.heat(5);
          return `你跟得太近，被他察觉了。第二天，巷口的炊饼摊不见了。`;
        }),
        opt('直接找上门，问他收了谁的钱', '险', () => {
          if (chk(0.5)) {
            fx.exposure(6); fx.heat(-8); fx.fame(-4);
            return `你把人堵在巷子里，只问了一句。老头吓得腿都软了，说是坊市里一个姓${
              pick(['王', '李', '赵', '孙'])}的修士给的灵石。你没为难他，转身走了。`;
          }
          return `你找上门时，人已经不见了。桌上留着一张字条：一个地址，和一句话——「来见一面。」`;
        }),
      ],
    };
  },
});

/* ---------------- 遁世 ---------------- */
ev({
  id: 'hermit_life', name: '山居岁月', kind: 'hide', base: 3, cooldown: 8,
  weight(c) {
    let w = 0;
    if (c.is('yinni')) { w += 7; c.why(7, '隐匿蛰伏'); }
    if (c.S.age > 50) w += 2;
    if (c.S.hidden.exposure < 20) w += 2;
    return w;
  },
  build(c) {
    return {
      title: '山居岁月',
      text: `你在山脚下住了几年，和村里的猎户都熟了。有人送来一篮野果，有人请你去给孩子看病。他们不知道你是修士，只当你是城里来的、识得几个字的后生。`,
      opts: [
        opt('就这样住下去，教孩子们认字', '稳', () => {
          fx.mood(10); fx.dao(-8); fx.fame(2); fx.route('changsheng', 4);
          return `你教孩子们认字，替村里人看些小病。这样的日子过得很慢，慢得你几乎忘了自己是个修士。`;
        }),
        opt('替村里解决一桩麻烦', '机', () => {
          fx.fame(5); fx.mood(6); fx.route('changsheng', 3);
          return `山里有东西在偷猎户的羊。你去看了看，是头刚成精的小兽。你没杀它，只是把它赶回了深山。`;
        }),
        opt('收拾行囊，离开这里', '稳', () => {
          fx.mood(-4); fx.exposure(-8); fx.heat(-10);
          return `你在一个清晨走了。走到村口回头看了一眼，炊烟正慢慢地升起来。你怕自己住久了，就再也走不动了。`;
        }),
      ],
    };
  },
});

/* ---------------- 寿元将尽 ---------------- */
ev({
  id: 'twilight', name: '大限将至', kind: 'calamity', base: 6, cooldown: 6,
  weight(c) {
    const left = c.S.life - c.S.age;
    if (left > 30) return 0;
    c.why(10, '大限将至');
    return 10 + (30 - Math.max(0, left)) * 0.5;
  },
  build(c) {
    return {
      title: '大限将至',
      text: `近来夜里总睡不实。你对着水面照了照，鬓角的白发比去年又多了。修行到现在，你能清楚地感觉到那根线——它就在前头不远的地方，慢慢地朝你收过来。`,
      opts: [
        opt('耗尽家财，去寻延寿之物', '险', () => {
          const cost = Math.round(c.S.stones * 0.7);
          fx.stones(-cost);
          if (chk(0.4 + c.S.hidden.credit / 400)) {
            fx.life(rndInt(8, 20)); fx.item('life', 1);
            return `你几乎卖光了所有东西，从一个老丹师手里换到一枚延寿丹。药入口时有点苦，可气血确实暖了起来。`;
          }
          fx.mood(-6);
          return `你花了大价钱，买回来的却是假货。`;
        }),
        opt('闭死关，赌一次突破', '险', () => {
          if (chk(0.35 + traitEff('luck'))) {
            fx.progress(0.5); fx.life(6);
            return `你把生死置之度外，一坐就是数年。某一日，丹田里忽然一松——瓶颈破了。`;
          }
          fx.hp(-0.3); fx.physique(15); fx.mood(-8);
          return `关是闭了，可这一次，你没能冲过去。醒来时，连抬手都费劲。`;
        }),
        opt('接受它，安排后事', '稳', () => {
          fx.mood(10); fx.dao(-10); fx.route('changsheng', 2);
          return `你把洞府收拾干净，该送的东西送了人，该埋的埋了。做完这一切，坐在蒲团上，心里反倒静了。`;
        }),
      ],
    };
  },
});
