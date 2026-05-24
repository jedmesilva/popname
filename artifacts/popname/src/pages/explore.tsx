import { useState, useCallback } from "react";
import {
  useGetNamesByDecade, getGetNamesByDecadeQueryKey,
  useBrowseNames,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Flags from "country-flag-icons/react/3x2";
import { CountryPicker, ALL_COUNTRIES } from "@/components/country-picker";

// ─── Constants ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "popular",  label: "Mais populares" },
  { value: "rare",     label: "Mais raros" },
  { value: "longest",  label: "Mais longos" },
  { value: "shortest", label: "Mais curtos" },
  { value: "trending", label: "Em ascensão" },
  { value: "declining",label: "Em declínio" },
] as const;

type SortValue = typeof SORT_OPTIONS[number]["value"];

const GENERATIONS = [
  { key: "boomer",     label: "Baby Boomer", years: "1946 – 1964", color: "border-amber-500",    accent: "text-amber-500" },
  { key: "genx",       label: "Geração X",   years: "1965 – 1980", color: "border-emerald-500",  accent: "text-emerald-500" },
  { key: "millennial", label: "Millennial",  years: "1981 – 1996", color: "border-violet-500",   accent: "text-violet-500" },
  { key: "genz",       label: "Geração Z",   years: "1997 – 2012", color: "border-sky-500",      accent: "text-sky-500" },
  { key: "alpha",      label: "Geração Alpha","years": "2013+",    color: "border-pink-500",     accent: "text-pink-500" },
] as const;

type GenerationKey = typeof GENERATIONS[number]["key"];


