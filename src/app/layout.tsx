import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Meetings',
  description: 'Simple, fast, and secure video meetings.',
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
      <body className="min-h-screen bg-black text-[#f5f5f7] font-sans antialiased selection:bg-[#2997ff] selection:text-white">
        {children}
      </body>
    </html>
  );
}
