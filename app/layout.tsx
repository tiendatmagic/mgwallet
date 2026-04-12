import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MG Wallet - Your Multi-chain Crypto Gateway",
  description: "Secure, beautiful, and decentralized crypto wallet for Ethereum, Arbitrum, BSC, and Polygon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <Providers>
          <div className="wallet-container">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
