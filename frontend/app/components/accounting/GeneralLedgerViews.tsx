'use client';

import type { ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpen,
  CircleDollarSign,
  HandCoins,
  Landmark,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';

export type LedgerLine = {
  account_code: string;
  account_name: string;
  account_type?: string | null;
  source?: string | null;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  opening_balance: number;
  period_movement: number;
  closing_balance: number;
  closing_side: 'debit' | 'credit';
  closing_debit: number;
  closing_credit: number;
};

export type PreviewMode = 'simple' | 'accountant';

export type SimpleGroupKey = 'money' | 'owed_to_you' | 'obligations' | 'income' | 'expenses' | 'other';

export type SimpleLedgerLine = {
  key: string;
  group: SimpleGroupKey;
  title: string;
  subtitle: string;
  atStart: number;
  cameIn: number;
  wentOut: number;
  current: number;
  change: number;
  icon: typeof Wallet;
  accent: string;
};

export type SimpleSummary = {
  moneyOnHand: number;
  customersOweYou: number;
  obligations: number;
  incomeEarned: number;
  moneySpent: number;
  netChange: number;
};

const GROUP_META: Record<
  SimpleGroupKey,
  { title: string; description: string; badge: string }
> = {
  money: {
    title: 'Your Money',
    description: 'Cash and bank balances available to the branch.',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  owed_to_you: {
    title: 'Customers Owe You',
    description: 'Outstanding loan amounts still to be collected.',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  obligations: {
    title: 'Reserved / Borrowed Funds',
    description: 'Main account balances and other amounts the branch owes or holds for others.',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  income: {
    title: 'Income Earned',
    description: 'Revenue earned from lending activity during this period.',
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  expenses: {
    title: 'Money Spent',
    description: 'Costs and refunds paid out during this period.',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  other: {
    title: 'Other Accounts',
    description: 'Additional account movements not grouped above.',
    badge: 'bg-slate-50 text-slate-800 border-slate-200',
  },
};

function amount(value: unknown): string {
  const parsed = typeof value === 'number' ? value : Number(value);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resolveGroup(line: LedgerLine): SimpleGroupKey {
  const type = String(line.account_type || '').toLowerCase();
  const name = String(line.account_name || '').toLowerCase();

  if (type === 'cash' || type === 'bank') return 'money';
  if (type === 'receivable' || name.includes('receivable')) return 'owed_to_you';
  if (type === 'main' || name.includes('borrow') || name.includes('investor')) return 'obligations';
  if (type === 'income' || name.includes('income')) return 'income';
  if (type === 'expense' || name.includes('expense') || name.includes('refund')) return 'expenses';
  return 'other';
}

function resolveIcon(group: SimpleGroupKey) {
  if (group === 'money') return Wallet;
  if (group === 'owed_to_you') return HandCoins;
  if (group === 'obligations') return Landmark;
  if (group === 'income') return CircleDollarSign;
  if (group === 'expenses') return Receipt;
  return Banknote;
}

function resolveAccent(group: SimpleGroupKey): string {
  if (group === 'money') return 'from-emerald-500 to-teal-600';
  if (group === 'owed_to_you') return 'from-cyan-500 to-blue-600';
  if (group === 'obligations') return 'from-amber-500 to-orange-600';
  if (group === 'income') return 'from-blue-500 to-indigo-600';
  if (group === 'expenses') return 'from-rose-500 to-red-600';
  return 'from-slate-500 to-slate-600';
}

function friendlySubtitle(line: LedgerLine, group: SimpleGroupKey): string {
  if (group === 'money') {
    return line.source === 'company_account'
      ? 'Branch cash or bank account from setup.'
      : 'Cash movement from collections, disbursements, and refunds.';
  }
  if (group === 'owed_to_you') return 'Loan principal still outstanding from customers.';
  if (group === 'obligations') return 'Funds reserved, borrowed, or owed to investors.';
  if (group === 'income') return 'Interest and related income collected in this period.';
  if (group === 'expenses') return 'Refunds and operating costs recorded in this period.';
  return 'Other ledger activity for this branch.';
}

function toSimpleLine(line: LedgerLine): SimpleLedgerLine {
  const group = resolveGroup(line);

  if (group === 'income') {
    return {
      key: line.account_code,
      group,
      title: line.account_name,
      subtitle: friendlySubtitle(line, group),
      atStart: Math.abs(line.opening_balance),
      cameIn: line.period_credit,
      wentOut: line.period_debit,
      current: Math.abs(line.closing_balance),
      change: line.period_movement,
      icon: resolveIcon(group),
      accent: resolveAccent(group),
    };
  }

  if (group === 'obligations') {
    return {
      key: line.account_code,
      group,
      title: line.account_name,
      subtitle: friendlySubtitle(line, group),
      atStart: Math.abs(line.opening_balance),
      cameIn: line.period_credit,
      wentOut: line.period_debit,
      current: Math.abs(line.closing_balance),
      change: line.period_movement,
      icon: resolveIcon(group),
      accent: resolveAccent(group),
    };
  }

  return {
    key: line.account_code,
    group,
    title: line.account_name,
    subtitle: friendlySubtitle(line, group),
    atStart: Math.abs(line.opening_balance),
    cameIn: line.period_debit,
    wentOut: line.period_credit,
    current: Math.abs(line.closing_balance),
    change: line.period_movement,
    icon: resolveIcon(group),
    accent: resolveAccent(group),
  };
}

export function buildSimpleLedgerModel(lines: LedgerLine[]): {
  summary: SimpleSummary;
  grouped: Array<{ key: SimpleGroupKey; items: SimpleLedgerLine[] }>;
  flat: SimpleLedgerLine[];
} {
  const flat = lines.map(toSimpleLine);

  const summary: SimpleSummary = {
    moneyOnHand: flat.filter((row) => row.group === 'money').reduce((sum, row) => sum + row.current, 0),
    customersOweYou: flat.filter((row) => row.group === 'owed_to_you').reduce((sum, row) => sum + row.current, 0),
    obligations: flat.filter((row) => row.group === 'obligations').reduce((sum, row) => sum + row.current, 0),
    incomeEarned: flat.filter((row) => row.group === 'income').reduce((sum, row) => sum + row.cameIn, 0),
    moneySpent: flat.filter((row) => row.group === 'expenses').reduce((sum, row) => sum + row.wentOut, 0),
    netChange: flat.reduce((sum, row) => sum + row.change, 0),
  };

  const order: SimpleGroupKey[] = ['money', 'owed_to_you', 'obligations', 'income', 'expenses', 'other'];
  const grouped = order
    .map((key) => ({ key, items: flat.filter((row) => row.group === key) }))
    .filter((section) => section.items.length > 0);

  return { summary, grouped, flat };
}

export function PreviewModeToggle({
  mode,
  onChange,
}: {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/90 p-2 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('simple')}
          className={`rounded-xl px-4 py-3 text-left transition ${
            mode === 'simple'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
              : 'border border-violet-100 bg-white hover:bg-violet-50/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserRound className={`h-4 w-4 ${mode === 'simple' ? 'text-white' : 'text-emerald-700'}`} />
            <span className="text-sm font-bold">Simple Preview</span>
          </div>
          <p className={`mt-1 text-xs ${mode === 'simple' ? 'text-emerald-50' : 'text-slate-600'}`}>
            Plain language for owners and managers.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange('accountant')}
          className={`rounded-xl px-4 py-3 text-left transition ${
            mode === 'accountant'
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm'
              : 'border border-violet-100 bg-white hover:bg-violet-50/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className={`h-4 w-4 ${mode === 'accountant' ? 'text-white' : 'text-violet-700'}`} />
            <span className="text-sm font-bold">Accountant Preview</span>
          </div>
          <p className={`mt-1 text-xs ${mode === 'accountant' ? 'text-violet-50' : 'text-slate-600'}`}>
            Full debit, credit, and ledger detail.
          </p>
        </button>
      </div>
    </div>
  );
}

function SimpleSummaryCards({ summary, currency }: { summary: SimpleSummary; currency: string }) {
  const cards = [
    {
      label: 'Money On Hand',
      value: amount(summary.moneyOnHand),
      hint: 'Cash + bank balances now',
      icon: Wallet,
      accent: 'from-emerald-500 to-teal-600',
      valueClass: 'text-emerald-700',
    },
    {
      label: 'Customers Owe You',
      value: amount(summary.customersOweYou),
      hint: 'Outstanding loan receivable',
      icon: HandCoins,
      accent: 'from-cyan-500 to-blue-600',
      valueClass: 'text-cyan-700',
    },
    {
      label: 'Income Earned',
      value: amount(summary.incomeEarned),
      hint: 'Earned in selected period',
      icon: TrendingUp,
      accent: 'from-blue-500 to-indigo-600',
      valueClass: 'text-blue-700',
    },
    {
      label: 'Money Spent',
      value: amount(summary.moneySpent),
      hint: 'Expenses in selected period',
      icon: TrendingDown,
      accent: 'from-rose-500 to-red-600',
      valueClass: 'text-rose-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-violet-100 bg-white/90 p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className={`mt-1 text-sm font-bold truncate tabular-nums leading-snug ${card.valueClass}`}>
                  {card.value} {currency}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">{card.hint}</p>
              </div>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${card.accent} text-white`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MovementPill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
      {positive ? '+' : '−'}
      {amount(Math.abs(value))}
    </span>
  );
}

function SimpleAccountCard({ row, currency }: { row: SimpleLedgerLine; currency: string }) {
  const Icon = row.icon;

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${row.accent} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-black">{row.title}</p>
            <p className="text-xs text-slate-600 mt-0.5">{row.subtitle}</p>
          </div>
        </div>
        <MovementPill value={row.change} />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'At Start', value: row.atStart },
          { label: 'Came In', value: row.cameIn, tone: 'text-emerald-700' },
          { label: 'Went Out', value: row.wentOut, tone: 'text-rose-700' },
          { label: 'Current', value: row.current, tone: 'text-black font-extrabold' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-violet-50 bg-violet-50/40 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
            <p className={`mt-1 text-xs font-bold tabular-nums ${item.tone || 'text-black'}`}>
              {amount(item.value)} {currency}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleLedgerPreview({
  lines,
  currency,
  children,
}: {
  lines: LedgerLine[];
  currency: string;
  children?: ReactNode;
}) {
  const model = buildSimpleLedgerModel(lines);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-900">How to read this view</p>
            <p className="text-xs text-emerald-800 mt-1">
              No accounting jargon here. Each card shows what you started with, what came in, what went out, and what
              you have now for the selected date range.
            </p>
          </div>
        </div>
      </div>

      <SimpleSummaryCards summary={model.summary} currency={currency} />

      {model.grouped.map((section) => {
        const meta = GROUP_META[section.key];
        return (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-black">{meta.title}</h3>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.badge}`}>
                    {section.items.length} accounts
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{meta.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {section.items.map((row) => (
                <SimpleAccountCard key={row.key} row={row} currency={currency} />
              ))}
            </div>
          </div>
        );
      })}

      {children}
    </div>
  );
}

export { amount as formatLedgerAmount };
