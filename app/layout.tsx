import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGNITERA Command Center",
  description: "社内AI業務OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
