/** Modal showing full transaction detail with a delete action. */
import { useTransition } from "react";
import { Button, Modal } from "@mantine/core";
import type { Transaction } from "../api";
import "./TransactionDetailModal.scss";

interface Props {
  opened: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  transaction: Transaction | null;
}

export default function TransactionDetailModal({
  opened,
  onClose,
  onDelete,
  transaction,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(() => onDelete());
  }

  const isDeposit = (transaction?.amount ?? 0) < 0;
  const absoluteAmount = Math.abs(transaction?.amount ?? 0);

  const rows: [string, string][] = transaction
    ? [
        ["Date", transaction.date ?? "—"],
        ["Name", transaction.merchant_name || transaction.name || "—"],
        ["Amount", `${isDeposit ? "+" : "-"}$${absoluteAmount.toFixed(2)}`],
        ["Category", transaction.category ?? "—"],
        ["Status", transaction.pending ? "Pending" : "Cleared"],
        ["Note", transaction.note ?? "—"],
        [
          "Budget",
          transaction.budget_item_id !== null ? "Assigned" : "Unassigned",
        ],
      ]
    : [];

  return (
    <Modal
      centered
      size="md"
      opened={opened}
      onClose={onClose}
      title={transaction?.merchant_name || transaction?.name || "Transaction"}
    >
      <dl className="transaction-detail__list">
        {rows.map(([label, value]) => (
          <div key={label} className="transaction-detail__row">
            <dt className="transaction-detail__label">{label}</dt>
            <dd
              className={`transaction-detail__value${
                label === "Amount"
                  ? ` transaction-detail__value--${isDeposit ? "in" : "out"}`
                  : ""
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="transaction-detail__footer">
        <Button color="red" disabled={isPending} onClick={handleDelete}>
          Delete Transaction
        </Button>
      </div>
    </Modal>
  );
}
