'use strict';
/* =============================================================
   事件内容 · 探索历练
   ============================================================= */

const opt = (text, tag, run) => ({ text, tag, run });

/* ---------------- 采药遇险 ---------------- */
ev({
  id: 'herb_risk', name: '崖畔灵药', kind: 'explore', base: 8, cooldown: 2,
  weight(c) {
    let w = 0;
    if (c.is('youli')) w += 14;
    w += (c.danger - 1) * 12;
    if (c.S.hidden.physique > 20) w += 4;
    c.why(w >= 14 ? 14 : 0, c.is('youli') ? '外出历练' : '');
    c.why((c.danger - 1) * 12, '此地凶险');
    return w;
  },
  build(c) {
    const g = pick(['一株通体赤红的血参', '三朵并生的幽兰', '一丛结着紫果的矮木', '半截埋在石缝里的何首乌']);
    return {
      title: '崖畔灵药',
      text: `你在${c.S.place}外围的山崖上，看见了${g}。药是好药，可崖下的石缝里盘着一团灰影，似乎是一条成了精的岩蟒，正慢慢地吐着信子。`,
      opts: [
        opt('绕道从上方垂索，冒险采药', '险', () => {
          if (chk(0.55 + traitEff('flee') * 0.5)) {
            fx.stones(rndInt(10, 26)); fx.item('herb', rndInt(1, 2)); fx.progress(0.06);
            return `你贴着崖壁一点点挪过去，指尖抠进石缝，把那株灵药连根拔起。回到安全处时，后背的衣裳已经湿透了。`;
          }
          fx.hp(-0.18); fx.physique(3);
          return `石缝里的灰影猛地弹起，你只来得及侧身。岩蟒的牙在你小臂上划开一道血口，灵药却也被你死死攥在手里、带下了崖——算是不亏，只是伤口一时半会儿好不了。`;
        }),
        opt('在崖下蹲守，等它自己离开', '稳', () => {
          fx.progress(0.02); fx.mood(-2);
          return `你在崖下等了半日。日头偏西时，那条岩蟒终于缓缓游走了。你爬上去采药，手脚都冻得发麻，好歹没有惊动什么东西。`;
        }),
        opt('记下位置，回头再说', '稳', () => {
          fx.flag('herbSpot', c.S.place); fx.mood(1);
          return `你没有逞强。回程路上把这个地方记在了心里——等修为再高些，这株药自然还是你的。`;
        }),
      ],
    };
  },
});

/* ---------------- 妖兽拦路 ---------------- */
ev({
  id: 'beast_block', name: '妖兽拦路', kind: 'combat', base: 7, cooldown: 2,
  weight(c) {
    let w = 6 + (c.danger - 1) * 16;
    if (c.is('youli')) w += 5;
    if (c.W.publicEvent && c.W.publicEvent.id === 'beastTide') { w += 20; c.why(20, '妖兽潮'); }
    if (hasPosTrait('yixiang')) { w += 6; c.why(6, '身具异香'); }
    if (c.S.hidden.heat > 30) w += 3;
    c.why(5, c.is('youli') ? '外出历练' : '');
    return w;
  },
  build(c) {
    const lvl = c.S.tier <= 1 ? pick(['一头青背狼', '一只铁甲蜈蚣', '一头落了单的赤睛猪']) : pick(['一头三阶妖兽', '一条双头赤练蛇', '一只铁羽雕']);
    return {
      title: '妖兽拦路',
      text: `转过山坳时，${lvl}正堵在必经的隘口上。它已经看见你了，喉咙里滚出低沉的声响，前爪在地上刨出两道深痕。`,
      opts: [
        opt('抢先出手，斩杀此兽', '险', () => fight(mookPower(rnd(0.8, 1.2)), lvl, `${lvl}低吼一声扑了上来。`)),
        opt('屏息退走，绕远路', '稳', () => {
          if (chk(0.68 - traitEff('flee') * 0.3)) {
            fx.heat(2);
            return `你一寸寸往后退，退到它的视线之外才敢转身。绕了小半个时辰的山路，多费些脚力，总算没缺胳膊少腿。`;
          }
          fx.hp(-0.12);
          return `你刚退了两步，它就动了。你连滚带爬地逃出老远，肩头被撕开一道口子。回头时，它已经叼着你掉落的口袋走远了。`;
        }),
        opt('以符箓惊退（需火弹符）', '机', () => {
          if (itemCount('talAtk') < 1) return '你摸了摸袖袋，空空如也。';
          addItem('talAtk', -1);
          fx.stones(rndInt(4, 10)); fx.item('material', 1);
          return `一张火弹符拍出去，火光在隘口炸开。妖兽受惊，夹着尾巴逃了。你捡了它掉下的一截兽角，倒也算有收获。`;
        }),
      ],
    };
  },
});

