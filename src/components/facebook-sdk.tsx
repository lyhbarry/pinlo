"use client";

import { useEffect, useState } from "react";
import { META_API_VERSION } from "@/lib/meta";

declare global {
  interface Window {
    FB: {
      init: (options: { appId: string; version: string; cookie: boolean; xfbml: boolean }) => void;
      login: (
        callback: (res: FBLoginResponse) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras?: Record<string, unknown>;
        }
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

export type FBLoginResponse = {
  status: string;
  code?: string;
  authResponse?: { code?: string };
};

export function useFacebookSDK(): boolean {
  const [ready, setReady] = useState(false);
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  useEffect(() => {
    if (!appId) return;
    if (window.FB) {
      const timeoutId = window.setTimeout(() => setReady(true), 0);
      return () => window.clearTimeout(timeoutId);
    }

    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: true, version: META_API_VERSION });
      setReady(true);
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [appId]);

  return ready;
}
