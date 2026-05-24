import { useState, useCallback, useRef, useEffect } from "react";
import { useBrowseNames } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
  Search, Globe, Users, Calendar, LayoutGrid,
  List, RotateCcw, TrendingUp, ChevronDown, X,
} from "lucide-react";
import { CountryPicker, ALL_COUNTRIES } from "@/components/country-picker";

const CURRENT_YEAR = new Date().getFullYear();

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrowseItem {
  name: string;
  count: number;
  countries: number;
  origin?: string | null;
  meaning?: string | null;
  gender?: string | null;
  changePercent?: number | null;
  sparkline?: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "popular",   label: "Popularidade" },
  { value: "trending",  label: "Em ascensão"  },
  { value: "declining", label: "Em declínio"  },
  { value: "rare",      label: "Mais raros"   },
  { value: "longest",   label: "Mais longos"  },
  { value: "shortest",  label: "Mais curtos"  },
] as const;
type SortValue = typeof SORT_OPTIONS[number]["value"];

const ERA_PRESETS = [
  { label: "Antes de 1950",   from: null,  to: 1950  },
  { label: "1950–1970",       from: 1950,  to: 1970  },
  { label: "1970–1990",       from: 1970,  to: 1990  },
  { label: "1990–2000",       from: 1990,  to: 2000  },
  { label: "2000–2010",       from: 2000,  to: 2010  },
  { label: "A partir de 2010", from: 2010, to: null  },
] as const;

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ data, rising, uid }: { data: number[]; rising: boolean; uid: string }) {
  if (!data || data.length < 2) return <div className="h-11" />;
  const W = 200, H = 44;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const poly = pts.join(" ");
  const fill = `0,${H} ${poly} ${W},${H}`;
  const stroke = rising ? "#22c55e" : "#ef4444";
  const gradId = `sg-${uid}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-11" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${gradId})`} />
      <polyline points={poly} fill="none" stroke={stroke} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Name card ────────────────────────────────────────────────────────────────

interface NameCardProps {
  name: string;
  count: number;
  countries: number;
  sort: SortValue;
  changePercent?: number | null;
  sparkline?: number[];
  cardIndex: number;
}

