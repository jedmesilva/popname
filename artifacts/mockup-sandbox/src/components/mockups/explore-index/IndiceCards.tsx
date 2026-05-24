import './_group.css';
import { useState } from "react";
import {
  Search, Globe, Users, Calendar, SlidersHorizontal,
  ArrowUpRight, ArrowDownRight, TrendingUp, LayoutGrid, List,
  RotateCcw, ChevronDown,
} from "lucide-react";

/* ─── Mock data helpers ──────────────────────────────────────────────── */

function makeSpark(rising: boolean, length = 24): number[] {
  const pts: number[] = [];
  let v = 50 + (rising ? -15 : 15);
  for (let i = 0; i < length; i++) {
    v += (Math.random() - (rising ? 0.35 : 0.65)) * 6;
    v = Math.max(5, Math.min(95, v));
    pts.push(v);
  }
  return pts;
}

const NAMES = [
  { name: "Lucas",   trend: +12.4, registros: 24823, paises: 17, rising: true  },
  { name: "Enzo",    trend: +8.7,  registros: 21341, paises: 13, rising: true  },
  { name: "Miguel",  trend: -5.2,  registros: 19872, paises: 16, rising: false },
  { name: "Arthur",  trend: +3.1,  registros: 18302, paises: 14, rising: true  },
  { name: "Heitor",  trend: +15.6, registros: 14987, paises: 11, rising: true  },
  { name: "Maria",   trend: -2.3,  registros: 21210, paises: 20, rising: false },
  { name: "Helena",  trend: +6.5,  registros: 13509, paises: 18, rising: true  },
  { name: "Davi",    trend: +10.2, registros: 12118, paises: 9,  rising: true  },
  { name: "Laura",   trend: -1.8,  registros: 11347, paises: 17, rising: false },
  { name: "Gabriel", trend: -3.7,  registros: 10986, paises: 15, rising: false },
  { name: "Isabela", trend: +4.2,  registros: 9872,  paises: 16, rising: true  },
  { name: "Theo",    trend: +9.1,  registros: 9102,  paises: 8,  rising: true  },
].map((n) => ({ ...n, spark: makeSpark(n.rising) }));

const SORT_OPTS = ["Crescimento", "Popularidade", "Registros", "A–Z"];
const PERIOD_OPTS = ["Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias", "Este ano"];

/* ─── Sparkline ─────────────────────────────────────────────────────── */
function Sparkline({ data, rising }: { data: number[]; rising: boolean }) {
  const w = 200, h = 48;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const fillPts = `0,${h} ${polyline} ${w},${h}`;
  const stroke = rising ? "#22c55e" : "#ef4444";
  const fillId = `fill-${rising ? "up" : "down"}-${Math.random().toString(36).slice(2)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${fillId})`} />
      <polyline points={polyline} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Name card ─────────────────────────────────────────────────────── */
function NameCard({ item, period }: { item: typeof NAMES[number]; period: string }) {
  const pos = item.trend >= 0;
  const trendColor = pos ? "text-emerald-400" : "text-red-400";
  const TrendIcon = pos ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="border border-border bg-card flex flex-col gap-3 p-4 hover:border-accent/60 transition-colors cursor-pointer group">
      {/* Name row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xl font-bold uppercase tracking-tighter group-hover:text-accent transition-colors leading-none">{item.name}</span>
        <div className="text-right shrink-0">
          <div className={`flex items-center gap-0.5 justify-end font-bold text-sm ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {pos ? "+" : ""}{item.trend.toFixed(1)}%
          </div>
          <div className="font-mono text-[9px] text-muted-foreground whitespace-nowrap mt-0.5">{period}</div>
        </div>
      </div>
      {/* Stats */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Users className="w-3 h-3 shrink-0" />
          {item.registros.toLocaleString("pt-BR")} registros
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Globe className="w-3 h-3 shrink-0" />
          {item.paises} países
        </div>
      </div>
      {/* Sparkline */}
      <div className="mt-auto -mx-1">
        <Sparkline data={item.spark} rising={item.rising} />
      </div>
    </div>
  );
}

