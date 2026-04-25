import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maddie's Dashboard",
  description: "Personal finance dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflowX: 'hidden', fontFamily: 'sans-serif' }}>{children}</body>
    </html>
  );
}