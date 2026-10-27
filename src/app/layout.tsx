import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Serif, Noto_Serif_Devanagari } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getLocale, loadMessages } from '@/lib/locale';

const sans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans', display: 'swap' });
const sansDeva = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-noto-sans-deva', display: 'swap' });
const serif = Noto_Serif({ subsets: ['latin'], variable: '--font-noto-serif', display: 'swap' });
const serifDeva = Noto_Serif_Devanagari({ subsets: ['devanagari'], variable: '--font-noto-serif-deva', display: 'swap' });

export const metadata: Metadata = {
  title: 'FairShift',
  description: 'Know your wages, keep your evidence, report problems safely.',
};

// No maximum-scale: people must be able to zoom.
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  const messages = loadMessages(locale);
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sans.variable} ${sansDeva.variable} ${serif.variable} ${serifDeva.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          {messages.common && typeof messages.common.skipToContent === 'string' ? messages.common.skipToContent : 'Skip to content'}
        </a>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
