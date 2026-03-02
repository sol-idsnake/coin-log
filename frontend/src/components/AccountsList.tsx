/** Displays all linked bank accounts grouped by institution, collapsed by default. */
import { useMemo } from "react";
import type { Account } from "../api";
import "./AccountsList.scss";

interface InstitutionGroup {
  accounts: Account[];
  name: string;
}

function groupByInstitution(accounts: Account[]): InstitutionGroup[] {
  const map = Map.groupBy(
    accounts,
    ({ institution_name }) => institution_name ?? "Unknown Institution",
  );
  return Array.from(map, ([name, groupAccounts]) => ({
    accounts: groupAccounts,
    name,
  }));
}

export default function AccountsList({ accounts }: { accounts: Account[] }) {
  const groups = useMemo(() => groupByInstitution(accounts), [accounts]);

  if (accounts.length === 0) {
    return (
      <section className="accounts">
        <p className="accounts__empty">No accounts linked yet.</p>
      </section>
    );
  }

  return (
    <section className="accounts">
      <div className="accounts__cards">
        {groups.map((group) => (
          <div key={group.name} className="institution-card">
            <h3 className="institution-card__name">{group.name}</h3>
            {group.accounts.map((account) => (
              <div key={account.account_id} className="account-row">
                <span className="account-row__name">
                  {account.name ?? "Unnamed"}
                  {account.mask ? ` ···${account.mask}` : ""}
                </span>
                <span className="account-row__meta">
                  {account.type ?? "?"}/{account.subtype ?? "?"}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
