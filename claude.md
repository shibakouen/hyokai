# Hyokai Development Notes

## Project Overview
Hyokai (氷解) is a prompt transformation tool that converts natural language into technical prompts for AI assistants. Built with React, Vite, TypeScript, and Tailwind CSS, deployed on Vercel.

## Recent Changes

### Auto-Scroll & Auto-Copy UX Enhancement (Dec 2024)
**Commit:** `feat: auto-scroll and auto-copy after prompt transformation`

Added post-transformation UX improvements:
- **Auto-scroll:** Viewport automatically scrolls to output section when transformation completes
- **Auto-copy:** Generated output is automatically copied to clipboard (single model mode only)
- **Toast notification:** Users see confirmation toast "Auto-copied to clipboard!"
- **Comparison mode:** Only auto-scrolls (no auto-copy since multiple outputs)

**Files modified:**
- `src/pages/Index.tsx` - Added outputSectionRef, auto-scroll/copy logic in useEffect
- `src/components/BeginnerView.tsx` - Same enhancements for Simple mode
- `src/lib/translations.ts` - Added EN/JP translations for auto-copy toast

**Translation keys added:**
```
output.autoCopied: "Auto-copied to clipboard!" / "クリップボードに自動コピーしました！"
output.autoCopiedMessage: "Ready to paste into your AI assistant." / "AIアシスタントに貼り付ける準備ができました。"
```

### Hook Ordering Bug Fix (Dec 2024)
**Commit:** `fix: move useLanguage hook before useEffects that depend on t()`

**Issue:** White screen with "Cannot access 'N' before initialization" error after deploying auto-scroll feature.

**Root cause:** `const { t } = useLanguage()` was called at line 187, but `t` was referenced in a useEffect at lines 66-101 (both in callback body and dependency array). JavaScript's temporal dead zone prevented accessing `t` before initialization.

**Fix:** Moved `useLanguage()` hook to line 60, before any useEffects that depend on `t()`.

**Lesson learned:** In React components, hooks that provide values used in other hooks/effects must be called first. Always ensure hook ordering follows dependency relationships.

### Japanese Translation Fix (Dec 2024)
**Commit:** `fix: add missing Japanese translations for simple mode on mobile`

Fixed hardcoded English strings in Simple mode:
- "chars" → `t('beginner.chars')` / "文字"
- "(edited)" → `t('beginner.edited')` / "(編集済み)"
- "Reset to original" → `t('beginner.resetToOriginal')` / "元に戻す"
- "Reset" → `t('beginner.reset')` / "リセット"
- "words" → `t('output.words')` / "単語"

**Files modified:**
- `src/components/BeginnerView.tsx`
- `src/components/OutputPanel.tsx`
- `src/components/ComparisonPanel.tsx`
- `src/lib/translations.ts`

### Mobile Bug Fix - Subsequent Generations Failing (Dec 2024)
**Commit:** `fix: resolve mobile-specific bug where subsequent generations fail`

**Issue:** On mobile, first transformation worked but subsequent ones failed silently.

**Root cause:**
1. Stale closures in `useCallback` - callbacks captured old `input` value
2. Radix Tooltip component interfering with touch events on transform button

**Fix:**
1. Added `inputValueRef` pattern to always read latest input value:
```typescript
const inputValueRef = useRef(input);
useEffect(() => {
  inputValueRef.current = input;
}, [input]);

const transform = useCallback(async () => {
  const currentInput = inputValueRef.current; // Always fresh
  // ...
}, [/* other deps, but NOT input */]);
```
2. Removed Tooltip wrapper from transform button in BeginnerView
3. Added `touch-manipulation` CSS class to buttons for better mobile touch handling

**Files modified:**
- `src/hooks/usePromptTransformer.ts`
- `src/hooks/useModelComparison.ts`
- `src/components/BeginnerView.tsx`
- `src/pages/Index.tsx`

## Architecture Notes

### State Management
- Single model mode: `usePromptTransformer` hook
- Compare mode: `useModelComparison` hook
- Both use refs to track previous loading state for detecting transformation completion

### Translation System
- `useLanguage()` hook provides `t()` function
- Translations in `src/lib/translations.ts`
- Supports EN and JP locales

### Deployment
- GitHub push to `main` triggers Vercel deployment
- Force deploy: `vercel --prod --yes`
- Check deployment: `vercel ls` and `vercel inspect <url>`

## Common Patterns

