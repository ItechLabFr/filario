import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Filario",
    template: "%s · Filario"
  },
  description: "Gestion moderne et auto-hébergeable de vos filaments d'impression 3D.",
  icons: {
    icon: "/brand/filario-mark.svg"
  }
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
