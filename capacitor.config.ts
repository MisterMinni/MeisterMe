import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.MEISTERME_APP_URL?.trim();

const config: CapacitorConfig = {
  appId: "de.meisterme.app",
  appName: "MeisterMe",
  webDir: "native-shell",
  server: appUrl
    ? {
        url: appUrl,
        cleartext: false,
      }
    : undefined,
  ios: {
    allowsLinkPreview: false,
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
