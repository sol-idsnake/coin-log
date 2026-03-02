/** Renders the "Connect Bank" button that opens Plaid Link. */
import { useCallback } from "react";
import { Button } from "@mantine/core";
import { usePlaidLink } from "react-plaid-link";
import { setAccessToken } from "../api";

interface LinkButtonProps {
  linkToken: string;
  onConnected: () => void;
}

export default function LinkButton({
  linkToken,
  onConnected,
}: LinkButtonProps) {
  const onSuccess = useCallback(
    async (publicToken: string) => {
      await setAccessToken(publicToken);
      onConnected();
    },
    [onConnected],
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  function handleClick() {
    open();
  }

  return (
    <Button disabled={!ready} onClick={handleClick}>
      Connect Bank
    </Button>
  );
}
