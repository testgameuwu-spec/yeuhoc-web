import "./globals.css";

export const metadata = {
  title: "YeuHoc - Luyện thi trắc nghiệm online",
  description: "Kho đề thi THPT QG, HSA, TSA — luyện tập với chấm điểm tự động và hỗ trợ LaTeX",
  keywords: ["trắc nghiệm", "luyện thi", "THPT", "HSA", "TSA", "toán", "yeuhoc"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-gray-100 text-gray-900 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
