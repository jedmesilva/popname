import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

type HistoryRow = {
  year: number;
  total_nome: number;
  total_periodo: number;
  participacao_pct: number;
};

type TrendRow = {
  day: string;
  name_text: string;
  birth_country: string | null;
  total_nome: number;
  total_periodo: number;
  participacao_pct: number;
};

async function fetchHistory(name: string, country: string, yearFrom: string, yearTo: string) {
  const p = new URLSearchParams({ name });
  if (country) p.set("country", country);
  if (yearFrom) p.set("yearFrom", yearFrom);
  if (yearTo) p.set("yearTo", yearTo);
  const res = await fetch(`/api/views/name-history?${p}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<HistoryRow[]>;
}

async function fetchTrends(name: string, country: string, days: number) {
  const p = new URLSearchParams({ days: String(days) });
  if (name) p.set("name", name);
  if (country) p.set("country", country);
  const res = await fetch(`/api/views/name-trends?${p}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<TrendRow[]>;
}

const DAYS_OPTIONS = [7, 30, 90, 180, 365] as const;

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 0,
  fontFamily: "monospace",
  fontSize: 11,
  color: "hsl(var(--foreground))",
};

export function Growth() {
  const { t } = useTranslation();
  const [histName, setHistName] = useState("João");
  const [histCountry, setHistCountry] = useState("");
  const [histYearFrom, setHistYearFrom] = useState("1980");
  const [histYearTo, setHistYearTo] = useState("2024");
  const [histQuery, setHistQuery] = useState({ name: "João", country: "", yearFrom: "1980", yearTo: "2024" });

  const [trendName, setTrendName] = useState("");
  const [trendCountry, setTrendCountry] = useState("");
  const [trendDays, setTrendDays] = useState(30);
  const [trendQuery, setTrendQuery] = useState({ name: "", country: "", days: 30 });

  const historyResult = useQuery({
    queryKey: ["name-history", histQuery],
    queryFn: () => fetchHistory(histQuery.name, histQuery.country, histQuery.yearFrom, histQuery.yearTo),
    enabled: !!histQuery.name,
  });

  const trendsResult = useQuery({
    queryKey: ["name-trends", trendQuery],
    queryFn: () => fetchTrends(trendQuery.name, trendQuery.country, trendQuery.days),
  });

  const applyHistory = useCallback(() => {
    setHistQuery({ name: histName.trim(), country: histCountry.trim(), yearFrom: histYearFrom.trim(), yearTo: histYearTo.trim() });
  }, [histName, histCountry, histYearFrom, histYearTo]);

  const applyTrends = useCallback(() => {
    setTrendQuery({ name: trendName.trim(), country: trendCountry.trim(), days: trendDays });
  }, [trendName, trendCountry, trendDays]);

  const trendsByName = buildTrendsByName(trendsResult.data ?? []);

  return (
    <div className="flex-1">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">
            {t("growth.title")}
          </h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
            {t("growth.subtitle")}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 space-y-20">

        {/* ── HISTÓRICO CIVIL ── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="w-3 h-3 bg-accent block" />
            <h2 className="text-2xl font-bold uppercase tracking-tighter">
              {t("growth.civHistory")}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            {t("growth.civDesc")}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-muted-foreground uppercase block mb-1">{t("growth.nameLabel")}</label>
              <input
                className="w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                value={histName}
                onChange={e => setHistName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyHistory()}
                placeholder="ex: Maria"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">{t("growth.countryLabel")}</label>
              <input
                className="w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                value={histCountry}
                onChange={e => setHistCountry(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyHistory()}
                placeholder="ex: BR"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">{t("growth.fromLabel")}</label>
              <input
                className="w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                value={histYearFrom}
                onChange={e => setHistYearFrom(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyHistory()}
                placeholder="1980"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">{t("growth.toLabel")}</label>
              <input
                className="w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                value={histYearTo}
                onChange={e => setHistYearTo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyHistory()}
                placeholder="2024"
              />
            </div>
          </div>
          <button
            onClick={applyHistory}
            disabled={!histName.trim()}
            className="mb-8 px-6 py-2 bg-accent text-accent-foreground font-bold text-sm uppercase hover:bg-accent/90 transition-colors disabled:opacity-40"
          >
            {t("growth.query")}
          </button>

          <HistoryChart data={historyResult.data} loading={historyResult.isLoading} name={histQuery.name} />
        </section>

        {/* ── TENDÊNCIA EM TEMPO REAL ── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="w-3 h-3 bg-primary block" />
            <h2 className="text-2xl font-bold uppercase tracking-tighter">
              {t("growth.platform")}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            {t("growth.platformDesc")}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">{t("growth.nameOptional")}</label>
              <input
                className="w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                value={trendName}
                onChange={e => setTrendName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyTrends()}
                placeholder="ex: Ana"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">{t("growth.countryLabel")}</label>
              <input
                className="w-full bg-card border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
                value={trendCountry}
                onChange={e => setTrendCountry(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyTrends()}
                placeholder="ex: BR"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase block mb-1">{t("growth.period")}</label>
              <div className="flex flex-wrap gap-1">
                {DAYS_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setTrendDays(d)}
                    className={`px-3 py-1 font-mono text-xs uppercase border transition-colors ${
                      trendDays === d
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-transparent hover:border-accent/50"
                    }`}
                  >
                    {t(`growth.days.${d}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={applyTrends}
            className="mb-8 px-6 py-2 bg-primary text-primary-foreground font-bold text-sm uppercase hover:bg-primary/90 transition-colors"
          >
            {t("growth.query")}
          </button>

          <TrendsChart data={trendsByName} loading={trendsResult.isLoading} />

          {!trendsResult.isLoading && trendsResult.data && trendsResult.data.length === 0 && (
            <EmptyState message={t("growth.noData")} />
          )}
        </section>

      </div>
    </div>
  );
}

function HistoryChart({ data, loading, name }: { data?: HistoryRow[]; loading: boolean; name: string }) {
  const { t } = useTranslation();
  if (loading) return <ChartSkeleton />;
  if (!data) return null;
  if (data.length === 0) return <EmptyState message={t("growth.noHistory", { name })} />;

  const chartData = data.map(r => ({
    year: r.year,
    pct: Number(r.participacao_pct.toFixed(4)),
    total: r.total_nome,
  }));

  const peak = chartData.reduce((a, b) => (b.pct > a.pct ? b : a), chartData[0]);

  return (
    <div>
      <div className="flex flex-wrap gap-8 mb-6 text-xs font-mono text-muted-foreground uppercase">
        <Stat label={t("growth.yearsWithData")} value={String(data.length)} />
        <Stat label={t("growth.peak")} value={`${peak.year} (${peak.pct}%)`} />
        <Stat label={t("growth.accumulated")} value={data.reduce((s, r) => s + r.total_nome, 0).toLocaleString()} />
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontFamily: "monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              tickFormatter={v => `${v}%`}
              tick={{ fontFamily: "monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={52}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [`${v}%`, t("growth.participation")]}
              labelFormatter={l => t("growth.year", { val: l })}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#histGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendsChart({ data, loading }: { data: Record<string, TrendRow[]>; loading: boolean }) {
  const { t } = useTranslation();
  if (loading) return <ChartSkeleton />;

  const names = Object.keys(data);
  if (names.length === 0) return null;

  const allDays = Array.from(
    new Set(names.flatMap(n => data[n].map(r => r.day)))
  ).sort();

  const chartData = allDays.map(day => {
    const point: Record<string, any> = { day };
    for (const n of names) {
      const row = data[n].find(r => r.day === day);
      point[n] = row ? Number(row.participacao_pct.toFixed(4)) : 0;
    }
    return point;
  });

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "#60a5fa",
    "#f472b6",
    "#34d399",
    "#fb923c",
    "#a78bfa",
    "#fbbf24",
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tick={{ fontFamily: "monospace", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={d => d?.slice(5) ?? ""}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontFamily: "monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            width={52}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number, name: string) => [`${v}%`, name]}
            labelFormatter={l => t("growth.day", { val: l })}
          />
          {names.length > 1 && <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11, textTransform: "uppercase" }} />}
          {names.map((n, idx) => (
            <Bar key={n} dataKey={n} fill={COLORS[idx % COLORS.length]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildTrendsByName(rows: TrendRow[]): Record<string, TrendRow[]> {
  const map: Record<string, TrendRow[]> = {};
  for (const r of rows) {
    const key = r.name_text;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  const topNames = Object.entries(map)
    .sort((a, b) => b[1].reduce((s, r) => s + r.total_nome, 0) - a[1].reduce((s, r) => s + r.total_nome, 0))
    .slice(0, 8)
    .map(([k]) => k);
  const result: Record<string, TrendRow[]> = {};
  for (const n of topNames) result[n] = map[n];
  return result;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground font-bold text-base">{value}</div>
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-72 w-full" />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-border h-36 flex items-center justify-center text-muted-foreground font-mono text-sm uppercase text-center px-4">
      {message}
    </div>
  );
}
