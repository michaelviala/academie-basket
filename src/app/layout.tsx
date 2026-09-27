import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Académie Basket",
  description: "Suivi de la progression des joueurs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        <meta name="theme-color" content="#0e0f12" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans" style={{ background: "#0e0f12", color: "#f4f5f7" }}>
        {children}
      </body>
    </html>
  );
}
