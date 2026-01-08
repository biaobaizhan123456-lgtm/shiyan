import Script from 'next/script';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Nebula Archive',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Inter:wght@100;300;400&display=swap"
          rel="stylesheet"
        />
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <style>{`
          body {
            margin: 0;
            background-color: #000;
            color: #fff;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
          }
          .serif-font {
            font-family: 'Cormorant Garamond', serif;
          }
          /* Film Grain Overlay */
          .film-grain {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 50;
            opacity: 0.04;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          }
        `}</style>
      </head>
      <body>
        {children}
        <div className="film-grain" />
      </body>
    </html>
  );
}
