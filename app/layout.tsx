import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carina Donaire | Pintora en Mendoza y retratos por encargo",
  description:
    "Obras originales, pintura figurativa, naturaleza y retratos por encargo de Carina Donaire en Mendoza, Argentina.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