/* ---------------- 灵脉现世 ---------------- */
ev({
  id: 'spirit_vein', name: '地脉灵气', kind: 'explore', base: 5, cooldown: 6, minTier: 1,
  weight(c) {
    let w = 3 + (c.era.id === 'recover' ? 4 : 0);
    if (c.is('bihai')) { w -= 3; c.why(-3, '闭关不出'); }
    if (c.is('youli')) { w += 4; c.why(4, '外出历练'); }
    if (c.reg.danger < 1.15) w += 2;
    return w;
  },
  build(c) {
    const place = pick(['一处干涸的古井', '半山腰的废弃猎屋', '一片枯死的竹林深处', '山谷尽头的石壁']);
    return {
      title: '地脉灵气',
      text: `你在${place}发现了一缕不寻常的灵气。凑近了看，石缝间有水珠缓缓沁出，带着淡淡的凉意——这是一处极小的地脉灵眼，浅得几乎算不上灵脉，却胜在无人知晓。`,
      opts: [
        opt('就地盘坐，引灵气入体', '机', () => {
          const gain = rnd(0.12, 0.25) * (1 + traitEff('luck'));
          fx.progress(gain); fx.mood(3);
          return `你就着那缕灵气打坐了一夜。天亮时，井壁上的水痕干了，你体内的灵气却厚了一层。这样的地方，一次也就够用一回。`;
        }),
        opt('记下位置，回去建一处洞府', '稳', () => {
          fx.flag('caveSite', c.S.place); fx.stones(-0); fx.route('changsheng', 4);
          return `你没有急着用掉它。回去的路上，你已经在盘算：这里偏僻，灵气虽薄，可正适合长住。`;
        }),
        opt('挖开石壁，看看里面有什么', '险', () => {
          if (chk(0.45)) { fx.stones(rndInt(30, 80)); fx.item('material', 1); fx.exposure(3); return `石壁后面是一间极小的石室，像是前人辟出来的。积灰里有一小袋灵石，还有几块未及带走的炼器材料。`; }
          fx.physique(5); fx.hp(-0.1);
          return `石壁塌了半边。你被埋在碎石头里，挣扎着爬出来时，肋骨疼得厉害。灵眼也彻底堵死了。`;
        }),
      ],
    };
  },
});

