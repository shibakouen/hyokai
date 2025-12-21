# Verification & Testing Rules

Best practices for ensuring code actually works. Based on proven patterns for agentic coding.

---

## Core Principle

**Never say "it's fixed" or "it's done" without proof.**

Code that "should work" often doesn't. Visual verification and tests are the only reliable way to confirm success.

---

## Verification Tiers

Choose the appropriate level based on task complexity:

### Tier 1: Quick Check (Simple Tasks)
*Use for: Small changes, styling tweaks, copy updates*

```
After implementing:
1. Run the build to catch errors
2. Use Playwright to screenshot the result
3. Confirm it looks/works as expected
```

### Tier 2: Standard Verification (Most Features)
*Use for: New features, refactors, integrations*

```
Before implementing:
1. Scan codebase for existing patterns
2. Identify files that will be affected

While implementing:
3. Run build after significant changes
4. Use Playwright to verify UI changes visually
5. Take screenshots of progress

When finished:
6. Run full build (must pass)
7. Run existing tests (must pass)
8. Take final screenshots proving it works
```

### Tier 3: Rigorous Testing (Bug Fixes & Critical Features)
*Use for: Recurring bugs, auth flows, data persistence, payments*

```
Before attempting fix:
1. Write a test that reproduces the bug (should FAIL)
2. Use Playwright to visually confirm the bug
3. Take screenshots showing the broken behavior

Implement the fix:
4. Make the code changes
5. Run the test (should now PASS)
6. Use Playwright to verify the fix visually
7. Take screenshots showing correct behavior

Stress test:
8. Refresh the page—does it survive?
9. Close and reopen tab—still working?
10. Test edge cases—still correct?

Verify no regressions:
11. Run full build
12. Run all existing tests

Provide proof:
- Screenshot: before (bug present)
- Screenshot: after (bug fixed)
- Test output showing pass
- Confirmation of refresh survival
```

---

## Playwright Usage

Playwright MCP gives Claude Code browser control. Use it liberally.

### When To Use Playwright:

- Any UI changes (layout, styling, components)
- Any user flow (login, save, submit)
- Any data display (lists, tables, forms)
- Any bug verification
- Any "does it actually work?" question

### Basic Playwright Commands:

```
Use Playwright to:
1. Open http://localhost:3000
2. Navigate to [page/route]
3. Take a screenshot
4. [Perform action: click, type, etc.]
5. Take another screenshot
6. Report what you observe
```

### Debugging With Playwright:

```
Use Playwright to investigate [issue]:

1. Open the app at the relevant page
2. Take a screenshot of initial state
3. Open browser DevTools console
4. Check for errors
5. Check localStorage contents
6. Perform the action that triggers the bug
7. Screenshot the result
8. Report findings

DO NOT attempt a fix yet—just document what you observe.
```

---

## Testing Persistence Issues

Persistence bugs (data disappearing) require special verification:

```
Test persistence:
1. Create/save some test data
2. Screenshot showing data exists
3. Refresh the page (F5)
4. Screenshot immediately after refresh
5. Wait 3 seconds
6. Screenshot again
7. Check localStorage directly in console
8. Report: Does data persist? Does it flash then disappear?

If implementing a fix:
- Repeat all steps above
- Data must survive refresh
- Data must survive tab close/reopen
- No "flash then disappear" behavior
```

---

## Testing Authentication Issues

Auth bugs can be subtle. Full verification required:

```
Test auth flow:
1. Log out completely (clear session)
2. Screenshot: logged out state
3. Perform login
4. Screenshot: logged in state
5. Refresh page
6. Screenshot: should still be logged in
7. Check console for auth errors
8. Check localStorage for auth tokens
9. Wait 30 seconds, refresh again
10. Should still be logged in

Common auth issues to check:
- Multiple GoTrueClient instances
- Race conditions in session initialization
- Token refresh failures
- localStorage being cleared unexpectedly
```

---

## Build Verification

Always run the build before declaring success:

```bash
npm run build
```

The build must complete without errors. Warnings are acceptable but should be noted.

If build fails:
1. Read the error message carefully
2. Fix the issue
3. Run build again
4. Repeat until clean

---

## Test Running

If the project has tests, run them:

```bash
npm run test
```

All tests must pass. If a test fails:
1. Determine if your changes broke it
2. If yes: fix the issue
3. If no (pre-existing failure): note it but proceed

For bug fixes, write a NEW test that:
1. Reproduces the bug (fails initially)
2. Passes after your fix
3. Will catch regressions in the future

---

## Evidence Requirements

Minimum evidence per task type:

| Task Type | Required Evidence |
|-----------|-------------------|
| Styling change | Before/after screenshots |
| New feature | Screenshot of feature working |
| Bug fix | Screenshot before + after + test output |
| Persistence fix | Screenshots: save → refresh → still there |
| Auth fix | Screenshots: login → refresh → still logged in |
| Refactor | Build passing + tests passing |
| API integration | Screenshot of successful response + error handling |

---

## Red Flags: When Something Is Wrong

Watch for these signs that "fixed" code isn't actually fixed:

- **"It should work now"** — No verification was done
- **Build warnings** — May indicate real issues
- **Console errors** — Something is broken
- **Data flashes then disappears** — Race condition, not fixed
- **Works once, fails on refresh** — Persistence problem
- **Works in dev, fails in build** — Environment issue

If you see any of these: investigate further, don't declare success.

---

## Verification Checklist Template

Copy and use this for complex tasks:

```
## Verification Checklist

### Pre-implementation:
- [ ] Scanned codebase for relevant patterns
- [ ] Identified affected files
- [ ] Wrote failing test (if bug fix)
- [ ] Documented current broken state (if bug fix)

### Implementation:
- [ ] Followed existing code patterns
- [ ] Ran incremental builds
- [ ] Took progress screenshots

### Post-implementation:
- [ ] Full build passes
- [ ] All tests pass
- [ ] Visual verification via Playwright
- [ ] Persistence survives refresh (if applicable)
- [ ] Edge cases handled

### Evidence provided:
- [ ] Screenshot(s) of working feature
- [ ] Test output (if applicable)
- [ ] Build success confirmation
```
