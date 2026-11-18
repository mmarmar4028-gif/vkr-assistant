import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Помощник по ВКР — ВШБ МГУ",
  description:
    "Сроки, план-график, чек-листы требований, список литературы, ссылки, нумерация рисунков и таблиц, шаблон Word для ВКР бакалавра ВШБ МГУ по Программе ГИА 2026-2027.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${golos.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
