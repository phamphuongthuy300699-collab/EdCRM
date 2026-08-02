import type { Metadata } from "next";
import { Inter, Geologica } from "next/font/google";
import "./globals.css";
import { getPublicSiteConfig } from "@/shared/config/public-site";
import { buildPublicMetadata, DEFAULT_HOME_DESCRIPTION, DEFAULT_HOME_TITLE } from "@/shared/seo/public-metadata";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "cyrillic"],
});

const publicSite = getPublicSiteConfig();
export const metadata: Metadata = {
  ...buildPublicMetadata({ title: DEFAULT_HOME_TITLE, description: DEFAULT_HOME_DESCRIPTION }),
  metadataBase: new URL(publicSite.origin),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${geologica.variable}`}>
      <body>{children}</body>
    </html>
  );
}
