import { Metadata } from "next";
import ParentLayoutClient from "./ParentLayoutClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <ParentLayoutClient>{children}</ParentLayoutClient>;
}
