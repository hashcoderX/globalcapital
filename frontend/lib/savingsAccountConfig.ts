export const SAVINGS_ACCOUNT_TYPES = [
  {
    value: 'savings',
    label: 'Savings',
    description: 'Regular savings with flexible deposits and withdrawals.',
  },
  {
    value: 'current',
    label: 'Current',
    description: 'Transactional account for frequent payments.',
  },
  {
    value: 'fixed_deposit',
    label: 'Fixed Deposit',
    description: 'Locked deposit for a fixed tenure with scheduled payouts.',
  },
  {
    value: 'investment',
    label: 'Investment',
    description: 'Long-term investment and growth-oriented deposit products.',
  },
] as const;

export type SavingsAccountType = (typeof SAVINGS_ACCOUNT_TYPES)[number]['value'];

export const SAVINGS_INTEREST_TYPES = [
  { value: 'simple_interest', label: 'Simple Interest', usage: 'Savings, basic loans' },
  { value: 'compound_interest', label: 'Compound Interest', usage: 'FDs, investments' },
  { value: 'monthly_payout', label: 'Monthly Payout', usage: 'FD monthly income schemes' },
  { value: 'quarterly_payout', label: 'Quarterly Payout', usage: 'Corporate deposits' },
  { value: 'annual_payout', label: 'Annual Payout', usage: 'Long-term deposits' },
  { value: 'maturity_payout', label: 'Maturity Payout', usage: 'Standard FD accounts' },
  { value: 'tiered_interest', label: 'Tiered Interest', usage: 'Savings accounts' },
  { value: 'auto_sweep_interest', label: 'Auto Sweep Interest', usage: 'Flexi savings accounts' },
] as const;

export type SavingsInterestType = (typeof SAVINGS_INTEREST_TYPES)[number]['value'];

export const DEFAULT_INTEREST_BY_ACCOUNT: Record<SavingsAccountType, SavingsInterestType> = {
  savings: 'simple_interest',
  current: 'simple_interest',
  fixed_deposit: 'maturity_payout',
  investment: 'compound_interest',
};

export const RECOMMENDED_INTEREST_BY_ACCOUNT: Record<SavingsAccountType, SavingsInterestType[]> = {
  savings: ['simple_interest', 'tiered_interest', 'auto_sweep_interest'],
  current: ['simple_interest'],
  fixed_deposit: [
    'compound_interest',
    'monthly_payout',
    'quarterly_payout',
    'annual_payout',
    'maturity_payout',
  ],
  investment: ['compound_interest', 'annual_payout', 'maturity_payout'],
};

export function formatAccountTypeLabel(value: string | null | undefined): string {
  const found = SAVINGS_ACCOUNT_TYPES.find((item) => item.value === value);
  if (found) return found.label;
  return String(value || '-').replace(/_/g, ' ');
}

export function formatInterestTypeLabel(value: string | null | undefined): string {
  const found = SAVINGS_INTEREST_TYPES.find((item) => item.value === value);
  if (found) return found.label;
  return String(value || '-').replace(/_/g, ' ');
}

export function interestTypeUsage(value: string | null | undefined): string {
  const found = SAVINGS_INTEREST_TYPES.find((item) => item.value === value);
  return found?.usage || '';
}