/* ---------------- 无名洞府 ---------------- */
ev({
  id: 'cave_find', name: '荒山洞府', kind: 'explore', base: 4, cooldown: 8, minTier: 1,
  weight(c) {
    let w = 2.5 + (c.reg.danger - 1) * 8;
    if (c.is('youli')) { w += 3; c.why(3, '外出历练'); }
    if (traitEff('luck')) { w *= 1.2; }
    return w;
  },
  build(c) {
    return {
      title: '荒山洞府',
      text: `荒草掩着一处极隐蔽的洞口。你拨开藤蔓进去，里面是一间早已废弃的洞府——蒲团朽了，丹炉裂了，墙上还留着半幅没画完的阵法。主人走得很急，或者，根本没来得及走。`,
      opts: [
        opt('仔细搜检遗物', '机', () => {
          const lucky = chk(0.4 + traitEff('luck'));
          if (lucky) {
            const t = pick(['qingyuan', 'dayan', 'xuangui', 'huoyan']);
            fx.learnTech(t); fx.stones(rndInt(20, 60));
            return `蒲团底下压着一只玉盒，里面是一卷保存完好的功法——《${TECHS[t].name}》。盒底还有十几块灵石。你把玉盒贴身收好，心跳得厉害。`;
          }
          fx.stones(rndInt(8, 24)); fx.item('herb', 2);
          return `丹炉底下有个夹层，几块灵石和两株风干的灵药。功法没找到，大概早被主人带走了。`;
        }),
        opt('在此地打坐，借洞府残余灵气修行', '稳', () => {
          fx.progress(0.1); fx.mood(2);
          return `洞府虽废弃，到底曾被人以灵脉养过。你在此静坐数日，比在野外强上不少。`;
        }),
        opt('设下陷阱，守株待兔', '险', () => {
          if (chk(0.4)) {
            const npc = c.someNpc();
            if (npc) { fx.stones(Math.round(npc.wealth * 0.3)); fx.exposure(4); fx.route('liesha', 5); return `第三日，果然有人摸进洞来。你借地形把人放倒，搜了他的储物袋——这人本也是冲着这处洞府来的。`; }
            fx.stones(rndInt(15, 40));
            return `守了三日，没等来人，倒等来一窝山鼠。你自嘲地笑笑，收了东西离开。`;
          }
          fx.hp(-0.2); fx.exposure(5);
          return `来的是两个结伴的散修。你只放倒了一个，另一个跑了——你不敢追，连夜换了地方。`;
        }),
      ],
    };
  },
});

/* ---------------- 落单修士 ---------------- */
ev({
  id: 'meet_wanderer', name: '道左相逢', kind: 'social', base: 9, cooldown: 2,
  weight(c) {
    let w = 6;
    if (c.is('youli')) { w += 10; c.why(10, '外出历练'); }
    if (c.is('bihai')) { w -= 6; c.why(-6, '闭关不出'); }
    w += livingInRegion(c.S.region).length * 0.5;
    return w;
  },
  build(c) {
    const n = c.someNpc((x) => x.realm >= Math.max(0, c.S.tier - 1) && x.realm <= c.S.tier + 1) || c.anyNpc();
    if (!n) return null;
    n.known = true;
    return {
      title: '道左相逢',
      text: `山道上迎面走来一个${n.tag}。${n.desc}他看见你，脚步明显慢了半拍，手也搭在了储物袋上，却没有立刻发难。这年头，两个修士在林子里撞见，谁先动手都说不准。`,
      opts: [
        opt('抱拳见礼，攀谈几句', '稳', () => {
          if (chk(0.6 + traitEff('social'))) {
            fx.bond(n.id, rndInt(6, 14)); fx.fame(1);
            const tip = pick(['附近有一处小型的灵药市集', '前头有条路最近不太平', '某座坊市最近在收妖兽材料', '山里有处地脉不太稳，夜里常有异响']);
            return `对方见你礼数周全，也松了手，回了一礼。两人在路边说了会儿话，他提起${tip}。临走时互通了姓名——他叫${n.name}。`;
          }
          fx.bond(n.id, -4);
          return `你刚抱拳，对方却像被踩了尾巴，厉声问你想干什么。你连忙摆手解释，他还是退着走了，一路盯着你。`;
        }),
        opt('不发一言，各走各路', '稳', () => {
          fx.mood(-1);
          return `你们彼此盯着，错身而过，各自走出十几步才敢回头。这大概是散修之间最常见的相处方式。`;
        }),
        opt('出言试探，看能不能问出点东西', '机', () => {
          if (chk(0.5 + traitEff('social'))) {
            fx.bond(n.id, 4); fx.credit(2);
            const info = pick(['一处秘境入口的大致方位', '某个宗门最近在招人', '一名魔修在附近出没的消息']);
            return `你装作随口一提，对方却接了下去。三言两语间，你摸到了${info}。他走后，你在原地盘算了一阵。`;
          }
          fx.bond(n.id, -8); fx.exposure(3);
          return `你的话问得太急，对方脸色一沉，甩袖就走。走出老远，还回头看了你一眼。`;
        }),
      ],
    };
  },
});

