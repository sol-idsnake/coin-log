/** Transactions page: full table of all synced transactions. */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Table } from "@mantine/core";
import { deleteTransaction, fetchTransactions, type Transaction } from "../api";
import TransactionDetailModal from "../components/TransactionDetailModal";
import DataTable from "../components/DataTable";
import { LAST_SYNCED_STORAGE_KEY, runSync } from "../hooks/syncStore";
import "./TransactionsPage.scss";

const COLUMN_HEADINGS = ["Date", "Name", "Category", "Amount", "Status"];

interface TransactionTableRowProps {
  onSelect: (transaction: Transaction) => void;
  transaction: Transaction;
}

/** Renders a single transaction as a table row. */
function TransactionTableRow({
  onSelect,
  transaction,
}: TransactionTableRowProps) {
  const isDeposit = (transaction.amount ?? 0) < 0;
  const absoluteAmount = Math.abs(transaction.amount ?? 0);

  function handleRowClick() {
    onSelect(transaction);
  }

  return (
    <Table.Tr style={{ cursor: "pointer" }} onClick={handleRowClick}>
      <Table.Td>{transaction.date ?? "—"}</Table.Td>
      <Table.Td>
        {transaction.merchant_name || transaction.name || "—"}
      </Table.Td>
      <Table.Td>{transaction.category ?? "—"}</Table.Td>
      <Table.Td
        style={{
          color: isDeposit ? "var(--color-success)" : "var(--color-danger)",
        }}
      >
        {isDeposit ? "+" : "-"}${absoluteAmount.toFixed(2)}
      </Table.Td>
      <Table.Td>
        {transaction.pending ? (
          <Badge color="orange" radius="xl" size="sm" variant="light">
            Pending
          </Badge>
        ) : (
          <Badge color="gray" radius="xl" size="sm" variant="light">
            Cleared
          </Badge>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

export default function TransactionsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  async function handleSync() {
    setIsSyncing(true);
    try {
      await runSync();
    } finally {
      setIsSyncing(false);
    }
  }

  const rawTimestamp = localStorage.getItem(LAST_SYNCED_STORAGE_KEY);
  const lastSyncedLabel = rawTimestamp
    ? `Last synced ${new Date(Number(rawTimestamp)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : null;
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const {
    data: transactions = [],
    error,
    isPending,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTransactions(),
  });

  function handleModalClose() {
    setTransaction(null);
  }

  async function handleDeleteTransaction() {
    await deleteTransaction(transaction!.id);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["budget"] });
    setTransaction(null);
  }

  if (error)
    return (
      <Alert color="red" variant="light">
        {String(error)}
      </Alert>
    );

  return (
    <div className="transactions-page">
      <div className="transactions-page__header">
        <h1 className="transactions-page__title">Transactions</h1>
        {isSyncing ? (
          <span className="transactions-page__sync-badge">Syncing…</span>
        ) : (
          lastSyncedLabel && (
            <span className="transactions-page__last-synced">
              {lastSyncedLabel}
            </span>
          )
        )}
        <Button disabled={isSyncing} variant="default" onClick={handleSync}>
          Sync
        </Button>
      </div>

      {isPending ? (
        <p className="transactions-page__loading">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="transactions-page__empty">
          No transactions yet. Go to Accounts and click Sync.
        </p>
      ) : (
        <DataTable
          headings={COLUMN_HEADINGS}
          rows={transactions.map((transaction) => (
            <TransactionTableRow
              key={transaction.id}
              onSelect={setTransaction}
              transaction={transaction}
            />
          ))}
        />
      )}

      <TransactionDetailModal
        onClose={handleModalClose}
        onDelete={handleDeleteTransaction}
        opened={transaction !== null}
        transaction={transaction}
      />
    </div>
  );
}
