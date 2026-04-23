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
          {/* Monday.com-style toasts — top-left (RTL), 3s auto-dismiss,
              colored 4px left border per type, slide in from the left. */}
          <Toaster
            position="top-left"
            toastOptions={{
              duration: 3000,
              className: "vx-toast",
              style: {
                borderRadius: "8px",
                background: "#fff",
                color: "#323338",
                fontSize: "14px",
                fontWeight: 500,
                padding: "12px 16px",
                maxWidth: "420px",
              },
              success: {
                className: "vx-toast vx-toast--success",
                iconTheme: { primary: "#00C875", secondary: "#fff" },
              },
              error: {
                className: "vx-toast vx-toast--error",
                iconTheme: { primary: "#E2445C", secondary: "#fff" },
              },
              loading: {
                className: "vx-toast vx-toast--loading",
                iconTheme: { primary: "#0073EA", secondary: "#fff" },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