/* ---------------- 古战场遗蜕 ---------------- */
ev({
  id: 'battle_remains', name: '古战场遗蜕', kind: 'explore', base: 2.5, cooldown: 10, minTier: 2,
  weight(c) {
    let w = 1.5 + (c.W.era === 'war' || c.W.era === 'scar' ? 5 : 0);
    c.why(c.W.era === 'war' ? 5 : 0, c.W.era === 'war' ? '战乱之地' : '');
    if (c.is('youli')) w += 2;
    return w;
  },
  build(c) {
    return {
      title: '古战场遗蜕',
      text: `这是一片被雷火犁过的焦土，寸草不生。半截断剑斜插在土里，剑身上还缠着一缕没散尽的黑气。再往里走，你看见几具白骨保持着斗法的姿势——其中一个的丹田处，似乎还嵌着什么东西。`,
      opts: [
        opt('破开丹田，取出那件东西', '险', () => {
          if (chk(0.45 + traitEff('appraise'))) {
            const art = pick(['wulei', 'xuanwu', 'lingmu']);
            fx.art(art);
            return `你以灵力震开那具枯骨，一枚冰凉的东西落进掌心——是${TREASURES[art].name}。${TREASURES[art].desc}你把东西贴身收好，冲着白骨拱了拱手。`;
          }
          fx.hp(-0.22); fx.dao(6); fx.exposure(6);
          return `指尖刚碰到那东西，一股阴寒的黑气就顺着手臂窜了上来。你急忙运功逼出，人也退出了老远。再看那具白骨，已经化成一摊黑水。`;
        }),
        opt('收敛遗骨，就地掩埋', '稳', () => {
          fx.mood(5); fx.dao(-4); fx.fame(3);
          return `你花了半日，把能找到的骸骨都埋在一处，堆了个小小的土堆。修行路上，谁也说不准自己最后会不会也这样躺着。`;
        }),
        opt('刮下剑上的黑气炼化', '险', () => {
          if (chk(0.4)) { fx.progress(0.14); fx.exposure(5); return `那缕黑气竟是一缕极精纯的煞气。你以真元裹着它一点点炼化，修为涨了一截，只是丹田里总觉得多了点凉意。`; }
          fx.dao(8); fx.mood(-6);
          return `煞气一入体就往识海里钻。你咬着牙把它逼出来，出了一身冷汗。有些东西，果然不该碰。`;
        }),
      ],
    };
  },
});

