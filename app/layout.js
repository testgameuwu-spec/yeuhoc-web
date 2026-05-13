import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.yeuhoc.site"),
  title: "YeuHoc",
  description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
  keywords: ["trắc nghiệm", "luyện thi", "THPT", "HSA", "TSA", "toán", "yeuhoc"],
  openGraph: {
    title: "YeuHoc",
    description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
    siteName: "YeuHoc",
    locale: "vi_VN",
    type: "website",
    url: "https://www.yeuhoc.site",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "YeuHoc Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YeuHoc",
    description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="antialiased bg-gray-100 text-gray-900 min-h-screen font-sans" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
