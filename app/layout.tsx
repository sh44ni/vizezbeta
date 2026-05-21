import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: "VizEz — AI Portal Mapping & Auto-Fill Platform",
  description: "Train any government portal. Auto-fill visa applications with AI-powered field mapping.",
  icons: {
    icon: "/logo_favicon.svg",
    shortcut: "/logo_favicon.svg",
    apple: "/logo_favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <head />
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
