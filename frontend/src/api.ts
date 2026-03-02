/** All typed API calls to the coin-log Flask backend. Single source of truth for fetch logic. */

export interface Account {
  account_id: string;
  institution_name: string | null;
  item_id: string;
  mask: string | null;
  name: string | null;
  subtype: string | null;
  type: string | null;
}

export interface Transaction {
  account_id: number;
  amount: number | null;
  budget_item_id: number | null;
  category: string | null;
  check_number: string | null;
  date: string | null;
  id: number;
  is_deleted: boolean;
  merchant_name: string | null;
  name: string | null;
  note: string | null;
  pending: boolean | null;
  plaid_transaction_id: string | null;
  type: "expense" | "income" | null;
}

// Describes what changed per institution after a Plaid sync. Keyed by Plaid
// item ID so the UI can report added/modified/removed counts per institution.
export interface SyncSummary {
  [itemId: string]: {
    added: number;
    institution: string | null;
    modified: number;
    removed: number;
  };
}

export interface BudgetItem {
  actual: number;
  id: number;
  name: string;
  planned_amount: number;
  remaining: number;
}

export interface BudgetCategory {
  id: number;
  items: BudgetItem[];
  name: string;
  planned: number;
  remaining: number;
  spent: number;
  type: "income" | "expense";
}

export interface Budget {
  categories: BudgetCategory[];
  month: string;
}

export async function createLinkToken(): Promise<string> {
  const res = await fetch("/api/create_link_token", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create link token");
  const data = await res.json();
  return data.link_token;
}

export async function setAccessToken(
  publicToken: string,
): Promise<{ item_id: string; institution_name: string | null }> {
  const res = await fetch("/api/set_access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_token: publicToken }),
  });
  if (!res.ok) throw new Error("Failed to exchange public token");
  return res.json();
}

export async function syncTransactions(): Promise<SyncSummary> {
  const res = await fetch("/api/sync", { method: "POST" });
  if (!res.ok) throw new Error("Sync failed");
  const data = await res.json();
  return data.synced;
}

export async function fetchTransactions(params?: {
  month?: string;
}): Promise<Transaction[]> {
  const query = new URLSearchParams();
  if (params?.month) query.set("month", params.month);
  const queryString = query.toString();
  const res = await fetch(
    `/api/transactions${queryString ? `?${queryString}` : ""}`,
  );
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch("/api/accounts");
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return res.json();
}

export async function fetchBudget(month: string): Promise<Budget | null> {
  const res = await fetch(`/api/budgets/${month}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch budget");
  return res.json();
}

export async function createBudget(month: string): Promise<Budget> {
  const res = await fetch(`/api/budgets/${month}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create budget");
  return res.json();
}

export async function updateBudgetItem(
  itemId: number,
  patch: { name?: string; planned_amount?: number },
): Promise<BudgetItem> {
  const res = await fetch(`/api/budget-items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update budget item");
  return res.json();
}

export async function removeBudgetItem(itemId: number): Promise<void> {
  const res = await fetch(`/api/budget-items/${itemId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove budget item");
}

export async function assignTransaction(
  transactionId: number,
  itemId: number,
): Promise<void> {
  const res = await fetch(`/api/transactions/${transactionId}/assignment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ budget_item_id: itemId }),
  });
  if (!res.ok) throw new Error("Failed to assign transaction");
}

export async function removeAssignment(transactionId: number): Promise<void> {
  const res = await fetch(`/api/transactions/${transactionId}/assignment`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove assignment");
}

export async function deleteTransaction(transactionId: number): Promise<void> {
  const res = await fetch(`/api/transactions/${transactionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete transaction");
}

export async function addBudgetItem(
  categoryId: number,
  name: string,
  plannedAmount: number,
): Promise<BudgetItem> {
  const res = await fetch(`/api/budget-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category_id: categoryId,
      name,
      planned_amount: plannedAmount,
    }),
  });
  if (!res.ok) throw new Error("Failed to add budget item");
  return res.json();
}
