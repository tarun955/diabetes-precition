import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diabetes model study",
  description: "A visual, plain-language comparison of Random Forest and Gradient Boosting.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
