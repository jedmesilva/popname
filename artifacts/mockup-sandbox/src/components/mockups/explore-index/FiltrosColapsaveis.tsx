import './_group.css';
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";

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
  { key: "boomer", label: "Baby Boomer", years: "1946–1964" },
  { key: "genx", label: "Geração X", years: "1965–1980" },
  { key: "millennial", label: "Millennial", years: "1981–1996" },
  { key: "genz", label: "Geração Z", years: "1997–2012" },
  { key: "alpha", label: "Geração Alpha", years: "2013+" },
] as const;
type GenerationKey = typeof GENERATIONS[number]["key"];

const TABS = ["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as const;
type Tab = typeof TABS[number];

const MOCK_NAMES = [
  { name: "Maria", count: 11200000 },
  { name: "João", count: 9800000 },
  { name: "Ana", count: 8500000 },
  { name: "Pedro", count: 7600000 },
  { name: "Paulo", count: 6900000 },
  { name: "Carlos", count: 6200000 },
  { name: "Lucas", count: 5800000 },
  { name: "Juliana", count: 5100000 },
  { name: "Fernanda", count: 4800000 },
  { name: "Marcos", count: 4500000 },
  { name: "Luiza", count: 4200000 },
  { name: "Rafael", count: 3900000 },
  { name: "Camila", count: 3700000 },
  { name: "Gabriel", count: 3400000 },
  { name: "Isabela", count: 3200000 },
  { name: "Bruno", count: 2900000 },
  { name: "Letícia", count: 2700000 },
  { name: "Rodrigo", count: 2500000 },
  { name: "Amanda", count: 2300000 },
  { name: "Felipe", count: 2100000 },
  { name: "Beatriz", count: 1900000 },
  { name: "Diego", count: 1700000 },
  { name: "Larissa", count: 1500000 },
  { name: "Thiago", count: 1300000 },
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

const GEN_COLORS = ["border-amber-500 text-amber-500", "border-emerald-500 text-emerald-500", "border-violet-500 text-violet-500", "border-sky-500 text-sky-500", "border-pink-500 text-pink-500"];

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-600 text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--app-font-mono)' }}>
      {label}
      <button onClick={onRemove} className="hover:text-blue-800"><X className="w-3 h-3" /></button>
    </span>
  );
}

