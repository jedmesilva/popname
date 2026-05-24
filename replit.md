# POPNAME

O índice de nomes da civilização humana. Busca, explora, reivindica e cria nomes humanos com dados globais reais.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/popname run dev` — run the frontend (uses PORT env var)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + Recharts + Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- OpenAPI spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/names.ts`, `lib/db/src/schema/claims.ts`
- API routes: `artifacts/api-server/src/routes/` (names.ts, index-stats.ts, claims.ts, forge.ts)
- Frontend pages: `artifacts/popname/src/pages/`
- Generated hooks: `lib/api-client-react/src/generated/api.ts`
- Generated Zod schemas: `lib/api-zod/src/generated/api.ts`

## Architecture decisions

- Contract-first: OpenAPI spec drives both frontend (React Query hooks) and backend (Zod validation)
- The stats endpoint always returns the global 4.381B figure — seeded data complements it, doesn't replace it
- Name search uses PostgreSQL `ILIKE` for case-insensitive matching
- Claims use UUID (not sequential ID) for public-facing identifiers
- Forge endpoint generates names algorithmically without external AI — combinations of base names + style-based generators

## Product

- **Buscar nome**: Pesquisa por nome com resultado detalhado (origem, significado, países, histórico)
- **Explorar**: Nomes mais populares por década, por país, mais raros, em ascensão/queda
- **Tendências**: Ranking de nomes em ascensão e declínio com filtros de período e sparklines
- **Crescimento** (`/crescimento`): Visualização de crescimento — histórico civil por `name_history` (anual, verificados) e tendência em tempo real por `name_trends` (diária, verified+pending)
- **Reivindicar**: Formulário para registrar existência no índice
- **Criar/Forjar**: Gera nomes únicos a partir de combinações, significados e estilos

## Views Supabase (crescimento)

- `name_history` — participação % por ano com base em `registration_date` (status = verified)
- `name_trends` — participação % por dia com base em `claimed_at` (status verified + pending)
- Endpoints: `GET /api/views/name-history?name=&country=&yearFrom=&yearTo=`
- Endpoints: `GET /api/views/name-trends?name=&country=&days=`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen` before touching routes or frontend
- The `/names/by-decade` endpoint returns hardcoded decade data (no DB table for this)
- Index stats always returns 4,381,229,047 as the headline number regardless of DB contents

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
