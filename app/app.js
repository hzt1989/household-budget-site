// 界面层：路由、五个视图的渲染、表单与筛选。
// 所有数字都来自 store.js 的现算结果，这里只负责显示和接住点击。
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryOf,
  loadState, saveState, addTransaction, updateTransaction, deleteTransaction,
  setBudgets, loadSample, clearAll, txInMonth, totalsForMonth,
  expenseByCategory, budgetStatus, dailyExpense, toCsv,
} from './store.js';
import { fmtMoney, monthKeyOf, monthLabel, dayLabel, todayStr, currentMonthKey, shiftMonth, lastMonths, escapeHtml } from './format.js';
import { drawDonut, drawTrend, drawDaily } from './charts.js';

const state = loadState();
let currentMonth = currentMonthKey();
let editingId = null;
let formType = 'expense';

const $ = (id) => document.getElementById(id);
const ROUTES = ['overview', 'add', 'ledger', 'budgets', 'stats'];

function route() {
  const hash = location.hash || '#/overview';
  const name = hash.replace('#/', '').split('?')[0];
  return ROUTES.includes(name) ? name : 'overview';
}

function showView(name) {
  for (const r of ROUTES) {
    $(`view-${r}`).hidden = r !== name;
    document.querySelector(`[data-route="${r}"]`)?.classList.toggle('active', r === name);
  }
}

function renderMonthBar() {
  $('monthLabel').textContent = monthLabel(currentMonth);
  $('todayMonth').hidden = currentMonth === currentMonthKey();
}

function txRow(t, showDate) {
  const cat = categoryOf(t.type, t.category);
  const sign = t.type === 'income' ? '+' : '-';
  return `<li>
    <span class="tx-cat ${t.type}">${escapeHtml(cat.name.slice(0, 2))}</span>
    <span class="tx-main">
      <span class="tx-note">${escapeHtml(t.note || cat.name)}</span>
      <span class="tx-meta">${showDate ? dayLabel(t.date) + ' · ' : ''}${escapeHtml(cat.name)}</span>
    </span>
    <span class="tx-amt ${t.type}">${sign}${fmtMoney(t.amount)}</span>
    <span class="tx-actions">
      <button type="button" class="icon-btn" data-edit="${t.id}" aria-label="改这笔">改</button>
      <button type="button" class="icon-btn danger" data-del="${t.id}" aria-label="删这笔">删</button>
    </span>
  </li>`;
}

function bindTxActions(root) {
  root.querySelectorAll('[data-edit]').forEach((b) => {
    b.addEventListener('click', () => {
      editingId = b.dataset.edit;
      location.hash = '#/add';
    });
  });
  root.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', () => {
      const t = state.transactions.find((x) => x.id === b.dataset.del);
      if (!t) return;
      if (confirm(`删掉这笔「${t.note || categoryOf(t.type, t.category).name} ${fmtMoney(t.amount)}」吗？`)) {
        deleteTransaction(state, t.id);
        render();
      }
    });
  });
}

function renderOverview() {
  const totals = totalsForMonth(state, currentMonth);
  $('sumIncome').textContent = fmtMoney(totals.income);
  $('sumExpense').textContent = fmtMoney(totals.expense);
  $('sumBalance').textContent = fmtMoney(totals.balance);
  $('incomeCount').textContent = totals.incomeCount + ' 笔';
  $('expenseCount').textContent = totals.expenseCount + ' 笔';
  $('balanceNote').textContent = totals.balance >= 0 ? '收入 − 支出，还剩这么多' : '这个月花超了';

  const bs = budgetStatus(state, currentMonth);
  if (bs.totalLimit > 0) {
    const rate = Math.round((bs.totalUsed / bs.totalLimit) * 100);
    $('budgetRate').textContent = rate + '%';
    $('budgetRate').classList.toggle('over', rate > 100);
    $('budgetNote').textContent = `已花 ${fmtMoney(bs.totalUsed)} / 预算 ${fmtMoney(bs.totalLimit)}`;
  } else {
    $('budgetRate').textContent = '—';
    $('budgetRate').classList.remove('over');
    $('budgetNote').textContent = '尚未设置预算';
  }

  const isEmpty = state.transactions.length === 0;
  $('emptyState').hidden = !isEmpty;
  $('overviewBody').hidden = isEmpty;
  $('budgetAlertCard').hidden = isEmpty;
  if (isEmpty) {
    return;
  }

  const cats = expenseByCategory(state, currentMonth);
  $('donutEmpty').hidden = cats.length > 0;
  $('donutChart').hidden = cats.length === 0;
  $('donutLegend').hidden = cats.length === 0;
  if (cats.length > 0) {
    drawDonut($('donutChart'), cats, totals.expense);
    $('donutLegend').innerHTML = cats.slice(0, 6).map((c) => {
      const pct = totals.expense > 0 ? Math.round((c.amount / totals.expense) * 100) : 0;
      return `<li><span class="dot" style="background:${c.color}"></span>${escapeHtml(c.name)}<span class="amt">${fmtMoney(c.amount)}</span><span class="pct">${pct}%</span></li>`;
    }).join('');
  }

  const recent = txInMonth(state, currentMonth).slice(0, 6);
  $('recentEmpty').hidden = recent.length > 0;
  $('recentList').innerHTML = recent.map((t) => txRow(t, true)).join('');
  bindTxActions($('recentList'));

  const alerts = bs.rows.filter((r) => r.limit > 0 && (r.rate >= 0.8 || r.rate > 1));
  $('budgetAlertsEmpty').hidden = alerts.length > 0;
  $('budgetAlerts').innerHTML = alerts.map((r) => {
    if (r.rate > 1) {
      return `<li><span class="over">超了：</span>${escapeHtml(r.name)}预算 ${fmtMoney(r.limit)}，已花 ${fmtMoney(r.used)}，超了 ${fmtMoney(r.used - r.limit)}。</li>`;
    }
    return `<li><span class="warn">快到了：</span>${escapeHtml(r.name)}预算 ${fmtMoney(r.limit)}，已花 ${fmtMoney(r.used)}（${Math.round(r.rate * 100)}%）。</li>`;
  }).join('');
}

