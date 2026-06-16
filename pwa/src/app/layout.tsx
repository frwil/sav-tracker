import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from '@/providers/QueryProvider';
import SyncProvider from '@/providers/SyncProvider';
import { I18nProvider } from '@/i18n/I18nProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAV Tracker",
  description: "Suivi des équipes terrain — élevage et provenderie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <QueryProvider>
            <SyncProvider>
               {children}
            </SyncProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