### Detecting async operation completion
```typescript
const prevLoadingRef = useRef(isLoading);

useEffect(() => {
  const wasLoading = prevLoadingRef.current;
  prevLoadingRef.current = isLoading;

  if (wasLoading && !isLoading && output) {
    // Operation just completed
  }
}, [isLoading, output]);
```

### Avoiding stale closures in callbacks
```typescript
const valueRef = useRef(value);
useEffect(() => {
  valueRef.current = value;
}, [value]);

const callback = useCallback(() => {
  const currentValue = valueRef.current; // Always fresh
}, [/* other deps */]);
```

---

## Planned Feature: Prompt Library Page

### Overview
Standalone `/library` page displaying 3000 prompts (1500 coding + 1500 general) from `docs/prompt-library.md` with fuzzy search and filtering.

### Key Decisions
- **Data Source**: Pre-process markdown → TypeScript at build time (`src/lib/promptLibraryData.ts`)
- **Navigation**: New route `/library` with back nav to home
- **Search**: Fuzzy search via fuse.js (~4KB)
- **Pagination**: 100 prompts per page
- **Beginner Mode**: Shows only beginner-level prompts (~500)
- **Click Behavior**: Copy prompt + navigate to home with input pre-filled

### Data Structure
```typescript
interface LibraryPrompt {
  id: string;                    // "coding-1", "general-1"
  number: number;                // 1-1500
  type: 'coding' | 'general';
  prompt: string;
  description: string;
  targetAudience: string;        // "vibe-coders", "seasoned-engineers"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;              // "Web Development - Frontend"
  tags: string[];                // For search indexing
}
```

### Files to Create
```
scripts/parse-prompt-library.ts      # Build-time markdown parser
src/lib/promptLibraryData.ts         # Generated 3000-prompt dataset
src/pages/PromptLibrary.tsx          # Main page
src/components/library/
  ├── LibraryHeader.tsx              # Back nav, title
  ├── LibrarySearchBar.tsx           # Fuzzy search input
  ├── LibraryFilters.tsx             # Type/difficulty/category
  ├── PromptCard.tsx                 # Individual prompt card
  ├── PromptGrid.tsx                 # Grid + pagination
  └── PromptDetailSheet.tsx          # Mobile detail view
src/hooks/usePromptLibrary.ts        # Main state hook
src/hooks/usePromptLibrarySearch.ts  # Fuse.js search
```

### Files to Modify
- `src/App.tsx` - Add `/library` route
- `src/pages/Index.tsx` - Add "View Library" link
- `src/lib/translations.ts` - Add ~40 EN/JP keys

### Performance
- `useMemo` for Fuse instance and filtered results
- Debounce search input (150ms)
- Lazy load page with `React.lazy`
- localStorage persistence: `hyokai-library-preferences`

### Full plan: `/Users/matteo/.claude/plans/smooth-petting-pie.md`

---

## CRITICAL: Auth Race Condition Bug (Dec 2024) - BIGGEST ISSUE

This bug survived **20+ fix attempts** across multiple commits. Document everything here for future reference.

### Symptoms
1. User data (history, contexts, GitHub settings) disappears on page refresh despite being logged in
2. Refreshing while logged out unexpectedly logs user back in
3. After unexpected re-login, all history and context data is lost
4. Intermittent behavior - sometimes works, sometimes doesn't

### Failed Fix Attempts (What NOT to do)
| Commit | Approach | Why It Failed |
|--------|----------|---------------|
| `650d5a3` | Initial auth implementation | No logout detection |
| `325c15e` | Prevent session clearing on refresh | Didn't address root cause |
| `e4a6e6b` | Clear all data on logout | Made it worse - cleared too eagerly |
| `87e3ed0` | Added `wasEverAuthenticated` STATE | React batching caused stale values |
| `17bfb52` | Changed to `useRef` for synchronous updates | Still had signOut race condition |
| `b67c10d` | Clear localStorage before signOut | Created NEW race condition |

### Root Cause #1: False Logout Detection
**Problem:** Consumer components cleared data when `!isAuthenticated && !isAuthLoading` was true during initial auth loading.

**Timeline of "danger zone":**
```
Page Load:     [isLoading=true,  isAuth=false, wasEver=false] → OK, loading
Auth Start:    [isLoading=true,  isAuth=false, wasEver=false] → OK, loading
DANGER ZONE:   [isLoading=false, isAuth=false, wasEver=false] → Effects fire!
Auth Complete: [isLoading=false, isAuth=true,  wasEver=true]  → Too late
```

