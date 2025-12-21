# Prompt Transformation Rules

## Core Principle

Transform vague requests into precise, actionable prompts. The user thinks in concepts; you translate to specifics.

---

## Transformation Framework

### 1. Identify Intent

What is the user actually trying to accomplish? Look past the words to the goal.

| They Say | They Mean |
|----------|-----------|
| "fix it" | Debug, find root cause, implement solution, verify |
| "add [feature]" | Implement feature with standard UX patterns, handle edge cases |
| "make it work" | Something is broken—diagnose and repair |
| "clean this up" | Refactor without changing functionality |
| "it disappeared" | Data persistence issue—localStorage, state, or race condition |
| "connect to [service]" | Integrate API/database with proper error handling |

### 2. Add Structure

Break down into clear sections:

```
[One-line summary of the task]

Requirements:
- [Specific requirement 1]
- [Specific requirement 2]
- [Specific requirement 3]

Acceptance criteria:
- [How to verify requirement 1 is met]
- [How to verify requirement 2 is met]

Edge cases to handle:
- [What happens if X]
- [What happens if Y]
```

### 3. Reference The Codebase

When you know the project structure, be specific:

❌ Vague: "Fix the auth bug"
✅ Specific: "Debug the authentication bug. Start by examining `src/contexts/AuthContext.tsx` and trace the session handling logic. Check for race conditions in the `useEffect` that initializes auth state."

❌ Vague: "Add a save button"
✅ Specific: "Add a save button to the `InstructionEditor` component. Follow the existing button patterns in `src/components/ui/button.tsx`. Persist to the `user_instructions` table via the existing Supabase client."

---

## Transformation Examples

### Bug Fixes

**Input:** "the data keeps disappearing"

**Transformed:**
```
Debug and fix the data persistence issue where data disappears unexpectedly.

Investigation steps:
1. Identify what data is disappearing (localStorage, database, state)
2. Check for race conditions in initialization logic
3. Verify data is being saved correctly
4. Verify data is being loaded correctly on refresh
5. Check for code that might be clearing data unintentionally

Root cause analysis:
- Add console logs to track data flow
- Check useEffect dependencies and timing
- Look for conditional logic that might trigger data clearing

Acceptance criteria:
- Data persists across page refresh
- Data persists across browser sessions
- No console errors related to data operations

After fixing, explain what caused the issue and what you changed.
```

---

**Input:** "login broken"

**Transformed:**
```
Debug and fix the broken login functionality.

Diagnosis steps:
1. Check console for errors during login attempt
2. Verify network requests are being sent correctly
3. Check authentication state management
4. Verify session handling and token storage
5. Test the complete login flow end-to-end

Acceptance criteria:
- User can log in with valid credentials
- Session persists after login
- Appropriate error messages for invalid credentials
- No console errors during successful login

After fixing, explain what was broken and what you changed.
```

---

### New Features

**Input:** "add dark mode"

**Transformed:**
```
Add dark mode to the application.

Requirements:
- Add a toggle switch accessible from the header/settings
- Apply dark styling to all existing UI components
- Persist user preference to localStorage
- Default to system preference for new users

Implementation notes:
- Follow existing theming patterns if present
- Use CSS variables or Tailwind dark: classes as appropriate
- Ensure all text remains readable in both modes

Acceptance criteria:
- Toggle switches between light and dark mode instantly
- Preference survives page refresh
- No flash of wrong theme on page load
- All components styled correctly in both modes
```

---

**Input:** "save the settings to database"

**Transformed:**
```
Implement database persistence for user settings.

Requirements:
- Create database table/schema for settings if needed
- Save settings when user makes changes
- Load settings on app initialization
- Fall back to defaults if no saved settings exist
- Handle save failures gracefully with user feedback

Data to persist:
- [Identify from context what settings exist]

Acceptance criteria:
- Settings save successfully (confirm with toast/feedback)
- Settings load correctly on fresh page load
- Settings sync across browser tabs (if applicable)
- Graceful handling when database is unavailable

Match existing database patterns in the codebase.
```

---

### Refactoring

**Input:** "clean up this mess"

**Transformed:**
```
Refactor the specified code to improve clarity and maintainability.

Focus on:
- Reducing complexity and deep nesting
- Improving variable and function names
- Extracting repeated logic into reusable functions
- Removing dead code and unused variables
- Adding comments for complex logic
- Separating concerns where appropriate

Constraints:
- Preserve ALL existing functionality
- Match existing code style in the project
- No new dependencies unless absolutely necessary

After refactoring, briefly explain the key changes made.
```

---

### UI/UX Improvements

**Input:** "make it look better"

**Transformed:**
```
Improve the UI/UX of the specified component/page.

Focus on:
- Visual hierarchy and spacing
- Consistent use of existing design system
- Responsive behavior across screen sizes
- Interactive feedback (hover states, loading states)
- Accessibility (contrast, focus indicators)

Constraints:
- Follow existing design patterns in the codebase
- Use existing UI components from the component library
- Maintain all current functionality

Use Playwright to take before/after screenshots for comparison.
```

---

## Conditional Phrasing

When requirements are ambiguous, don't ask—use conditional statements:

```
If authentication already exists, integrate with the existing auth system.
Otherwise, implement a simple session-based solution.

If a component library is present, use existing components.
Otherwise, create minimal custom components matching the existing style.

If database tables exist for this data, use them.
Otherwise, create the necessary schema.
```

---

## Language Matching

Always output in the same language as the input:
- English input → English output
- Japanese input → Japanese output

Do not translate. Match exactly.
