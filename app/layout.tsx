import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Ekodrix HRMS",
  description: "Ekodrix - WorkFlow Pro HRMS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ekodrix HRMS",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png" },
    ],
  },
};

export const viewport = {
  themeColor: "#1f4d42",
  width: "device-width",
  initialScale: 1,
  userScalable: true,
};

import { QueryProvider } from "@/components/providers/query-provider";

const localServiceWorkerCleanupScript = `
(() => {
  try {
    if (typeof window === "undefined") return;
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocalhost || !("serviceWorker" in navigator)) return;

    const doneKey = "__ekodrix_sw_cleanup_v1";
    if (sessionStorage.getItem(doneKey) === "1") return;

    const unregisterAll = navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())));
    const clearCaches = "caches" in window
      ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      : Promise.resolve();

    Promise.all([unregisterAll, clearCaches]).finally(() => {
      sessionStorage.setItem(doneKey, "1");
      const url = new URL(window.location.href);
      if (!url.searchParams.has("__sw_reset")) {
        url.searchParams.set("__sw_reset", "1");
        window.location.replace(url.toString());
      }
    });
  } catch (_) {
    // Ignore cleanup failures and continue rendering app.
  }
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} ${outfit.variable} ${spaceGrotesk.variable} antialiased`}>
        <Script
          id="localhost-sw-cleanup"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: localServiceWorkerCleanupScript }}
        />
        <ThemeProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}

