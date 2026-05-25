import { useGetTrendingNames, getGetTrendingNamesQueryKey, useGetDecliningNames, getGetDecliningNamesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";

type Period = "1m" | "6m" | "1y" | "5y";

export function Trends() {
  const [period, setPeriod] = useState<Period>("1y");
  const { t } = useTranslation();

  const { data: trending, isLoading: loadingTrending } = useGetTrendingNames(
    { period, limit: 10 },
    { query: { queryKey: getGetTrendingNamesQueryKey({ period, limit: 10 }) } }
  );

  const { data: declining, isLoading: loadingDeclining } = useGetDecliningNames(
    { period, limit: 10 },
    { query: { queryKey: getGetDecliningNamesQueryKey({ period, limit: 10 }) } }
  );

  const periodKeys: Period[] = ["1m", "6m", "1y", "5y"];

  return (
    <div className="flex-1">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">
                {t("trends.title")}
              </h1>
              <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
                {t("trends.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {periodKeys.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-colors ${
                    period === p
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-transparent hover:border-accent/50"
                  }`}
                >
                  {t(`trends.periods.${p}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section>
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 flex items-center gap-4">
            <span className="w-3 h-3 bg-accent block rounded-full" /> {t("trends.rising")}
          </h2>
          <div className="space-y-2">
            {loadingTrending
              ? Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              : trending?.map((item, idx) => (
                  <TrendRow key={item.name} item={item} rank={idx + 1} />
                ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 flex items-center gap-4">
            <span className="w-3 h-3 bg-destructive block rounded-full" /> {t("trends.declining")}
          </h2>
          <div className="space-y-2">
            {loadingDeclining
              ? Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              : declining?.map((item, idx) => (
                  <TrendRow key={item.name} item={item} rank={idx + 1} isDeclining />
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TrendRow({
  item, rank, isDeclining = false,
}: {
  item: any;
  rank: number;
  isDeclining?: boolean;
}) {
  const chartData = item.sparkline?.map((val: number, i: number) => ({ i, val })) || [];
  const color = isDeclining ? "hsl(var(--destructive))" : "hsl(var(--accent))";

  return (
    <Link
      href={`/name/${item.name}`}
      className="flex items-center gap-4 p-4 border border-border hover:border-muted-foreground transition-colors group bg-card"
    >
      <div className="font-mono text-sm text-muted-foreground w-6">{rank}.</div>
      <div className="flex-1 font-bold text-lg uppercase group-hover:text-foreground transition-colors">
        {item.name}
      </div>
      <div className="w-24 h-8 hidden sm:block">
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="val"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className={`font-mono text-sm font-bold w-20 text-right ${isDeclining ? "text-destructive" : "text-accent"}`}>
        {item.changePercent === null
          ? "—"
          : `${item.changePercent > 0 ? "+" : ""}${item.changePercent}%`}
      </div>
    </Link>
  );
}
