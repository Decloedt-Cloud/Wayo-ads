import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import { WelcomeToast } from "@/components/auth/WelcomeToast";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import ImportantAlertBanner from "@/components/notifications/ImportantAlertBanner";
import CookieConsent from "@/components/shared/CookieConsent";
import { headers, cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const locales = ['en', 'fr', 'ar'];

async function getLocaleFromHeaders(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('locale')?.value;
    if (cookieLocale && locales.includes(cookieLocale)) {
      return cookieLocale;
    }
    
    const headersList = await headers();
    const pathname = headersList.get('x-invoke-path') || '/';
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );
    if (pathnameHasLocale) {
      return pathname.split('/')[1];
    }
  } catch {
    // headers() not available
  }
  return 'en';
}

export const metadata: Metadata = {
  metadataBase: new URL("https://wayoads.com"),
  title: {
    default: "Wayo Ads - Creator Monetization Platform | Pay Per View Advertising",
    template: "%s | Wayo Ads",
  },
  description: "The creator monetization platform where influencers earn from every view. Connect with local creators, pay for real validated views, and grow your brand with better CPM rates than traditional agencies.",
  keywords: [
    "creator monetization platform",
    "influencer marketing marketplace",
    "pay per view advertising",
    "CPM marketplace",
    "creator economy",
    "influencer advertising",
    "brand creator collaboration",
    "validated views advertising",
    "local influencer marketing",
    "performance-based creator marketing",
  ],
  authors: [{ name: "Wayo Ads" }],
  creator: "Wayo Ads",
  publisher: "Wayo Ads",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wayoads.com",
    siteName: "Wayo Ads",
    title: "Wayo Ads - Creator Monetization Platform | Pay Per View Advertising",
    description: "The creator monetization platform where influencers earn from every view. Connect with local creators, pay for real validated views, and grow your brand with better CPM rates.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Wayo Ads - Creator Monetization Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wayo Ads - Creator Monetization Platform",
    description: "The creator monetization platform where influencers earn from every view. Pay for real validated views.",
    images: ["/og-image.png"],
    creator: "@wayoads",
  },
  alternates: {
    canonical: "https://wayoads.com",
    languages: {
      en: "https://wayoads.com",
      fr: "https://wayoads.com/fr",
      ar: "https://wayoads.com/ar",
    },
  },
  category: "marketing",
  classification: "Business, Advertising, Marketing",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromHeaders();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers initialLanguage={locale as 'en' | 'fr' | 'ar'}>
          <Suspense fallback={null}>
            <WelcomeToast />
          </Suspense>
          <ImportantAlertBanner />
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <CookieConsent />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
