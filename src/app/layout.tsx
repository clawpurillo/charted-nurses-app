import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const siteMetadata: Omit<Metadata, "openGraph" | "twitter"> = {
  title: "Charted — Voice-First FDAR Nursing Charting",
  description:
    "Log nursing actions in seconds. Room-based, HIPAA-safe, no PHI stored. Built for Filipino nurses.",
};

export function generateMetadata(): Metadata {
  const imageUrl = `${APP_URL}/logo.png`;

  return {
    ...siteMetadata,
    openGraph: {
      title: siteMetadata.title!,
      description: siteMetadata.description!,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Charted — Voice-First FDAR Nursing Charting",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteMetadata.title!,
      description: siteMetadata.description!,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}