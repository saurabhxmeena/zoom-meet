import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Zoom Meet',
  description: 'Fast, clear, peer-to-peer video meetings directly in your browser.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-[#0e1015] text-[#f1f2f4] font-sans antialiased selection:bg-[#2563eb] selection:text-white">
        {children}
      </body>
    </html>
  );
}
