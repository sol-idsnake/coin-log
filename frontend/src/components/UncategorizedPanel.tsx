/** Uncategorized expense transactions: draggable list for drop-to-assign. */
import type { DragEvent } from "react";
import { Table } from "@mantine/core";
import type { Transaction } from "../api";
import DataTable from "./DataTable";
import "./UncategorizedPanel.scss";

const COLUMN_HEADINGS = ["Date", "Name", "Amount"];

function UncategorizedTransactionRow({
  transaction,
}: {
  transaction: Transaction;
}) {
  const absoluteAmount = Math.abs(transaction.amount ?? 0);

  function handleDragStart(dragEvent: DragEvent<HTMLTableRowElement>) {
    dragEvent.dataTransfer.setData("transaction_id", String(transaction.id));
  }

  return (
    <Table.Tr draggable onDragStart={handleDragStart}>
      <Table.Td>{transaction.date}</Table.Td>
      <Table.Td>{transaction.merchant_name || transaction.name}</Table.Td>
      <Table.Td>${absoluteAmount.toFixed(2)}</Table.Td>
    </Table.Tr>
  );
}

export default function UncategorizedPanel({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const rows = transactions.map((transaction) => (
    <UncategorizedTransactionRow
      key={transaction.id}
      transaction={transaction}
    />
  ));

  return (
    <section className="uncategorized-panel">
      <h2 className="uncategorized-panel__title">Uncategorized</h2>
      {transactions.length === 0 ? (
        <p className="uncategorized-panel__empty">All transactions assigned.</p>
      ) : (
        <DataTable headings={COLUMN_HEADINGS} rows={rows} />
      )}
    </section>
  );
}
