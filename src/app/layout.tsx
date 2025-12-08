import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";

// https://fonts.google.com/specimen/Roboto
// 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold), 900 (Black)
const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UN Budget Explorer",
  description: "Explore the United Nations programme budget",
  openGraph: {
    title: "UN Budget Explorer",
    description: "Explore the United Nations programme budget",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#009edb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.className} antialiased`}>
      <body className="flex min-h-screen flex-col">
        {children}
        <Footer />
        <GoogleAnalytics gaId="G-XYZ" />
      </body>
    </html>
  );
}
