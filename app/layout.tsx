import type { Metadata } from "next";
import type { ReactNode } from "react";

import SiteHeader from "@/components/SiteHeader";
import { AppProvider } from "@/lib/store";

import "./globals.css";

export const metadata: Metadata = {
  title: "CampusSignal",
  description: "CampusSignal eligibility workspace",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <SiteHeader />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
