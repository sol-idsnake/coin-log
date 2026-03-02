/** Entry point: mounts the React app into the #root element. */
import "@mantine/core/styles.css";
import { StrictMode } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import "./App.scss";
import App from "./App";
import queryClient from "./queryClient";
import { theme } from "./theme";

createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <QueryClientProvider client={queryClient}>
      <StrictMode>
        <App />
      </StrictMode>
    </QueryClientProvider>
  </MantineProvider>,
);
