import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Ekodrix HRMS",
  description: "Ekodrix - WorkFlow Pro HRMS"
};

import { QueryProvider } from "@/components/providers/query-provider";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} ${outfit.variable} antialiased`}>
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

