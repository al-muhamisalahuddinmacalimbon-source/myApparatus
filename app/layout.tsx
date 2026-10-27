import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { StudentProvider } from "../components/StudentProvider";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "myApparatus",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-page text-ink font-sans">
        <StudentProvider>{children}</StudentProvider>
      </body>
    </html>
  );
}
