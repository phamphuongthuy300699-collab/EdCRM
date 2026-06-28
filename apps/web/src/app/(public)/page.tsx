import React from "react";
import { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "Робототехника и программирование для детей в Липецке | Школа Robotics",
  description: "Курсы робототехники, Scratch, Python и Arduino для детей 6–14 лет в Липецке. Бесплатное пробное занятие 90 минут! Запись в мини-группы до 8 человек.",
  alternates: {
    canonical: "https://robotics-lipetsk.ru",
  },
};

export default function Page() {
  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": "https://robotics-lipetsk.ru/#organization",
    "name": "Школа робототехники и программирования Robotics Липецк",
    "url": "https://robotics-lipetsk.ru",
    "logo": "https://robotics-lipetsk.ru/favicon.ico",
    "image": "https://robotics-lipetsk.ru/images/classroom_lipetsk.png",
    "description": "Школа инженерного мышления и программирования для детей 6–14 лет в Липецке. Сборка роботов, разработка игр, Scratch, Python, Arduino в мини-группах.",
    "telephone": "+7-999-123-45-67",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Ленина, д. 10",
      "addressLocality": "Липецк",
      "postalCode": "398000",
      "addressCountry": "RU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "52.6088",
      "longitude": "39.5992"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ],
      "opens": "09:00",
      "closes": "20:00"
    },
    "priceRange": "$$"
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Главная",
        "item": "https://robotics-lipetsk.ru"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <LandingPageClient />
    </>
  );
}
