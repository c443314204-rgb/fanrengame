'use strict';
/* =============================================================
   事件内容 · 坊市与商道（坊市经营 / 交易信誉 / 露财招祸）
   ============================================================= */

/* ---------------- 拍卖会 ---------------- */
ev({
  id: 'auction', name: '拍卖会', kind: 'market', base: 6, cooldown: 4,
  weight(c) {
    let w = 0;
    if (c.W.publicEvent && c.W.publicEvent.id === 'auction') { w += 12; c.why(12, '大型拍卖会'); }
    if (c.is('shifang')) { w += 8; c.why(8, '坊市经营'); }
    if (c.S.stones > 300) { w += 4; c.why(4, '身家颇丰'); }
    if (c.S.hidden.credit > 30) w += 3;
    return w;
  },
  build(c) {
    const lot = pick([
      { id: 'break', name: '一炉上品破障丹', qty: 2, base: 260 },
      { id: 'art', name: '一柄无主的中品飞剑', qty: 1, base: 420 },
      { id: 'life', name: '一枚延寿丹', qty: 1, base: 900 },
      { id: 'talisman', name: '一叠古法遁符', qty: 5, base: 180 },
    ]);
    const price = Math.round(lot.base * priceOf(lot.id === 'art' ? 'art' : lot.id === 'life' ? 'life' : lot.id, c.S.region));
    return {
      title: '拍卖会',
      text: `坊市的拍卖会设在三层地下的石厅里，来的人不少，蒙面的更多。压轴的几件东西已经抬上来了，其中${lot.name}正被摆上高台，起价${price}块灵石。叫价声此起彼伏，已经有人开始加价了。`,
      opts: [
        opt(`跟价，非拿不可`, '险', () => {
          const final = Math.round(price * rnd(1.4, 2.2));
          if (c.S.stones < final) {
            fx.stones(-c.S.stones); fx.mood(-6);
            return `你一路跟到后来，才发现自己根本吃不下。最后落槌时，你连定金都赔了进去。`;
          }
          fx.stones(-final);
          fx.item(lot.id === 'talisman' ? 'escape' : lot.id === 'break' ? 'break' : lot.id === 'life' ? 'life' : 'material', lot.qty);
          fx.exposure(6); fx.route('caifa', 4);
          if (lot.id === 'art') grantArt('qingzhufeng');
          return `最后落槌，${final}块灵石。你把东西收进袖中，能感觉到周围有几道目光一直跟着你出了坊市。`;
        }),
        opt('只旁观，看看都是些什么人在竞价', '机', () => {
          fx.credit(4); fx.flag('auctionWatchers', true);
          const npc = c.someNpc();
          if (npc) { npc.known = true; fx.bond(npc.id, 3); return `你没有出价，只在角落里看。三号包厢里坐着的是${npc.name}，他一整晚只举了一次牌。你把这个细节记下了。`; }
          return `你安静地看完了全场。谁在抬价，谁在观望，谁在虚张声势，都比拍品本身有意思。`;
        }),
        opt('在场外动手，劫了那个得手的', '险', () => {
          if (chk(0.4 + traitEff('ambush'))) {
            fx.stones(rndInt(100, 260)); fx.blood(2); fx.fame(-8); fx.route('liesha', 8); fx.exposure(8);
            return `你在坊市外的窄巷里等了半夜。得手的是个筑基散修，你从背后下手，一击毙命。储物袋里除了那件拍品，还有不少灵石。`;
          }
          fx.hp(-0.25); fx.exposure(10);
          return `你算错了对方的修为。\n` + fight(mookPower(1.4), '得手的修士', '「我就知道会有人跟来。」他转过身，脸上没什么表情。');
        }),
      ],
    };
  },
});

