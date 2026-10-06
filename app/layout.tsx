import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatchScan — Vulnerability & Patch Management Platform",
  description: "Enterprise vulnerability scanner for servers, cloud clusters, and software stacks with automated 1-click patch remediation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F8FAFC] text-slate-900 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
