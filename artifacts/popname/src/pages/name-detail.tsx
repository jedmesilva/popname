import { useGetNameDetail, getGetNameDetailQueryKey, useGetNameHistory, getGetNameHistoryQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Globe, History, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NameDetail() {
  const params = useParams();
  const name = params.name || "";

  const { data: detail, isLoading: loadingDetail } = useGetNameDetail(name, {
    query: { enabled: !!name, queryKey: getGetNameDetailQueryKey(name) }
  });

  const { data: history, isLoading: loadingHistory } = useGetNameHistory(name, {
    query: { enabled: !!name, queryKey: getGetNameHistoryQueryKey(name) }
  });

  return (
    <div className="flex-1 container mx-auto px-4 py-12">
      <Link href="/">
        <Button variant="ghost" className="mb-8 font-mono uppercase tracking-widest text-xs">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Voltar
        </Button>
      </Link>

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
                ) : history ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <XAxis 
                        dataKey="year" 
                        stroke="#888" 
                        tick={{fill: '#888', fontSize: 12, fontFamily: 'monospace'}}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#888"
                        tick={{fill: '#888', fontSize: 12, fontFamily: 'monospace'}}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => (value >= 1000 ? `${(value/1000).toFixed(1)}k` : value)}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', textTransform: 'uppercase' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        dot={false}
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
                {detail.topCountries?.map((country, idx) => (
                  <div key={country.countryCode} className="space-y-2">
                    <div className="flex justify-between font-mono text-sm uppercase">
                      <span>{idx + 1}. {country.country}</span>
                      <span className="text-muted-foreground">{country.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-accent" 
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {!detail.topCountries?.length && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground uppercase font-mono text-sm">
                    Sem dados geográficos
                  </div>
                )}
              </div>
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
                 <div className="text-muted-foreground text-xs font-mono uppercase mb-2">Tendência (5 Anos)</div>
                 <div className={`text-4xl font-bold font-mono ${detail.changePercent && detail.changePercent > 0 ? 'text-accent' : 'text-destructive'}`}>
                   {detail.changePercent ? `${detail.changePercent > 0 ? '+' : ''}${detail.changePercent}%` : 'N/D'}
                 </div>
               </div>
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