/* ---------------- 囤货居奇 ---------------- */
ev({
  id: 'hoard_deal', name: '囤货之机', kind: 'market', base: 5, cooldown: 4,
  weight(c) {
    let w = 0;
    if (c.is('shifang')) { w += 9; c.why(9, '坊市经营'); }
    if (c.W.era === 'tense' || c.W.era === 'war') { w += 6; c.why(6, '战乱涨价'); }
    if (c.S.hidden.credit > 25) { w += 4; c.why(4, '坊市信誉'); }
    return w;
  },
  build(c) {
    const good = pick(['heal', 'mana', 'talisman', 'material']);
    const p = buyPrice(good, c.S.region);
    const qty = Math.max(1, Math.floor(c.S.stones / Math.max(1, p) / 2));
    return {
      title: '囤货之机',
      text: `一个相熟的商人找上门来，说手里有一批${GOODS[good].name}想出手，价钱比坊市低三成。「我急着脱手，」他压低声音，「你若吃下，我不问你卖给谁。」你算了算，这批货若压在手里等价钱涨起来，翻一倍都不止。`,
      opts: [
        opt('吃下这批货', '险', () => {
          if (qty < 1) { fx.mood(-2); return `你算了半天，连一成的货都吃不下。只能眼睁睁看着。`; }
          const cost = Math.round(p * qty * 0.7);
          fx.stones(-cost); fx.item(good, qty); fx.route('caifa', 6); fx.credit(3);
          if (c.W.era === 'war' || c.W.era === 'tense') {
            const profit = Math.round(cost * rnd(0.6, 1.4));
            fx.stones(profit);
            return `你压了三个月，战事一起，价钱果然翻了。你分批出手，净赚了${profit}块灵石。`;
          }
          return `你吃下了这批货，压在手里等时机。坊市里没人知道，你床底下堆着半屋子${GOODS[good].name}。`;
        }),
        opt('只吃一半，留些余地', '稳', () => {
          const n = Math.max(1, Math.floor(qty / 2));
          fx.stones(-Math.round(p * n * 0.7)); fx.item(good, n); fx.route('caifa', 3);
          return `你只吃了一半。剩下的，让那商人另寻买主。稳妥些总没错——货压太多，也怕砸在手里。`;
        }),
        opt('不碰，怕是赃物', '稳', () => {
          fx.credit(2);
          return `你婉拒了。坊市里来路不明的东西，吃下去容易，吐出来难。`;
        }),
      ],
    };
  },
});

/* ---------------- 保护费 ---------------- */
ev({
  id: 'protection', name: '地头蛇', kind: 'market', base: 4, cooldown: 5,
  weight(c) {
    let w = 2;
    if (c.is('shifang')) { w += 7; c.why(7, '坊市经营'); }
    if (c.S.stones > 200) { w += 3; c.why(3, '身家颇丰'); }
    if (c.S.hidden.credit > 40) { w -= 2; }
    return w;
  },
  build(c) {
    return {
      title: '地头蛇',
      text: `坊市的管事带着两个打手堵在你的铺子门口：「这个月的份子钱，该交了。」他手里转着两颗铁胆，「别家都交了，就你特殊？」`,
      opts: [
        opt('老老实实交钱', '稳', () => {
          const cost = Math.max(10, Math.round(c.S.stones * 0.08));
          fx.stones(-cost); fx.credit(2);
          return `你数出${cost}块灵石递过去。管事掂了掂，满意地走了。这条街的规矩，就是这样。`;
        }),
        opt('一分不给，让他去别处要', '险', () => {
          if (chk(0.5 + c.S.hidden.fame / 200)) {
            fx.fame(4); fx.credit(5); fx.mood(2);
            return `你把手按在柜台上，盯着他看了三息。管事脸上的笑僵了僵，最后哼了一声，带着人走了。这条街上的人隔天就都知道：这家不好惹。`;
          }
          fx.stones(-Math.round(c.S.stones * 0.15)); fx.fame(-3); fx.heat(5);
          return `你话没说完，两边就打手就动了手。铺子被砸了半边，货也折了不少。\n` +
            (chance(0.5) ? fight(mookPower(1.0), '坊市打手', '「给脸不要脸。」') : `最后你还是把钱交了，多交了一倍。`);
        }),
        opt('反过来请他喝酒，谈个长期合作', '机', () => {
          if (chk(0.6 + traitEff('social'))) {
            fx.stones(-Math.round(c.S.stones * 0.05)); fx.credit(12); fx.route('caifa', 6);
            return `你留他喝了顿酒，席间把话头引到了「合作」上。最后谈定：份子钱照交，但坊市里有什么风声，他先告诉你。`;
          }
          fx.stones(-Math.round(c.S.stones * 0.1)); fx.mood(-2);
          return `酒喝了，话没说拢。管事抹抹嘴，还是把该收的收了。`;
        }),
      ],
    };
  },
});

