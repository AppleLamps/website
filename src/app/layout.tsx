import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollToTop from "@/components/ScrollToTop";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://epsteinphotos.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Epstein Files Browser - DOJ Document Archive | December 2025 Release",
    template: "%s | Epstein Files Browser",
  },
  description: "Browse and search 10,588 publicly released documents from the Epstein case. Official DOJ files from the December 2025 release. Community-driven archive with comments and discussion.",
  keywords: [
    "Epstein files",
    "Epstein documents",
    "DOJ files",
    "Epstein case",
    "December 2025 release",
    "public records",
    "court documents",
    "Maxwell trial",
    "SDNY documents",
    "Epstein photos",
    "Epstein flight logs",
    "document archive",
    "legal documents",
  ],
  authors: [{ name: "Epstein Files Browser" }],
  creator: "Epstein Files Browser",
  publisher: "Epstein Files Browser",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Epstein Files Browser - Official DOJ Document Archive",
    description: "Browse 10,588 publicly released Epstein case documents from the December 2025 DOJ release.",
    type: "website",
    url: BASE_URL,
    siteName: "Epstein Files Browser",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Epstein Files Browser - Public Document Archive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Epstein Files Browser - DOJ Document Archive",
    description: "Browse 10,588 publicly released Epstein case documents from the December 2025 DOJ release.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: "your-verification-code",
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "Legal Documents",
};

/**
 * Site-wide structured data for Organization and WebSite schemas.
 * This helps Google understand the site structure and enables sitelinks search box.
 */
function generateSiteStructuredData() {
  return [
    // WebSite schema with search action for sitelinks search box
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      name: "Epstein Files Browser",
      url: BASE_URL,
      description: "Browse and search 10,588 publicly released documents from the Epstein case.",
      inLanguage: "en-US",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    // Collection/Dataset schema for the document archive
    {
      "@context": "https://schema.org",
      "@type": "Collection",
      "@id": `${BASE_URL}/#collection`,
      name: "Epstein DOJ Document Archive",
      description: "Complete archive of 10,588 publicly released documents from the U.S. Department of Justice related to the Jeffrey Epstein case. Released December 2025.",
      url: BASE_URL,
      numberOfItems: 10588,
      datePublished: "2025-12-20",
      dateModified: "2025-12-20",
      isAccessibleForFree: true,
      license: "https://www.usa.gov/government-works",
      creator: {
        "@type": "GovernmentOrganization",
        name: "U.S. Department of Justice",
        url: "https://www.justice.gov",
      },
      provider: {
        "@type": "WebSite",
        name: "Epstein Files Browser",
        url: BASE_URL,
      },
      about: {
        "@type": "Thing",
        name: "Jeffrey Epstein Case",
        description: "Legal proceedings and documents related to the Jeffrey Epstein case.",
      },
    },
  ];
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = generateSiteStructuredData();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Site-wide structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ScrollToTop />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
