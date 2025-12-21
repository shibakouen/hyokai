# Quick Reference Cheatsheet

One-page reference for the Hyokai skill workflow.

---

## The Flow (Every Request)

```
1. TRANSFORM → Rewrite vague input into precise prompt
2. SHOW → Display what you understood
3. SCAN → Check codebase for patterns and context
4. EXECUTE → Implement with full awareness
5. VERIFY → Prove it works with evidence
```

---

## Response Template

```markdown
## What I understood:
[Your transformed version of their request]

## Codebase context:
[Relevant files, patterns, dependencies you found]

## Plan:
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Implementation:
[The actual work]

## Verification:
[Screenshots, test output, build results]
```

---

## Prompt Transformation Cheatsheet

| User Says | Transform To |
|-----------|--------------|
| "fix it" | Debug, find root cause, implement fix, verify |
| "broken" | Investigate error, trace flow, repair, confirm |
| "add X" | Implement X with requirements, edge cases, acceptance criteria |
| "not working" | Diagnose issue, check logs, identify failure point |
| "disappeared" | Debug persistence, check localStorage/state, verify data flow |
| "clean up" | Refactor for clarity, preserve functionality |
| "make it better" | Improve specific aspects (identify from context) |
| "connect to X" | Integrate with proper error handling and auth |

---

## Verification Quick Guide

**Simple task:**
```
→ Build passes
→ Screenshot of result
```

**Standard feature:**
```
→ Build passes
→ Tests pass
→ Screenshots proving it works
```

**Bug fix (especially recurring):**
```
→ Test that fails first, then passes
→ Before/after screenshots
→ Survives page refresh
→ Build + tests pass
```

**Persistence issue:**
```
→ Save data → Screenshot
→ Refresh → Screenshot
→ Data still there → Screenshot
→ Tab close/reopen → Still there
```

---

## Playwright Commands

```
# Basic visual check
Use Playwright to open localhost:3000 and take a screenshot

# Test a flow
Use Playwright to:
1. Open [url]
2. [Action]
3. Screenshot
4. [Action]
5. Screenshot
6. Report what you observed

# Debug investigation
Use Playwright to investigate [issue]:
1. Open the page
2. Check console for errors
3. Check localStorage
4. Perform the triggering action
5. Document what happens
DO NOT FIX YET—just report findings
```

---

## Build Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build (must pass)
npm run test     # Run tests (must pass)
```

---

## Never Do This

❌ Say "it should work" without testing
❌ Skip the transformation step
❌ Ignore existing code patterns
❌ Declare "fixed" without screenshots
❌ Skip build check
❌ Forget to test page refresh for persistence bugs
❌ Add features/libraries user didn't request

---

## Always Do This

✅ Show transformed prompt before executing
✅ Scan codebase for patterns first
✅ Match existing code style exactly
✅ Run build before declaring done
✅ Provide visual proof via Playwright
✅ Test persistence bugs with refresh
✅ Write tests for recurring bugs
