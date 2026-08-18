import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Textboard',
  description: 'Multipurpose data dashboard application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
      <body>{children}</body>
    </html>
  );
}
