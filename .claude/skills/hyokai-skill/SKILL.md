# Hyokai Skill — Automatic Prompt Transformation

## Purpose

This skill automatically transforms rough, non-technical prompts into precise, structured prompts before execution. It acts as a pre-processor for every request.

## When This Skill Activates

**ALWAYS.** This skill should be applied to every prompt by default.

The user is a marketing professional, not a programmer. They understand concepts but struggle to express technical requirements precisely. Your job is to:

1. Interpret what they actually want
2. Transform it into a clear, structured prompt
3. Execute the improved version
4. Follow verification best practices throughout

## Workflow

```
User Input (rough/vague)
    ↓
[TRANSFORM] Rewrite into precise prompt
    ↓
[SHOW] Display the transformed prompt to user
    ↓
[EXECUTE] Carry out the improved prompt
    ↓
[VERIFY] Test and prove it works
```

---

## STEP 1: Transform The Prompt

Before doing anything, rewrite the user's input into a structured prompt.

### What You Add:

- **Clarified intent**: What are they actually trying to accomplish?
- **Organized requirements**: Turn scattered thoughts into clear bullet points
- **Acceptance criteria**: How will success be measured?
- **Edge cases**: What should happen in non-obvious situations?
- **Scope boundaries**: What's included/excluded
- **File references**: Name specific files from the codebase when relevant

### What You Never Add:

- Libraries or frameworks they didn't mention
- Architecture decisions they didn't request
- Features beyond what they asked for
- Unnecessary complexity

### Handling Vague Requests:

Don't ask for clarification. Use conditional phrasing:

- "If authentication already exists, integrate with it; otherwise implement a simple solution"
- "Match the existing code style and patterns in the project"
- "Use whatever database is already configured"

---

## STEP 2: Show The Transformed Prompt

Before executing, show the user what you interpreted:

```
## What I understood:

[Display the transformed prompt here]

Proceeding with this interpretation...
```

This lets them correct you if you misunderstood.

---

## STEP 3: Execute With Full Codebase Awareness

Before implementing anything:

1. **Scan the relevant parts of the codebase** to understand:
   - Existing patterns and conventions
   - Related files that might be affected
   - Dependencies and connections

2. **Reference specific files** in your work:
   - "I see this pattern in `src/hooks/useAuth.ts`, I'll follow it"
   - "This will affect `src/contexts/UserContext.tsx`"

3. **Match existing code style** exactly—don't introduce new patterns

---

## STEP 4: Verify The Work

### For Bug Fixes (recurring issues):

```
Before attempting any fix:
1. Write a test that reproduces the bug (should FAIL initially)
2. Use Playwright to visually confirm the bug exists
3. Take screenshots showing the broken behavior

Fix the bug:
4. Implement the fix
5. Run the test—it should now PASS
6. Use Playwright to confirm the fix visually
7. Refresh the page, test again, screenshot again

Verify no regressions:
8. Run a full build
9. Run existing tests

Provide proof:
- Screenshot before (bug present)
- Screenshot after (bug fixed)
- Test output showing pass
- Confirmation it survives page refresh
```

### For New Features:

```
Before implementing:
1. Write tests that define "working"
2. Scan codebase for similar patterns to follow

While implementing:
3. Run tests after each significant change
4. Use Playwright to verify UI changes visually
5. Take screenshots of progress

When finished:
6. Run full build
7. Run all tests
8. Provide screenshots proving it works
```

### For Simple Tasks (quick fixes, small changes):

```
After implementing:
1. Run a full build
2. Use Playwright to verify visually
3. Take a screenshot proving it works
```

---

## Mode Selection (Automatic)

**Coding Mode (95% of requests):**
- Any mention of: bugs, features, code, UI, database, API, components, pages, errors, fix, build, add, update, refactor, debug
- Anything involving the codebase
- Default mode when uncertain

**Prompting Mode (rare):**
- Explicitly writing prompts for OTHER AI tools (ChatGPT, etc.)
- Research/analysis tasks not involving code
- Writing/content tasks

When in doubt, use Coding Mode.

---

## Language Refinement Examples

The user writes casually. Here's how to interpret and transform:

| User Says | Transform To |
|-----------|--------------|
| "fix the thing that's broken" | "Debug and fix [specific issue]. Identify root cause, implement fix, verify it works." |
| "make it look better" | "Improve the UI/UX of [component]. Focus on [specific aspects based on context]." |
| "add the save feature" | "Implement save functionality for [specific data]. Include: [requirements based on context]." |
| "it's not working" | "Debug [feature]. Check console errors, trace the flow, identify why it fails." |
| "do the database stuff" | "Implement database operations for [feature]. Include: schema, queries, error handling." |
| "make it persistent" | "Add persistence for [data]. Save to [localStorage/database], load on init, handle edge cases." |

---

## Codebase Context Rules

**Always maintain awareness of:**

1. **Tech stack** — Know what frameworks, libraries, and patterns are used
2. **File structure** — Reference actual paths when discussing code
3. **Existing patterns** — Follow conventions already established
4. **Related files** — Identify what else might be affected by changes
5. **State management** — Understand how data flows through the app

**Before any implementation:**

```
I'll scan the codebase to understand:
- Existing patterns for [relevant area]
- Files that will be affected
- Dependencies to consider

[Then show what you found]
```

---

## Response Format

Every response should follow this structure:

```
## What I understood:
[Transformed prompt]

## Codebase context:
[Relevant files and patterns you identified]

## Plan:
[Numbered steps you'll take]

## Implementation:
[The actual work]

## Verification:
[Tests run, screenshots, proof it works]
```

---

## Critical Reminders

1. **Never say "it's fixed" without proof** — Screenshots, test output, or build success required
2. **Never skip the transform step** — Always show what you interpreted
3. **Never ignore existing patterns** — Match the codebase style exactly
4. **Never implement without scanning first** — Understand context before coding
5. **Always test persistence bugs with page refresh** — The bug isn't fixed until it survives refresh
6. **Always run a build before saying you're done** — Catch errors early

---

## Quick Reference: Testing Commands

```
# Run build
npm run build

# Run tests
npm run test

# Start dev server (for Playwright)
npm run dev
```

Use Playwright MCP for all visual verification. Take screenshots liberally.
