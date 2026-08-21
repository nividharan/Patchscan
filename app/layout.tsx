import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebHealer AI — Autonomous Web QA Agent",
  description: "Autonomous AI QA tester that crawls any live website, finds bugs, and generates Playwright tests with code fixes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
