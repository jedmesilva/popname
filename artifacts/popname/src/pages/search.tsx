import { useLocation } from "wouter";
import { useSearchNames } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Search, Globe, Users, ArrowLeft, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

function getQueryFromURL(): string {
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export function SearchResults() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const [activeQ, setActiveQ] = useState<string>(getQueryFromURL);
  const [inputQ, setInputQ] = useState<string>(getQueryFromURL);

  useEffect(() => {
    function onPopState() {
      const q = getQueryFromURL();
      setActiveQ(q);
      setInputQ(q);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const { data, isLoading } = useSearchNames(
    { q: activeQ, limit: 50 },
    { query: { enabled: activeQ.trim().length > 0 } }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = inputQ.trim();
    if (!q) return;
    window.history.pushState({}, "", `/search?q=${encodeURIComponent(q)}`);
    setActiveQ(q);
  }

  function clearSearch() {
    setInputQ("");
    setActiveQ("");
    window.history.pushState({}, "", "/search");
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 pt-8 pb-6">
          <button
            onClick={() => setLocation("/explore")}
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t("search.backToIndex")}
          </button>
          <h1 className="text-5xl font-bold tracking-tighter uppercase mb-1">{t("search.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("search.subtitle")}</p>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-5 flex flex-col gap-6">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 border border-border bg-card px-4 py-2.5 focus-within:border-accent/60 transition-colors">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              placeholder={t("search.placeholder")}
              className="bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
            {inputQ && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 border border-border bg-card font-mono text-xs uppercase tracking-wide hover:border-accent/50 transition-colors"
          >
            {t("search.btn")}
          </button>
        </form>

        {/* Empty state */}
        {!activeQ.trim() && (
          <div className="py-20 text-center font-mono text-muted-foreground uppercase text-sm">
            {t("search.empty")}
          </div>
        )}

        {/* Loading */}
        {activeQ.trim() && isLoading && (
          <div className="flex flex-col gap-3">
            {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        )}

        {/* Results */}
        {activeQ.trim() && !isLoading && data && data.length > 0 && (
          <>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">
              {t("search.results", { count: data.length, query: activeQ })}
            </p>
            <div className="border border-border divide-y divide-border">
              {data.map((item) => (
                <Link
                  key={item.name}
                  href={`/name/${item.name}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-lg font-bold uppercase tracking-tight group-hover:text-accent transition-colors">
                      {item.name}
                    </span>
                    {(item.origin || item.meaning) && (
                      <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                        {[item.origin, item.meaning].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Users className="w-3 h-3 shrink-0" />
                      {item.count >= 1_000_000
                        ? `${(item.count / 1_000_000).toFixed(1)}M`
                        : item.count.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Globe className="w-3 h-3 shrink-0" />
                      {t("search.country", { count: item.countries })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* No results */}
        {activeQ.trim() && !isLoading && data?.length === 0 && (
          <div className="py-20 text-center font-mono text-muted-foreground uppercase text-sm">
            {t("search.noResults", { query: activeQ })}
          </div>
        )}
      </div>
    </div>
  );
}
