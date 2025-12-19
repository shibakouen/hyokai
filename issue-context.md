# Recurring Issue: Auth Race Condition Clearing User Data

## Issue Summary

**User data (history, contexts, GitHub PAT) is cleared on page load despite the user being logged in.**

The app incorrectly detects a "logout" during auth initialization and triggers cleanup effects that clear all user data. This happens because `isAuthLoading` becomes `false` BEFORE `isAuthenticated` becomes `true`, causing effects that check `(!isAuthenticated && !isAuthLoading)` to fire prematurely.

## Symptoms

- History panel shows empty after page refresh (despite user being logged in)
- User context/saved contexts disappear
- GitHub PAT and connected repos are cleared
- Sometimes duplicate history entries appear (5x duplicates)
- Issue is intermittent - depends on timing of auth state resolution

## Attempt History (Chronological)

| Commit | Date | Approach | Why It Failed |
|--------|------|----------|---------------|
| `650d5a3` | Dec 16 | Initial auth implementation | No logout detection, data mixed between users |
| `8a30ba3` | Dec 16 | Add context persistence | Didn't handle race condition |
| `a180824` | Dec 16 | Improve context persistence | Still no race condition handling |
| `30a01d0` | Dec 17 | Prevent auth timeout signing out | Addressed timeout but not race condition |
| `325c15e` | Dec 17 | Prevent session clearing on refresh | Fixed one path, not the effect-based clearing |
| `70509f5` | Dec 17 | History panel auth race + localStorage fallback | Added fallback but effects still cleared data |
| `6eba118` | Dec 17 | Resolve persistence issues | Unclear approach, issue persisted |
| `421fb46` | Dec 17 | Resolve sign-out and history refresh | Still using `!isAuthenticated && !isAuthLoading` |
| `20ef150` | Dec 17 | History panel auth race condition | Duplicate commit message, unclear changes |
| `e4a6e6b` | Dec 17 | Complete logout clears all data + optimize auth | Added `clearUserData()` on logout but made clearing MORE aggressive |
| `3d48e29` | Dec 17 | Clear context state on logout | Made UserContextContext clear state, but same race condition |
| `93f4171` | Dec 17 | Fix stale closure + add logging | Added `loadHistoryData` to deps - caused infinite loop |
| `38718af` | Dec 17 | Prevent infinite history sync loop | Removed `loadHistoryData` from deps with eslint-disable |
| `7729fd3` | Dec 17 | Prevent duplicate history saves | Added `compareHistorySavedRef` guard |
| `87e3ed0` | Dec 17 | **Added `wasEverAuthenticated` flag** | Attempted to fix race condition - still failing |
| `95dc9bc` | Dec 17 | Prevent duplicate entries with consistent IDs | Fixed ID mismatch issue, core race condition remains |

## Root Cause Analysis

The core issue is a **React state timing problem**:

```
Timeline during page load:
─────────────────────────────────────────────────────────────────────►
│                    │                      │                        │
│ isLoading=true     │ isLoading=false      │ isAuthenticated=true   │
│ isAuth=false       │ isAuth=false         │ (session restored)     │
│                    │ ▲▲▲ DANGER ZONE ▲▲▲  │                        │
│                    │ Effects fire here    │                        │
│                    │ clearing all data    │                        │
```

**Effects in these files check for logout:**
```typescript
// This condition is TRUE during the danger zone
if (!isAuthenticated && !isAuthLoading) {
  setHistory([]);  // DATA CLEARED!
}
```

**The `wasEverAuthenticated` fix (commit 87e3ed0) attempted to solve this:**
```typescript
if (!isAuthenticated && !isAuthLoading && wasEverAuthenticated) {
  // Only clear if user WAS authenticated before
}
```

**Why it's still failing:**
1. `wasEverAuthenticated` is set asynchronously when session is restored
2. Effects may run before `wasEverAuthenticated` propagates through React's state batching
3. Multiple effects across different contexts may have subtle timing differences

## Affected Files

### Primary (Logout Detection Effects)

| File | Lines | Effect Purpose |
|------|-------|----------------|
| `src/contexts/AuthContext.tsx` | 54-58, 154, 231 | Sets `wasEverAuthenticated` |
| `src/components/HistoryPanel.tsx` | 370-376 | Clears history on logout |
| `src/components/SimpleHistoryPanel.tsx` | 315-321 | Clears simple history on logout |
| `src/contexts/UserContextContext.tsx` | 243-252 | Clears contexts on logout |
| `src/contexts/GitRepoContext.tsx` | 256-268 | Clears GitHub data on logout |

### Secondary (Data Loading/Saving)

| File | Purpose |
|------|---------|
| `src/lib/history.ts` | History localStorage + DB operations |
| `src/lib/simpleHistory.ts` | Simple history localStorage + DB operations |
| `src/pages/Index.tsx` | Triggers history saves after transformation |
| `src/components/BeginnerView.tsx` | Triggers simple history saves |

## Current Status

**UNRESOLVED** - The issue persists after 16+ fix attempts over 2 days.

The `wasEverAuthenticated` approach is theoretically correct but has implementation issues:
1. State propagation timing across multiple contexts
2. Effects running before all state updates are batched
3. Possible re-renders triggering effects at wrong time

## Potential Solutions (Not Yet Tried)

1. **Use refs instead of state for `wasEverAuthenticated`** - Refs update synchronously and don't trigger re-renders

2. **Single source of truth** - Move ALL logout detection to AuthContext, emit an event that other contexts listen to

3. **Delay effect execution** - Use `setTimeout` or `requestIdleCallback` to defer cleanup

4. **Check user.id directly** - Instead of boolean flags, check if `user?.id` changed from a value to null

5. **Remove all automatic clearing** - Only clear data on explicit logout button click, not on auth state changes

## How to Reproduce

1. Log in with a valid account
2. Create some history entries (generate prompts)
3. Refresh the page
4. Observe: History/context may be empty despite being logged in
5. (Intermittent - may need multiple refreshes)
