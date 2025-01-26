import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import Nav from "./ui/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inv.ioce",
  description: "",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body
        className={`${outfit.variable} antialiased`}
      >
      <div>
      </div>
        {children}
      <div className='blur-[150px] bg-accent/70 pointer-events-none absolute -top-40 right-60 w-[300px] h-[300px] rounded-full'></div>
      <div className='blur-[150px] bg-primary/70 pointer-events-none absolute top-40 -left-40 w-[300px] h-[300px] rounded-full'></div>
      <div className='blur-[170px] bg-secondary/70 pointer-events-none absolute bottom-20 right-40 w-[300px] h-[300px] rounded-full'></div>
      </body>
    </html>
  );
}