/* ─── Dropdown pill ─────────────────────────────────────────────────── */
function Dropdown({ icon: Icon, label, className = "" }: { icon: React.ElementType; label: string; className?: string }) {
  return (
    <button className={`flex items-center gap-2 px-3 py-2 border border-border bg-card text-foreground font-mono text-xs uppercase tracking-wide hover:border-accent/50 transition-colors ${className}`}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span>{label}</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground ml-1 shrink-0" />
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function IndiceCards() {
  const [sort, setSort] = useState("Crescimento");
  const [period, setPeriod] = useState("Últimos 30 dias");
  const [grid, setGrid] = useState(true);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const shortPeriod = period === "Últimos 30 dias" ? "nos últimos 30 dias"
    : period === "Últimos 7 dias" ? "nos últimos 7 dias"
    : period === "Últimos 90 dias" ? "nos últimos 90 dias"
    : "neste ano";

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border px-6 pt-8 pb-5">
        <h1 className="text-5xl font-bold tracking-tighter uppercase mb-1">Índice</h1>
        <p className="text-muted-foreground text-sm">
          Explore os nomes, descubra padrões e acompanhe tendências na nomenclatura humana.
        </p>
      </div>

      <div className="flex-1 flex flex-col px-6 py-5 gap-4">
        {/* ── Search ── */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 border border-border bg-card px-4 py-2.5">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              readOnly
              placeholder="Buscar nome..."
              className="bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1 cursor-default"
            />
          </div>
          <div className="flex items-center px-4 py-2.5 border border-border bg-card font-mono text-sm text-muted-foreground">
            Ex.: Lucas, Maria, Enzo...
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap gap-2">
          <Dropdown icon={TrendingUp}  label="Popularidade"   />
          <Dropdown icon={Globe}       label="Brasil"          />
          <Dropdown icon={Users}       label="Todas as gerações" />
          <Dropdown icon={Calendar}    label="1990 – 2025"    />
          <button className="flex items-center gap-2 px-3 py-2 border border-accent bg-accent/5 text-accent font-mono text-xs uppercase tracking-wide hover:bg-accent/10 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            + Filtros
          </button>
        </div>

        {/* ── Trend status bar ── */}
        <div className="border border-border bg-card px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent shrink-0" />
            <div>
              <p className="font-bold text-sm">Tendência de crescimento</p>
              <p className="font-mono text-[10px] text-muted-foreground">comparada ao período anterior</p>
            </div>
          </div>

          {/* Period dropdown */}
          <div className="relative">
            <button onClick={() => { setPeriodOpen(v => !v); setSortOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 border border-accent bg-accent/10 text-accent font-mono text-xs uppercase tracking-wide transition-colors">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {period}
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>
            {periodOpen && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border z-10 min-w-[160px]">
                {PERIOD_OPTS.map((o) => (
                  <button key={o} onClick={() => { setPeriod(o); setPeriodOpen(false); }}
                    className={`w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wide hover:bg-muted transition-colors ${o === period ? "text-accent" : "text-muted-foreground"}`}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Em ascensão
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-400 shrink-0" />
              Em declínio
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span className="w-2 h-2 bg-muted-foreground shrink-0" />
              Estável
            </div>
            <button className="flex items-center gap-2 ml-4 px-3 py-1.5 border border-border text-muted-foreground hover:border-accent/50 font-mono text-xs uppercase tracking-wide transition-colors">
              <RotateCcw className="w-3 h-3 shrink-0" /> Limpar filtros
            </button>
          </div>
        </div>

        {/* ── Results bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xl font-bold uppercase tracking-tight">
              {NAMES.length} nomes encontrados
            </p>
            <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
              Brasil · Todas as gerações · 1990 – 2025 · Popularidade
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wide">Ordenar por:</span>
            <div className="relative">
              <button onClick={() => { setSortOpen(v => !v); setPeriodOpen(false); }}
                className="flex items-center gap-2 px-3 py-1.5 border border-border bg-card font-mono text-xs uppercase tracking-wide hover:border-accent/50 transition-colors">
                {sort}
                <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <div className="absolute top-full right-0 mt-1 bg-card border border-border z-10 min-w-[140px]">
                  {SORT_OPTS.map((o) => (
                    <button key={o} onClick={() => { setSort(o); setSortOpen(false); }}
                      className={`w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wide hover:bg-muted transition-colors ${o === sort ? "text-accent" : "text-muted-foreground"}`}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setGrid(true)}
              className={`p-1.5 border transition-colors ${grid ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setGrid(false)}
              className={`p-1.5 border transition-colors ${!grid ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Cards grid ── */}
        {grid ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {NAMES.map((item) => (
              <NameCard key={item.name} item={item} period={shortPeriod} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border border border-border">
            {NAMES.map((item) => {
              const pos = item.trend >= 0;
              const trendColor = pos ? "text-emerald-400" : "text-red-400";
              const TrendIcon = pos ? ArrowUpRight : ArrowDownRight;
              return (
                <div key={item.name} className="flex items-center gap-6 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group">
                  <span className="text-base font-bold uppercase tracking-tight w-28 shrink-0 group-hover:text-accent transition-colors">{item.name}</span>
                  <div className={`flex items-center gap-0.5 font-bold text-sm ${trendColor} w-20 shrink-0`}>
                    <TrendIcon className="w-3.5 h-3.5" />
                    {pos ? "+" : ""}{item.trend.toFixed(1)}%
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground w-32 shrink-0">
                    <Users className="w-3 h-3 shrink-0" />{item.registros.toLocaleString("pt-BR")}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground w-20 shrink-0">
                    <Globe className="w-3 h-3 shrink-0" />{item.paises} países
                  </div>
                  <div className="flex-1 min-w-0">
                    <Sparkline data={item.spark} rising={item.rising} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
