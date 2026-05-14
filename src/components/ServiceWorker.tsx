"use client";
import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // When a new SW is waiting, reload the page to apply it immediately
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New content available — reload silently for seamless update
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  return null;
}