function NameCard({ name, count, countries, sort, changePercent, sparkline, cardIndex }: NameCardProps) {
  const rising   = sort === "declining" ? false : sort === "trending" ? true : (changePercent ?? 0) >= 0;
  const showPct  = changePercent != null;
  const trendCls = rising ? "text-emerald-400" : "text-red-400";
  const TIcon    = rising ? ArrowUpRight : ArrowDownRight;

  return (
    <Link href={`/nome/${name}`}
      className="border border-border bg-card flex flex-col gap-3 p-4 hover:border-accent/70 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xl font-bold uppercase tracking-tighter group-hover:text-accent transition-colors leading-none">
            {name}
          </span>
        </div>
        {showPct && (
          <div className="text-right shrink-0">
            <div className={`flex items-center gap-0.5 justify-end font-bold text-sm ${trendCls}`}>
              <TIcon className="w-3.5 h-3.5" />
              {rising ? "+" : ""}{Math.abs(changePercent!).toFixed(0)}%
            </div>
            <div className="font-mono text-[9px] text-muted-foreground whitespace-nowrap mt-0.5">
              variação histórica
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Users className="w-3 h-3 shrink-0" />
          {count >= 1_000_000
            ? `${(count / 1_000_000).toFixed(1)}M registros`
            : `${count.toLocaleString("pt-BR")} registros`}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Globe className="w-3 h-3 shrink-0" />
          {countries} {countries === 1 ? "país" : "países"}
        </div>
      </div>

      <div className="-mx-0.5 mt-auto">
        <Sparkline data={sparkline ?? []} rising={rising} uid={`card-${cardIndex}`} />
      </div>
    </Link>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

interface DropdownProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}

function Dropdown({ icon: Icon, label, active, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 border font-mono text-xs uppercase tracking-wide transition-colors whitespace-nowrap ${
          active
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-card text-foreground hover:border-accent/50"
        }`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 ml-0.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-card border border-border z-30 min-w-[180px] shadow-xl">
          <div onClick={() => setOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Explore() {
  const [, setLocation]         = useLocation();
  const [sort, setSort]         = useState<SortValue>("popular");
  const [country, setCountry]   = useState<string | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo]     = useState<number | null>(null);
  const [page, setPage]         = useState(1);
  const [grid, setGrid]         = useState(true);
  const [searchQ, setSearchQ]   = useState("");
  const [eraOpen, setEraOpen]   = useState(false);

  const reset = useCallback(() => setPage(1), []);

  const { data, isLoading } = useBrowseNames(
    {
      sort, page, limit: grid ? 20 : 30,
      ...(country  ? { country }  : {}),
      ...(yearFrom ? { yearFrom } : {}),
      ...(yearTo   ? { yearTo }   : {}),
    },
    {}
  );

  function changeSort(v: SortValue)        { setSort(v);       reset(); }
  function changeCountry(v: string | null) { setCountry(v);    reset(); }
  function applyPreset(from: number | null, to: number | null) {
    setYearFrom(from); setYearTo(to); setEraOpen(false); reset();
  }
  function clearEra() { setYearFrom(null); setYearTo(null); reset(); }
  function clearAll()  { setCountry(null); setYearFrom(null); setYearTo(null); setSort("popular"); reset(); }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) setLocation(`/buscar?q=${encodeURIComponent(searchQ.trim())}`);
  }

  const isTrend      = sort === "trending" || sort === "declining";
  const sortLabel    = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Popularidade";
  const countryLabel = country ? ALL_COUNTRIES.find(c => c.code === country)?.name : null;
  const eraActive = !!(yearFrom || yearTo);
  const eraLabel  = !eraActive
    ? "Qualquer período"
    : yearFrom && yearTo
      ? `${yearFrom} – ${yearTo}`
      : yearTo
        ? `Antes de ${yearTo}`
        : `A partir de ${yearFrom}`;
  const hasFilters   = !!(country || eraActive || sort !== "popular");

  return (
    <div className="flex-1 flex flex-col">

      {/* ── Header ── */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 pt-8 pb-6">
          <h1 className="text-5xl font-bold tracking-tighter uppercase mb-1">Índice</h1>
          <p className="text-muted-foreground text-sm">
            Explore os nomes, descubra padrões e acompanhe tendências na nomenclatura humana.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col container mx-auto px-4 py-5 gap-4">

        {/* ── Search ── */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 border border-border bg-card px-4 py-2.5 focus-within:border-accent/60 transition-colors">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar nome..."
              className="bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
            />
            {searchQ && (
              <button type="button" onClick={() => setSearchQ("")}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="submit"
            className="px-4 py-2.5 border border-border bg-card font-mono text-xs uppercase tracking-wide hover:border-accent/50 transition-colors hidden sm:block">
            Buscar
          </button>
        </form>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap gap-2">

          {/* Sort */}
          <Dropdown icon={TrendingUp} label={sortLabel} active={sort !== "popular"}>
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => changeSort(o.value)}
                className={`w-full text-left px-4 py-2.5 font-mono text-xs uppercase tracking-wide hover:bg-muted transition-colors ${
                  o.value === sort ? "text-accent" : "text-muted-foreground"
                }`}>
                {o.label}
              </button>
            ))}
          </Dropdown>

          {/* Country — uses its own built-in dropdown */}
          <CountryPicker value={country} onChange={v => changeCountry(v)} />

          {/* Período / Year range */}
          <div className="relative">
            <button
              onClick={() => setEraOpen(o => !o)}
              className={`flex items-center gap-2 px-3 py-2 border font-mono text-xs uppercase tracking-wide transition-colors ${
                eraActive
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {eraLabel}
              {eraActive
                ? <X className="w-3 h-3 ml-1" onClick={e => { e.stopPropagation(); clearEra(); }} />
                : <ChevronDown className="w-3 h-3 ml-1" />
              }
            </button>

            {eraOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[240px] border border-border bg-card shadow-lg">
                {/* Presets */}
                <div className="px-3 pt-3 pb-2">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider mb-2">
                    Período predefinido
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => applyPreset(null, null)}
                      className={`px-2.5 py-1 border font-mono text-[10px] uppercase tracking-wide transition-colors ${
                        !yearFrom && !yearTo
                          ? "border-accent text-accent bg-accent/10"
                          : "border-border text-muted-foreground hover:border-accent/40"
                      }`}
                    >
                      Todos
                    </button>
                    {ERA_PRESETS.map(p => {
                      const active = yearFrom === p.from && yearTo === p.to;
                      return (
                        <button key={p.label}
                          onClick={() => applyPreset(p.from as number | null, p.to as number | null)}
                          className={`px-2.5 py-1 border font-mono text-[10px] uppercase tracking-wide transition-colors ${
                            active
                              ? "border-accent text-accent bg-accent/10"
                              : "border-border text-muted-foreground hover:border-accent/40"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Custom range */}
                <div className="border-t border-border px-3 py-3">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider mb-2">
                    Intervalo personalizado
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="De"
                      min={1900} max={CURRENT_YEAR}
                      value={yearFrom ?? ""}
                      onChange={e => { const v = e.target.value ? Number(e.target.value) : null; setYearFrom(v); reset(); }}
                      className="w-20 px-2 py-1.5 border border-border bg-background font-mono text-xs text-center focus:border-accent/60 outline-none"
                    />
                    <span className="font-mono text-xs text-muted-foreground">–</span>
                    <input
                      type="number"
                      placeholder="Até"
                      min={1900} max={CURRENT_YEAR}
                      value={yearTo ?? ""}
                      onChange={e => { const v = e.target.value ? Number(e.target.value) : null; setYearTo(v); reset(); }}
                      className="w-20 px-2 py-1.5 border border-border bg-background font-mono text-xs text-center focus:border-accent/60 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Trend status bar (only for trending/declining) ── */}
        {isTrend && (
          <div className="border border-border bg-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 shrink-0">
              <TrendingUp className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="font-bold text-sm leading-none">
                  {sort === "trending" ? "Tendência de crescimento" : "Tendência de declínio"}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  comparada ao período anterior
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 px-3 py-1.5 border border-accent/40 bg-accent/5 text-accent font-mono text-xs uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5 mr-1 shrink-0" />
              {eraActive ? eraLabel : "Todos os tempos"}
            </div>

            <div className="flex items-center gap-4 ml-auto flex-wrap">
              <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Em ascensão
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <ArrowDownRight className="w-3.5 h-3.5 text-red-400" /> Em declínio
              </span>
            </div>
          </div>
        )}

        {/* ── Results bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            {!isLoading && data ? (
              <>
                <p className="text-xl font-bold uppercase tracking-tight">
                  {data.total.toLocaleString("pt-BR")} nomes encontrados
                </p>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {[
                    countryLabel ?? "Todos os países",
                    eraActive ? eraLabel : "Todos os tempos",
                    sortLabel,
                  ].join(" · ")}
                </p>
              </>
            ) : (
              <Skeleton className="h-7 w-48" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasFilters && (
              <button onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:border-accent/50 font-mono text-xs uppercase tracking-wide transition-colors">
                <RotateCcw className="w-3 h-3" /> Limpar
              </button>
            )}
            <button onClick={() => setGrid(true)}
              className={`p-2 border transition-colors ${grid ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setGrid(false)}
              className={`p-2 border transition-colors ${!grid ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Cards grid ── */}
        {grid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
            {isLoading
              ? Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-44" />)
              : (data?.items as BrowseItem[] ?? []).map((item, idx) => (
                <NameCard
                  key={item.name}
                  name={item.name}
                  count={item.count}
                  countries={item.countries}
                  sort={sort}
                  changePercent={item.changePercent}
                  sparkline={item.sparkline}
                  cardIndex={idx}
                />
              ))
            }
            {!isLoading && data?.items.length === 0 && (
              <div className="col-span-full py-20 text-center font-mono text-muted-foreground uppercase">
                Nenhum nome encontrado com esses filtros.
              </div>
            )}
          </div>
        ) : (
          /* ── List view ── */
          <div className="border border-border divide-y divide-border pb-4">
            {isLoading
              ? Array(30).fill(0).map((_, i) => <Skeleton key={i} className="h-12 mx-4 my-2" />)
              : (data?.items as BrowseItem[] ?? []).map((item: BrowseItem, idx: number) => {
                const cp      = item.changePercent ?? null;
                const rising  = sort === "declining" ? false : sort === "trending" ? true : (cp ?? 0) >= 0;
                const trendCls = rising ? "text-emerald-400" : "text-red-400";
                const TIcon   = rising ? ArrowUpRight : ArrowDownRight;
                return (
                  <Link key={item.name} href={`/nome/${item.name}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group">
                    <span className="text-base font-bold uppercase tracking-tight w-36 shrink-0 group-hover:text-accent transition-colors truncate">
                      {item.name}
                    </span>
                    {cp != null && (
                      <span className={`flex items-center gap-0.5 font-bold text-sm ${trendCls} w-20 shrink-0`}>
                        <TIcon className="w-3.5 h-3.5" />
                        {rising ? "+" : ""}{Math.abs(cp).toFixed(0)}%
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground w-36 shrink-0">
                      <Users className="w-3 h-3 shrink-0" />
                      {item.count >= 1_000_000
                        ? `${(item.count / 1_000_000).toFixed(1)}M`
                        : item.count.toLocaleString("pt-BR")}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground w-24 shrink-0">
                      <Globe className="w-3 h-3 shrink-0" />
                      {item.countries} {item.countries === 1 ? "país" : "países"}
                    </span>
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <Sparkline data={item.sparkline ?? []} rising={rising} uid={`list-${idx}`} />
                    </div>
                  </Link>
                );
              })
            }
            {!isLoading && data?.items.length === 0 && (
              <div className="py-20 text-center font-mono text-muted-foreground uppercase">
                Nenhum nome encontrado com esses filtros.
              </div>
            )}
          </div>
        )}

        {/* ── Pagination ── */}
        {data && data.total > (grid ? 20 : 30) && (
          <div className="flex items-center justify-center gap-4 font-mono text-sm pb-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 border border-border hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" /> ANTERIOR
            </button>
            <span className="text-muted-foreground">
              Pág. {page} de {Math.ceil(data.total / (grid ? 20 : 30))}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={!data.hasMore}
              className="flex items-center gap-1 px-4 py-2 border border-border hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              PRÓXIMA <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
