/** Modal listing transactions assigned to a budget item, with per-row Remove action. */
import { useTransition } from "react";
import { Button, Modal } from "@mantine/core";
import "./BudgetItemDetails.scss";
import type { Transaction } from "../api";

interface AssignmentRowProps {
  isPending: boolean;
  onRemove: (transactionId: number) => void;
  transaction: Transaction;
}

interface Props {
  onClose: () => void;
  onRemove: (transactionId: number) => Promise<void>;
  opened: boolean;
  title: string;
  transactions: Transaction[];
}

function TransactionRow({
  isPending,
  onRemove,
  transaction,
}: AssignmentRowProps) {
  const isDeposit = (transaction.amount ?? 0) < 0;
  const absoluteAmount = Math.abs(transaction.amount ?? 0);

  function handleRemoveClick() {
    onRemove(transaction.id);
  }

  return (
    <li className="modal__row">
      <span
        className={`modal__amount modal__amount--${isDeposit ? "in" : "out"}`}
      >
        {isDeposit ? "+" : "-"}${absoluteAmount.toFixed(2)}
      </span>
      <span className="modal__name">
        {transaction.merchant_name || transaction.name}
      </span>
      <span className="modal__date">{transaction.date}</span>
      <Button
        color="red"
        disabled={isPending}
        size="xs"
        type="button"
        onClick={handleRemoveClick}
      >
        Remove
      </Button>
    </li>
  );
}

export default function BudgetItemDetails({
  onClose,
  onRemove,
  opened,
  title,
  transactions,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleRemove(transactionId: number) {
    startTransition(() => onRemove(transactionId));
  }

  return (
    <Modal centered opened={opened} size="md" title={title} onClose={onClose}>
      {transactions.length === 0 ? (
        <p className="modal__empty">No transactions assigned.</p>
      ) : (
        <ul className="modal__list">
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              isPending={isPending}
              onRemove={handleRemove}
              transaction={transaction}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}
