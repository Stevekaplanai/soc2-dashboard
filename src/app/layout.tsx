import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOC2 Dashboard — Kill Vanta",
  description:
    "Open-source SOC2 compliance dashboard. Evidence upload, AI-powered control mapping, human review gate, full audit log. The $100K/yr Vanta alternative.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}