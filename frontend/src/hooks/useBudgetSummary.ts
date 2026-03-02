/** Derives budget summary figures from server-supplied budget and transaction data. */
import type { Budget, Transaction } from "../api";

export interface BudgetSummary {
  leftToBudget: number;
  remainingToSpend: number;
  spentSoFar: number;
  totalPlannedIncome: number;
}

const BASE_SUMMARY: BudgetSummary = {
  leftToBudget: 0,
  remainingToSpend: 0,
  spentSoFar: 0,
  totalPlannedIncome: 0,
};

export function useBudgetSummary(
  budget: Budget | undefined,
  transactions: Transaction[],
): BudgetSummary {
  if (!budget) return BASE_SUMMARY;

  const { expense: expenseCategories = [], income: incomeCategories = [] } =
    Object.groupBy(budget.categories, (category) => category.type);

  const totalPlannedIncome = incomeCategories.reduce(
    (sum, category) => sum + category.planned,
    0,
  );
  const leftToBudget =
    totalPlannedIncome -
    expenseCategories.reduce((sum, category) => sum + category.planned, 0);
  const spentSoFar = expenseCategories.reduce(
    (sum, category) => sum + category.spent,
    0,
  );
  const totalActualIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount ?? 0), 0);

  return {
    leftToBudget,
    remainingToSpend: totalActualIncome - spentSoFar,
    spentSoFar,
    totalPlannedIncome,
  };
}
