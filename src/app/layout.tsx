import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MY5 — Share Your Top 5",
  description: "Curate and share the 5 things that define you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