**Solution:** Added `wasEverAuthenticated` ref (NOT state) set synchronously BEFORE state updates:
```typescript
// AuthContext.tsx
const wasEverAuthenticatedRef = useRef(false);

// When session found - set ref BEFORE state updates
if (initialSession?.user) {
  wasEverAuthenticatedRef.current = true;  // Synchronous!
  setSession(initialSession);              // Async batched
  setUser(initialSession.user);            // Async batched
}

// Consumer components check all three conditions
if (!isAuthenticated && !isAuthLoading && wasEverAuthenticated) {
  // Only clear if user WAS authenticated (real logout, not initial load)
}
```

**Why useRef instead of useState:**
- `useState` updates are batched/async - effects may run before new value propagates
- `useRef` updates are synchronous - value is immediately available
- The ref is read during render and included in context value

### Root Cause #2: SignOut Race Condition
**Problem:** Original signOut flow:
1. Clear localStorage tokens
2. Clear app data
3. Call `supabase.auth.signOut()` (async)

This allowed Supabase's background token refresh (or another tab) to write NEW tokens AFTER we cleared localStorage but BEFORE server session was invalidated.

**Solution:** Reorder operations - call signOut() FIRST:
```typescript
const signOut = useCallback(async () => {
  // 1. Call signOut FIRST - stops token refresh, invalidates server session
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
  }

  // 2. Clear localStorage (backup - signOut should have done this)
  clearSupabaseStorage();
  clearUserData();

  // 3. Clear React state
  wasEverAuthenticatedRef.current = false;
  setSession(null);
  setUser(null);
  // ...
}, []);
```

### Root Cause #3: Edge Case - Quick Navigation
**Problem:** If user clicks sign out then immediately refreshes/navigates, `signOut()` might not complete.

**Solution:** Added redundant cleanup in `SIGNED_OUT` event handler:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear localStorage here too (backup)
    clearSupabaseStorage();
    USER_DATA_KEYS.forEach(key => localStorage.removeItem(key));

    wasEverAuthenticatedRef.current = false;
    setSession(null);
    // ...
  }
});
```

### Files Involved
| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Main auth state, signOut logic, wasEverAuthenticatedRef |
| `src/contexts/UserContextContext.tsx` | Saved contexts - has logout detection effect |
| `src/contexts/GitRepoContext.tsx` | GitHub PAT/repos - has logout detection effect |
| `src/components/HistoryPanel.tsx` | Advanced history - has logout detection effect |
| `src/components/SimpleHistoryPanel.tsx` | Simple history - has logout detection effect |

### Correct Logout Detection Pattern
All consumer components must use this exact pattern:
```typescript
const { isAuthenticated, isLoading: isAuthLoading, wasEverAuthenticated } = useAuth();

useEffect(() => {
  if (!isAuthenticated && !isAuthLoading && wasEverAuthenticated) {
    // User explicitly logged out - safe to clear data
    // This does NOT fire during initial page load
    setData([]);
  }
}, [isAuthenticated, isAuthLoading, wasEverAuthenticated]);
```

### localStorage Keys Cleared on Logout
```typescript
const USER_DATA_KEYS = [
  'hyokai-user-context',
  'hyokai-saved-contexts',
  'hyokai-active-context-id',
  'hyokai-history',
  'hyokai-simple-history',
  'hyokai-github-pat',
  'hyokai-github-repos',
  'hyokai-github-settings',
  'hyokai-mode',
  'hyokai-language',
  'hyokai-beginner-mode',
  'hyokai-selected-model-index',
  'hyokai-compare-model-indices',
];
```

### Testing Checklist
1. **Login → Create data → Refresh 5x** - Data persists
2. **Login → Logout → Refresh 5x** - Stays logged out, no data
3. **Login → Create data → Logout** - Data is cleared
4. **Login as A → Create data → Logout → Login as B** - B sees no A data
5. **Two tabs: Logout in one** - Both tabs log out
6. **Slow network during logout** - Still logs out properly
7. **Quick refresh after logout click** - Stays logged out

### Key Lessons Learned
1. **React state batching is async** - Don't rely on useState for race condition guards
2. **useRef for synchronous values** - When timing matters, use refs
3. **Order of operations matters** - In signOut, invalidate server session BEFORE clearing local state
4. **Redundant cleanup is good** - Multiple code paths clearing data prevents edge cases
5. **Supabase has background operations** - Token refresh runs independently and can write to localStorage
