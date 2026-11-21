import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { es } from "@/i18n/dictionaries";
import "./globals.css";

const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: es.meta.title,
  description: es.meta.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={es.lang} className={`${display.variable} ${mono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
