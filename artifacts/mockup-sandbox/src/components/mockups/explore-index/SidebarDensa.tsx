import './_group.css';
import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight, LayoutGrid, Clock, Users } from "lucide-react";

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
  { key: "boomer",     label: "Baby Boomer",  years: "1946–1964", hex: "#f59e0b" },
  { key: "genx",       label: "Geração X",    years: "1965–1980", hex: "#10b981" },
  { key: "millennial", label: "Millennial",   years: "1981–1996", hex: "#8b5cf6" },
  { key: "genz",       label: "Geração Z",    years: "1997–2012", hex: "#0ea5e9" },
  { key: "alpha",      label: "Geração Alpha",years: "2013+",     hex: "#ec4899" },
] as const;
type GenerationKey = typeof GENERATIONS[number]["key"];

const TABS = ["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as const;
type Tab = typeof TABS[number];

const MOCK_NAMES = [
  { name: "Maria", count: 11200000, trend: "+2.1%" }, { name: "João",  count: 9800000, trend: "-0.3%" },
  { name: "Ana",   count: 8500000,  trend: "+0.8%" }, { name: "Pedro", count: 7600000, trend: "-1.2%" },
  { name: "Paulo", count: 6900000,  trend: "-0.7%" }, { name: "Carlos",count: 6200000, trend: "+0.4%" },
  { name: "Lucas", count: 5800000,  trend: "+3.2%" }, { name: "Juliana",count:5100000, trend: "+1.1%" },
  { name: "Fernanda",count:4800000, trend: "-0.5%" }, { name: "Marcos",count: 4500000, trend: "+0.2%" },
  { name: "Luiza", count: 4200000,  trend: "+2.8%" }, { name: "Rafael",count: 3900000, trend: "+1.5%" },
  { name: "Camila",count: 3700000,  trend: "+0.9%" }, { name: "Gabriel",count:3400000, trend: "+4.1%" },
  { name: "Isabela",count:3200000,  trend: "+2.3%" }, { name: "Bruno", count: 2900000, trend: "-1.8%" },
  { name: "Letícia",count:2700000,  trend: "+0.6%" }, { name: "Rodrigo",count:2500000, trend: "-2.1%" },
  { name: "Amanda",count: 2300000,  trend: "+0.3%" }, { name: "Felipe",count: 2100000, trend: "-0.9%" },
  { name: "Beatriz",count:1900000,  trend: "+1.7%" }, { name: "Diego", count: 1700000, trend: "-1.4%" },
  { name: "Larissa",count:1500000,  trend: "+0.5%" }, { name: "Thiago",count: 1300000, trend: "-2.3%" },
];

const MOCK_DECADES = [
  { decade: 1950, names: ["Maria", "João", "José", "Ana", "Antônio"] },
  { decade: 1960, names: ["Paulo", "Pedro", "Carlos", "Luiz", "Francisca"] },
  { decade: 1970, names: ["Marcos", "Fernando", "Roberto", "Sonia", "Vera"] },
  { decade: 1980, names: ["Alexandre", "Rodrigo", "Renato", "Cláudia", "Cristiane"] },
  { decade: 1990, names: ["Felipe", "Lucas", "Bruno", "Juliana", "Amanda"] },
  { decade: 2000, names: ["Gabriel", "Mateus", "Rafael", "Camila", "Isabela"] },
  { decade: 2010, names: ["Miguel", "Arthur", "Davi", "Sofia", "Alice"] },
  { decade: 2020, names: ["Noah", "Théo", "Gael", "Helena", "Valentina"] },
];

const REGIONS = ["América do Sul", "Europa", "América do Norte", "Ásia", "África"];

function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="w-48 shrink-0 border-r border-border bg-card flex flex-col py-5 px-3 gap-5">
      {children}
    </aside>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5 px-2">{label}</p>
      {children}
      </div>
  );
}

function SidebarItem({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-2 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}>
      {children}
    </button>
  );
}

