# APP_CONTEXT.md - Hyokai Technical Reference

## Project Overview

**Hyokai** (氷解 - "ice melt") is a prompt transformation tool that converts natural language requests into precise technical specifications for AI coding agents and general assistants. Supports dual modes (coding/prompting), multi-model comparison, and bilingual UI (EN/JP).

## Deployment Architecture

Hyokai uses a **two-deployment architecture** with separate Vercel projects for the landing page and main application.

### Deployment Map

| Role | Vercel Project | Domain (Planned) | Description |
|------|----------------|------------------|-------------|
| **Landing Page** | `hyokai---curveball-edition` | `hyokai.io` | Marketing/intro page with "Launch App" CTA |
| **Main App** | `Hyokai-Vercel` | `app.hyokai.io` | The actual Hyokai transformation tool |

### Configuration

Deployment configuration is centralized in `src/config/deployments.ts`:

```typescript
import { LANDING_PAGE, MAIN_APP, getAppUrl, getLandingUrl } from '@/config/deployments';

// Get URL to launch app from landing page
const launchUrl = getAppUrl();           // https://app.hyokai.io
const libraryUrl = getAppUrl('/library'); // https://app.hyokai.io/library

// Get URL back to landing page
const homeUrl = getLandingUrl();          // https://hyokai.io

// CORS configuration
import { getAllowedOrigins, isAllowedOrigin } from '@/config/deployments';
```

### User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         hyokai.io (Landing)                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Marketing content, features overview, "Launch App" button    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ "Launch App"
┌─────────────────────────────────────────────────────────────────────┐
│                       app.hyokai.io (Main App)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Prompt transformation, model comparison, history, settings   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Domain Configuration Checklist

When setting up production domains:

1. [ ] Configure `hyokai.io` → `hyokai---curveball-edition` in Vercel
2. [ ] Configure `app.hyokai.io` → `Hyokai-Vercel` in Vercel
3. [ ] Update `src/config/deployments.ts` with actual domains
4. [ ] Update Supabase CORS settings to include new domains
5. [ ] Test cross-origin navigation between landing and app

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18.3, TypeScript 5.8, Vite 5.4 |
| **Styling** | Tailwind CSS 3.4, shadcn-ui (Radix UI), Lucide icons |
| **State** | React Context, custom hooks, localStorage persistence |
| **Backend** | Supabase Edge Functions (Deno), OpenRouter API |
| **Build** | Vite + SWC, ESLint 9, PostCSS |

**Key Dependencies**: `@tanstack/react-query`, `react-hook-form`, `zod`, `next-themes`, `sonner`

## Core Features

- Transform vague prompts into structured technical specifications
- **Coding Mode**: Optimized for IDE agents (Claude Code, Cursor, Copilot)
- **Prompting Mode**: Optimized for general AI (ChatGPT, Claude, Gemini)
- **Model Comparison**: Run same prompt through 2-4 models simultaneously
- **History**: localStorage-based session history with restore capability
- **i18n**: Full English/Japanese translation support
- Real-time elapsed time tracking per transformation

## Architecture & Structure

**Architecture**: React SPA + Serverless Edge Function

```
src/
├── pages/Index.tsx          # Main orchestrator - all features integrated here
├── components/
│   ├── ui/                  # shadcn-ui primitives (50+ components)
│   ├── Header.tsx           # App branding
│   ├── PromptInput.tsx      # User input textarea
│   ├── OutputPanel.tsx      # Single model output display
│   ├── ComparisonPanel.tsx  # Multi-model grid output
│   ├── ModelSelector.tsx    # Single model dropdown
│   ├── ModelMultiSelector.tsx # Multi-select checkboxes
│   ├── ModeToggle.tsx       # Coding/Prompting switch
│   ├── CompareToggle.tsx    # Single/Compare switch
│   ├── LanguageSelector.tsx # EN/JP toggle
│   └── HistoryPanel.tsx     # History sidebar
├── config/
│   └── deployments.ts       # Landing/App deployment configuration
├── contexts/
│   ├── AuthContext.tsx      # Supabase auth state + wasEverAuthenticated ref
│   ├── ModeContext.tsx      # Task mode state (coding|prompting)
│   └── LanguageContext.tsx  # Language state (en|jp) + t() function
├── hooks/
│   ├── usePromptTransformer.ts  # Single model transformation
│   └── useModelComparison.ts    # Parallel multi-model transformation
├── lib/
│   ├── models.ts            # AIModel[] definitions
│   ├── translations.ts      # EN/JP string map
│   ├── history.ts           # localStorage + DB CRUD for history
│   ├── dbRetry.ts           # Exponential backoff retry utility
│   └── utils.ts             # clsx/tailwind-merge helper
└── integrations/supabase/   # Supabase client setup

supabase/functions/
├── transform-prompt/index.ts  # Edge function: LLM API integration
└── user-data/index.ts         # Edge function: PAT encryption/decryption
```

