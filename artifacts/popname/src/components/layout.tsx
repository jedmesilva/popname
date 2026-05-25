import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en",    label: "English",         short: "EN" },
  { code: "pt-BR", label: "Português (BR)",  short: "BR" },
  { code: "pt",    label: "Português (PT)",  short: "PT" },
  { code: "es",    label: "Español",         short: "ES" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const navLinks = [
    { href: "/",           label: t("nav.home") },
    { href: "/index",      label: t("nav.index") },
    { href: "/tendencias", label: t("nav.trends") },
    { href: "/crescimento",label: t("nav.growth") },
  ];

  function changeLang(code: string) {
    i18n.changeLanguage(code);
    setLangOpen(false);
    setMenuOpen(false);
  }

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

          <div className="flex items-center gap-2">
            {/* Language picker */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(v => !v)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors font-mono text-xs uppercase"
                aria-label={t("lang.label")}
              >
                <Globe className="w-3.5 h-3.5" />
                {LANGUAGES.find(l => l.code === i18n.language)?.short ??
                  LANGUAGES.find(l => i18n.language.startsWith(l.code.split("-")[0]))?.short ??
                  "PT"}
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border z-50 min-w-[140px] shadow-xl">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => changeLang(lang.code)}
                      className={`w-full text-left px-4 py-2.5 font-mono text-xs uppercase tracking-wide hover:bg-muted transition-colors ${
                        i18n.language === lang.code ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/reivindicar"
              className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 items-center justify-center font-bold text-sm"
            >
              {t("nav.claim")}
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
                className="px-4 py-4 text-sm text-accent font-bold hover:bg-card transition-colors border-b border-border"
              >
                {t("nav.claim")} →
              </Link>
              {/* Language picker mobile */}
              <div className="px-4 py-3 flex gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => changeLang(lang.code)}
                    className={`font-mono text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors ${
                      i18n.language === lang.code
                        ? "border-accent text-accent bg-accent/10"
                        : "border-border text-muted-foreground hover:border-accent/40"
                    }`}
                  >
                    {lang.label.slice(0, 2)}
                  </button>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4 text-center md:text-left">
          <div>© {new Date().getFullYear()} POPNAME. {t("footer.tagline")}</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.about")}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.privacy")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
