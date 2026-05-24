import { useState, useCallback, useRef, useEffect } from "react";
import {
  useGetNamesByDecade, getGetNamesByDecadeQueryKey,
  useBrowseNames,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
  Search, Globe, Users, Calendar, SlidersHorizontal, LayoutGrid,
  List, RotateCcw, TrendingUp, ChevronDown, X,
} from "lucide-react";
import { CountryPicker, ALL_COUNTRIES } from "@/components/country-picker";

interface BrowseItem {
  name: string;
  count: number;
  countries: number;
  origin?: string | null;
  meaning?: string | null;
  gender?: string | null;
}
interface DecadeData { decade: number; names: string[] }

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "popular",   label: "Popularidade" },
  { value: "trending",  label: "Em ascensão"  },
  { value: "declining", label: "Em declínio"  },
  { value: "rare",      label: "Mais raros"   },
  { value: "longest",   label: "Mais longos"  },
  { value: "shortest",  label: "Mais curtos"  },
] as const;

type SortValue = typeof SORT_OPTIONS[number]["value"];

const GENERATIONS = [
  { key: "boomer",     label: "Baby Boomer",   years: "1946–1964", color: "border-amber-500",   accent: "text-amber-500"   },
  { key: "genx",       label: "Geração X",     years: "1965–1980", color: "border-emerald-500", accent: "text-emerald-500" },
  { key: "millennial", label: "Millennial",    years: "1981–1996", color: "border-violet-500",  accent: "text-violet-500"  },
  { key: "genz",       label: "Geração Z",     years: "1997–2012", color: "border-sky-500",     accent: "text-sky-500"     },
  { key: "alpha",      label: "Geração Alpha", years: "2013+",     color: "border-pink-500",    accent: "text-pink-500"    },
] as const;

type GenerationKey = typeof GENERATIONS[number]["key"];

const TABS = ["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as const;
type Tab = typeof TABS[number];

// ─── Deterministic sparkline from name string ─────────────────────────────────

function nameSeed(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function makeSparkData(name: string, rising: boolean, length = 24): number[] {
  let seed = nameSeed(name);
  const next = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const pts: number[] = [];
  let v = 40 + next() * 20;
  for (let i = 0; i < length; i++) {
    v += (next() - (rising ? 0.38 : 0.62)) * 7;
    v = Math.max(4, Math.min(96, v));
    pts.push(v);
  }
  return pts;
}

function nameTrend(name: string): number {
  const s = nameSeed(name);
  return parseFloat(((s * 32) - 16).toFixed(1));
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ name, rising }: { name: string; rising: boolean }) {
  const data = makeSparkData(name, rising);
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
  const uid = `s-${name}-${rising ? "u" : "d"}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-11" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${uid})`} />
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
  rank?: number;
  sort: SortValue;
}

