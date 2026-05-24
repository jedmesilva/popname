import './_group.css';
import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight, LayoutGrid, Clock, Users } from "lucide-react";

const SORT_OPTIONS = [
  { value: "popular", label: "Mais populares" },
  { value: "rare", label: "Mais raros" },
  { value: "longest", label: "Mais longos" },
  { value: "shortest", label: "Mais curtos" },
  { value: "trending", label: "Em ascensão" },
  { value: "declining", label: "Em declínio" },
] as const;
type SortValue = typeof SORT_OPTIONS[number]["value"];

const GENERATIONS = [
  { key: "boomer", label: "Baby Boomer", years: "1946–1964", color: "#f59e0b" },
  { key: "genx", label: "Geração X", years: "1965–1980", color: "#10b981" },
  { key: "millennial", label: "Millennial", years: "1981–1996", color: "#8b5cf6" },
  { key: "genz", label: "Geração Z", years: "1997–2012", color: "#0ea5e9" },
  { key: "alpha", label: "Geração Alpha", years: "2013+", color: "#ec4899" },
] as const;
type GenerationKey = typeof GENERATIONS[number]["key"];

const TABS = ["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as const;
type Tab = typeof TABS[number];

const MOCK_NAMES = [
  { name: "Maria", count: 11200000, trend: "+2.1%" },
  { name: "João", count: 9800000, trend: "-0.3%" },
  { name: "Ana", count: 8500000, trend: "+0.8%" },
  { name: "Pedro", count: 7600000, trend: "-1.2%" },
  { name: "Paulo", count: 6900000, trend: "-0.7%" },
  { name: "Carlos", count: 6200000, trend: "+0.4%" },
  { name: "Lucas", count: 5800000, trend: "+3.2%" },
  { name: "Juliana", count: 5100000, trend: "+1.1%" },
  { name: "Fernanda", count: 4800000, trend: "-0.5%" },
  { name: "Marcos", count: 4500000, trend: "+0.2%" },
  { name: "Luiza", count: 4200000, trend: "+2.8%" },
  { name: "Rafael", count: 3900000, trend: "+1.5%" },
  { name: "Camila", count: 3700000, trend: "+0.9%" },
  { name: "Gabriel", count: 3400000, trend: "+4.1%" },
  { name: "Isabela", count: 3200000, trend: "+2.3%" },
  { name: "Bruno", count: 2900000, trend: "-1.8%" },
  { name: "Letícia", count: 2700000, trend: "+0.6%" },
  { name: "Rodrigo", count: 2500000, trend: "-2.1%" },
  { name: "Amanda", count: 2300000, trend: "+0.3%" },
  { name: "Felipe", count: 2100000, trend: "-0.9%" },
  { name: "Beatriz", count: 1900000, trend: "+1.7%" },
  { name: "Diego", count: 1700000, trend: "-1.4%" },
  { name: "Larissa", count: 1500000, trend: "+0.5%" },
  { name: "Thiago", count: 1300000, trend: "-2.3%" },
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

function BrowseTab() {
  const [sort, setSort] = useState<SortValue>("popular");
  const [generation, setGeneration] = useState<GenerationKey | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [page] = useState(1);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col py-6 px-4 gap-6">
        {/* Ordenar */}
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2 font-bold" style={{ fontFamily: 'var(--app-font-mono)' }}>Ordenar por</p>
          <div className="flex flex-col gap-0.5">
            {SORT_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setSort(o.value)}
                className={`text-left px-2 py-1.5 text-xs uppercase tracking-widest transition-colors ${sort === o.value ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                style={{ fontFamily: 'var(--app-font-mono)' }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Geração */}
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2 font-bold" style={{ fontFamily: 'var(--app-font-mono)' }}>Geração</p>
          <div className="flex flex-col gap-0.5">
            <button onClick={() => setGeneration(null)}
              className={`text-left px-2 py-1.5 text-xs uppercase tracking-widest transition-colors ${!generation ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
              style={{ fontFamily: 'var(--app-font-mono)' }}>
              Todas
            </button>
            {GENERATIONS.map((g) => (
              <button key={g.key} onClick={() => setGeneration(generation === g.key ? null : g.key)}
                className={`text-left px-2 py-1.5 text-xs uppercase tracking-widest transition-colors flex items-center gap-1.5 ${generation === g.key ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                style={{ fontFamily: 'var(--app-font-mono)' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Região */}
        <div>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2 font-bold" style={{ fontFamily: 'var(--app-font-mono)' }}>Região</p>
          <div className="flex flex-col gap-0.5">
            <button onClick={() => setRegion(null)}
              className={`text-left px-2 py-1.5 text-xs uppercase tracking-widest transition-colors ${!region ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
              style={{ fontFamily: 'var(--app-font-mono)' }}>
              Todos
            </button>
            {REGIONS.map((r) => (
              <button key={r} onClick={() => setRegion(region === r ? null : r)}
                className={`text-left px-2 py-1.5 text-xs uppercase tracking-widest transition-colors ${region === r ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                style={{ fontFamily: 'var(--app-font-mono)' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 px-6 py-5">
        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest" style={{ fontFamily: 'var(--app-font-mono)' }}>
            284 nomes
            {generation && ` · ${GENERATIONS.find(g => g.key === generation)?.label}`}
            {region && ` · ${region}`}
          </p>
        </div>

        {/* Dense grid */}
        <div className="grid grid-cols-4 lg:grid-cols-6 gap-1.5 mb-6">
          {MOCK_NAMES.map((item, idx) => (
            <div key={item.name} className="border border-gray-100 px-2.5 py-2 bg-white flex flex-col cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors group">
              <div className="text-[9px] text-gray-300 mb-0.5" style={{ fontFamily: 'var(--app-font-mono)' }}>#{idx + 1}</div>
              <div className="font-bold uppercase text-xs truncate group-hover:text-blue-600 transition-colors" style={{ fontFamily: 'var(--app-font-sans)' }}>{item.name}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-gray-400" style={{ fontFamily: 'var(--app-font-mono)' }}>
                  {(item.count / 1_000_000).toFixed(1)}M
                </span>
                <span className={`text-[9px] ${item.trend.startsWith("+") ? "text-emerald-500" : "text-red-400"}`} style={{ fontFamily: 'var(--app-font-mono)' }}>
                  {item.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-3 mt-auto">
          <button disabled className="flex items-center gap-1 px-3 py-1.5 border border-gray-100 text-gray-200 text-xs cursor-not-allowed" style={{ fontFamily: 'var(--app-font-mono)' }}>
            <ChevronLeft className="w-3 h-3" /> ANT.
          </button>
          <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--app-font-mono)' }}>1 / 12</span>
          <button className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs hover:border-blue-400 transition-colors" style={{ fontFamily: 'var(--app-font-mono)' }}>
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
      <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50 py-6 px-4">
        <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-3 font-bold" style={{ fontFamily: 'var(--app-font-mono)' }}>Geração</p>
        {GENERATIONS.map((g) => (
          <div key={g.key} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 cursor-pointer hover:bg-gray-100" style={{ fontFamily: 'var(--app-font-mono)' }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
            {g.label}
          </div>
        ))}
      </aside>
      <div className="flex-1 px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GENERATIONS.map((g) => (
            <div key={g.key} className="border border-gray-100 p-4 flex flex-col gap-3" style={{ borderLeftColor: g.color, borderLeftWidth: 3 }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold uppercase tracking-tight text-black" style={{ fontFamily: 'var(--app-font-sans)' }}>{g.label}</h3>
                <span className="text-[10px] text-gray-400" style={{ fontFamily: 'var(--app-font-mono)' }}>{g.years}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {["Maria", "João", "Ana", "Pedro", "Paulo", "Carlos", "Lucas", "Juliana"].map((n, i) => (
                  <span key={n} className="px-2 py-0.5 text-[11px] uppercase bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors" style={{ fontFamily: 'var(--app-font-mono)' }}>
                    {i === 0 && <span style={{ color: g.color }} className="mr-1">#1</span>}{n}
                  </span>
                ))}
              </div>
              <div className="text-[11px] uppercase tracking-widest flex items-center gap-1 mt-1" style={{ fontFamily: 'var(--app-font-mono)', color: g.color }}>
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
      <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50 py-6 px-4">
        <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-3 font-bold" style={{ fontFamily: 'var(--app-font-mono)' }}>Navegar para</p>
        {MOCK_DECADES.map((d) => (
          <div key={d.decade} className={`px-2 py-1.5 text-xs cursor-pointer transition-colors ${d.decade >= 2020 ? "text-blue-500 bg-blue-50" : "text-gray-500 hover:bg-gray-100"}`} style={{ fontFamily: 'var(--app-font-mono)' }}>
            {d.decade}s
          </div>
        ))}
      </aside>
      <div className="flex-1 px-6 py-5">
        <div className="space-y-1">
          {MOCK_DECADES.map((d) => (
            <div key={d.decade} className="flex items-center gap-0">
              <div className={`w-16 shrink-0 py-2.5 text-center text-xs font-bold border ${d.decade >= 2020 ? "bg-blue-500 text-white border-blue-500" : "bg-gray-50 text-gray-500 border-gray-100"}`} style={{ fontFamily: 'var(--app-font-mono)' }}>
                {d.decade}s
              </div>
              <div className={`flex-1 flex flex-wrap gap-1.5 items-center px-4 py-2 border border-l-0 ${d.decade >= 2020 ? "border-blue-200 bg-blue-50" : "border-gray-100"}`}>
                {d.names.map((name, i) => (
                  <span key={name} className={`text-xs uppercase px-2 py-0.5 cursor-pointer transition-colors ${i === 0 ? "bg-blue-500 text-white font-bold" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} style={{ fontFamily: 'var(--app-font-mono)' }}>
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
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Compact header */}
      <div className="border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter uppercase" style={{ fontFamily: 'var(--app-font-sans)' }}>Índice</h1>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-0.5" style={{ fontFamily: 'var(--app-font-mono)' }}>
              {tab === "NAVEGAR" ? "284 nomes · filtro ativo" : tab === "GERAÇÕES" ? "5 gerações" : "1950 – 2020+"}
            </p>
          </div>
          {/* Tab nav — icon + label */}
          <div className="flex gap-1">
            {(["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as Tab[]).map((t) => {
              const Icon = navIcons[t];
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-widest border transition-colors ${tab === t ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                  style={{ fontFamily: 'var(--app-font-mono)' }}>
                  <Icon className="w-3 h-3" /> {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content with sidebar */}
      <div className="flex flex-1 min-h-0">
        {tab === "NAVEGAR" && <BrowseTab />}
        {tab === "GERAÇÕES" && <GenerationsTab />}
        {tab === "LINHA DO TEMPO" && <TimelineTab />}
      </div>
    </div>
  );
}
