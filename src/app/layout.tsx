import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TopBar } from "@/components/shell/top-bar";
import { getCurrentUser } from "@/lib/data/session";
import { DEMO_USERS, isDemoMode } from "@/lib/demo-users";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "reply-review",
  description: "Review support replies after they were sent.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TopBar user={user} demoUsers={isDemoMode() ? DEMO_USERS : null} />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
