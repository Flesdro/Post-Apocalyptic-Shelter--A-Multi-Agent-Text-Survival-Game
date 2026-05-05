import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shelter Chat Survival",
  description: "A post-apocalyptic shelter group-chat survival MVP."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
