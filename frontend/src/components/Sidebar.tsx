/** Sidebar: collapsible navigation linking Budget, Transactions, and Accounts pages. */
import { ActionIcon, NavLink } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import type { Tab } from "../App";
import "./Sidebar.scss";

interface Props {
  activeRoute: Tab;
  isOpen: boolean;
  onNavigate: (tab: Tab) => void;
  onToggle: () => void;
}

const NAV_ITEMS: { label: string; tab: Tab }[] = [
  { label: "Budget", tab: "budget" },
  { label: "Transactions", tab: "transactions" },
  { label: "Accounts", tab: "accounts" },
];

export default function Sidebar({
  activeRoute,
  isOpen,
  onNavigate,
  onToggle,
}: Props) {
  return (
    <aside className={`sidebar${isOpen ? "" : " sidebar--collapsed"}`}>
      <div className="sidebar__header">
        <ActionIcon
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          color="gray"
          onClick={onToggle}
          size="md"
          variant="subtle"
        >
          {isOpen ? (
            <IconLayoutSidebarLeftCollapse size={18} />
          ) : (
            <IconLayoutSidebarLeftExpand size={18} />
          )}
        </ActionIcon>
      </div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ label, tab }) => (
          <NavLink
            active={activeRoute === tab}
            key={tab}
            label={label}
            onClick={() => onNavigate(tab)}
          />
        ))}
      </nav>
    </aside>
  );
}