/* ---------------- 盘下铺子 ---------------- */
ev({
  id: 'shop_buy', name: '盘下铺子', kind: 'market', base: 3, cooldown: 9,
  weight(c) {
    let w = 0;
    if (c.is('shifang')) { w += 8; c.why(8, '坊市经营'); }
    if (c.S.stones > 400) { w += 4; c.why(4, '手头宽裕'); }
    if (c.S.hidden.credit > 30) { w += 3; }
    if (c.S.flags.hasShop) w = 0;
    return w;
  },
  build(c) {
    const cost = 360;
    return {
      title: '盘下铺子',
      text: `坊市西头有一间铺子要转手。位置不算最好，可也差不到哪去。原主是个老丹师，说是年纪大了想回乡。铺子带一只旧丹炉、半柜药材，还有一条没走完的供货路子。要价${cost}块灵石。`,
      opts: [
        opt('盘下来', '稳', () => {
          if (c.S.stones < cost) return `你把储物袋翻了个底朝天，还差得远。只能眼看着别人接手。`;
          fx.stones(-cost); fx.flag('hasShop', true); fx.route('caifa', 20); fx.credit(15);
          return `你把铺子盘了下来，换了块新匾。开张那天没什么客人，可你知道，从今天起，你在这坊市里有了根。`;
        }),
        opt('找人合股，分摊风险', '机', () => {
          if (chk(0.6 + traitEff('social'))) {
            fx.stones(-Math.round(cost / 2)); fx.flag('hasShop', true); fx.route('caifa', 12);
            return `你拉了个相熟的商人合股，一人一半。铺子照样开张，只是以后分钱的时候，总要多算一遍账。`;
          }
          fx.mood(-2);
          return `你找了几个人，都摇头。这年头，谁的钱都不是大风刮来的。`;
        }),
        opt('不碰，铺子是个无底洞', '稳', () => {
          return `你看了一圈，还是走了。铺子是好铺子，可铺子后面的麻烦，比铺子本身值钱。`;
        }),
      ],
    };
  },
});

/* ---------------- 供货链断裂 ---------------- */
ev({
  id: 'supply_cut', name: '断货', kind: 'market', base: 4, cooldown: 5,
  weight(c) {
    if (!c.S.flags.hasShop) return 0;
    let w = 10;
    c.why(10, '坊市产业');
    if (c.W.era === 'war') { w += 8; c.why(8, '战乱断道'); }
    return w;
  },
  build(c) {
    return {
      title: '断货',
      text: `铺子的老主顾来问了三回，那批灵药还是没到。派去催货的人回来说，南边的道被魔修封了，送货的商队折在半路上，连人带货都没了。柜台后头，伙计正眼巴巴地看着你。`,
      opts: [
        opt('亲自走一趟，去接货', '险', () => {
          if (chk(0.5 + traitEff('flee'))) {
            fx.stones(rndInt(80, 180)); fx.credit(8); fx.route('caifa', 6); fx.exposure(3);
            return `你亲自押着货走了三天夜路，绕开了两处魔修的哨卡。货到铺子那天，老主顾们排着队来取。这一趟，信誉比灵石更值钱。`;
          }
          fx.hp(-0.2); fx.stones(-Math.round(c.S.stones * 0.1));
          return `你在半路上撞见了魔修的巡逻队，货丢了，人也受了伤。回到铺子，只能把定金一一退回去。`;
        }),
        opt('改从他处高价调货，先保住信誉', '机', () => {
          const cost = Math.round(c.S.stones * 0.2);
          fx.stones(-cost); fx.credit(10); fx.route('caifa', 4);
          return `你咬牙从别处高价调了一批货，赔本赚吆喝。老主顾们不知道你亏了多少，只知道这家的货从没断过。`;
        }),
        opt('暂闭铺门，等风头过去', '稳', () => {
          fx.credit(-8); fx.mood(-3);
          return `你挂了块「东主有事」的牌子，把铺门关了。几个月后再开，熟客已经去了别家。`;
        }),
      ],
    };
  },
});