/* ---------------- 秘境传闻 ---------------- */
ev({
  id: 'realm_rumor', name: '秘境传闻', kind: 'explore', base: 5, cooldown: 5,
  weight(c) {
    let w = 4;
    if (c.W.publicEvent && c.W.publicEvent.id === 'secretRealm') { w += 10; c.why(10, '秘境开启'); }
    if (c.S.tier >= 2) w += 3;
    if (c.is('shifang')) w += 6;
    c.why(c.is('shifang') ? 6 : 0, c.is('shifang') ? '坊市打听' : '');
    return w;
  },
  build(c) {
    const dir = pick(['北面三百里的一处枯山', '海外的一座无名岛', '邻国的雾泽深处']);
    return {
      title: '秘境传闻',
      text: `坊市里的人都在传：${dir}有异光冲天，八成是上古修士的遗府现世。几个散修已经动身了，也有人摇头说那是凶地，进去的人没一个回来。`,
      opts: [
        opt('立刻动身，抢在前头', '险', () => {
          if (chk(0.5 + traitEff('luck'))) {
            fx.stones(rndInt(60, 160)); fx.item('material', 2); fx.progress(0.1); fx.route('liesha', 4);
            return `你连夜赶到，入口还开着。里面比传闻中更凶险，可也更肥——你从一具前人骸骨旁摸到两只储物袋，还采了两株年份极好的灵药。`;
          }
          fx.hp(-0.25); fx.physique(6);
          return `你到的时候，入口已经挤满了人。里头禁制重重，你被一道残阵弹出来，吐了两口血。所谓机缘，多半是别人的。`;
        }),
        opt('先去坊市把消息卖个好价钱', '机', () => {
          fx.stones(rndInt(15, 40)); fx.credit(5); fx.route('caifa', 4);
          return `你转头进了坊市，把这消息分三处卖给了三个不同的人。他们互相不知道，你也没打算让他们知道。`;
        }),
        opt('按兵不动，等第一批人回来再说', '稳', () => {
          fx.mood(2); fx.flag('realmWait', true);
          return `你照常修你的行。三个月后，消息传回来了：进去七个人，出来两个，那两个被人在半路截了。你庆幸自己没去。`;
        }),
      ],
    };
  },
});

/* ---------------- 雾障迷途 ---------------- */
ev({
  id: 'lost_fog', name: '雾障迷途', kind: 'explore', base: 4, cooldown: 4,
  weight(c) {
    let w = 2.5 + (c.danger - 1) * 10 + (c.reg.danger - 1) * 6;
    if (c.is('youli')) { w += 5; c.why(5, '外出历练'); }
    return w;
  },
  build(c) {
    return {
      title: '雾障迷途',
      text: `雾来得毫无征兆。前后左右都是白，连自己的手指都看不太清。你走了很久，发现自己又回到了同一块歪脖子石头旁——这雾不对劲，是动了手脚的。`,
      opts: [
        opt('以神识探路，硬闯出去', '机', () => {
          if (chk(0.5 + c.S.wits * 0.03)) {
            fx.progress(0.05); fx.mood(3);
            return `你闭上眼，不再用眼睛看，只以神识一寸寸摸出去。雾里有细密的灵力纹路，像是有人随手布下的困阵。顺着纹路走，天光忽然就透了下来。`;
          }
          fx.hp(-0.12); fx.mp(-0.3);
          return `神识探出去，撞上一层黏腻的东西，反震得你太阳穴生疼。你在雾里转了整整两天，才摸到一条出去的缝。`;
        }),
        opt('原地不动，静待雾散', '稳', () => {
          fx.mood(-3); fx.progress(0.02); fx.heat(3);
          return `你找了个背风的石头坐下，一坐就是三天。第四日清晨，雾自己散了。远处山道上，有人在低声说话。`;
        }),
        opt('循着雾里隐约的人声过去', '险', () => {
          if (chk(0.45)) {
            const npc = c.someNpc();
            if (npc) { fx.bond(npc.id, 8); return `雾里是个同样迷路的修士。两人合力寻路，走出雾障时天已经黑了。他叫${npc.name}，说这份情记下了。`; }
            fx.stones(rndInt(20, 50));
            return `人声引你到一处石台，台上摆着一只半旧的蒲团和一只储物袋——布雾的人早就走了。`;
          }
          const npc = c.someNpc((x) => x.side === '魔');
          return `人声是诱饵。三个蒙面修士从雾里围上来，为首的低声笑道：「本来只想劫个财，谁叫你听见了呢。」\n` + fightNpc(npc, `雾中窜出三道黑影，杀气直逼面门。`);
        }),
      ],
    };
  },
});

