import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desire Line Mapper",
  description: "GIS web app for visualizing origin–destination desire lines",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
