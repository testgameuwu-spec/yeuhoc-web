import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";

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
  title: "YeuHoc",
  description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
  keywords: ["trắc nghiệm", "luyện thi", "THPT", "HSA", "TSA", "toán", "yeuhoc"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} ${outfit.variable}`}>
      <body className="antialiased bg-gray-100 text-gray-900 min-h-screen font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
