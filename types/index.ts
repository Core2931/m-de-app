import type { Category } from "@/lib/categories";

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  item: string;
  amount: number;
  remark: string;
  category: Category;
  createdAt: string; // ISO timestamp
}

export type NewExpense = Omit<Expense, "id" | "createdAt">;

export interface DailyTotal {
  date: string;
  total: number;
  items: Expense[];
}

export type SplitDirection = "owed_to_me" | "i_owe";

export interface Split {
  person: string; // normalized
  amount: number;
  label: string;
  direction: SplitDirection;
}

export interface ParsedRemark {
  splits: Split[];
  freeText: string;
  invalid: boolean;
}

export interface ExpenseSplitSummary extends ParsedRemark {
  lentOut: number; // amount we paid on someone else's behalf
  borrowed: number; // amount someone else paid on our behalf
  myShare: number; // what this expense really cost us = amount - lentOut
  cashOut: number; // what actually left our pocket = amount - borrowed
  overAllocated: boolean; // lentOut + borrowed > amount
}

export type SettlementDirection = "received" | "paid";

export interface Settlement {
  id: string;
  date: string; // YYYY-MM-DD
  person: string; // normalized
  amount: number;
  direction: SettlementDirection;
  note: string;
  createdAt: string; // ISO timestamp
}

export type NewSettlement = Omit<Settlement, "id" | "createdAt">;

export interface SplitEntry {
  expenseId: string;
  date: string;
  item: string;
  split: Split;
}

export interface PersonBalance {
  person: string;
  balance: number; // positive: they owe us, negative: we owe them
  lentOut: number;
  borrowed: number;
  settledNet: number;
  entries: SplitEntry[];
}

export interface BalanceTotals {
  reserved: number; // we are obligated to pay this amount
  receivable: number; // we will receive this amount
}

/**
 * One person's split activity inside a filtered slice of expenses. Gross on
 * purpose — settlements are not netted here because a repayment covers a debt,
 * not a date range, so subtracting one would make the number depend on which
 * range happened to be on screen. Net-of-settlement lives on /people.
 */
export interface PersonPeriodTotal {
  person: string;
  lentOut: number; // we fronted this much for them
  borrowed: number; // they fronted this much for us
  net: number; // lentOut - borrowed; positive means they owe us
  entries: SplitEntry[];
}

export interface CategoryTotal {
  category: Category;
  total: number; // sum of expense.amount
  myShare: number; // sum of each expense's own amount - lentOut
  count: number;
}

export interface PeriodSummary {
  total: number; // every baht that went through these expenses
  lentOut: number; // of which we fronted for other people
  borrowed: number; // of which other people fronted for us
  myShare: number; // what the slice really cost us = total - lentOut
  people: PersonPeriodTotal[];
  byCategory: CategoryTotal[]; // only categories actually present in the slice
}
