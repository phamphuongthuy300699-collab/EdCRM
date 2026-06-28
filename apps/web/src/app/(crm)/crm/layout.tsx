import { Metadata } from "next";
import CrmLayoutClient from "./CrmLayoutClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmLayoutClient>{children}</CrmLayoutClient>;
}
