import { useState, useRef, useEffect } from "react";
import Flags from "country-flag-icons/react/3x2";
import { ChevronDown, X, Search } from "lucide-react";

export const ALL_COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "ZA", name: "South Africa" },
  { code: "AL", name: "Albania" },
  { code: "DE", name: "Germany" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "DZ", name: "Algeria" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BH", name: "Bahrain" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BY", name: "Belarus" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "BT", name: "Bhutan" },
  { code: "CV", name: "Cape Verde" },
  { code: "CM", name: "Cameroon" },
  { code: "KH", name: "Cambodia" },
  { code: "CA", name: "Canada" },
  { code: "QA", name: "Qatar" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CY", name: "Cyprus" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo (DRC)" },
  { code: "KP", name: "North Korea" },
  { code: "KR", name: "South Korea" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Ivory Coast" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "EC", name: "Ecuador" },
  { code: "ER", name: "Eritrea" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "US", name: "United States" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "PH", name: "Philippines" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GH", name: "Ghana" },
  { code: "GE", name: "Georgia" },
  { code: "GD", name: "Grenada" },
  { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "YE", name: "Yemen" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IQ", name: "Iraq" },
  { code: "IR", name: "Iran" },
  { code: "IE", name: "Ireland" },
  { code: "IS", name: "Iceland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LS", name: "Lesotho" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MK", name: "North Macedonia" },
  { code: "MG", name: "Madagascar" },
  { code: "MY", name: "Malaysia" },
  { code: "MW", name: "Malawi" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MA", name: "Morocco" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MZ", name: "Mozambique" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "NZ", name: "New Zealand" },
  { code: "OM", name: "Oman" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PK", name: "Pakistan" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "United Kingdom" },
  { code: "CF", name: "Central African Republic" },
  { code: "DO", name: "Dominican Republic" },
  { code: "CZ", name: "Czech Republic" },
  { code: "RO", name: "Romania" },
  { code: "RW", name: "Rwanda" },
  { code: "RU", name: "Russia" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "LC", name: "Saint Lucia" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "ST", name: "São Tomé and Príncipe" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SG", name: "Singapore" },
  { code: "SY", name: "Syria" },
  { code: "SO", name: "Somalia" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SZ", name: "Eswatini" },
  { code: "SD", name: "Sudan" },
  { code: "SS", name: "South Sudan" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SR", name: "Suriname" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TH", name: "Thailand" },
  { code: "TW", name: "Taiwan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TR", name: "Turkey" },
  { code: "TV", name: "Tuvalu" },
  { code: "UA", name: "Ukraine" },
  { code: "UG", name: "Uganda" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
].sort((a, b) => a.name.localeCompare(b.name, "en"));

function Flag({ code, className }: { code: string; className?: string }) {
  const FlagComp = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[code];
  if (!FlagComp) return null;
  return <FlagComp className={className} />;
}

interface CountryPickerProps {
  value: string | null;
  onChange: (code: string | null) => void;
}

export function CountryPicker({ value, onChange }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = ALL_COUNTRIES.find((c) => c.code === value) ?? null;

  const filtered = search.trim()
    ? ALL_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_COUNTRIES;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(code: string | null) {
    onChange(code);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-widest border transition-colors ${
          value
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border hover:border-accent/50 text-muted-foreground"
        }`}
      >
        {selected ? (
          <>
            <Flag code={selected.code} className="w-4 h-auto shrink-0" />
            <span>{selected.name}</span>
          </>
        ) : (
          <span>Country</span>
        )}
        {value ? (
          <X
            className="w-3 h-3 ml-1 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              select(null);
            }}
          />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1 shrink-0" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-background border border-border shadow-xl">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => select(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-left hover:bg-card transition-colors ${
                !value ? "text-accent" : "text-muted-foreground"
              }`}
            >
              All countries
            </button>
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs font-mono text-muted-foreground text-center">
                No country found
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.code}
                onClick={() => select(c.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-xs text-left hover:bg-card transition-colors ${
                  value === c.code ? "text-accent bg-card" : "text-foreground"
                }`}
              >
                <Flag code={c.code} className="w-4 h-auto shrink-0" />
                <span>{c.name}</span>
                <span className="ml-auto text-muted-foreground">{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
