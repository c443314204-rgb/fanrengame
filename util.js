'use strict';
/* =============================================================
   凡人修仙传 · 双状态纪元 —— 基础工具
   ============================================================= */

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const chance = (p) => Math.random() < p;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMany = (arr, n) => {
  const pool = arr.slice(), out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
};
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const round = Math.round;

/* 可复现随机（用于开局生成，便于分享种子） */
let SEED = (Date.now() >>> 0) || 1;
function srand() {
  SEED ^= SEED << 13; SEED >>>= 0;
  SEED ^= SEED >>> 17;
  SEED ^= SEED << 5; SEED >>>= 0;
  return SEED / 4294967296;
}
const srnd = (a, b) => a + srand() * (b - a);

const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function cn(n) {
  n = Math.floor(n);
  if (n < 10) return CN_NUM[n];
  if (n < 20) return '十' + (n % 10 ? CN_NUM[n % 10] : '');
  if (n < 100) return CN_NUM[Math.floor(n / 10)] + '十' + (n % 10 ? CN_NUM[n % 10] : '');
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return CN_NUM[h] + '百' + (r ? (r < 10 ? '零' : '') + cn(r) : '');
  }
  return String(n);
}
function fmt(n) {
  n = Math.round(n);
  if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(2).replace(/\.?0+$/, '') + '亿';
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1).replace(/\.0$/, '') + '万';
  return String(n);
}
function pct(v) { return Math.round(v * 100) + '%'; }
function pctStr(v) { return (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; }

/* 加权随机：items 里每项有 w；w<=0 视为不可选 */
function weightedPick(items) {
  const pool = items.filter((x) => x && x.w > 0);
  if (!pool.length) return null;
  const total = sum(pool.map((x) => x.w));
  let r = Math.random() * total;
  for (const it of pool) { r -= it.w; if (r <= 0) return it; }
  return pool[pool.length - 1];
}

/* 设定语气的随机句式 */
const say = (...a) => a[Math.floor(Math.random() * a.length)];

/* 中文数字年份 */
const YEAR_CN = ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
  '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
  '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
  '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'];

/* 取范围随机整数并夹在范围内 */
function rollRange(r) { return rndInt(r[0], r[1]); }

/* 简易 DOM 构造 */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
