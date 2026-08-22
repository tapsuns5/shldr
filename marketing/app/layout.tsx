import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shldr | Travel Organizer",
  description:
    "Organize your trips, import reservations from email, and keep all your travel docs in one place.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
  openGraph: {
    title: "Shldr | Travel Organizer",
    description:
      "Organize your trips, import reservations from email, and keep all your travel docs in one place.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}
