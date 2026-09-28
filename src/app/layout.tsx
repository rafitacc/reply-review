import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { UserSwitcher } from "@/components/auth/user-switcher";
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
  const user = isDemoMode() ? await getCurrentUser() : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {isDemoMode() && <UserSwitcher users={DEMO_USERS} currentEmail={user?.email ?? null} />}
        {children}
      </body>
    </html>
  );
}
