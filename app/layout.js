import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://yeuhoc.site"),
  title: "YeuHoc",
  description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
  keywords: ["trắc nghiệm", "luyện thi", "THPT", "HSA", "TSA", "toán", "yeuhoc"],
  openGraph: {
    title: "YeuHoc",
    description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
    siteName: "YeuHoc",
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YeuHoc",
    description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-gray-100 text-gray-900 min-h-screen font-sans" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
