// 将 src/ 下的页面、样式与脚本内联为单文件游戏
const fs = require('fs');
const path = require('path');

const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8').replace(/^\uFEFF/, '');
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>');

const re = /<script src="([^"]+)"><\/script>/g;
const seen = [];
html = html.replace(re, (m, file) => {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) throw new Error('script not found: ' + file);
  seen.push(file);
  const js = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  if (js.includes('</script')) throw new Error(file + ' contains </script>, cannot inline');
  return '<script>\n/* ==== ' + file + ' ==== */\n' + js + '\n</script>';
});
if (!seen.length) throw new Error('no script tags found in index.html');

const root = path.join(dir, '..');
function out(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

out('凡人修仙传.html', html);
out(path.join('便携版', 'Game.html'), html);
out(path.join('便携版', '开始游戏.cmd'), [
  '@echo off',
  'rem 凡人修仙传 · 双状态纪元 —— 双击本文件用默认浏览器打开游戏，无需联网',
  'cd /d "%~dp0"',
  'start "" "%~dp0Game.html"',
  'exit',
].join('\r\n'));
out(path.join('便携版', '说明.txt'), [
  '凡人修仙传 · 双状态纪元',
  '====================',
  '',
  '怎么玩：',
  '  1. 双击「开始游戏.cmd」（或直接双击 Game.html）',
  '  2. 选难度 → 卜一卦定身世、灵根与天赋 → 踏入仙途',
  '  3. 每年选一项年度行动，年中会撞上由「世界状态 + 你的状态」碰撞出的事',
  '',
  '特点：',
  '  - 单文件，不需要联网，也不需要安装任何东西',
  '  - 没有固定事件池：事件由权重公式动态生成，你的行为会改变遭遇',
  '  - 存档在浏览器本地（localStorage），换电脑请在「囊」中导出/导入存档码',
  '',
  '同人作品，致敬忘语《凡人修仙传》。',
].join('\r\n'));

console.log('built bytes', Buffer.byteLength(html, 'utf8'), '| inlined:', seen.join(', '));