const TABS = ["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as const;
type Tab = typeof TABS[number];

// ─── Flag helper ─────────────────────────────────────────────────────────────

function CountryFlag({ code, className }: { code: string; className?: string }) {
  const Flag = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[code];
  if (!Flag) return null;
  return <Flag className={className} />;
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function Explore() {
  const [tab, setTab] = useState<Tab>("NAVEGAR");

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-2">
            Índice
          </h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            Mergulhe nos dados. Filtre, ordene e descubra padrões na nomenclatura humana.
          </p>
        </div>
        {/* Tabs */}
        <div className="container mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 whitespace-nowrap transition-colors ${
                tab === t
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
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

// ─── Browse Tab ───────────────────────────────────────────────────────────────

function BrowseTab() {
  const [sort, setSort]           = useState<SortValue>("popular");
  const [country, setCountry]     = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationKey | null>(null);
  const [page, setPage]           = useState(1);

  const reset = useCallback(() => setPage(1), []);

  const { data, isLoading } = useBrowseNames(
    {
      sort,
      page,
      limit: 24,
      ...(country    ? { country }    : {}),
      ...(generation ? { generation } : {}),
    },
    {}
  );

  function changeSort(v: SortValue)        { setSort(v); reset(); }
  function changeCountry(v: string | null) { setCountry(v); reset(); }
  function changeGeneration(v: GenerationKey | null) { setGeneration(v); reset(); }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Sort */}
        <div className="flex flex-wrap gap-1">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => changeSort(o.value)}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
                sort === o.value
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border hover:border-accent/50 text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px bg-border self-stretch hidden sm:block" />

        {/* Country */}
        <CountryPicker value={country} onChange={(v) => changeCountry(v)} />

        {/* Divider */}
        <div className="w-px bg-border self-stretch hidden sm:block" />

        {/* Generation */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => changeGeneration(null)}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
              !generation ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent/50 text-muted-foreground"
            }`}
          >
            Todas as gerações
          </button>
          {GENERATIONS.map((g) => (
            <button
              key={g.key}
              onClick={() => changeGeneration(generation === g.key ? null : g.key)}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
                generation === g.key
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border hover:border-accent/50 text-muted-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results info */}
      {!isLoading && data && (
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-6">
          {data.total.toLocaleString("pt-BR")} nomes encontrados
          {country && ` · ${ALL_COUNTRIES.find(c => c.code === country)?.name}`}
          {generation && ` · ${GENERATIONS.find(g => g.key === generation)?.label}`}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {isLoading
          ? Array(24).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)
          : data?.items.map((item, idx) => (
            <Link
              key={item.name}
              href={`/nome/${item.name}`}
              className="border border-border p-3 hover:border-accent transition-colors bg-card group flex flex-col"
            >
              <div className="font-mono text-xs text-muted-foreground mb-1">
                #{((page - 1) * 24) + idx + 1}
              </div>
              <div className="font-bold uppercase group-hover:text-accent transition-colors truncate text-sm" title={item.name}>
                {item.name}
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-auto pt-2">
                {item.count >= 1_000_000
                  ? `${(item.count / 1_000_000).toFixed(1)}M`
                  : item.count.toLocaleString("pt-BR")}
              </div>
            </Link>
          ))
        }
        {!isLoading && data?.items.length === 0 && (
          <div className="col-span-full py-20 text-center font-mono text-muted-foreground uppercase">
            Nenhum nome encontrado com esses filtros.
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > 24 && (
        <div className="flex items-center justify-center gap-4 font-mono text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 border border-border hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> ANTERIOR
          </button>
          <span className="text-muted-foreground">
            Pág. {page} de {Math.ceil(data.total / 24)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.hasMore}
            className="flex items-center gap-1 px-4 py-2 border border-border hover:border-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
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
    <div className={`border ${gen.color} border-2 p-6 flex flex-col gap-4`}>
      <div>
        <h3 className={`text-2xl font-bold uppercase tracking-tighter ${gen.accent}`}>
          {gen.label}
        </h3>
        <p className="font-mono text-xs text-muted-foreground mt-1">{gen.years}</p>
      </div>

      <div className="flex flex-wrap gap-2 flex-1">
        {isLoading
          ? Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-20" />)
          : data?.items.length === 0
          ? <p className="text-xs font-mono text-muted-foreground">Sem dados disponíveis</p>
          : data?.items.map((n) => (
            <Link
              key={n.name}
              href={`/nome/${n.name}`}
              className={`px-2 py-1 font-mono text-xs uppercase border border-current/20 hover:bg-current/10 transition-colors ${gen.accent}`}
            >
              {n.name}
            </Link>
          ))
        }
      </div>

      <Link
        href={`/explorar`}
        className={`font-mono text-xs uppercase tracking-widest ${gen.accent} hover:underline flex items-center gap-1 mt-auto`}
      >
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
        {GENERATIONS.map((g) => (
          <GenerationCard key={g.key} gen={g} />
        ))}
      </div>
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab() {
  const { data: decades, isLoading } = useGetNamesByDecade({
    query: { queryKey: getGetNamesByDecadeQueryKey() }
  });

  const DECADE_LABELS: Record<number, string> = {
    1950: "Anos 50",
    1960: "Anos 60",
    1970: "Anos 70",
    1980: "Anos 80",
    1990: "Anos 90",
    2000: "Anos 2000",
    2010: "Anos 2010",
    2020: "Anos 2020",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Os nomes que marcaram cada década.
      </p>
      <div className="space-y-3">
        {isLoading
          ? Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          : decades?.map((d) => (
            <div
              key={d.decade}
              className={`border p-5 transition-colors flex gap-6 items-start ${
                d.decade >= 2020 ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}
            >
              <div className="shrink-0">
                <div className={`text-3xl font-bold font-mono w-24 ${d.decade >= 2020 ? "text-accent" : ""}`}>
                  {d.decade}s
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  {DECADE_LABELS[d.decade] ?? `${d.decade}s`}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {d.names.map((name, i) => (
                  <Link
                    key={name}
                    href={`/nome/${name}`}
                    className={`font-mono text-sm uppercase px-3 py-1.5 border transition-colors hover:border-accent hover:text-accent ${
                      i === 0 ? "border-accent/50 text-foreground font-bold" : "border-border text-muted-foreground"
                    }`}
                  >
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

