# Hyokai Migration: Lovable → Vercel + Self-Managed Supabase

## Overview

**Current Stack**: Vite + React SPA hosted on Lovable, Supabase Edge Functions
**Target Stack**: Vercel hosting, self-managed Supabase project

**Migration Complexity**: LOW - App is stateless, no database schema, single edge function

---

## Phase 1: Preparation & Export

### 1.1 Clone and Audit Repository
```bash
git clone https://github.com/shibakouen/hy-kai-prompt-forge.git
cd hy-kai-prompt-forge
npm install
```

### 1.2 Document Current Configuration
- **Supabase Project ID**: `hcapqmwmlswpvjsfvpxv`
- **Current URL**: `https://hcapqmwmlswpvjsfvpxv.supabase.co`
- **Edge Function**: `transform-prompt` (JWT verification disabled)
- **Secret Required**: `OPENROUTER_API_KEY`

### 1.3 Export OpenRouter API Key
1. Go to current Supabase dashboard → Settings → Edge Functions → Secrets
2. Copy `OPENROUTER_API_KEY` value (or generate new one at openrouter.ai/keys)

---

## Phase 2: Database Migration

### 2.1 Current Database State
**NO MIGRATION NEEDED** - Database schema is empty. App stores all data in localStorage:
- `hyokai-mode`, `hyokai-language`, `hyokai-selected-model-index`
- `hyokai-compare-model-indices`, `hyokai-history`

### 2.2 Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Select organization, name project (e.g., "hyokai-production")
4. Choose region closest to users
5. Set database password (save securely)
6. Wait for project to provision (~2 minutes)

### 2.3 Note New Credentials
From Project Settings → API:
- **Project URL**: `https://[NEW_PROJECT_ID].supabase.co`
- **Anon/Public Key**: `eyJ...` (safe for client-side)
- **Service Role Key**: Keep secret (not needed for this app)

---

## Phase 3: Edge Function Deployment

### 3.1 Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 3.2 Link to New Project
```bash
supabase link --project-ref [NEW_PROJECT_ID]
```

### 3.3 Set Function Secret
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### 3.4 Deploy Edge Function
```bash
supabase functions deploy transform-prompt
```

### 3.5 Verify Deployment
```bash
curl -X POST https://[NEW_PROJECT_ID].supabase.co/functions/v1/transform-prompt \
  -H "Content-Type: application/json" \
  -d '{"userPrompt":"test prompt","model":"google/gemini-3-pro-preview","mode":"coding","thinking":false}'
```
Expected: `{"result":"...transformed prompt..."}`

---

## Phase 4: Code Cleanup & Adaptation

### 4.1 Update Environment Variables
Edit `.env`:
```env
VITE_SUPABASE_URL="https://[NEW_PROJECT_ID].supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="[NEW_ANON_KEY]"
```

### 4.2 Update Supabase Config
Edit `supabase/config.toml`:
```toml
project_id = "[NEW_PROJECT_ID]"
```

### 4.3 Remove Lovable Dependencies (Optional)
Edit `package.json` - remove from devDependencies:
```json
"lovable-tagger": "^1.1.11"
```

Edit `vite.config.ts` - remove:
```typescript
import { componentTagger } from "lovable-tagger";
// Remove: mode === "development" && componentTagger(),
```

### 4.4 Update README
Remove Lovable references, add Vercel deployment badge

### 4.5 Test Locally
```bash
npm run dev
# Test all features: transform, compare, history, mode switching
npm run build
npm run preview
```

---

## Phase 5: Vercel Setup & Deployment

### 5.1 Create Vercel Project
1. Go to https://vercel.com/new
2. Import GitHub repository: `shibakouen/hy-kai-prompt-forge`
3. Framework Preset: **Vite** (auto-detected)
4. Build Command: `npm run build` (default)
5. Output Directory: `dist` (default)

### 5.2 Configure Environment Variables
In Vercel Project Settings → Environment Variables:
```
VITE_SUPABASE_URL = https://[NEW_PROJECT_ID].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = [NEW_ANON_KEY]
```
Apply to: Production, Preview, Development

### 5.3 Deploy
- Push to main branch triggers auto-deploy
- Or click "Deploy" in Vercel dashboard

### 5.4 Verify Deployment
- Visit `https://[project-name].vercel.app`
- Test all features end-to-end

---

## Phase 6: Domain & DNS (Optional)

### 6.1 Add Custom Domain in Vercel
1. Project Settings → Domains
2. Add domain (e.g., `hyokai.app`)
3. Follow DNS configuration instructions

### 6.2 Update CORS (if needed)
In edge function, update `HTTP-Referer` header if using custom domain:
```typescript
"HTTP-Referer": "https://hyokai.app",
```

---

## Phase 7: Post-Migration Verification

### 7.1 Functionality Checklist
- [ ] Single model transformation works
- [ ] Model comparison (2-4 models) works
- [ ] Thinking/reasoning mode works for all models
- [ ] History panel saves and restores correctly
- [ ] Mode toggle (coding/prompting) persists
- [ ] Language toggle (EN/JP) works
- [ ] Copy to clipboard functions

### 7.2 Performance Checks
- [ ] Cold start time < 3s
- [ ] Transform latency acceptable
- [ ] No console errors

### 7.3 Security Checks
- [ ] No secrets exposed in client bundle
- [ ] HTTPS enforced
- [ ] Edge function not leaking API key

---

## Pitfalls & Solutions

| Issue | Solution |
|-------|----------|
| Edge function 500 error | Check `OPENROUTER_API_KEY` secret is set |
| CORS errors | Verify Supabase project allows requests from Vercel domain |
| Build fails on Vercel | Ensure Node.js version matches (check `.nvmrc` or `engines`) |
| Environment vars not loading | Must use `VITE_` prefix for Vite to expose |
| Old Supabase still being called | Clear browser cache, verify `.env` updated |

---

## Files to Modify

| File | Change |
|------|--------|
| `.env` | Update Supabase URL and key |
| `supabase/config.toml` | Update project_id |
| `package.json` | Remove `lovable-tagger` (optional) |
| `vite.config.ts` | Remove `componentTagger` (optional) |
| `README.md` | Update deployment info |

---

## Estimated Time: 2-4 hours

- 30 min: Supabase project setup
- 30 min: Edge function deployment + testing
- 30 min: Frontend configuration
- 30 min: Vercel setup
- 30-60 min: End-to-end testing
