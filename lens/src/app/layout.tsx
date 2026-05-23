import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VizEz Lens — Document Intelligence Dashboard',
  description:
    'Premium document processing monitoring and analytics platform. Process, enhance, and classify identity documents with real-time intelligence.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body>{children}</body>
    </html>
  );
}
