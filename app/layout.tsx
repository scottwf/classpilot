import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClassPilot",
  description: "A personal AI-assisted teacher plan book for units, lessons, and curriculum outcomes.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ClassPilot",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