/* ---------------- 灵泉洗体 ---------------- */
ev({
  id: 'spring', name: '灵泉洗体', kind: 'explore', base: 3, cooldown: 9,
  weight(c) { return 2 + (c.S.hidden.physique > 15 ? 5 : 0) + (c.is('youli') ? 3 : 0); },
  build(c) {
    return {
      title: '灵泉洗体',
      text: `山腹里有一汪温热的泉。泉水清得能看见底，水面上浮着一层极淡的白气。你把手探进去，一股温润的灵气顺着经络往上走——这泉可洗经伐髓，只是不知泡久了会怎样。`,
      opts: [
        opt('脱衣入水，泡上一夜', '机', () => {
          if (chk(0.7)) {
            fx.physique(-12); fx.progress(0.08); fx.mood(4);
            return `泉水从四面八方渗进你的经脉，把藏在骨缝里的暗伤一点点泡软、化开。天亮时你从水里出来，只觉得浑身上下都轻了。`;
          }
          fx.mood(-5); fx.physique(4);
          return `泡到后半夜，泉水忽然变凉。你惊觉不对，爬上岸时已经晚了——冷气顺着毛孔钻进骨头里，反倒添了一层新伤。`;
        }),
        opt('只取一壶泉水带走', '稳', () => {
          fx.item('heal', 1); fx.item('mind', 1);
          return `你用玉壶装了两壶泉水，又采了几株泉边生的草。这些东西带回去，比泡一次澡划算。`;
        }),
        opt('以泉水炼丹，试试手气', '机', () => {
          if (chk(0.45 + traitEff('alchemy'))) {
            fx.item('break', 1); fx.route('zongshi', 4);
            return `你支起丹炉，以泉水为引。火候起落之间，竟真结出一枚破障丹——成色不算上佳，可这种运气不是每次都有。`;
          }
          fx.item('heal', 1);
          return `丹炉炸了。你灰头土脸地收拾残局，只捞回一枚勉强能用的疗伤丹。`;
        }),
      ],
    };
  },
});

/* ---------------- 被人追赶 ---------------- */
ev({
  id: 'chase', name: '身后有人', kind: 'danger', base: 3, cooldown: 3,
  weight(c) {
    let w = 0;
    if (c.S.hidden.exposure > 30) { w += (c.S.hidden.exposure - 30) * 0.18; c.why((c.S.hidden.exposure - 30) * 0.18, '秘密暴露'); }
    if (c.S.hidden.bloodDebt > 10) { w += 4; c.why(4, '血债'); }
    if (c.S.stones > 200) { w += 3; c.why(3, '身家颇丰'); }
    if (c.is('yinni') || c.is('bihai')) { w *= 0.3; }
    return w;
  },
  build(c) {
    return {
      title: '身后有人',
      text: `你已经第三次在身后听见同样的脚步声了。不远不近，你停它也停，你走它就走。转过一道山梁时，你借着水面反光看见一个人影，青布蒙面，腰间挂着一串铃铛。`,
      opts: [
        opt('骤然回身，抢先动手', '险', () => fight(mookPower(rnd(0.9, 1.3)), '蒙面修士', '你猛地转身，那人显然没料到。')),
        opt('加快遁速，甩掉尾巴', '机', () => {
          if (chk(0.55 + traitEff('flee') + traitEff('escape'))) {
            fx.mp(-0.2); fx.heat(-5);
            return `你暗暗催动遁光，专往林木最密的地方钻。绕了半个时辰，那串铃铛声终于听不见了。`;
          }
          fx.mp(-0.35); fx.hp(-0.1);
          return `你拼命催动遁术，可对方的修为比你高出一线。眼看就要被追上，你咬牙把随身的一只空储物袋扔下，趁他去捡的工夫才脱身。`;
        }),
        opt('主动停下，问他想干什么', '机', () => {
          if (chk(0.5 + traitEff('social'))) {
            fx.stones(-rndInt(10, 30)); fx.mood(-2);
            return `那人也不遮掩，开口就要「借」三十块灵石。你权衡了一下，给了。他收了灵石，拱手说了句「道友识趣」，转身走了。`;
          }
          return `你话音未落，那人已经欺身而上。\n` + fight(mookPower(rnd(1, 1.4)), '蒙面修士', '刀光当头罩下。');
        }),
      ],
    };
  },
});
