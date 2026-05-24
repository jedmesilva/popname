import { useGetNameDetail, getGetNameDetailQueryKey, useGetNameHistory, getGetNameHistoryQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { ArrowLeft, Globe, History, Activity, ChevronDown, Loader2, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Flags from "country-flag-icons/react/3x2";

function fmtPct(v: number): string {
  const abs = Math.abs(v);
  if (abs === 0) return "0%";
  if (abs < 0.1) return "<0.1%";
  if (abs < 1)   return abs.toFixed(1) + "%";
  return Math.round(abs) + "%";
}

const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina", AU: "Austrália", BR: "Brasil", CA: "Canadá",
  CL: "Chile", CN: "China", CO: "Colômbia", DE: "Alemanha",
  ES: "Espanha", FR: "França", GB: "Reino Unido", IN: "Índia",
  IT: "Itália", JP: "Japão", MX: "México", NG: "Nigéria",
  PT: "Portugal", RU: "Rússia", US: "Estados Unidos", ZA: "África do Sul",
};

type CountryEntry = { country: string; countryCode: string; count: number; percentage: number };

export function NameDetail() {
  const params = useParams();
  const name = params.name || "";

  const { data: detail, isLoading: loadingDetail } = useGetNameDetail(name, {
    query: { enabled: !!name, queryKey: getGetNameDetailQueryKey(name) }
  });

  const { data: history, isLoading: loadingHistory } = useGetNameHistory(name, {
    query: { enabled: !!name, queryKey: getGetNameHistoryQueryKey(name) }
  });

  const [granularity, setGranularity] = useState<string>("monthly");
  const { data: registrations, isLoading: loadingReg } = useQuery<{ period: string; label: string; count: number }[]>({
    queryKey: ["registrations", name, granularity],
    queryFn: () => fetch(`/api/names/${encodeURIComponent(name)}/registrations?granularity=${granularity}`).then(r => r.json()),
    enabled: !!name,
  });

  const PAGE_SIZE = 10;
  const INITIAL_SIZE = 5;
  const [extraCountries, setExtraCountries] = useState<CountryEntry[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCountries, setTotalCountries] = useState<number | null>(null);

  const initialCountries = (detail?.topCountries ?? []) as CountryEntry[];
  const displayedCountries: CountryEntry[] = [...initialCountries, ...extraCountries];
  const loadedCount = displayedCountries.length;
  const hasMore = totalCountries === null
    ? initialCountries.length >= INITIAL_SIZE
    : loadedCount < totalCountries;

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const offset = extraCountries.length === 0 ? INITIAL_SIZE : loadedCount;
      const url = `/api/names/${encodeURIComponent(name)}/countries?limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url);
      const data: { total: number; items: CountryEntry[] } = await res.json();
      setTotalCountries(data.total);
      setExtraCountries(prev => [...prev, ...data.items]);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex-1 container mx-auto px-4 py-12">
      <Button
        variant="ghost"
        className="mb-8 font-mono uppercase tracking-widest text-xs"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="mr-2 w-4 h-4" />
        Voltar
      </Button>

      {loadingDetail ? (
        <div className="space-y-8">
          <Skeleton className="h-20 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      ) : detail ? (
        <div className="space-y-16">
          <header>
            <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tighter mb-4">{detail.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm font-mono text-muted-foreground uppercase tracking-widest">
              <span className="flex items-center gap-2 border border-border px-3 py-1">
                <Globe className="w-4 h-4" /> {detail.origin || 'Origem desconhecida'}
              </span>
              <span className="flex items-center gap-2 border border-border px-3 py-1">
                {detail.gender || 'Gênero não especificado'}
              </span>
              <span className="flex items-center gap-2 border border-border px-3 py-1">
                {detail.countries} Países
              </span>
            </div>
            {detail.meaning && (
              <p className="mt-8 text-xl md:text-2xl max-w-3xl leading-relaxed text-foreground/90">
                "{detail.meaning}"
              </p>
            )}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 border border-border p-8 bg-card">
              <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-2">
                <History className="w-4 h-4" /> Histórico de Popularidade
              </h2>
              <div className="h-[300px] w-full">
                {loadingHistory ? (
                  <Skeleton className="w-full h-full" />
                ) : history && (history as any[]).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history as any[]}>
                      <XAxis
                        dataKey="year"
                        stroke="#888"
                        tick={{ fill: '#888', fontSize: 12, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#888"
                        tick={{ fill: '#888', fontSize: 12, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', textTransform: 'uppercase' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Participação']}
                      />
                      <Line
                        type="monotone"
                        dataKey="pct"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "hsl(var(--accent))" }}
                        activeDot={{ r: 6, fill: "hsl(var(--accent))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground uppercase font-mono text-sm">
                    Sem dados históricos
                  </div>
                )}
              </div>
            </div>

            <div className="border border-border p-8 bg-card flex flex-col">
              <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Top Países
              </h2>
              <div className="flex-1 flex flex-col gap-6">
                {displayedCountries.length > 0 ? displayedCountries.map((country, idx) => {
                  const FlagComponent = (Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>)[country.countryCode ?? ""];
                  const countryName = COUNTRY_NAMES[country.countryCode ?? ""] ?? country.country;
                  return (
                    <div key={`${country.countryCode}-${idx}`} className="space-y-2">
                      <div className="flex justify-between font-mono text-sm uppercase">
                        <span className="flex items-center gap-2">
                          {FlagComponent && <FlagComponent className="w-5 h-auto rounded-sm shrink-0" />}
                          <span>{idx + 1}. {countryName}</span>
                        </span>
                        <span className="text-muted-foreground">{country.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground uppercase font-mono text-sm">
                    Sem dados geográficos
                  </div>
                )}
              </div>

              {hasMore && (
                <div className="mt-6 pt-6 border-t border-border">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {loadingMore
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>
                      : <>
                          <ChevronDown className="w-4 h-4" />
                          Ver mais países
                          {totalCountries !== null && (
                            <span className="opacity-50">({loadedCount}/{totalCountries})</span>
                          )}
                        </>
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="border border-border p-8 bg-card">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                 <Activity className="w-4 h-4" /> Estatísticas Globais
               </h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div>
                 <div className="text-muted-foreground text-xs font-mono uppercase mb-2">Total de Pessoas</div>
                 <div className="text-4xl font-bold font-mono">{detail.count.toLocaleString('pt-BR')}</div>
               </div>
               <div>
                 <div className="text-muted-foreground text-xs font-mono uppercase mb-2">Presença Global</div>
                 <div className="text-4xl font-bold font-mono">{detail.countries} Países</div>
               </div>
               <div>
                 <div className="text-muted-foreground text-xs font-mono uppercase mb-2">Tendência (1 Ano)</div>
                 <div className={`text-4xl font-bold font-mono ${detail.changePercent != null ? (detail.changePercent >= 0 ? 'text-accent' : 'text-destructive') : ''}`}>
                   {detail.changePercent != null
                     ? `${detail.changePercent >= 0 ? '+' : '-'}${fmtPct(detail.changePercent)}`
                     : 'N/D'}
                 </div>
               </div>
             </div>
          </div>

          {/* Registros por período */}
          <div className="border border-border p-8 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BarChart2 className="w-4 h-4" /> Registros por Período
              </h2>
              <div className="flex flex-wrap gap-1">
                {([
                  ["daily",   "Diário"],
                  ["weekly",  "Semanal"],
                  ["monthly", "Mensal"],
                  ["annual",  "Anual"],
                  ["decade",  "Década"],
                  ["century", "Século"],
                ] as [string, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setGranularity(key)}
                    className={`px-3 py-1 font-mono text-xs uppercase tracking-widest border transition-colors ${
                      granularity === key
                        ? "border-accent text-accent bg-accent/10"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[260px] w-full">
              {loadingReg ? (
                <Skeleton className="w-full h-full" />
              ) : registrations && registrations.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={registrations} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis
                      dataKey="label"
                      stroke="#888"
                      tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#888"
                      tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: 12 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(v: any) => [v, "Registros"]}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={48}>
                      {(registrations ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill="hsl(var(--accent))" fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground uppercase font-mono text-sm">
                  Sem registros neste período
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 font-mono uppercase text-muted-foreground">
          Nome não encontrado
        </div>
      )}
    </div>
  );
}