function NameCard({ name, count, countries, rank, sort }: NameCardProps) {
  const trend   = nameTrend(name);
  const rising  = sort === "declining" ? false : sort === "trending" ? true : trend >= 0;
  const showTrend = sort === "trending" || sort === "declining";
  const pos     = rising;
  const trendCls = pos ? "text-emerald-400" : "text-red-400";
  const TIcon   = pos ? ArrowUpRight : ArrowDownRight;

  return (
    <Link href={`/nome/${name}`}
      className="border border-border bg-card flex flex-col gap-3 p-4 hover:border-accent/70 transition-colors group">
      {/* Name + trend */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {rank && <div className="font-mono text-[10px] text-muted-foreground mb-0.5">#{rank}</div>}
          <span className="text-xl font-bold uppercase tracking-tighter group-hover:text-accent transition-colors leading-none">
            {name}
          </span>
        </div>
        {showTrend && (
          <div className="text-right shrink-0">
            <div className={`flex items-center gap-0.5 justify-end font-bold text-sm ${trendCls}`}>
              <TIcon className="w-3.5 h-3.5" />
              {pos ? "+" : ""}{Math.abs(trend).toFixed(1)}%
            </div>
            <div className="font-mono text-[9px] text-muted-foreground whitespace-nowrap mt-0.5">
              nos últimos 30 dias
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
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

      {/* Sparkline */}
      <div className="-mx-0.5 mt-auto">
        <Sparkline name={name} rising={rising} />
      </div>
    </Link>
  );
}

// ─── Reusable dropdown ────────────────────────────────────────────────────────

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
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 border font-mono text-xs uppercase tracking-wide transition-colors whitespace-nowrap ${
          active
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border bg-card text-foreground hover:border-accent/50"
        }`}>
        <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 ml-0.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-card border border-border z-30 min-w-[180px] shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Browse Tab ───────────────────────────────────────────────────────────────

function BrowseTab() {
  const [, setLocation] = useLocation();
  const [sort, setSort]             = useState<SortValue>("popular");
  const [country, setCountry]       = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationKey | null>(null);
  const [page, setPage]             = useState(1);
  const [grid, setGrid]             = useState(true);
  const [searchQ, setSearchQ]       = useState("");
  const [extraOpen, setExtraOpen]   = useState(false);

  const reset = useCallback(() => setPage(1), []);

  const { data, isLoading } = useBrowseNames(
    { sort, page, limit: grid ? 20 : 30, ...(country ? { country } : {}), ...(generation ? { generation } : {}) },
    {}
  );

  function changeSort(v: SortValue)                  { setSort(v); reset(); }
  function changeCountry(v: string | null)           { setCountry(v); reset(); }
  function changeGeneration(v: GenerationKey | null) { setGeneration(v); reset(); }
  function clearAll()                                { setCountry(null); setGeneration(null); setSort("popular"); reset(); }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQ.trim()) setLocation(`/buscar?q=${encodeURIComponent(searchQ.trim())}`);
  }

  const activeFilters: string[] = [];
  if (country)    activeFilters.push(ALL_COUNTRIES.find(c => c.code === country)?.name ?? country);
  if (generation) activeFilters.push(GENERATIONS.find(g => g.key === generation)?.label ?? generation);

  const isTrend    = sort === "trending" || sort === "declining";
  const sortLabel  = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Popularidade";
  const genLabel   = generation ? GENERATIONS.find(g => g.key === generation)?.label : "Todas as gerações";
  const countryLabel = country ? ALL_COUNTRIES.find(c => c.code === country)?.name : "Todos os países";

  return (
    <div className="flex flex-col gap-4 container mx-auto px-4 py-5">

      {/* ── Search bar ── */}
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
            <button type="button" onClick={() => setSearchQ("")} className="text-muted-foreground hover:text-foreground transition-colors">
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
            <button key={o.value} onClick={() => { changeSort(o.value); }}
              className={`w-full text-left px-4 py-2.5 font-mono text-xs uppercase tracking-wide hover:bg-muted transition-colors ${
                o.value === sort ? "text-accent" : "text-muted-foreground"
              }`}>
              {o.label}
            </button>
          ))}
        </Dropdown>

        {/* Country */}
        <Dropdown icon={Globe} label={countryLabel ?? "Todos os países"} active={!!country}>
          <div className="w-64">
            <CountryPicker value={country} onChange={v => { changeCountry(v); }} />
          </div>
        </Dropdown>

        {/* Generation */}
        <Dropdown icon={Users} label={genLabel ?? "Todas as gerações"} active={!!generation}>
          <button onClick={() => changeGeneration(null)}
            className={`w-full text-left px-4 py-2.5 font-mono text-xs uppercase tracking-wide hover:bg-muted transition-colors ${!generation ? "text-accent" : "text-muted-foreground"}`}>
            Todas as gerações
          </button>
          {GENERATIONS.map(g => (
            <button key={g.key} onClick={() => changeGeneration(g.key)}
              className={`w-full text-left px-4 py-2.5 font-mono text-xs uppercase tracking-wide hover:bg-muted transition-colors ${generation === g.key ? "text-accent" : "text-muted-foreground"}`}>
              {g.label}
              <span className="text-muted-foreground/60 ml-1 normal-case">{g.years}</span>
            </button>
          ))}
        </Dropdown>

        {/* Extra filters toggle */}
        <button onClick={() => setExtraOpen(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 border font-mono text-xs uppercase tracking-wide transition-colors ${
            extraOpen ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground hover:border-accent/50"
          }`}>
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" /> + Filtros
        </button>
      </div>

      {/* ── Trend status bar ── */}
      {isTrend && (
        <div className="border border-border bg-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2 shrink-0">
            <TrendingUp className="w-4 h-4 text-accent shrink-0" />
            <div>
              <p className="font-bold text-sm leading-none">
                {sort === "trending" ? "Tendência de crescimento" : "Tendência de declínio"}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">comparada ao período anterior</p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 border border-accent/40 bg-accent/5 text-accent font-mono text-xs uppercase tracking-wide">
            <Calendar className="w-3.5 h-3.5 mr-1 shrink-0" />
            Últimos 30 dias
          </div>

          <div className="flex items-center gap-4 ml-auto flex-wrap">
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> Em ascensão
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-400" /> Em declínio
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span className="w-2 h-2 bg-muted-foreground inline-block" /> Estável
            </div>
            {(country || generation || isTrend) && (
              <button onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground hover:border-accent/50 font-mono text-xs uppercase tracking-wide transition-colors">
                <RotateCcw className="w-3 h-3" /> Limpar filtros
              </button>
            )}
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
                  genLabel ?? "Todas as gerações",
                  sortLabel,
                ].join(" · ")}
              </p>
            </>
          ) : (
            <Skeleton className="h-7 w-48" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {(country || generation || sort !== "popular") && (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
          {isLoading
            ? Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-44" />)
            : (data?.items as BrowseItem[] ?? []).map((item, idx) => (
              <NameCard
                key={item.name}
                name={item.name}
                count={item.count}
                countries={item.countries}
                rank={(page - 1) * 20 + idx + 1}
                sort={sort}
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
        <div className="border border-border divide-y divide-border mb-4">
          {isLoading
            ? Array(30).fill(0).map((_, i) => <Skeleton key={i} className="h-12 mx-4 my-2" />)
            : (data?.items as BrowseItem[] ?? []).map((item: BrowseItem, idx: number) => {
              const trend  = nameTrend(item.name);
              const rising = sort === "declining" ? false : sort === "trending" ? true : trend >= 0;
              const pos    = rising;
              const trendCls = pos ? "text-emerald-400" : "text-red-400";
              const TIcon  = pos ? ArrowUpRight : ArrowDownRight;
              return (
                <Link key={item.name} href={`/nome/${item.name}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group">
                  <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">
                    #{(page - 1) * 30 + idx + 1}
                  </span>
                  <span className="text-base font-bold uppercase tracking-tight w-36 shrink-0 group-hover:text-accent transition-colors truncate">
                    {item.name}
                  </span>
                  {(sort === "trending" || sort === "declining") && (
                    <span className={`flex items-center gap-0.5 font-bold text-sm ${trendCls} w-20 shrink-0`}>
                      <TIcon className="w-3.5 h-3.5" />
                      {pos ? "+" : ""}{Math.abs(trend).toFixed(1)}%
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
                    <Sparkline name={item.name} rising={rising} />
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
  );
}

// ─── Generations Tab ──────────────────────────────────────────────────────────

function GenerationCard({ gen }: { gen: typeof GENERATIONS[number] }) {
  const { data, isLoading } = useBrowseNames(
    { generation: gen.key, sort: "popular", limit: 8, page: 1 },
    { query: {} }
  );
  return (
    <div className={`border-2 ${gen.color} p-6 flex flex-col gap-4`}>
      <div>
        <h3 className={`text-2xl font-bold uppercase tracking-tighter ${gen.accent}`}>{gen.label}</h3>
        <p className="font-mono text-xs text-muted-foreground mt-1">{gen.years}</p>
      </div>
      <div className="flex flex-wrap gap-2 flex-1">
        {isLoading
          ? Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-20" />)
          : data?.items.length === 0
          ? <p className="text-xs font-mono text-muted-foreground">Sem dados disponíveis</p>
          : (data?.items as BrowseItem[] ?? []).map((n: BrowseItem) => (
            <Link key={n.name} href={`/nome/${n.name}`}
              className={`px-2 py-1 font-mono text-xs uppercase border border-current/20 hover:bg-current/10 transition-colors ${gen.accent}`}>
              {n.name}
            </Link>
          ))
        }
      </div>
      <Link href="/explorar"
        className={`font-mono text-xs uppercase tracking-widest ${gen.accent} hover:underline flex items-center gap-1 mt-auto`}>
        Ver todos <ArrowUpRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function GenerationsTab() {
  return (
    <div className="container mx-auto px-4 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Nomes que dominaram cada geração — baseado nos anos de nascimento.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {GENERATIONS.map(g => <GenerationCard key={g.key} gen={g} />)}
      </div>
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab() {
  const { data: decades, isLoading } = useGetNamesByDecade({
    query: { queryKey: getGetNamesByDecadeQueryKey() }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Os nomes que marcaram cada década.
      </p>
      <div className="space-y-3">
        {isLoading
          ? Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          : (decades as DecadeData[] ?? []).map((d: DecadeData) => (
            <div key={d.decade}
              className={`border p-5 transition-colors flex gap-6 items-start ${
                d.decade >= 2020 ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}>
              <div className="shrink-0">
                <div className={`text-3xl font-bold font-mono w-24 ${d.decade >= 2020 ? "text-accent" : ""}`}>
                  {d.decade}s
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {(d.names as string[]).map((name: string, i: number) => (
                  <Link key={name} href={`/nome/${name}`}
                    className={`font-mono text-sm uppercase px-3 py-1.5 border transition-colors hover:border-accent hover:text-accent ${
                      i === 0 ? "border-accent/50 text-foreground font-bold" : "border-border text-muted-foreground"
                    }`}>
                    {i === 0 && <span className="text-accent mr-1">#1</span>}
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Explore() {
  const [tab, setTab] = useState<Tab>("NAVEGAR");

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 pt-8 pb-5">
          <h1 className="text-5xl font-bold tracking-tighter uppercase mb-1">Índice</h1>
          <p className="text-muted-foreground text-sm">
            Explore os nomes, descubra padrões e acompanhe tendências na nomenclatura humana.
          </p>
        </div>
        {/* Tabs */}
        <div className="container mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 whitespace-nowrap transition-colors ${
                tab === t
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {tab === "NAVEGAR"        && <BrowseTab />}
        {tab === "GERAÇÕES"       && <GenerationsTab />}
        {tab === "LINHA DO TEMPO" && <TimelineTab />}
      </div>
    </div>
  );
}
