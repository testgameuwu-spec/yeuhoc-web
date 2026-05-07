import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese"],
  weight: ["400", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata = {
  title: "YeuHoc",
  description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và AI",
  keywords: ["trắc nghiệm", "luyện thi", "THPT", "HSA", "TSA", "toán", "yeuhoc"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="antialiased bg-gray-100 text-gray-900 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
