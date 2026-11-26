// 数据层：分类、localStorage 存取、增删改查、汇总计算。
// 这里只算数、不碰页面；所有金额都是“分”以下的元（可带小数），汇总时按分取整避免浮点误差。
import { SAMPLE_TRANSACTIONS, SAMPLE_BUDGETS } from './sample.js';
import { monthKeyOf } from './format.js';

const STORAGE_KEY = 'xiaojia-budget-v1';

export const EXPENSE_CATEGORIES = [
  { id: 'food', name: '餐饮', color: '#c2571f' },
  { id: 'grocery', name: '买菜日用', color: '#0f766e' },
  { id: 'transport', name: '交通', color: '#2563eb' },
  { id: 'housing', name: '住房', color: '#7c3aed' },
  { id: 'utility', name: '水电燃气', color: '#0891b2' },
  { id: 'phone', name: '通讯', color: '#4d7c0f' },
  { id: 'health', name: '医疗', color: '#be185d' },
  { id: 'education', name: '教育', color: '#b45309' },
  { id: 'fun', name: '娱乐', color: '#db2777' },
  { id: 'shopping', name: '购物', color: '#475569' },
  { id: 'gift', name: '人情', color: '#a16207' },
  { id: 'other-expense', name: '其他支出', color: '#94a3b8' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', name: '工资', color: '#0f766e' },
  { id: 'bonus', name: '奖金补贴', color: '#4d7c0f' },
  { id: 'side', name: '兼职', color: '#2563eb' },
  { id: 'invest', name: '理财收益', color: '#7c3aed' },
  { id: 'gift-in', name: '红包礼金', color: '#be185d' },
  { id: 'other-income', name: '其他收入', color: '#94a3b8' },
];

export function categoryOf(type, id) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.id === id) || list[list.length - 1];
}

function blankState() {
  return { transactions: [], budgets: {} };
}

function normalize(state) {
  const s = { transactions: [], budgets: {} };
  if (state && Array.isArray(state.transactions)) {
    for (const t of state.transactions) {
      if (!t || (t.type !== 'expense' && t.type !== 'income')) continue;
      const amount = Number(t.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(t.date || ''))) continue;
      s.transactions.push({
        id: String(t.id || ''),
        type: t.type,
        category: String(t.category || ''),
        amount: Math.round(amount * 100) / 100,
        date: String(t.date),
        note: String(t.note || '').slice(0, 60),
      });
    }
  }
  if (state && state.budgets && typeof state.budgets === 'object') {
    for (const [k, v] of Object.entries(state.budgets)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) s.budgets[k] = Math.round(n * 100) / 100;
    }
  }
  s.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return s;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    return normalize(JSON.parse(raw));
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function newId() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addTransaction(state, tx) {
  const item = {
    id: newId(),
    type: tx.type,
    category: tx.category,
    amount: Math.round(Number(tx.amount) * 100) / 100,
    date: tx.date,
    note: String(tx.note || '').slice(0, 60),
  };
  state.transactions.unshift(item);
  state.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  saveState(state);
  return item;
}

export function updateTransaction(state, id, tx) {
  const item = state.transactions.find((t) => t.id === id);
  if (!item) return null;
  item.type = tx.type;
  item.category = tx.category;
  item.amount = Math.round(Number(tx.amount) * 100) / 100;
  item.date = tx.date;
  item.note = String(tx.note || '').slice(0, 60);
  state.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  saveState(state);
  return item;
}

export function deleteTransaction(state, id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveState(state);
}

export function setBudgets(state, budgets) {
  state.budgets = {};
  for (const [k, v] of Object.entries(budgets)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) state.budgets[k] = Math.round(n * 100) / 100;
  }
  saveState(state);
}

export function loadSample(state) {
  state.transactions = SAMPLE_TRANSACTIONS.map((t) => ({ ...t, id: newId() }));
  state.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  state.budgets = { ...SAMPLE_BUDGETS };
  saveState(state);
}

export function clearAll(state) {
  state.transactions = [];
  state.budgets = {};
  saveState(state);
}

// ---- 汇总：全部从存着的账单现算 ----

export function txInMonth(state, monthKey) {
  return state.transactions.filter((t) => monthKeyOf(t.date) === monthKey);
}

export function totalsForMonth(state, monthKey) {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  for (const t of txInMonth(state, monthKey)) {
    if (t.type === 'income') { income += t.amount; incomeCount++; }
    else { expense += t.amount; expenseCount++; }
  }
  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance: Math.round((income - expense) * 100) / 100,
    incomeCount,
    expenseCount,
  };
}

export function expenseByCategory(state, monthKey) {
  const map = new Map();
  for (const t of txInMonth(state, monthKey)) {
    if (t.type !== 'expense') continue;
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  return [...map.entries()]
    .map(([id, amount]) => ({ ...categoryOf('expense', id), amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

export function budgetStatus(state, monthKey) {
  const spent = expenseByCategory(state, monthKey);
  const spentById = new Map(spent.map((s) => [s.id, s.amount]));
  const rows = EXPENSE_CATEGORIES.map((c) => {
    const limit = state.budgets[c.id] || 0;
    const used = spentById.get(c.id) || 0;
    const rate = limit > 0 ? used / limit : 0;
    return { ...c, limit, used: Math.round(used * 100) / 100, rate };
  });
  const totalLimit = rows.reduce((s, r) => s + r.limit, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);
  return { rows, totalLimit, totalUsed, left: Math.round((totalLimit - totalUsed) * 100) / 100 };
}

export function monthsWithData(state) {
  const keys = new Set(state.transactions.map((t) => monthKeyOf(t.date)));
  return [...keys].sort();
}

export function dailyExpense(state, monthKey) {
  const days = {};
  for (const t of txInMonth(state, monthKey)) {
    if (t.type !== 'expense') continue;
    const d = Number(t.date.slice(8, 10));
    days[d] = (days[d] || 0) + t.amount;
  }
  const [y, m] = monthKey.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= count; d++) out.push({ day: d, amount: Math.round((days[d] || 0) * 100) / 100 });
  return out;
}

export function toCsv(state) {
  const head = '日期,类型,分类,金额（元）,备注';
  const lines = [...state.transactions]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => [
      t.date,
      t.type === 'income' ? '收入' : '支出',
      categoryOf(t.type, t.category).name,
      t.amount.toFixed(2),
      '"' + String(t.note || '').replaceAll('"', '""') + '"',
    ].join(','));
  return '\uFEFF' + [head, ...lines].join('\n');
}
