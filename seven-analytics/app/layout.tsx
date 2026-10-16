import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Seven Analytics",
  description: "Centro analítico de Seven Suite",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-neutral-200 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
