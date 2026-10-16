import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Zoom Meeting Application | MAIT 7th Sem Minor Project',
  description:
    'A MERN-Stack Web Application for Online Meetings and Real-Time Collaboration with WebRTC peer-to-peer audio/video communication, in-meeting chat, and MongoDB persistence. Department of Information Technology, Maharaja Agrasen Institute of Technology (2026-2027).',
  keywords: [
    'Zoom Clone',
    'MERN Stack',
    'WebRTC',
    'Video Conferencing',
    'MAIT',
    'Minor Project',
    'Socket.IO',
    'Real-time Communication',
  ],
  authors: [{ name: 'Department of Information Technology, MAIT' }],
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
    <html lang="en" className={`dark ${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-[#070b12] text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
