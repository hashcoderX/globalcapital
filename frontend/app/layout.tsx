import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BMS - Business Management System",
  description: "Modern Business Management System with HRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
