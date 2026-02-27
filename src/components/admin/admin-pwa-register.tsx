"use client";

import { useEffect } from "react";

export function AdminPwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).catch(() => {
      // Ignore registration failures to avoid blocking admin usage.
    });
  }, []);

  return null;
}

