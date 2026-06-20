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
  title: "Робототехника и программирование для детей в Липецке",
  description: "Инженерное мышление, программирование и робототехника для детей 6–14 лет в Липецке. Запишитесь на пробное занятие в мини-группы.",
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
