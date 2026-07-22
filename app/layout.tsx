import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AuthButtons } from "@/components/AuthButtons";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Litmus — Research Paper Triage",
  description:
    "Litmus-test papers against your research question. Get a relevance score, red flags, and a read/skim/skip verdict.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <div className="site-shell">
          <header className="site-header">
            <Link href="/" className="brand-mark">
              Lit<span>mus</span>
            </Link>
            <nav className="nav-links">
              {session?.user ? (
                <Link href="/dashboard">Dashboard</Link>
              ) : null}
              <AuthButtons
                signedIn={Boolean(session?.user)}
                name={session?.user?.name}
              />
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
