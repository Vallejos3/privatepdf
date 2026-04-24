import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
      title: 'PrivatePDF - Free Local PDF Tools (Merge, Split, Rotate)',
        description: '100% private PDF tools. Merge, split, rotate, and watermark PDFs in your browser. No uploads, no servers, no tracking.',
          keywords: 'pdf merge, pdf split, pdf tools, private pdf, local pdf, no upload pdf',
            robots: 'index, follow',
            openGraph: {
              title: 'PrivatePDF - Free Local PDF Tools',
              description: '100% private PDF tools. Merge, split, rotate, and watermark PDFs in your browser. No uploads, no servers, no tracking.',
              url: 'https://privatepdf.pages.dev',
              siteName: 'PrivatePDF',
              images: [
                {
                  url: 'https://privatepdf.pages.dev/og-image.png',
                  width: 1200,
                  height: 630,
                },
              ],
              locale: 'en_US',
              type: 'website',
            },
            twitter: {
              card: 'summary_large_image',
              title: 'PrivatePDF - Free Local PDF Tools',
              description: '100% private PDF tools. Merge, split, rotate, and watermark PDFs in your browser. No uploads, no servers, no tracking.',
              images: ['https://privatepdf.pages.dev/og-image.png'],
            },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Script strategy="afterInteractive" src="https://plausible.io/js/script.js" data-domain="privatepdf.pages.dev" />{children}</body>
    </html>
  );
}
