import './_group.css';
import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

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

function BrowseTab() {
  const [sort, setSort] = useState<SortValue>("popular");
  const [generation, setGeneration] = useState<GenerationKey | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-3 mb-8">
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
        <div className="w-px bg-border self-stretch hidden sm:block" />
        <button className="flex items-center gap-2 px-3 py-1.5 border border-border text-muted-foreground font-mono text-xs uppercase tracking-widest hover:border-accent/50 transition-colors">
          País <span className="ml-1 text-[10px]">▾</span>
        </button>
        <div className="w-px bg-border self-stretch hidden sm:block" />
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setGeneration(null)}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
              !generation ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent/50 text-muted-foreground"
            }`}>
            Todas as gerações
          </button>
          {GENERATIONS.map((g) => (
            <button key={g.key} onClick={() => setGeneration(generation === g.key ? null : g.key)}
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

      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-6">
        284 nomes encontrados
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {MOCK_NAMES.map((item, idx) => (
          <div key={item.name}
            className="border border-border p-3 hover:border-accent transition-colors bg-card group flex flex-col cursor-pointer">
            <div className="font-mono text-xs text-muted-foreground mb-1">#{idx + 1}</div>
            <div className="font-bold uppercase group-hover:text-accent transition-colors truncate text-sm">{item.name}</div>
            <div className="font-mono text-xs text-muted-foreground mt-auto pt-2">
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
          <div key={g.key} className={`border ${g.color} border-2 p-6 flex flex-col gap-4`}>
            <div>
              <h3 className={`text-2xl font-bold uppercase tracking-tighter ${g.accent}`}>{g.label}</h3>
              <p className="font-mono text-xs text-muted-foreground mt-1">{g.years}</p>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {["Maria", "João", "Ana", "Pedro", "Paulo", "Carlos", "Lucas", "Juliana"].map((n) => (
                <span key={n} className={`px-2 py-1 font-mono text-xs uppercase border border-current/20 hover:bg-current/10 transition-colors cursor-pointer ${g.accent}`}>{n}</span>
              ))}
            </div>
            <div className={`font-mono text-xs uppercase tracking-widest ${g.accent} hover:underline flex items-center gap-1 mt-auto cursor-pointer`}>
              Ver todos <ArrowUpRight className="w-3 h-3" />
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
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
        Os nomes que marcaram cada década.
      </p>
      <div className="space-y-3">
        {MOCK_DECADES.map((d) => (
          <div key={d.decade}
            className={`border p-5 flex gap-6 items-start transition-colors ${
              d.decade >= 2020 ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            }`}>
            <div className="shrink-0">
              <div className={`text-3xl font-bold font-mono w-24 ${d.decade >= 2020 ? "text-accent" : ""}`}>{d.decade}s</div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {d.names.map((name, i) => (
                <span key={name}
                  className={`font-mono text-sm uppercase px-3 py-1.5 border transition-colors hover:border-accent hover:text-accent cursor-pointer ${
                    i === 0 ? "border-accent/50 text-foreground font-bold" : "border-border text-muted-foreground"
                  }`}>
                  {i === 0 && <span className="text-accent mr-1">#1</span>}{name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Atual() {
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
