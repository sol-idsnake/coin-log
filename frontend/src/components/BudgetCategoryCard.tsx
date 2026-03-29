/** Budget category card: named group of items with actuals, progress bars, and inline edit. */
import {
  type DragEvent,
  type ReactNode,
  useActionState,
  useState,
  useTransition,
} from "react";
import {
  Button,
  NumberInput,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import "./BudgetCategoryCard.scss";
import type { BudgetCategory, BudgetItem } from "../api";

export type ViewMode = "planned" | "remaining" | "spent";
import {
  addBudgetItem,
  assignTransaction,
  removeBudgetItem,
  updateBudgetItem,
} from "../api";

interface CardProps {
  category: BudgetCategory;
  onItemClick: (itemId: number) => void;
  viewMode: ViewMode;
}

interface FormPanelProps {
  defaultAmount?: number;
  defaultName?: string;
  error: string | null;
  formAction: (formData: FormData) => void;
  isActionPending: boolean;
  isPending: boolean;
  onCancel: () => void;
  removeSlot?: ReactNode;
}

interface ItemRowProps {
  item: BudgetItem;
  onItemClick: (itemId: number) => void;
  viewMode: ViewMode;
}

function parseBudgetItemForm(
  formData: FormData,
): { name: string; amount: number } | string {
  const name = (formData.get("name") as string).trim();
  const amount = parseFloat(formData.get("amount") as string);
  if (!name) return "Name must not be empty.";
  if (isNaN(amount) || amount < 0) return "Amount must be a positive number.";
  return { name, amount };
}

function BudgetItemFormPanel({
  defaultAmount,
  defaultName,
  error,
  formAction,
  isActionPending,
  isPending,
  onCancel,
  removeSlot,
}: FormPanelProps) {
  return (
    <form action={formAction}>
      <div className="budget-item__row">
        <TextInput
          autoFocus
          defaultValue={defaultName}
          name="name"
          placeholder="Name"
          size="xs"
          style={{ flex: 1, minWidth: 0 }}
        />
        <NumberInput
          defaultValue={defaultAmount ?? 0}
          min={0}
          name="amount"
          size="xs"
          step={0.01}
          style={{ width: 80 }}
        />
      </div>
      <div className="budget-item__actions">
        <Button disabled={isActionPending} size="xs" type="submit">
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          disabled={isActionPending}
          onClick={onCancel}
          size="xs"
          type="button"
          variant="default"
        >
          Cancel
        </Button>
        {removeSlot}
        {error && (
          <Text c="red" component="span" fz="xs">
            {error}
          </Text>
        )}
      </div>
    </form>
  );
}

function ItemRow({ item, onItemClick, viewMode }: ItemRowProps) {
  const [assignError, setAssignError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRemoving, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const isOverBudget = item.actual > item.planned_amount;
  const queryClient = useQueryClient();
  const progressPercent =
    item.planned_amount > 0
      ? Math.min((item.actual / item.planned_amount) * 100, 100)
      : item.actual > 0
        ? 100
        : 0;

  // useActionState action: returns an error string on validation/API failure, null on success.
  async function saveAction(_prevError: string | null, formData: FormData) {
    const parsed = parseBudgetItemForm(formData);
    if (typeof parsed === "string") return parsed;
    const { name, amount } = parsed;
    try {
      await updateBudgetItem(item.id, { name, planned_amount: amount });
    } catch {
      return "Save failed. Please try again.";
    }
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["budget"] });
    return null;
  }

  function handleRemove() {
    startRemove(async () => {
      try {
        await removeBudgetItem(item.id);
        queryClient.invalidateQueries({ queryKey: ["budget"] });
      } catch {
        setRemoveError("Remove failed. Please try again.");
      }
    });
  }

  // error: last returned string from saveAction (null = no error); formAction: bound
  // to <form action>; isPending: true while the async action is in flight.
  const [error, formAction, isPending] = useActionState(saveAction, null);
  const isActionPending = isPending || isRemoving;

  function handleCancelEdit() {
    setEditing(false);
  }

  function handleItemClick() {
    onItemClick(item.id);
  }

  function handleAmountClick() {
    setEditing(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDragOver(dragEvent: DragEvent<HTMLDivElement>) {
    dragEvent.preventDefault();
    setIsDragOver(true);
  }

  async function handleDrop(dragEvent: DragEvent<HTMLDivElement>) {
    dragEvent.preventDefault();
    const transactionId = dragEvent.dataTransfer.getData("transaction_id");
    setIsDragOver(false);
    if (!transactionId) return;
    try {
      await assignTransaction(Number(transactionId), item.id);
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch {
      setAssignError("Assignment failed. Try again.");
    }
  }

  return (
    <li className="budget-item">
      {editing ? (
        <BudgetItemFormPanel
          defaultAmount={item.planned_amount}
          defaultName={item.name}
          error={error}
          formAction={formAction}
          isActionPending={isActionPending}
          isPending={isPending}
          onCancel={handleCancelEdit}
          removeSlot={
            <>
              <Button
                color="red"
                disabled={isActionPending}
                onClick={handleRemove}
                size="xs"
                type="button"
              >
                {isRemoving ? "Removing…" : "Remove"}
              </Button>
              {removeError && (
                <Text c="red" component="span" fz="xs">
                  {removeError}
                </Text>
              )}
            </>
          }
        />
      ) : (
        <div
          className={`budget-item__row${isDragOver ? " budget-item__row--drag-over" : ""}`}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <UnstyledButton
            className="budget-item__name budget-item__name--link"
            onClick={handleItemClick}
          >
            {item.name}
          </UnstyledButton>
          <UnstyledButton
            className="budget-item__amount"
            title="Click to edit"
            onClick={handleAmountClick}
          >
            {viewMode === "planned"
              ? `$${item.planned_amount.toFixed(2)}`
              : viewMode === "spent"
                ? `$${item.actual.toFixed(2)}`
                : `$${item.remaining.toFixed(2)}`}
          </UnstyledButton>
        </div>
      )}
      {assignError && <span className="budget-item__error">{assignError}</span>}
      <div className="budget-item__bar">
        <div
          className={`budget-item__fill${isOverBudget ? " budget-item__fill--over" : ""}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </li>
  );
}

export default function BudgetCategoryCard({
  category,
  onItemClick,
  viewMode,
}: CardProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  // useActionState action: returns an error string on validation/API failure, null on success.
  async function addAction(_prevError: string | null, formData: FormData) {
    const parsed = parseBudgetItemForm(formData);
    if (typeof parsed === "string") return parsed;
    const { name, amount } = parsed;
    try {
      await addBudgetItem(category.id, name, amount);
    } catch {
      return "Save failed. Please try again.";
    }
    setIsAdding(false);
    queryClient.invalidateQueries({ queryKey: ["budget"] });
    return null;
  }

  // addError: returned by any erroring form field
  // addFormAction: form action handler
  // isAddPending: true while the async action is in flight
  const [addError, addFormAction, isAddPending] = useActionState(
    addAction,
    null,
  );

  function handleAddCancel() {
    setIsAdding(false);
  }

  function handleAddItemClick() {
    setIsAdding(true);
  }

  return (
    <div className="budget-category-card">
      <div className="budget-category-card__header">
        <Text
          c="dimmed"
          component="span"
          fw={700}
          fz="xs"
          style={{ letterSpacing: "0.05em" }}
          tt="uppercase"
        >
          {category.name}
        </Text>
      </div>
      <ul className="budget-category-card__items">
        {category.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onItemClick={onItemClick}
            viewMode={viewMode}
          />
        ))}
      </ul>
      {isAdding ? (
        <BudgetItemFormPanel
          error={addError}
          formAction={addFormAction}
          isActionPending={isAddPending}
          isPending={isAddPending}
          onCancel={handleAddCancel}
        />
      ) : (
        <Button
          className="budget-category-card__add-btn"
          onClick={handleAddItemClick}
          size="xs"
          type="button"
          variant="subtle"
        >
          + Add item
        </Button>
      )}
    </div>
  );
}
