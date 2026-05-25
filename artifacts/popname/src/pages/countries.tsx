import { useGetPopularNames, getGetPopularNamesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import Flags from "country-flag-icons/react/3x2";
import { useTranslation } from "react-i18next";

const TOP_COUNTRIES = [
  { code: "BR", nameKey: "Brasil" },
  { code: "US", nameKey: "Estados Unidos" },
  { code: "IN", nameKey: "Índia" },
  { code: "JP", nameKey: "Japão" },
  { code: "CN", nameKey: "China" },
  { code: "FR", nameKey: "França" },
  { code: "DE", nameKey: "Alemanha" },
  { code: "RU", nameKey: "Rússia" },
];

function CountryFlag({ code, className }: { code: string; className?: string }) {
  const Flag = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[code];
  if (!Flag) return null;
  return <Flag className={className} />;
}

export function Countries() {
  const [country, setCountry] = useState<string>("BR");
  const { t } = useTranslation();
  const selected = TOP_COUNTRIES.find((c) => c.code === country);

  const { data: popular, isLoading } = useGetPopularNames(
    { limit: 50, country },
    { query: { queryKey: getGetPopularNamesQueryKey({ limit: 50, country }) } }
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-8">
            {t("countries.title")}
          </h1>

          <div className="flex flex-wrap gap-2">
            {TOP_COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCountry(c.code)}
                className={`flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-colors ${
                  country === c.code
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-transparent hover:border-accent/50"
                }`}
              >
                <CountryFlag code={c.code} className="w-5 h-auto" />
                {c.nameKey}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          {selected && (
            <CountryFlag code={selected.code} className="w-10 h-auto border border-border" />
          )}
          <h2 className="text-xl font-mono uppercase tracking-widest text-muted-foreground">
            {t("countries.mostPopular", { country: selected?.nameKey })}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading
            ? Array(20).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            : popular?.map((item, idx) => (
              <Link
                key={item.name}
                href={`/nome/${item.name}`}
                className="border border-border p-4 hover:border-accent transition-colors bg-card group"
              >
                <div className="font-mono text-xs text-muted-foreground mb-2">#{idx + 1}</div>
                <div
                  className="font-bold text-xl uppercase group-hover:text-accent transition-colors truncate"
                  title={item.name}
                >
                  {item.name}
                </div>
                <div className="font-mono text-xs text-muted-foreground mt-2">
                  {item.count.toLocaleString()} {t("countries.records")}
                </div>
              </Link>
            ))}
          {popular?.length === 0 && (
            <div className="col-span-full py-20 text-center font-mono text-muted-foreground uppercase">
              {t("countries.noData")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
