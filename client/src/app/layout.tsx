import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feuer",
  description: "Multiplayer IO game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-mono bg-black text-white">{children}</body>
    </html>
  );
}
