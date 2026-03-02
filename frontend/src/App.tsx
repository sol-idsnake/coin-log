/** Root component: manages layout, sidebar toggle, and tab navigation. */
import { useState } from "react";
import "./App.scss";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { useSyncInit } from "./hooks/syncStore";
import { useSidebar } from "./hooks/useSidebar";
import AccountsPage from "./pages/AccountsPage";
import BudgetPage from "./pages/BudgetPage";
import TransactionsPage from "./pages/TransactionsPage";

export type Tab = "accounts" | "budget" | "transactions";

export default function App() {
  const { isSidebarOpen, toggle: toggleSidebar } = useSidebar();
  const [activeRoute, setActiveTab] = useState<Tab>("budget");
  useSyncInit();

  return (
    <>
      <Header />
      <div
        className={`app-layout${isSidebarOpen ? " app-layout--sidebar-open" : ""}`}
      >
        <Sidebar
          activeRoute={activeRoute}
          isOpen={isSidebarOpen}
          onNavigate={setActiveTab}
          onToggle={toggleSidebar}
        />
        <main className="main-content">
          {activeRoute === "accounts" && <AccountsPage />}
          {activeRoute === "budget" && <BudgetPage />}
          {activeRoute === "transactions" && <TransactionsPage />}
        </main>
      </div>
    </>
  );
}
