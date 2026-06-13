import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DATUM — Client Portal",
  description: "View your 3D interior scans, tours, and deliverables.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
