import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "feuer.io",
  description: "Multiplayer IO game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width,height=device-height,user-scalable=no"
        />
      </head>
      <body className="font-mono bg-black text-white">{children}</body>
    </html>
  );
}
