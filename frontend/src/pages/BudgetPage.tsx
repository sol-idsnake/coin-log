/** Budget page: current month's category cards plus an uncategorizedTransactions transactions panel. */
import { useTransition, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  SegmentedControl,
  Text,
  Title,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { BudgetItem } from "../api";
import {
  createBudget,
  fetchBudget,
  fetchTransactions,
  removeAssignment,
} from "../api";
import type { ViewMode } from "../components/BudgetCategoryCard";
import BudgetItemDetails from "../components/BudgetItemDetails";
import BudgetCategoryCard from "../components/BudgetCategoryCard";
import UncategorizedPanel from "../components/UncategorizedPanel";
import { useBudgetSummary } from "../hooks/useBudgetSummary";
import { currentMonthKey, formatMonth, getMonthKey } from "../utils/date";
import "./BudgetPage.scss";

const SPEND_ATTRIBUTION = [
  { label: "Planned", value: "planned" },
  { label: "Remaining", value: "remaining" },
  { label: "Spent", value: "spent" },
];

interface BudgetPageHeaderProps {
  hasBudget: boolean;
  month: string;
  onMonthChange: (direction: "next" | "previous") => void;
  onViewModeChange: (value: string) => void;
  remainingToSpend: number;
  spentSoFar: number;
  totalPlannedIncome: number;
  viewMode: ViewMode;
}

function BudgetPageHeader({
  hasBudget,
  month,
  onMonthChange,
  onViewModeChange,
  remainingToSpend,
  spentSoFar,
  totalPlannedIncome,
  viewMode,
}: BudgetPageHeaderProps) {
  return (
    <div className="budget-page__header">
      <div className="budget-page__month-nav">
        <ActionIcon
          aria-label="Previous month"
          onClick={() => onMonthChange("previous")}
          variant="subtle"
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        <h1 className="budget-page__title">{formatMonth(month)} Budget</h1>
        <ActionIcon
          aria-label="Next month"
          onClick={() => onMonthChange("next")}
          variant="subtle"
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      </div>
      {hasBudget && (
        <>
          {viewMode === "planned" && (
            <span className="budget-page__summary">
              ${totalPlannedIncome.toFixed(2)} planned income
            </span>
          )}
          {viewMode === "spent" && (
            <span className="budget-page__summary">
              ${spentSoFar.toFixed(2)} spent so far
            </span>
          )}
          {viewMode === "remaining" && (
            <span className="budget-page__summary">
              ${remainingToSpend.toFixed(2)} remaining to spend
            </span>
          )}
          <SegmentedControl
            data={SPEND_ATTRIBUTION}
            ml="auto"
            onChange={onViewModeChange}
            size="md"
            value={viewMode}
          />
        </>
      )}
    </div>
  );
}

export default function BudgetPage() {
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<
    number | null
  >(null);
  const [viewMode, setViewMode] = useState<ViewMode>("planned");
  const [isCreating, startCreate] = useTransition();
  const [month, setMonth] = useState(currentMonthKey);
  const queryClient = useQueryClient();
  const monthLabel = formatMonth(month).split(" ")[0];
  const previousMonthLabel = formatMonth(getMonthKey(month, "previous")).split(
    " ",
  )[0];

  const {
    data: budget,
    error: budgetError,
    isPending: isBudgetPending,
  } = useQuery({
    queryKey: ["budget", month],
    queryFn: () => fetchBudget(month),
  });

  const { data: transactions = [], error: transactionsError } = useQuery({
    queryKey: ["transactions", { month }],
    queryFn: () => fetchTransactions({ month }),
  });

  const error = budgetError ?? transactionsError;

  function handleCreate() {
    startCreate(async () => {
      await createBudget(month);
      queryClient.invalidateQueries({ queryKey: ["budget", month] });
    });
  }

  const { leftToBudget, remainingToSpend, spentSoFar, totalPlannedIncome } =
    useBudgetSummary(budget ?? undefined, transactions);

  const uncategorizedTransactions = transactions.filter(
    (transaction) =>
      transaction.type === "expense" && transaction.budget_item_id === null,
  );

  const modalBudgetItem: BudgetItem | null =
    selectedBudgetItemId !== null
      ? (budget?.categories
          .flatMap((category) => category.items)
          .find((budgetItem) => budgetItem.id === selectedBudgetItemId) ?? null)
      : null;

  const assignedTransactions = transactions.filter(
    (transaction) => transaction.budget_item_id === selectedBudgetItemId,
  );

  function handleMonthChange(direction: "next" | "previous") {
    setMonth(getMonthKey(month, direction));
  }

  function handleViewModeChange(value: string) {
    setViewMode(value as ViewMode);
  }

  function handleItemClick(itemId: number) {
    setSelectedBudgetItemId(itemId);
    setModalItemId(itemId);
  }

  function handleDetailsClose() {
    // selectedBudgetItemId is intentionally left unchanged — keeps modal
    // content stable while the exit animation plays.
    setModalItemId(null);
  }

  async function handleRemoveAssignment(transactionId: number) {
    await removeAssignment(transactionId);
    queryClient.invalidateQueries({ queryKey: ["budget"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }

  if (error)
    return (
      <Alert color="red" variant="light">
        {String(error)}
      </Alert>
    );
  if (isBudgetPending || budget === undefined)
    return <p className="budget-page__loading">Loading budget…</p>;

  return (
    <div className="budget-page">
      <BudgetPageHeader
        hasBudget={budget !== null}
        month={month}
        onMonthChange={handleMonthChange}
        onViewModeChange={handleViewModeChange}
        remainingToSpend={remainingToSpend}
        spentSoFar={spentSoFar}
        totalPlannedIncome={totalPlannedIncome}
        viewMode={viewMode}
      />

      {budget === null ? (
        <div className="budget-page__empty">
          <Title order={3}>
            Hey there! It looks like you need a budget for {monthLabel}.
          </Title>
          <Text c="dimmed">
            We'll copy {previousMonthLabel}'s budget to get you started.
          </Text>
          <Button loading={isCreating} onClick={handleCreate} size="lg">
            Create {monthLabel} Budget
          </Button>
        </div>
      ) : (
        <>
          <p className="budget-page__balance">
            <span className="budget-page__balance-amount">
              ${leftToBudget.toFixed(2)}
            </span>
            <span className="budget-page__balance-label">left to budget</span>
          </p>

          <div className="budget-page__grid">
            {budget.categories.map((category) => (
              <BudgetCategoryCard
                category={category}
                key={category.id}
                onItemClick={handleItemClick}
                viewMode={viewMode}
              />
            ))}
          </div>

          <div className="budget-page__divider" />

          <UncategorizedPanel transactions={uncategorizedTransactions} />

          <BudgetItemDetails
            onClose={handleDetailsClose}
            onRemove={handleRemoveAssignment}
            opened={modalItemId !== null}
            title={modalBudgetItem?.name ?? ""}
            transactions={assignedTransactions}
          />
        </>
      )}
    </div>
  );
}
