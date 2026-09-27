import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Académie Basket",
  description: "Suivi de la progression des joueurs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
