import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nombre de la artista | Pintura realista y retratos",
  description:
    "Obras originales, paisajes y retratos realistas pintados a mano en Mendoza, Argentina.",
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
