// 手绘 canvas 图表：不拉任何库。调用前先按 CSS 尺寸定好画布像素比，保证字不糊。
import { fmtMoney } from './format.js';

function setup(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.font = '13px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  return ctx;
}

function fitWidth(canvas) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(280, Math.round(rect.width));
  const h = Number(canvas.getAttribute('height')) || 260;
  return { w, h };
}

// 支出分类环形图：segments 为 [{name, color, amount}]，已按金额排好。
export function drawDonut(canvas, segments, total) {
  const { w, h } = fitWidth(canvas);
  const size = Math.min(w, 260);
  const ctx = setup(canvas, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const inner = r * 0.62;
  let start = -Math.PI / 2;
  for (const s of segments) {
    const sweep = (s.amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + sweep);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    start += sweep;
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#22312a';
  ctx.font = '700 15px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('本月支出', cx, cy - 8);
  ctx.font = '700 19px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  ctx.fillText(fmtMoney(total), cx, cy + 16);
}

// 六个月收支对照：months 为 [{label, income, expense}]。
export function drawTrend(canvas, months) {
  const { w } = fitWidth(canvas);
  const cssH = 320;
  const ctx = setup(canvas, w, cssH);
  const padL = 58;
  const padR = 10;
  const padT = 26;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = cssH - padT - padB;
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const y = (v) => padT + plotH - (v / max) * plotH;

  ctx.strokeStyle = '#e4dccb';
  ctx.fillStyle = '#6f7a72';
  ctx.textAlign = 'right';
  ctx.font = '12px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    const yy = y(v);
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(w - padR, yy);
    ctx.stroke();
    ctx.fillText('¥' + Math.round(v).toLocaleString('zh-CN'), padL - 8, yy + 4);
  }

  const slot = plotW / months.length;
  const barW = Math.min(26, slot / 3.4);
  months.forEach((m, i) => {
    const x0 = padL + slot * i + slot / 2;
    ctx.fillStyle = '#0f766e';
    const hIn = padT + plotH - y(m.income);
    ctx.fillRect(x0 - barW - 3, y(m.income), barW, hIn);
    ctx.fillStyle = '#c2571f';
    const hEx = padT + plotH - y(m.expense);
    ctx.fillRect(x0 + 3, y(m.expense), barW, hEx);
    ctx.fillStyle = '#22312a';
    ctx.textAlign = 'center';
    ctx.font = '12px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillText(m.label, x0, cssH - 8);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(padL, 4, 12, 12);
  ctx.fillStyle = '#22312a';
  ctx.fillText('收入', padL + 17, 15);
  ctx.fillStyle = '#c2571f';
  ctx.fillRect(padL + 64, 4, 12, 12);
  ctx.fillStyle = '#22312a';
  ctx.fillText('支出', padL + 81, 15);
}

// 本月每日支出：days 为 [{day, amount}]。
export function drawDaily(canvas, days) {
  const { w } = fitWidth(canvas);
  const cssH = 260;
  const ctx = setup(canvas, w, cssH);
  const padL = 44;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = cssH - padT - padB;
  const max = Math.max(1, ...days.map((d) => d.amount));
  const y = (v) => padT + plotH - (v / max) * plotH;
  const slot = plotW / days.length;
  const barW = Math.max(2, Math.min(14, slot - 3));
  ctx.fillStyle = '#6f7a72';
  ctx.textAlign = 'right';
  ctx.font = '12px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
  for (let i = 0; i <= 3; i++) {
    const v = (max * i) / 3;
    const yy = y(v);
    ctx.strokeStyle = '#e4dccb';
    ctx.beginPath();
    ctx.moveTo(padL, yy);
    ctx.lineTo(w - padR, yy);
    ctx.stroke();
    ctx.fillText('¥' + Math.round(v).toLocaleString('zh-CN'), padL - 6, yy + 4);
  }
  days.forEach((d, i) => {
    const x = padL + slot * i + (slot - barW) / 2;
    const h = padT + plotH - y(d.amount);
    ctx.fillStyle = d.amount > 0 ? '#0f766e' : '#e4dccb';
    ctx.fillRect(x, y(d.amount), barW, Math.max(h, d.amount > 0 ? 2 : 0));
    if (d.day === 1 || d.day % 5 === 0) {
      ctx.fillStyle = '#6f7a72';
      ctx.textAlign = 'center';
      ctx.fillText(String(d.day), padL + slot * i + slot / 2, cssH - 8);
    }
  });
}
