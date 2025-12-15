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
