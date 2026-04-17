import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Orbit',
  description: 'A Discord-inspired Laboratory Borrowing Web Application.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Orbit',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e2430',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased overflow-hidden" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
