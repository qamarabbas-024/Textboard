import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TextBoard — Visual Intelligence & Forensic Analytics Workstation',
  description: 'Ultra-high-performance 3D visual intelligence workstation for massive communication streams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  // Suppress third-party Chrome extension errors from triggering Next.js dev overlay
                  window.addEventListener('error', function(event) {
                    if (
                      (event.filename && event.filename.includes('chrome-extension://')) ||
                      (event.message && event.message.includes('chrome: call method')) ||
                      (event.message && event.message.includes('Extension context invalidated'))
                    ) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      return true;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event.reason;
                    var msg = reason ? (reason.message || String(reason)) : '';
                    var stack = reason ? (reason.stack || '') : '';
                    if (
                      msg.includes('chrome: call method') ||
                      msg.includes('Extension context invalidated') ||
                      stack.includes('chrome-extension://')
                    ) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      return true;
                    }
                  }, true);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}