function fillCategories() {
  const list = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  $('txCategory').innerHTML = list.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

function setFormType(type) {
  formType = type;
  $('typeExpense').classList.toggle('active', type === 'expense');
  $('typeExpense').classList.toggle('expense', type === 'expense');
  $('typeExpense').setAttribute('aria-pressed', String(type === 'expense'));
  $('typeIncome').classList.toggle('active', type === 'income');
  $('typeIncome').classList.toggle('income', type === 'income');
  $('typeIncome').setAttribute('aria-pressed', String(type === 'income'));
  fillCategories();
}

function renderAdd() {
  const editing = editingId ? state.transactions.find((t) => t.id === editingId) : null;
  $('formTitle').textContent = editing ? '改这笔' : '记一笔';
  $('formError').hidden = true;
  if (editing) {
    setFormType(editing.type);
    $('txCategory').value = editing.category;
    $('txAmount').value = editing.amount;
    $('txDate').value = editing.date;
    $('txNote').value = editing.note || '';
  } else {
    setFormType('expense');
    $('txAmount').value = '';
    $('txDate').value = todayStr();
    $('txNote').value = '';
  }
}

function renderLedger() {
  const type = $('filterType').value;
  const cat = $('filterCategory').value;
  const text = $('filterText').value.trim();
  let list = txInMonth(state, currentMonth);
  if (type !== 'all') list = list.filter((t) => t.type === type);
  if (cat !== 'all') list = list.filter((t) => t.category === cat);
  if (text) list = list.filter((t) => (t.note || '').includes(text));
  $('ledgerCount').textContent = `共 ${list.length} 笔`;
  $('ledgerEmpty').hidden = list.length > 0;
  $('ledgerList').innerHTML = list.map((t) => txRow(t, true)).join('');
  bindTxActions($('ledgerList'));
  let ex = 0;
  let inc = 0;
  for (const t of list) {
    if (t.type === 'expense') ex += t.amount;
    else inc += t.amount;
  }
  $('ledgerExpense').textContent = fmtMoney(ex);
  $('ledgerIncome').textContent = fmtMoney(inc);
}

function budgetRowHtml(r) {
  const pct = r.limit > 0 ? Math.min(100, Math.round((r.used / r.limit) * 100)) : 0;
  const cls = r.rate > 1 ? 'over' : r.rate >= 0.8 ? 'warn' : '';
  const meta = r.limit > 0
    ? r.rate > 1
      ? `已花 ${fmtMoney(r.used)}，<span class="over-text">超了 ${fmtMoney(r.used - r.limit)}</span>`
      : r.rate >= 0.8
        ? `已花 ${fmtMoney(r.used)}，<span class="warn-text">快到预算了（${Math.round(r.rate * 100)}%）</span>`
        : `已花 ${fmtMoney(r.used)}，还剩 ${fmtMoney(r.limit - r.used)}`
    : '还没给这个分类定预算';
  return `<li data-cat="${r.id}">
    <div class="budget-row">
      <span class="budget-name">${escapeHtml(r.name)}</span>
      <label class="budget-input">每月预算 ¥<input type="number" min="0" step="1" inputmode="decimal" value="${r.limit || ''}" placeholder="0" aria-label="${escapeHtml(r.name)}每月预算"></label>
    </div>
    <div class="budget-bar"><i class="${cls}" style="width:${pct}%"></i></div>
    <div class="budget-meta">${meta}</div>
  </li>`;
}

function readBudgetInputs() {
  const out = {};
  document.querySelectorAll('#budgetList li').forEach((li) => {
    const v = Number(li.querySelector('input').value);
    if (Number.isFinite(v) && v > 0) out[li.dataset.cat] = v;
  });
  return out;
}

function previewBudgetTotals() {
  const draft = readBudgetInputs();
  const bs = budgetStatus(state, currentMonth);
  let totalLimit = 0;
  for (const v of Object.values(draft)) totalLimit += v;
  $('budgetTotal').textContent = fmtMoney(totalLimit);
  $('budgetSpent').textContent = fmtMoney(bs.totalUsed);
  $('budgetLeft').textContent = fmtMoney(totalLimit - bs.totalUsed);
}

function renderBudgets() {
  const bs = budgetStatus(state, currentMonth);
  $('budgetList').innerHTML = bs.rows.map(budgetRowHtml).join('');
  previewBudgetTotals();
  $('budgetSaved').hidden = true;
  document.querySelectorAll('#budgetList input').forEach((input) => {
    input.addEventListener('input', () => {
      previewBudgetTotals();
      $('budgetSaved').hidden = true;
    });
  });
}

function renderStats() {
  const keys = lastMonths(currentMonth, 6);
  const months = keys.map((k) => {
    const t = totalsForMonth(state, k);
    return { label: Number(k.slice(5, 7)) + '月', income: t.income, expense: t.expense };
  });
  const monthsWithTx = keys.filter((k) => txInMonth(state, k).length > 0).length;
  $('trendEmpty').hidden = monthsWithTx >= 2;
  $('trendChart').hidden = monthsWithTx < 2;
  if (monthsWithTx >= 2) drawTrend($('trendChart'), months);

  const days = dailyExpense(state, currentMonth);
  const hasDaily = days.some((d) => d.amount > 0);
  $('dailyEmpty').hidden = hasDaily;
  $('dailyChart').hidden = !hasDaily;
  if (hasDaily) drawDaily($('dailyChart'), days);

  const cats = expenseByCategory(state, currentMonth);
  $('rankEmpty').hidden = cats.length > 0;
  $('rankList').innerHTML = cats.slice(0, 8).map((c) =>
    `<li>${escapeHtml(c.name)}<span class="amt">${fmtMoney(c.amount)}</span></li>`).join('');
}

function render() {
  renderMonthBar();
  const name = route();
  showView(name);
  if (name === 'overview') renderOverview();
  else if (name === 'add') renderAdd();
  else if (name === 'ledger') renderLedger();
  else if (name === 'budgets') renderBudgets();
  else if (name === 'stats') renderStats();
}

// ---- 接线 ----

$('prevMonth').addEventListener('click', () => { currentMonth = shiftMonth(currentMonth, -1); render(); });
$('nextMonth').addEventListener('click', () => { currentMonth = shiftMonth(currentMonth, 1); render(); });
$('todayMonth').addEventListener('click', () => { currentMonth = currentMonthKey(); render(); });

$('loadSampleEmpty').addEventListener('click', () => {
  loadSample(state);
  render();
});
$('loadSample').addEventListener('click', () => {
  if (state.transactions.length > 0 && !confirm('这会用示例数据替换现在的全部账单和预算，确定吗？')) return;
  loadSample(state);
  render();
});
$('clearAll').addEventListener('click', () => {
  if (confirm('确定要清空全部账单和预算吗？这个操作不能撤销。')) {
    clearAll(state);
    render();
  }
});
$('exportCsv').addEventListener('click', () => {
  const blob = new Blob([toCsv(state)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '小家账本-账单.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('typeExpense').addEventListener('click', () => setFormType('expense'));
$('typeIncome').addEventListener('click', () => setFormType('income'));

$('txForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = Number($('txAmount').value);
  const date = $('txDate').value;
  const err = $('formError');
  if (!Number.isFinite(amount) || amount <= 0) {
    err.textContent = '金额要填一个大于 0 的数。';
    err.hidden = false;
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    err.textContent = '日期不对，选一个有效日期。';
    err.hidden = false;
    return;
  }
  const tx = { type: formType, category: $('txCategory').value, amount, date, note: $('txNote').value.trim() };
  if (editingId) {
    updateTransaction(state, editingId, tx);
    editingId = null;
  } else {
    addTransaction(state, tx);
  }
  const key = monthKeyOf(date);
  if (key !== currentMonth) currentMonth = key;
  location.hash = '#/ledger';
  render();
});
$('formCancel').addEventListener('click', () => {
  editingId = null;
  location.hash = '#/ledger';
  render();
});

$('filterType').addEventListener('change', renderLedger);
$('filterCategory').addEventListener('change', renderLedger);
$('filterText').addEventListener('input', renderLedger);

$('saveBudgets').addEventListener('click', () => {
  setBudgets(state, readBudgetInputs());
  $('budgetSaved').hidden = false;
  renderBudgets();
});

window.addEventListener('hashchange', () => { render(); });
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});

// 账单分类筛选：支出和收入分类放一起，按类型分组显示。
(function initCategoryFilter() {
  const groups = [
    ['支出', EXPENSE_CATEGORIES],
    ['收入', INCOME_CATEGORIES],
  ];
  $('filterCategory').innerHTML = '<option value="all">全部分类</option>' + groups.map(([label, list]) =>
    `<optgroup label="${label}">` + list.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') + '</optgroup>').join('');
})();

if (!location.hash) location.hash = '#/overview';
render();
