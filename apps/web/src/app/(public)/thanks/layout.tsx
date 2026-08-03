import type { ReactNode } from "react";
import { buildPublicMetadata } from "@/shared/seo/public-metadata";

export const metadata = buildPublicMetadata({
  title: "Спасибо за заявку",
  description: "Подтверждение отправки заявки в школу Робокс.",
  path: "/thanks",
  noIndex: true,
});

export default function ThanksLayout({ children }: { children: ReactNode }) {
  return children;
}