## Data Models / Schema

```typescript
// AI Model Definition
interface AIModel {
  id: string;           // OpenRouter model ID
  name: string;         // Display name
  provider: string;     // "Google" | "Anthropic"
  thinking?: boolean;   // Extended reasoning mode
}

// History Entry (localStorage)
interface HistoryEntry {
  id: string;
  timestamp: number;
  input: string;
  taskMode: 'coding' | 'prompting';
  result: SingleModelResult | CompareModelResult;
}

interface SingleModelResult {
  type: 'single';
  modelName: string;
  modelProvider: string;
  output: string;
  elapsedTime: number | null;
}

interface CompareModelResult {
  type: 'compare';
  results: Array<{
    modelName: string;
    modelProvider: string;
    output: string | null;
    error: string | null;
    elapsedTime: number | null;
  }>;
}

// API Request (transform-prompt)
{ userPrompt: string, model: string, mode: string, thinking: boolean }

// API Response
{ result: string } | { error: string }
```

## Key Workflows

### Single Model Transformation
```
PromptInput → usePromptTransformer.transform()
  → supabase.functions.invoke('transform-prompt')
    → OpenRouter API (system prompt + user prompt)
  → OutputPanel displays result
  → Auto-save to history
```

### Model Comparison
```
ModelMultiSelector (2-4 models) → useModelComparison.compare()
  → Promise.all(models.map(transformWithModel))
    → Concurrent API calls, individual timers
  → ComparisonPanel updates as each completes
  → Auto-save all results to history
```

### State Persistence (localStorage keys)
- `hyokai-mode`: 'coding' | 'prompting'
- `hyokai-language`: 'en' | 'jp'
- `hyokai-selected-model-index`: number
- `hyokai-compare-model-indices`: number[]
- `hyokai-history`: HistoryEntry[] (max 50)

## Development Context

**Environment Variables** (`.env`):
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
```

**Edge Function Secrets** (Supabase dashboard):
- `OPENROUTER_API_KEY`: Required for LLM API calls

**Scripts**:
```bash
npm run dev      # Vite dev server (port 8080)
npm run build    # Production build to /dist
npm run lint     # ESLint check
```

**Key Config**:
- TypeScript: `strict: false`, path alias `@/` → `src/`
- Tailwind: Dark mode via class, custom ice-theme colors
- Vite: SWC for fast compilation

**Available Models** (hardcoded in `lib/models.ts`):
1. Gemini 3 Pro (Google)
2. Gemini 3 Pro + Thinking
3. Claude Sonnet 4.5 (Anthropic)
4. Claude Sonnet 4.5 + Thinking

**System Prompts** (in edge function):
- `CODING_MODE_SYSTEM_PROMPT`: 167 lines - transforms for IDE coding agents
- `PROMPTING_MODE_SYSTEM_PROMPT`: 388 lines - transforms for general AI assistants

Both enforce: transform-only output, no preamble, add structure/criteria/edge cases.

## Critical Implementation Notes

- History saves automatically when `isLoading` transitions false → detected via `useRef` + `useEffect`
- Compare mode uses per-model timers via `Map<number, NodeJS.Timeout>`
- Model selection stores index (not ID) because thinking variants share same model ID
- Edge function strips unwanted headers from LLM output (indexOf + regex fallback)
- Hybrid persistence: localStorage (offline) + Supabase DB (authenticated users)
- Two-deployment architecture: Landing Page + Main App (see Deployment Architecture)
- Deployed via Vercel (frontend) + Supabase CLI (edge functions)