function BrowseTab() {
  const [sort, setSort] = useState<SortValue>("popular");
  const [generation, setGeneration] = useState<GenerationKey | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page] = useState(1);

  const activeCount = (generation ? 1 : 0);

  return (
    <div className="container mx-auto px-4 py-6" style={{ fontFamily: 'var(--app-font-sans)' }}>

      {/* Toolbar: sort + filter toggle */}
      <div className="flex items-center justify-between mb-4">
        {/* Sort — horizontal pill row */}
        <div className="flex gap-1 flex-wrap">
          {SORT_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => setSort(o.value)}
              className={`px-3 py-1.5 text-xs uppercase tracking-widest border transition-colors ${sort === o.value ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
              style={{ fontFamily: 'var(--app-font-mono)' }}>
              {o.label}
            </button>
          ))}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 border text-xs uppercase tracking-widest transition-colors ml-4 shrink-0 ${filtersOpen || activeCount > 0 ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
          style={{ fontFamily: 'var(--app-font-mono)' }}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros {activeCount > 0 && <span className="bg-white text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{activeCount}</span>}
          <ChevronDown className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Collapsible filter panel */}
      {filtersOpen && (
        <div className="border border-gray-200 bg-gray-50 p-4 mb-4 flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--app-font-mono)' }}>País</p>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs uppercase tracking-widest bg-white" style={{ fontFamily: 'var(--app-font-mono)' }}>
              Selecionar país <ChevronDown className="w-3 h-3 ml-1" />
            </button>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--app-font-mono)' }}>Geração</p>
            <div className="flex flex-wrap gap-1">
              {GENERATIONS.map((g) => (
                <button key={g.key}
                  onClick={() => setGeneration(generation === g.key ? null : g.key)}
                  className={`px-3 py-1.5 text-xs uppercase tracking-widest border transition-colors ${generation === g.key ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 text-gray-400 bg-white hover:border-gray-300"}`}
                  style={{ fontFamily: 'var(--app-font-mono)' }}>
                  {g.label} <span className="text-[10px] opacity-60 ml-0.5">{g.years}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {generation && (
            <ActiveChip
              label={GENERATIONS.find(g => g.key === generation)?.label ?? ""}
              onRemove={() => setGeneration(null)}
            />
          )}
        </div>
      )}

      {/* Results summary */}
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-5" style={{ fontFamily: 'var(--app-font-mono)' }}>
        284 nomes encontrados
      </p>

      {/* Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-8">
        {MOCK_NAMES.map((item, idx) => (
          <div key={item.name} className="border border-gray-200 p-3 bg-white flex flex-col cursor-pointer hover:border-blue-400 transition-colors group">
            <div className="text-[10px] text-gray-300 mb-1" style={{ fontFamily: 'var(--app-font-mono)' }}>#{idx + 1}</div>
            <div className="font-bold uppercase text-sm truncate group-hover:text-blue-500 transition-colors" style={{ fontFamily: 'var(--app-font-sans)' }}>{item.name}</div>
            <div className="text-[11px] text-gray-400 mt-auto pt-2" style={{ fontFamily: 'var(--app-font-mono)' }}>{(item.count / 1_000_000).toFixed(1)}M</div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <button disabled className="flex items-center gap-1 px-4 py-2 border border-gray-100 text-gray-200 cursor-not-allowed" style={{ fontFamily: 'var(--app-font-mono)' }}>
          <ChevronLeft className="w-4 h-4" /> ANTERIOR
        </button>
        <span className="text-gray-400" style={{ fontFamily: 'var(--app-font-mono)' }}>Pág. 1 de 12</span>
        <button className="flex items-center gap-1 px-4 py-2 border border-gray-200 hover:border-blue-400 transition-colors" style={{ fontFamily: 'var(--app-font-mono)' }}>
          PRÓXIMA <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GenerationsTab() {
  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-8" style={{ fontFamily: 'var(--app-font-mono)' }}>
        Nomes que dominaram cada geração.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {GENERATIONS.map((g, i) => (
          <div key={g.key} className={`border-l-4 ${GEN_COLORS[i].split(" ")[0]} border-gray-100 border border-l-[4px] p-5 flex flex-col gap-3`}>
            <div>
              <h3 className={`text-xl font-bold uppercase tracking-tight ${GEN_COLORS[i].split(" ")[1]}`} style={{ fontFamily: 'var(--app-font-sans)' }}>{g.label}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5" style={{ fontFamily: 'var(--app-font-mono)' }}>{g.years}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Maria", "João", "Ana", "Pedro", "Paulo", "Carlos", "Lucas", "Juliana"].map((n) => (
                <span key={n} className={`px-2 py-1 text-xs uppercase ${GEN_COLORS[i].split(" ")[1]}`} style={{ fontFamily: 'var(--app-font-mono)', border: '1px solid currentColor', opacity: 0.8 }}>{n}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineTab() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-2">
        {MOCK_DECADES.map((d) => (
          <div key={d.decade} className={`flex gap-0 ${d.decade >= 2020 ? "bg-blue-50" : ""}`}>
            <div className={`w-20 shrink-0 flex items-center justify-center border ${d.decade >= 2020 ? "border-blue-300 bg-blue-500 text-white" : "border-gray-200 bg-gray-50 text-gray-500"} font-bold text-sm`} style={{ fontFamily: 'var(--app-font-mono)' }}>
              {d.decade}s
            </div>
            <div className={`flex-1 flex flex-wrap gap-2 items-center p-3 border border-l-0 ${d.decade >= 2020 ? "border-blue-300" : "border-gray-200"}`}>
              {d.names.map((name, i) => (
                <span key={name} className={`text-sm uppercase px-2.5 py-1 cursor-pointer transition-colors ${i === 0 ? "bg-blue-500 text-white font-bold" : "text-gray-500 hover:text-black"}`} style={{ fontFamily: 'var(--app-font-mono)' }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FiltrosColapsaveis() {
  const [tab, setTab] = useState<Tab>("NAVEGAR");

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-8 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter uppercase" style={{ fontFamily: 'var(--app-font-sans)' }}>Índice</h1>
            <p className="text-gray-400 text-xs uppercase tracking-widest mt-1" style={{ fontFamily: 'var(--app-font-mono)' }}>
              Filtre, ordene e descubra padrões na nomenclatura humana.
            </p>
          </div>
        </div>
        {/* Tabs */}
        <div className="container mx-auto px-4 flex gap-0">
          {(["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-xs uppercase tracking-widest border-b-2 whitespace-nowrap transition-colors ${tab === t ? "border-blue-500 text-black" : "border-transparent text-gray-400 hover:text-black"}`}
              style={{ fontFamily: 'var(--app-font-mono)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "NAVEGAR" && <BrowseTab />}
      {tab === "GERAÇÕES" && <GenerationsTab />}
      {tab === "LINHA DO TEMPO" && <TimelineTab />}
    </div>
  );
}
