import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayntage — Your Community, Clarified",
  description: "Track tax rate changes, rezonings, and bond elections that affect your home. Know exactly what government decisions cost you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