/* ---------------- 假药 ---------------- */
ev({
  id: 'fake_goods', name: '假药风波', kind: 'market', base: 4, cooldown: 6,
  weight(c) {
    if (!c.S.flags.hasShop) return 0;
    return 9;
  },
  build(c) {
    return {
      title: '假药风波',
      text: `一个散修拎着半瓶丹药闯进铺子，把瓶子砸在柜台上：「你们卖的什么玩意儿？我兄弟吃了这个，差点没挺过来！」门外已经围了半条街的人。`,
      opts: [
        opt('认下，赔钱道歉', '稳', () => {
          fx.stones(-Math.round(c.S.stones * 0.15)); fx.credit(6); fx.fame(2);
          return `你没有争辩，当场赔了灵石，又请了坊市里最好的丹师替他兄弟看诊。人群散了，有人小声说：「这家还算讲道理。」`;
        }),
        opt('查验药瓶，反咬他调包', '机', () => {
          if (chk(0.55 + c.S.hidden.credit / 300)) {
            fx.credit(8); fx.fame(3); fx.stones(rndInt(10, 40));
            return `你接过药瓶只看了一眼，就指出了封口的印泥不对——这东西根本不是从你铺子里出去的。围观的人哗然，那散修涨红了脸，被坊市的执事带走了。`;
          }
          fx.credit(-12); fx.fame(-5);
          return `你查验了半天，说不出个所以然。围观的人开始指指点点，那散修越发有理。最后赔了钱，名声也坏了。`;
        }),
        opt('把人请进后堂，私下解决', '机', () => {
          if (chk(0.5)) {
            fx.stones(-Math.round(c.S.stones * 0.08)); fx.credit(3); fx.heat(3);
            return `你把人请进去，关了门。半个时辰后，他握着一个小袋子出来，没再说话。没人知道你们谈了什么。`;
          }
          fx.exposure(5); fx.credit(-6);
          return `你想私下解决，对方却认定了你心虚，闹得更大。这件事最后传到了坊市管事耳朵里。`;
        }),
      ],
    };
  },
});

/* ---------------- 黑吃黑 ---------------- */
ev({
  id: 'black_deal', name: '黑吃黑', kind: 'market', base: 4, cooldown: 4,
  weight(c) {
    let w = 0;
    if (c.S.hidden.bloodDebt > 10 || c.S.hidden.fame < -20) { w += 6; c.why(6, '恶名在外'); }
    if (c.is('shifang')) { w += 4; }
    if (c.W.era === 'war') { w += 3; }
    return w;
  },
  build(c) {
    return {
      title: '黑吃黑',
      text: `有人托坊市的掮客递了句话：城南破庙里有一批「干净」的货，问你要不要。货是干净的，人不是——这批东西是从一个刚死的结丹修士身上扒下来的，卖它的人急着出手，也知道买家会是什么人。`,
      opts: [
        opt('去，把货吃下', '险', () => {
          if (chk(0.5 + traitEff('ambush'))) {
            fx.stones(rndInt(120, 300)); fx.exposure(8); fx.route('caifa', 8); fx.route('liesha', 4);
            return `你去了。货确实干净，价钱也确实低得离谱。可就在你伸手去接储物袋的时候，对方忽然发难——你比他快了半息。\n你带着两袋东西出来，破庙里留了一具尸体。`;
          }
          fx.hp(-0.3); fx.exposure(10);
          return `你去了。庙里等着你的不止一个人。\n` + fight(mookPower(1.35), '验货的修士', '「货在这儿。」他笑着，手却往袖子里探。');
        }),
        opt('不去，但把消息转卖出去', '机', () => {
          fx.stones(rndInt(30, 70)); fx.credit(-3); fx.route('caifa', 4);
          return `你转手把这条消息卖给了一个专做这路生意的掮客，赚了一笔居间费。至于那批货后来到了谁手里，你没问。`;
        }),
        opt('报给坊市执事，换个人情', '稳', () => {
          fx.credit(10); fx.fame(3); fx.mood(1);
          return `你把消息递给了坊市执事。三天后，城南破庙被围了个水泄不通。执事见了你，破例点了点头。`;
        }),
      ],
    };
  },
});

