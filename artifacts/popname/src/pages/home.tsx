import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import * as Flags from "country-flag-icons/react/3x2";

import {
  useGetIndexStats, getGetIndexStatsQueryKey,
  useGetTrendingNames, getGetTrendingNamesQueryKey,
  useGetDecliningNames, getGetDecliningNamesQueryKey,
  useGetFeaturedName, getGetFeaturedNameQueryKey,
  useGetNamesByDecade, getGetNamesByDecadeQueryKey,
  useGetRareNames, getGetRareNamesQueryKey,
  useGetPopularNames, getGetPopularNamesQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowUpRight, TrendingUp, Search } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina", AU: "Austrália", BR: "Brasil", CA: "Canadá",
  CL: "Chile", CN: "China", CO: "Colômbia", DE: "Alemanha",
  ES: "Espanha", FR: "França", GB: "Reino Unido", IN: "Índia",
  IT: "Itália", JP: "Japão", MX: "México", NG: "Nigéria",
  PT: "Portugal", RU: "Rússia", US: "Estados Unidos", ZA: "África do Sul",
};

export function Home() {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: loadingStats } = useGetIndexStats({
    query: { queryKey: getGetIndexStatsQueryKey() }
  });

  const { data: trending, isLoading: loadingTrending } = useGetTrendingNames(
    { period: "1y", limit: 5 },
    { query: { queryKey: getGetTrendingNamesQueryKey({ period: "1y", limit: 5 }) } }
  );

  const { data: declining, isLoading: loadingDeclining } = useGetDecliningNames(
    { period: "5y", limit: 5 },
    { query: { queryKey: getGetDecliningNamesQueryKey({ period: "5y", limit: 5 }) } }
  );

  const { data: featured } = useGetFeaturedName({
    query: { queryKey: getGetFeaturedNameQueryKey() }
  });

  const { data: decades, isLoading: loadingDecades } = useGetNamesByDecade({
    query: { queryKey: getGetNamesByDecadeQueryKey() }
  });

  const { data: rare } = useGetRareNames(
    { limit: 5 },
    { query: { queryKey: getGetRareNamesQueryKey({ limit: 5 }) } }
  );

  const { data: popular } = useGetPopularNames(
    { limit: 6 },
    { query: { queryKey: getGetPopularNamesQueryKey({ limit: 6 }) } }
  );

  const { data: namesByCountry, isLoading: loadingByCountry } = useQuery<{ name: string; country: string }[]>({
    queryKey: ["names-by-country"],
    queryFn: () => fetch("/api/names/by-country").then((r) => r.json()),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setLocation(`/nome/${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="py-16 md:py-32 border-b border-border overflow-hidden">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4 md:mb-6">
            Human Name Index
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-4 md:mb-6 leading-tight">
            O ÍNDICE DE NOMES DA{" "}
            <span className="text-muted-foreground">CIVILIZAÇÃO HUMANA.</span>
          </h1>
          <p className="text-muted-foreground font-mono text-xs md:text-sm mb-8 md:mb-12">
            Dados reais. Tendências globais. A história do seu nome, revelada.
          </p>

          <div className="my-8 md:my-10">
            {loadingStats ? (
              <Skeleton className="h-20 w-64 mx-auto" />
            ) : (
              <div
                className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-accent tabular-nums leading-none"
                data-testid="stat-total-names"
              >
                {(stats?.totalNamesIndexed ?? 4381229047).toLocaleString("pt-BR")}
              </div>
            )}
            <div className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4 uppercase tracking-widest font-mono">
              Nomes indexados
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-8 justify-center mb-8 md:mb-12 text-xs md:text-sm font-mono text-muted-foreground max-w-sm md:max-w-none mx-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-foreground font-bold">
                {stats?.countriesCovered ?? 195}
              </span>
              <span>PAÍSES</span>
            </div>
            <span className="hidden md:block w-px h-4 bg-border" />
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-foreground font-bold">
                {stats?.peopleAnalyzed != null
                  ? stats.peopleAnalyzed >= 1_000_000_000
                    ? `${(stats.peopleAnalyzed / 1_000_000_000).toFixed(1)}B+`
                    : stats.peopleAnalyzed >= 1_000_000
                    ? `${(stats.peopleAnalyzed / 1_000_000).toFixed(1)}M+`
                    : stats.peopleAnalyzed.toLocaleString("pt-BR")
                  : "—"}
              </span>
              <span>PESSOAS</span>
            </div>
            <span className="hidden md:block w-px h-4 bg-border" />
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className="text-accent font-bold">
                +{(stats?.dailyGrowth ?? 12481).toLocaleString("pt-BR")}
              </span>
              <span>HOJE</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-0">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Digite um nome..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="input-search-name"
                className="w-full h-12 md:h-14 bg-transparent border border-border pl-12 pr-4 outline-none focus:border-accent transition-all font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              data-testid="button-search"
              className="h-12 md:h-14 px-5 md:px-8 bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors uppercase tracking-widest font-mono text-xs md:text-sm"
            >
              Buscar
            </button>
          </form>

          {/* Popular now chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <span className="text-xs text-muted-foreground font-mono uppercase mr-2 leading-7">
              Populares:
            </span>
            {(popular ?? []).map((n) => (
              <Link
                key={n.name}
                href={`/nome/${n.name}`}
                data-testid={`chip-name-${n.name}`}
                className="text-xs font-mono uppercase px-3 py-1 border border-border hover:border-accent hover:text-accent transition-colors"
              >
                {n.name} <ArrowUpRight className="inline w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured name */}
      {featured && (
        <section className="py-16 border-b border-border bg-card">
          <div className="container mx-auto px-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Nome mais popular do mundo
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2
                  className="text-6xl md:text-8xl font-bold tracking-tighter mb-4"
                  data-testid="text-featured-name"
                >
                  {featured.name?.toUpperCase()}
                </h2>
                <div className="flex items-center gap-6 text-muted-foreground font-mono text-sm mb-4">
                  <span>{(featured.count).toLocaleString("pt-BR")} pessoas</span>
                  <span>{featured.countries} países</span>
                  {featured.changePercent !== null && (
                    <span className="text-accent">
                      +{featured.changePercent}% (5 anos)
                    </span>
                  )}
                </div>
                <Link
                  href={`/nome/${featured.name}`}
                  data-testid="link-featured-detail"
                  className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-widest border border-border px-4 py-2 hover:border-accent hover:text-accent transition-colors"
                >
                  Ver detalhes <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
                  Top países
                </p>
                <div className="space-y-3">
                  {featured.topCountries?.slice(0, 5).map((c) => {
                    const FlagComponent = (Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[c.countryCode ?? ""];
                    const countryName = COUNTRY_NAMES[c.countryCode ?? ""] ?? c.country;
                    return (
                      <div key={c.countryCode} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-36 shrink-0">
                          {FlagComponent && <FlagComponent className="w-5 h-auto rounded-sm shrink-0" />}
                          <span className="font-mono text-sm truncate">{countryName}</span>
                        </div>
                        <div className="flex-1 h-1 bg-border rounded-full">
                          <div
                            className="h-1 bg-accent rounded-full"
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                        <div className="font-mono text-sm text-muted-foreground w-10 text-right">
                          {c.percentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trending */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-accent" />
                Nomes em Ascensão
              </h2>
              <p className="text-muted-foreground text-sm font-mono mt-1">
                Últimos 12 meses
              </p>
            </div>
            <Link
              href="/tendencias"
              className="text-xs font-mono uppercase tracking-widest text-accent hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {loadingTrending
              ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : Array.isArray(trending) && trending.map((item, idx) => (
                <TrendRowSmall
                  key={item.name}
                  name={item.name}
                  rank={idx + 1}
                  change={item.changePercent}
                  sparkline={item.sparkline ?? []}
                  rising
                />
              ))}
          </div>
        </div>
      </section>

      {/* Explore section */}
      <section className="py-16 border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-2">Explorar</h2>
          <p className="text-muted-foreground text-sm font-mono mb-12">
            Descubra tendências, origens e histórias por trás dos nomes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* By decade */}
            <div className="border border-border p-6 flex flex-col">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
                Nomes mais populares por década
              </p>
              <div className="space-y-2 flex-1">
                {loadingDecades
                  ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
                  : decades?.slice(-6).map((d) => (
                    <div
                      key={d.decade}
                      className={`flex items-center gap-3 font-mono text-sm ${
                        d.decade >= 2020 ? "bg-accent text-black px-2 py-1 font-bold" : ""
                      }`}
                    >
                      <span className="text-muted-foreground w-10">{d.decade}s</span>
                      <span className="uppercase">{d.names[0]}</span>
                    </div>
                  ))}
              </div>
              <Link
                href="/explorar"
                data-testid="link-explore-decade"
                className="text-xs font-mono uppercase tracking-widest text-accent hover:underline mt-4 flex items-center gap-1"
              >
                Ver linha do tempo <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* By country */}
            <div className="border border-border p-6 flex flex-col">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
                Populares por país
              </p>
              <div className="space-y-2 flex-1">
                {loadingByCountry
                  ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
                  : (Array.isArray(namesByCountry) ? namesByCountry : []).map((item) => {
                    const FlagComponent = (Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[item.country];
                    return (
                      <div key={`${item.name}-${item.country}`} className="flex items-center gap-2 font-mono text-sm">
                        {FlagComponent
                          ? <FlagComponent className="w-5 h-auto rounded-sm shrink-0" />
                          : <span className="text-muted-foreground text-xs w-5">{item.country}</span>
                        }
                        <Link
                          href={`/nome/${item.name}`}
                          className="uppercase hover:text-accent transition-colors flex-1"
                        >
                          {item.name}
                        </Link>
                        </div>
                    );
                  })}
              </div>
              <Link
                href="/paises"
                data-testid="link-explore-countries"
                className="text-xs font-mono uppercase tracking-widest text-accent hover:underline mt-4 flex items-center gap-1"
              >
                Explorar países <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Rarest */}
            <div className="border border-border p-6 flex flex-col">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
                Nome mais raro do índice
              </p>
              {rare?.[0] && (
                <div className="flex-1">
                  <div className="text-3xl font-bold uppercase mb-2">{rare[0].name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {rare[0].count} pessoas · {rare[0].countries} países
                  </div>
                </div>
              )}
              <Link
                href="/explorar"
                data-testid="link-explore-rare"
                className="text-xs font-mono uppercase tracking-widest text-accent hover:underline mt-4 flex items-center gap-1"
              >
                Ver nomes raros <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Declining */}
            <div className="border border-border p-6 flex flex-col">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
                Nomes em queda
              </p>
              <div className="space-y-3 flex-1">
                {declining?.slice(0, 5).map((n, i) => (
                  <div key={n.name} className="flex items-center justify-between text-sm font-mono">
                    <span className="text-muted-foreground w-5">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 ml-3 uppercase">{n.name}</span>
                    <span className="text-destructive">{n.changePercent !== null ? `${n.changePercent}%` : "—"}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/tendencias"
                data-testid="link-explore-declining"
                className="text-xs font-mono uppercase tracking-widest text-accent hover:underline mt-4 flex items-center gap-1"
              >
                Ver todos em queda <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Claim CTA */}
      <section className="py-24 border-b border-border">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-6">
            Seu nome existe apenas uma vez<br />na história.
          </h2>
          <p className="text-muted-foreground font-mono text-sm mb-8">
            Reivindique seu nome para garantir que sua identidade esteja ligada a você — para sempre.
          </p>
          <Link
            href="/reivindicar"
            data-testid="button-claim-cta"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground font-bold px-8 py-4 hover:bg-primary/90 transition-colors uppercase tracking-widest font-mono"
          >
            Reivindicar meu nome <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

    </div>
  );
}

function SvgSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const W = 64, H = 24, pad = 1.5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={points.join(" ")} stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TrendRowSmall({
  name, rank, change, sparkline, rising
}: {
  name: string;
  rank: number;
  change: number | null;
  sparkline: number[];
  rising: boolean;
}) {
  const color = rising ? "hsl(var(--accent))" : "hsl(var(--destructive))";

  return (
    <Link
      href={`/nome/${name}`}
      data-testid={`trend-row-${name}`}
      className="flex items-center gap-4 px-4 py-3 border border-transparent hover:border-border hover:bg-card transition-colors group"
    >
      <span className="font-mono text-sm text-muted-foreground w-5">{rank}.</span>
      <span className="flex-1 font-bold uppercase group-hover:text-accent transition-colors">{name}</span>
      <div className="w-16 h-6 hidden sm:block">
        <SvgSparkline values={sparkline} color={color} />
      </div>
      <span
        className={`font-mono text-sm font-bold w-16 text-right ${
          rising ? "text-accent" : "text-destructive"
        }`}
      >
        {change === null ? "—" : `${change > 0 ? "+" : ""}${change}%`}
      </span>
    </Link>
  );
}
