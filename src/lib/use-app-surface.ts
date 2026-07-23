import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";

export type AppSurface = "desktop" | "mobile";

const configuredSurface = import.meta.env.VITE_APP_SURFACE?.toLowerCase();

export function detectAppSurface(): AppSurface {
  const nativePlatform = Capacitor.getPlatform();
  if (Capacitor.isNativePlatform() && (nativePlatform === "ios" || nativePlatform === "android")) {
    return "mobile";
  }

  if (configuredSurface === "desktop" || configuredSurface === "mobile") {
    return configuredSurface;
  }

  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return "mobile";
  }

  return "desktop";
}

export function useAppSurface(): AppSurface {
  // Keep the server and first client render identical, then resolve the runtime surface.
  const [surface, setSurface] = useState<AppSurface>("desktop");

  useEffect(() => {
    setSurface(detectAppSurface());

    if (
      configuredSurface === "desktop" ||
      configuredSurface === "mobile" ||
      Capacitor.isNativePlatform()
    ) {
      return;
    }

    const media = window.matchMedia("(max-width: 767px)");
    const updateSurface = () => setSurface(media.matches ? "mobile" : "desktop");
    media.addEventListener("change", updateSurface);
    return () => media.removeEventListener("change", updateSurface);
  }, []);

  return surface;
}
