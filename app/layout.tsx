import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { getLang } from "@/lib/i18n/lang";
import { t } from "@/lib/i18n";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";
import { AppDownloadBanner } from "@/components/layout/AppDownloadBanner";
import { ChromeHeightVars } from "@/components/layout/ChromeHeightVars";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  // "Cook well. Eat better." er ikke lenger i bruk noe sted på siden – bruker
  // samme "Din digitale kokebok"-frasen som forsiden/footeren i tittelen her.
  const tagline = t(lang, "home.eyebrow");
  const description = lang === "en" ? siteConfig.descriptionEn : siteConfig.description;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} – ${tagline}`,
      template: `%s · ${siteConfig.name}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: lang === "en" ? "en_US" : siteConfig.locale,
      siteName: siteConfig.name,
      title: siteConfig.name,
      description,
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description,
      images: ["/og-image.jpg"],
    },
    icons: {
      icon: "/icon.png",
      apple: "/apple-icon.png",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15120d",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();

  return (
    <html lang={lang === "en" ? "en" : "no"} className={`${fraunces.variable} ${inter.variable}`}>
      {/* id="top" – ankerpunkt for "til toppen"-pilen nederst i footeren
          (se Footer.tsx), samme enkle anker+scroll-behavior:smooth-mønster
          som "bla nedover"-pilen i heroen bruker, uten behov for JS. */}
      <body id="top" className="flex min-h-screen flex-col bg-cream text-ink">
        <ChromeHeightVars />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          {lang === "en" ? "Skip to content" : "Hopp til innhold"}
        </a>
        <DemoModeBanner />
        <AppDownloadBanner />
        <Header />
        <main id="main-content" className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <Footer lang={lang} />
        <BottomNav lang={lang} />
      </body>
    </html>
  );
}
