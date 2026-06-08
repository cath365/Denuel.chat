import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';

import { FirebaseProvider } from '../components/firebase-provider';
import { env } from '../lib/env';
import './globals.css';

const heading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: env.appName,
  description: `${env.appName} secure messaging frontend`,
  icons: {
    icon: '/branding/logo-primary.jpg',
    apple: '/branding/logo-light.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className={`${heading.variable} ${body.variable}`}>
        <FirebaseProvider>{children}</FirebaseProvider>
      </body>
    </html>
  );
}
