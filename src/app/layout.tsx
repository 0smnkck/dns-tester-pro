import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DNS Tester Pro",
  description: "Gerçek zamanlı DNS (Ping & Jitter) ölçüm ve Yapay Zeka Danışmanlık Aracı.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DNS Tester",
  },
};

export const viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${inter.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
