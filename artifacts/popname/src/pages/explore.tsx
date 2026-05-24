import { useGetNamesByDecade, getGetNamesByDecadeQueryKey, useGetRareNames, getGetRareNamesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export function Explore() {
  const { data: decades, isLoading: loadingDecades } = useGetNamesByDecade({
    query: { queryKey: getGetNamesByDecadeQueryKey() }
  });

  const { data: rare, isLoading: loadingRare } = useGetRareNames(
    { limit: 20 },
    { query: { queryKey: getGetRareNamesQueryKey({ limit: 20 }) } }
  );

  return (
    <div className="flex-1">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">Explorar o Índice</h1>
          <p className="text-muted-foreground max-w-2xl font-mono text-sm uppercase tracking-widest">
            Mergulhe nos dados. Descubra padrões temporais, distribuições geográficas e as anomalias mais raras da nomenclatura humana.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section>
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 border-b border-border pb-4">Linha do Tempo</h2>
          <div className="space-y-4">
            {loadingDecades ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : decades?.map((d) => (
              <div key={d.decade} className="border border-border p-4 hover:border-accent transition-colors flex gap-6 items-center">
                <div className="text-2xl font-bold font-mono text-accent w-20">{d.decade}s</div>
                <div className="flex flex-wrap gap-2">
                  {d.names.slice(0, 5).map(name => (
                    <Link key={name} href={`/nome/${name}`} className="text-sm uppercase font-mono bg-muted px-2 py-1 hover:bg-accent hover:text-white transition-colors">
                      {name}
                    </Link>
                  ))}
                  {d.names.length > 5 && <span className="text-sm font-mono text-muted-foreground py-1">+{d.names.length - 5}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 border-b border-border pb-4">Nomes Mais Raros</h2>
          <div className="grid grid-cols-2 gap-4">
            {loadingRare ? (
              Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : rare?.map((name) => (
              <Link key={name.name} href={`/nome/${name.name}`} className="border border-border p-4 hover:border-accent transition-colors block group">
                <div className="text-xl font-bold uppercase group-hover:text-accent transition-colors">{name.name}</div>
                <div className="text-xs text-muted-foreground mt-2 font-mono uppercase tracking-widest">
                  Apenas {name.count} pessoas
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
