import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./hooks/useAuth";
import { WorkspaceOptionsProvider } from "./hooks/useWorkspaceOptions";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceOptionsProvider>
            <App />
          </WorkspaceOptionsProvider>
          <Toaster
            position="top-left"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: "8px",
                background: "#323338",
                color: "#fff",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
