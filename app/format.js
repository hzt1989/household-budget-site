// 金额、日期一类的小格式化：只做展示，不碰数据。
export function fmtMoney(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  const body = Number.isInteger(abs)
    ? abs.toLocaleString('zh-CN')
    : abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '-¥' : '¥') + body;
}

export function fmtSigned(n) {
  const v = Number(n) || 0;
  return (v < 0 ? '-' : '+') + fmtMoney(Math.abs(v));
}

// '2026-11-26' -> '2026-11'；月份键全站通用。
export function monthKeyOf(dateStr) {
  return String(dateStr).slice(0, 7);
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return y + '年' + m + '月';
}

// '2026-11-26' -> '11月26日'
export function dayLabel(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return m + '月' + d + '日';
}

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function currentMonthKey() {
  return todayStr().slice(0, 7);
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// 列出从 key 往前推 n 个月的月份键（从早到晚）。
export function lastMonths(key, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(key, -i));
  return out;
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