function BrowseTab() {
  const [sort, setSort] = useState<SortValue>("popular");
  const [generation, setGeneration] = useState<GenerationKey | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar>
        <SidebarSection label="Ordenar por">
          {SORT_OPTIONS.map((o) => (
            <SidebarItem key={o.value} active={sort === o.value} onClick={() => setSort(o.value)}>
              {o.label}
            </SidebarItem>
          ))}
        </SidebarSection>
        <div className="border-t border-border" />
        <SidebarSection label="Geração">
          <SidebarItem active={!generation} onClick={() => setGeneration(null)}>Todas</SidebarItem>
          {GENERATIONS.map((g) => (
            <SidebarItem key={g.key} active={generation === g.key} onClick={() => setGeneration(generation === g.key ? null : g.key)}>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.hex }} />
                {g.label}
              </span>
            </SidebarItem>
          ))}
        </SidebarSection>
        <div className="border-t border-border" />
        <SidebarSection label="Região">
          <SidebarItem active={!region} onClick={() => setRegion(null)}>Todas</SidebarItem>
          {REGIONS.map((r) => (
            <SidebarItem key={r} active={region === r} onClick={() => setRegion(region === r ? null : r)}>{r}</SidebarItem>
          ))}
        </SidebarSection>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0 px-5 py-4">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-4">
          284 nomes
          {generation && ` · ${GENERATIONS.find(g => g.key === generation)?.label}`}
          {region && ` · ${region}`}
        </p>

        <div className="grid grid-cols-4 lg:grid-cols-6 gap-1.5 mb-5">
          {MOCK_NAMES.map((item, idx) => (
            <div key={item.name}
              className="border border-border px-2.5 py-2 bg-card flex flex-col cursor-pointer hover:border-accent transition-colors group">
              <div className="font-mono text-[9px] text-muted-foreground mb-0.5">#{idx + 1}</div>
              <div className="font-bold uppercase text-xs truncate group-hover:text-accent transition-colors">{item.name}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-[9px] text-muted-foreground">{(item.count / 1_000_000).toFixed(1)}M</span>
                <span className={`font-mono text-[9px] ${item.trend.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                  {item.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-auto">
          <button disabled className="flex items-center gap-1 px-3 py-1.5 border border-border opacity-30 text-xs font-mono cursor-not-allowed">
            <ChevronLeft className="w-3 h-3" /> ANT.
          </button>
          <span className="font-mono text-xs text-muted-foreground">1 / 12</span>
          <button className="flex items-center gap-1 px-3 py-1.5 border border-border hover:border-accent transition-colors text-xs font-mono">
            PRÓX. <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerationsTab() {
  return (
    <div className="flex flex-1">
      <Sidebar>
        <SidebarSection label="Geração">
          {GENERATIONS.map((g) => (
            <SidebarItem key={g.key}>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.hex }} />
                {g.label}
              </span>
            </SidebarItem>
          ))}
        </SidebarSection>
      </Sidebar>
      <div className="flex-1 px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GENERATIONS.map((g) => (
            <div key={g.key} className="border border-border p-4 flex flex-col gap-3" style={{ borderLeftColor: g.hex, borderLeftWidth: 3 }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold uppercase tracking-tight text-foreground">{g.label}</h3>
                <span className="font-mono text-[10px] text-muted-foreground">{g.years}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {["Maria", "João", "Ana", "Pedro", "Paulo", "Carlos", "Lucas", "Juliana"].map((n, i) => (
                  <span key={n} className="px-2 py-0.5 font-mono text-[11px] uppercase bg-muted text-muted-foreground hover:bg-muted/70 cursor-pointer transition-colors">
                    {i === 0 && <span style={{ color: g.hex }} className="mr-1">#1</span>}{n}
                  </span>
                ))}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-1 mt-1 cursor-pointer" style={{ color: g.hex }}>
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineTab() {
  return (
    <div className="flex flex-1">
      <Sidebar>
        <SidebarSection label="Décadas">
          {MOCK_DECADES.map((d) => (
            <SidebarItem key={d.decade} active={d.decade >= 2020}>{d.decade}s</SidebarItem>
          ))}
        </SidebarSection>
      </Sidebar>
      <div className="flex-1 px-5 py-4">
        <div className="space-y-1">
          {MOCK_DECADES.map((d) => (
            <div key={d.decade} className="flex">
              <div className={`w-16 shrink-0 py-2.5 text-center font-mono text-xs font-bold border ${
                d.decade >= 2020
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-muted-foreground border-border"
              }`}>
                {d.decade}s
              </div>
              <div className={`flex-1 flex flex-wrap gap-1.5 items-center px-4 py-2 border border-l-0 ${
                d.decade >= 2020 ? "border-accent bg-accent/5" : "border-border"
              }`}>
                {d.names.map((name, i) => (
                  <span key={name}
                    className={`font-mono text-xs uppercase px-2 py-0.5 cursor-pointer transition-colors ${
                      i === 0 ? "bg-accent text-accent-foreground font-bold" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SidebarDensa() {
  const [tab, setTab] = useState<Tab>("NAVEGAR");
  const navIcons = { "NAVEGAR": LayoutGrid, "GERAÇÕES": Users, "LINHA DO TEMPO": Clock };

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter uppercase">Índice</h1>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              {tab === "NAVEGAR" ? "284 nomes · filtro ativo" : tab === "GERAÇÕES" ? "5 gerações" : "1950 – 2020+"}
            </p>
          </div>
          <div className="flex gap-1">
            {(["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as Tab[]).map((t) => {
              const Icon = navIcons[t];
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                    tab === t
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:border-accent/50"
                  }`}>
                  <Icon className="w-3 h-3" /> {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {tab === "NAVEGAR"        && <BrowseTab />}
        {tab === "GERAÇÕES"       && <GenerationsTab />}
        {tab === "LINHA DO TEMPO" && <TimelineTab />}
      </div>
    </div>
  );
}
