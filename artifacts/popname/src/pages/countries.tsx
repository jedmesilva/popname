import { useGetPopularNames, getGetPopularNamesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

const TOP_COUNTRIES = [
  { code: "BR", name: "Brasil" },
  { code: "US", name: "Estados Unidos" },
  { code: "IN", name: "Índia" },
  { code: "JP", name: "Japão" },
  { code: "CN", name: "China" },
  { code: "FR", name: "França" },
  { code: "DE", name: "Alemanha" },
  { code: "RU", name: "Rússia" }
];

export function Countries() {
  const [country, setCountry] = useState<string>("BR");

  const { data: popular, isLoading } = useGetPopularNames(
    { limit: 50, country },
    { query: { queryKey: getGetPopularNamesQueryKey({ limit: 50, country }) } }
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-8">Mundo</h1>
          
          <div className="flex flex-wrap gap-2">
            {TOP_COUNTRIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCountry(c.code)}
                className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-colors ${
                  country === c.code 
                    ? 'border-accent bg-accent text-accent-foreground' 
                    : 'border-border bg-transparent hover:border-accent/50'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <h2 className="text-xl font-mono uppercase tracking-widest text-muted-foreground mb-8">
          Nomes mais populares: {TOP_COUNTRIES.find(c => c.code === country)?.name}
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : popular?.map((item, idx) => (
            <Link key={item.name} href={`/nome/${item.name}`} className="border border-border p-4 hover:border-accent transition-colors bg-card group">
              <div className="font-mono text-xs text-muted-foreground mb-2">#{idx + 1}</div>
              <div className="font-bold text-xl uppercase group-hover:text-accent transition-colors truncate" title={item.name}>
                {item.name}
              </div>
              <div className="font-mono text-xs text-muted-foreground mt-2">
                {item.count.toLocaleString('pt-BR')} registros
              </div>
            </Link>
          ))}
          {popular?.length === 0 && (
             <div className="col-span-full py-20 text-center font-mono text-muted-foreground uppercase">
               Nenhum dado encontrado para este país.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
