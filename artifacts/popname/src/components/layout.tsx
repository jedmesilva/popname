import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "INÍCIO" },
    { href: "/explorar", label: "ÍNDICE" },
    { href: "/tendencias", label: "TENDÊNCIAS" },
    { href: "/crescimento", label: "CRESCIMENTO" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono uppercase tracking-tight selection:bg-accent selection:text-white">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tighter" onClick={() => setMenuOpen(false)}>
            POPNAME
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-foreground transition-colors ${location === link.href ? "text-foreground" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/reivindicar"
              className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 items-center justify-center font-bold text-sm"
            >
              REIVINDICAR NOME
            </Link>
            {/* Hamburger */}
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-4 text-sm border-b border-border hover:bg-card transition-colors ${
                    location === link.href ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/reivindicar"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-4 text-sm text-accent font-bold hover:bg-card transition-colors"
              >
                REIVINDICAR NOME →
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4 text-center md:text-left">
          <div>© {new Date().getFullYear()} POPNAME. O índice da civilização.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Sobre</a>
            <a href="#" className="hover:text-foreground transition-colors">API</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
