import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "觉醒玩家｜让真实行动被看见",
  description:
    "把读书、运动、创作、自律、社交与探索，变成看得见的现实成长。",
  applicationName: "觉醒玩家",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "觉醒玩家",
    title: "觉醒玩家｜让真实行动被看见",
    description:
      "完成现实任务，点亮六大能力、能力星图与属于你的成长世界。",
    images: [
      {
        url: "/og.png",
        width: 1672,
        height: 941,
        alt: "觉醒玩家——让真实行动被看见",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "觉醒玩家｜让真实行动被看见",
    description:
      "完成现实任务，点亮六大能力、能力星图与属于你的成长世界。",
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "觉醒玩家",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#081110",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSans.variable} ${notoSerif.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