/* ---------------- 大主顾 ---------------- */
ev({
  id: 'big_buyer', name: '大主顾', kind: 'market', base: 4, cooldown: 6,
  weight(c) {
    let w = 0;
    if (c.S.flags.hasShop) { w += 8; c.why(8, '坊市产业'); }
    if (c.S.hidden.credit > 35) { w += 5; c.why(5, '坊市信誉'); }
    if (c.S.flags.bigClient) w = 0;
    return w;
  },
  build(c) {
    return {
      title: '大主顾',
      text: `一位穿锦袍的中年人走进铺子，身后跟着两名随从。他没看柜台上的货，只问了一句：「你这里，接不接长单？」`,
      opts: [
        opt('接，问他什么价', '机', () => {
          fx.flag('bigClient', true); fx.route('caifa', 12); fx.credit(8);
          const advance = rndInt(100, 260);
          fx.stones(advance);
          return `他要的是一批定量的疗伤丹，每月一交，给的价比坊市高出两成，还先付了${advance}块灵石的定钱。这样的主顾，一年遇上不了一个。`;
        }),
        opt('先探他的底细', '机', () => {
          if (chk(0.55 + c.S.wits * 0.02)) {
            fx.flag('bigClient', true); fx.route('caifa', 8);
            return `你留了个心眼，托人去查。这人是越国境内一家大商号的三掌柜，背后靠着某个宗门。身份干净。你这才应下了这单生意。`;
          }
          fx.mood(-2);
          return `你查了半个月，什么也没查到。等再去回话时，这位主顾已经在别家下了单。`;
        }),
        opt('推了，长单绑人', '稳', () => {
          fx.credit(2);
          return `你婉言推了。长单看着稳当，可一旦交不上货，赔的就不只是灵石了。`;
        }),
      ],
    };
  },
});

/* ---------------- 债务 ---------------- */
ev({
  id: 'debt', name: '旧债', kind: 'market', base: 3, cooldown: 7,
  weight(c) {
    if (c.S.hidden.credit > 10) return 0;
    return c.S.hidden.credit < 0 ? 8 : 3;
  },
  build(c) {
    return {
      title: '旧债',
      text: `一个面生的修士找上门来，手里拿着一枚借据玉简：「三年前你借的那笔灵石，该还了。连本带利，一共一百二十块。」你完全不记得有这回事——可玉简上的气息，确实是你自己的。`,
      opts: [
        opt('认账，把钱还了', '稳', () => {
          const cost = Math.min(c.S.stones, 120);
          fx.stones(-cost); fx.credit(8);
          return `你把灵石数给了他。玉简当场碎了，化作一缕青烟。你心里清楚，有些账是还给自己心安的。`;
        }),
        opt('不认，让他拿出证据', '机', () => {
          if (chk(0.5 + c.S.wits * 0.02)) {
            fx.credit(4); fx.fame(2); fx.mood(1);
            return `你只问了三句话，那人就露了怯。玉简上的气息是真的，可日期是假的。他被坊市的执事带走时，还在回头喊冤。`;
          }
          fx.stones(-Math.min(c.S.stones, 150)); fx.credit(-6); fx.heat(4);
          return `你辩不过。坊市的规矩是认玉简不认人，你只能把钱掏了，还多付了一笔「滞纳」。`;
        }),
        opt('动手，把借据毁掉', '险', () => {
          fx.blood(1); fx.fame(-6); fx.exposure(6); fx.route('liesha', 5);
          if (chk(0.5)) return `你出手极快。玉简碎了，人也倒了。你把尸体拖进后巷，回来时手还在抖。`;
          fx.hp(-0.18);
          return `对方早有防备。\n` + fight(mookPower(1.15), '讨债的修士', '「就知道你会来这套。」');
        }),
      ],
    };
  },
});
