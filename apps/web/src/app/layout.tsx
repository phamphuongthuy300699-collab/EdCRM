import type { Metadata } from "next";
import { Inter, Geologica } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://robotics-lipetsk.ru"),
  title: {
    default: "Робототехника и программирование для детей в Липецке | Школа Robotics",
    template: "%s | Школа Robotics Липецк"
  },
  description: "Школа инженерного мышления и программирования для детей 6–14 лет в Липецке. Практические занятия в мини-группах до 8 человек. Запишитесь на бесплатный пробный урок!",
  alternates: {
    canonical: "./",
  },
  openGraph: {
    title: "Робототехника и программирование для детей в Липецке | Школа Robotics",
    description: "Развиваем инженерное мышление у детей 6–14 лет. Сборка роботов, программирование игр и микроконтроллеров. Запись на бесплатное пробное занятие!",
    url: "https://robotics-lipetsk.ru",
    siteName: "Школа Robotics Липецк",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Робототехника и программирование для детей в Липецке | Школа Robotics",
    description: "Развиваем инженерное мышление у детей 6–14 лет. Сборка роботов, программирование игр и микроконтроллеров.",
  }
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
