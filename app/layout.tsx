import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: {
      default: "Issue-killer · 从 Issue 到可执行计划",
      template: "%s · Issue-killer",
    },
    description:
      "由腾讯混元 Hy3 驱动的开源 Issue 分析工作台：提取验收标准、代码入口、实施计划、风险与测试清单。",
    openGraph: {
      title: "Issue-killer · 从 Issue 到可执行计划",
      description: "把公开 GitHub Issue 转换成有证据、可验证的贡献计划。",
      type: "website",
      locale: "zh_CN",
      url: metadataBase,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: "Issue-killer" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Issue-killer · 从 Issue 到可执行计划",
      description: "由 Hy3 驱动的开源贡献工作台。",
      images: [imageUrl],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#eef3fb",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${manrope.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
