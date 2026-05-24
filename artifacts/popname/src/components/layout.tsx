import { Link, useLocation } from "wouter";
import { Search } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navLinks = [
    { href: "/", label: "INÍCIO" },
    { href: "/explorar", label: "ÍNDICE" },
    { href: "/tendencias", label: "TENDÊNCIAS" },
    { href: "/paises", label: "PAÍSES" },
    { href: "/criar", label: "CRIAR" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono uppercase tracking-tight selection:bg-accent selection:text-white">
      <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tighter">
              POPNAME
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              {navLinks.map(link => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`hover:text-foreground transition-colors ${location === link.href ? 'text-foreground' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/reivindicar" className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 items-center justify-center font-bold text-sm">
              REIVINDICAR NOME
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
          <div>© {new Date().getFullYear()} POPNAME. O índice da civilização.</div>
          <div className="flex gap-6">
            <Link href="/sobre" className="hover:text-foreground">Sobre</Link>
            <Link href="/api" className="hover:text-foreground">API</Link>
            <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
