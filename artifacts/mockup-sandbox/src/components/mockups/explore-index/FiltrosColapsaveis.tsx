import './_group.css';
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";

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
  { key: "boomer",     label: "Baby Boomer",  years: "1946–1964", color: "border-amber-500",   accent: "text-amber-500"   },
  { key: "genx",       label: "Geração X",    years: "1965–1980", color: "border-emerald-500", accent: "text-emerald-500" },
  { key: "millennial", label: "Millennial",   years: "1981–1996", color: "border-violet-500",  accent: "text-violet-500"  },
  { key: "genz",       label: "Geração Z",    years: "1997–2012", color: "border-sky-500",     accent: "text-sky-500"     },
  { key: "alpha",      label: "Geração Alpha",years: "2013+",     color: "border-pink-500",    accent: "text-pink-500"    },
] as const;
type GenerationKey = typeof GENERATIONS[number]["key"];

const TABS = ["NAVEGAR", "GERAÇÕES", "LINHA DO TEMPO"] as const;
type Tab = typeof TABS[number];

const MOCK_NAMES = [
  { name: "Maria", count: 11200000 }, { name: "João", count: 9800000 },
  { name: "Ana", count: 8500000 },   { name: "Pedro", count: 7600000 },
  { name: "Paulo", count: 6900000 }, { name: "Carlos", count: 6200000 },
  { name: "Lucas", count: 5800000 }, { name: "Juliana", count: 5100000 },
  { name: "Fernanda", count: 4800000 }, { name: "Marcos", count: 4500000 },
  { name: "Luiza", count: 4200000 }, { name: "Rafael", count: 3900000 },
  { name: "Camila", count: 3700000 }, { name: "Gabriel", count: 3400000 },
  { name: "Isabela", count: 3200000 }, { name: "Bruno", count: 2900000 },
  { name: "Letícia", count: 2700000 }, { name: "Rodrigo", count: 2500000 },
  { name: "Amanda", count: 2300000 }, { name: "Felipe", count: 2100000 },
  { name: "Beatriz", count: 1900000 }, { name: "Diego", count: 1700000 },
  { name: "Larissa", count: 1500000 }, { name: "Thiago", count: 1300000 },
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

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/30 text-accent font-mono text-xs uppercase tracking-widest">
      {label}
      <button onClick={onRemove} className="hover:text-foreground transition-colors"><X className="w-3 h-3" /></button>
    </span>
  );
}

function BrowseTab() {
  const [sort, setSort] = useState<SortValue>("popular");
  const [generation, setGeneration] = useState<GenerationKey | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCount = generation ? 1 : 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Toolbar: sort left, filter toggle right */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-1">
          {SORT_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => setSort(o.value)}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
                sort === o.value
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border hover:border-accent/50 text-muted-foreground"
              }`}>
              {o.label}
            </button>
          ))}
        </div>

        <button onClick={() => setFiltersOpen(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 border font-mono text-xs uppercase tracking-widest transition-colors ml-4 shrink-0 ${
            filtersOpen || activeCount > 0
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border hover:border-accent/50 text-muted-foreground"
          }`}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="bg-accent-foreground text-accent rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{activeCount}</span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Collapsible filter panel */}
      {filtersOpen && (
        <div className="border border-border bg-card p-4 mb-4 flex flex-wrap gap-6">
          <div>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">País</p>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-border text-muted-foreground font-mono text-xs uppercase tracking-widest hover:border-accent/50 transition-colors">
              Selecionar país <ChevronDown className="w-3 h-3 ml-1" />
            </button>
          </div>
          <div>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Geração</p>
            <div className="flex flex-wrap gap-1">
              {GENERATIONS.map((g) => (
                <button key={g.key}
                  onClick={() => setGeneration(generation === g.key ? null : g.key)}
                  className={`px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
                    generation === g.key
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border hover:border-accent/50 text-muted-foreground"
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active chips */}
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

      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-5">
        284 nomes encontrados
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-8">
        {MOCK_NAMES.map((item, idx) => (
          <div key={item.name}
            className="border border-border p-3 hover:border-accent transition-colors bg-card group flex flex-col cursor-pointer">
            <div className="font-mono text-[10px] text-muted-foreground mb-1">#{idx + 1}</div>
            <div className="font-bold uppercase group-hover:text-accent transition-colors truncate text-sm">{item.name}</div>
            <div className="font-mono text-[11px] text-muted-foreground mt-auto pt-2">
              {(item.count / 1_000_000).toFixed(1)}M
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 font-mono text-sm">
        <button disabled className="flex items-center gap-1 px-4 py-2 border border-border opacity-30 cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" /> ANTERIOR
        </button>
        <span className="text-muted-foreground">Pág. 1 de 12</span>
        <button className="flex items-center gap-1 px-4 py-2 border border-border hover:border-accent transition-colors">
          PRÓXIMA <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GenerationsTab() {
  return (
    <div className="container mx-auto px-4 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Nomes que dominaram cada geração — baseado nos anos de nascimento.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {GENERATIONS.map((g) => (
          <div key={g.key} className={`border-2 ${g.color} border p-6 flex flex-col gap-3`}>
            <div>
              <h3 className={`text-xl font-bold uppercase tracking-tighter ${g.accent}`}>{g.label}</h3>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{g.years}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Maria", "João", "Ana", "Pedro", "Paulo", "Carlos", "Lucas", "Juliana"].map((n) => (
                <span key={n} className={`px-2 py-1 font-mono text-xs uppercase border border-current/20 cursor-pointer ${g.accent}`}>{n}</span>
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
          <div key={d.decade} className="flex gap-0">
            <div className={`w-20 shrink-0 flex items-center justify-center border font-bold font-mono text-sm ${
              d.decade >= 2020
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}>
              {d.decade}s
            </div>
            <div className={`flex-1 flex flex-wrap gap-2 items-center p-3 border border-l-0 ${
              d.decade >= 2020 ? "border-accent bg-accent/5" : "border-border"
            }`}>
              {d.names.map((name, i) => (
                <span key={name}
                  className={`font-mono text-sm uppercase px-2.5 py-1 cursor-pointer transition-colors ${
                    i === 0 ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  }`}>
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
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-2">Índice</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
            Mergulhe nos dados. Filtre, ordene e descubra padrões na nomenclatura humana.
          </p>
        </div>
        <div className="container mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 whitespace-nowrap transition-colors ${
                tab === t ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1">
        {tab === "NAVEGAR"        && <BrowseTab />}
        {tab === "GERAÇÕES"       && <GenerationsTab />}
        {tab === "LINHA DO TEMPO" && <TimelineTab />}
      </div>
    </div>
  );
}
