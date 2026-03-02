/** Accounts page: linked accounts and Plaid connect button. */
import { Alert, Button } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createLinkToken, fetchAccounts } from "../api";
import AccountsList from "../components/AccountsList";
import LinkButton from "../components/LinkButton";
import "./AccountsPage.scss";

export default function AccountsPage() {
  const queryClient = useQueryClient();

  const { data: linkToken } = useQuery({
    queryKey: ["link-token"],
    queryFn: createLinkToken,
  });

  const { data: accounts = [], error } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  function handleConnected() {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  }

  return (
    <div className="accounts-page">
      <h1 className="accounts-page__title">Accounts</h1>

      {error && (
        <Alert color="red" variant="light">
          {String(error)}
        </Alert>
      )}

      <div className="accounts-page__actions">
        {linkToken ? (
          <LinkButton linkToken={linkToken} onConnected={handleConnected} />
        ) : (
          <Button disabled>Connect Bank</Button>
        )}
      </div>

      <AccountsList accounts={accounts} />
    </div>
  );
}
