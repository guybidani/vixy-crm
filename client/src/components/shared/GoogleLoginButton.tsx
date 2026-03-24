import { useEffect, useRef, useCallback } from "react";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "595077912228-qbl9ulrqtalslk58pii8ttpo772m0dk6.apps.googleusercontent.com";

interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (error: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (
            element: HTMLElement,
            config: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

export default function GoogleLoginButton({
  onSuccess,
  onError,
  text = "signin_with",
}: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onSuccess);
  callbackRef.current = onSuccess;

  const initGoogle = useCallback(() => {
    if (!window.google || !buttonRef.current || !GOOGLE_CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          callbackRef.current(response.credential);
        } else {
          onError?.("Google sign-in failed");
        }
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width: "100%",
      text,
      shape: "rectangular",
      logo_alignment: "center",
    });
  }, [text, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // If script already loaded
    if (window.google) {
      initGoogle();
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount — other components may use it
    };
  }, [initGoogle]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="w-full flex justify-center">
      <div ref={buttonRef} className="w-full [&>div]:!w-full" />
    </div>
  );
}
