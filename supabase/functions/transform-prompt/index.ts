import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// SUBSCRIPTION CHECKING
// ============================================================================

interface SubscriptionStatus {
  hasSubscription: boolean;
  planId: string | null;
  planName: string | null;
  transformationsUsed: number;
  transformationsLimit: number;
  transformationsRemaining: number;
  status: string | null;
  isTrialing: boolean;
  trialEndsAt: string | null;
  canTransform: boolean;
  overageAllowed: boolean;
}

async function getSubscriptionStatus(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<SubscriptionStatus> {
  const noSubscription: SubscriptionStatus = {
    hasSubscription: false,
    planId: null,
    planName: null,
    transformationsUsed: 0,
    transformationsLimit: 0,
    transformationsRemaining: 0,
    status: null,
    isTrialing: false,
    trialEndsAt: null,
    canTransform: false,
    overageAllowed: false,
  };

  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return noSubscription;
    }

    const isActive = data.status === "active" || data.status === "trialing";
    const isTrialing = data.status === "trialing";
    const remaining = Math.max(0, data.transformations_limit - data.transformations_used);

    // Allow transformation if: active/trialing AND (has remaining OR overage is allowed)
    const canTransform = isActive && (remaining > 0 || true); // Always allow overage for now

    return {
      hasSubscription: true,
      planId: data.plan_id,
      planName: data.subscription_plans?.name || null,
      transformationsUsed: data.transformations_used || 0,
      transformationsLimit: data.transformations_limit || 0,
      transformationsRemaining: remaining,
      status: data.status,
      isTrialing,
      trialEndsAt: data.trial_ends_at,
      canTransform,
      overageAllowed: true, // Will implement metered billing later
    };
  } catch (err) {
    console.error("Error checking subscription:", err);
    return noSubscription;
  }
}

async function incrementTransformationUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ success: boolean; isOverage: boolean; newUsage: number }> {
  try {
    // Get current subscription
    const { data: sub, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select("id, transformations_used, transformations_limit")
      .eq("user_id", userId)
      .single();

    if (fetchError || !sub) {
      return { success: false, isOverage: false, newUsage: 0 };
    }

    const newUsage = (sub.transformations_used || 0) + 1;
    const isOverage = newUsage > sub.transformations_limit;

    // Increment usage
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({ transformations_used: newUsage })
      .eq("id", sub.id);

    if (updateError) {
      console.error("Error incrementing usage:", updateError);
      return { success: false, isOverage, newUsage };
    }

    // Log transformation event
    await supabase.from("transformation_events").insert({
      user_id: userId,
      subscription_id: sub.id,
      is_overage: isOverage,
    });

    return { success: true, isOverage, newUsage };
  } catch (err) {
    console.error("Error incrementing transformation usage:", err);
    return { success: false, isOverage: false, newUsage: 0 };
  }
}

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================
const RATE_LIMITS = {
  // Authenticated users
  authenticated: {
    daily: 100000,     // tokens per day (100K - generous for development)
    monthly: 1000000,  // tokens per month (1M)
    perRequest: 8000,  // max tokens per single request (for large prompts)
  },
  // Anonymous users (by session)
  anonymous: {
    daily: 50000,      // tokens per day (50K - also generous for testing)
    perRequest: 4000,  // slightly lower per-request limit
  },
  // Email that bypasses all limits
  unlimitedEmail: "reimutomonari@gmail.com",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Estimate tokens from text (roughly 4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Parse token usage from OpenRouter response
function parseTokenUsage(data: {
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}): { input: number; output: number; estimated: boolean } {
  if (data.usage?.prompt_tokens !== undefined) {
    return {
      input: data.usage.prompt_tokens,
      output: data.usage.completion_tokens || 0,
      estimated: false,
    };
  }
  return { input: 0, output: 0, estimated: true };
}

// Create Supabase client with service role for admin operations
function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Extract user from JWT token
async function getUserFromToken(authHeader: string | null): Promise<{
  userId: string | null;
  email: string | null;
  isUnlimited: boolean;
}> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, email: null, isUnlimited: false };
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return { userId: null, email: null, isUnlimited: false };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { userId: null, email: null, isUnlimited: false };
    }

    return {
      userId: user.id,
      email: user.email || null,
      isUnlimited: user.email === RATE_LIMITS.unlimitedEmail,
    };
  } catch {
    return { userId: null, email: null, isUnlimited: false };
  }
}

// Check rate limits for authenticated user
async function checkAuthenticatedLimits(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  estimatedTokens: number
): Promise<{ allowed: boolean; error?: string; dailyRemaining?: number; monthlyRemaining?: number }> {
  // Get user's limits
  const { data: limits } = await supabase
    .from("user_usage_limits")
    .select("daily_token_limit, monthly_token_limit, max_tokens_per_request, is_unlimited")
    .eq("user_id", userId)
    .single();

  // If unlimited, allow immediately
  if (limits?.is_unlimited) {
    return { allowed: true, dailyRemaining: -1, monthlyRemaining: -1 };
  }

  const dailyLimit = limits?.daily_token_limit || RATE_LIMITS.authenticated.daily;
  const monthlyLimit = limits?.monthly_token_limit || RATE_LIMITS.authenticated.monthly;
  const perRequestLimit = limits?.max_tokens_per_request || RATE_LIMITS.authenticated.perRequest;

  // Check per-request limit
  if (estimatedTokens > perRequestLimit) {
    return {
      allowed: false,
      error: `Request too large (est. ${estimatedTokens} tokens). Maximum ${perRequestLimit} tokens per request. Try reducing your prompt or context.`,
    };
  }

  // Get daily usage
  const today = new Date().toISOString().split("T")[0];
  const { data: dailyUsage } = await supabase
    .from("api_usage")
    .select("total_tokens")
    .eq("user_id", userId)
    .gte("created_at", today)
    .lt("created_at", `${today}T23:59:59.999Z`);

  const dailyTotal = dailyUsage?.reduce((sum, row) => sum + (row.total_tokens || 0), 0) || 0;

  if (dailyTotal + estimatedTokens > dailyLimit) {
    return {
      allowed: false,
      error: `Daily limit reached (${dailyTotal}/${dailyLimit} tokens). Resets at midnight UTC.`,
      dailyRemaining: Math.max(0, dailyLimit - dailyTotal),
    };
  }

  // Get monthly usage
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthlyUsage } = await supabase
    .from("api_usage")
    .select("total_tokens")
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  const monthlyTotal = monthlyUsage?.reduce((sum, row) => sum + (row.total_tokens || 0), 0) || 0;

  if (monthlyTotal + estimatedTokens > monthlyLimit) {
    return {
      allowed: false,
      error: `Monthly limit reached (${monthlyTotal}/${monthlyLimit} tokens). Resets on the 1st.`,
      dailyRemaining: Math.max(0, dailyLimit - dailyTotal),
      monthlyRemaining: Math.max(0, monthlyLimit - monthlyTotal),
    };
  }

  return {
    allowed: true,
    dailyRemaining: dailyLimit - dailyTotal - estimatedTokens,
    monthlyRemaining: monthlyLimit - monthlyTotal - estimatedTokens,
  };
}

// Check rate limits for anonymous user (by session)
async function checkAnonymousLimits(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  estimatedTokens: number
): Promise<{ allowed: boolean; error?: string; dailyRemaining?: number }> {
  const today = new Date().toISOString().split("T")[0];

  // Check per-request limit
  if (estimatedTokens > RATE_LIMITS.anonymous.perRequest) {
    return {
      allowed: false,
      error: `Request too large. Sign in to unlock higher limits.`,
    };
  }

  // Get or create anonymous usage record
  const { data: existing } = await supabase
    .from("anonymous_usage")
    .select("tokens_today, last_request_date")
    .eq("session_id", sessionId)
    .single();

  let tokensToday = 0;

  if (existing) {
    // Reset if new day
    if (existing.last_request_date !== today) {
      tokensToday = 0;
    } else {
      tokensToday = existing.tokens_today || 0;
    }
  }

  if (tokensToday + estimatedTokens > RATE_LIMITS.anonymous.daily) {
    return {
      allowed: false,
      error: `Daily limit reached. Sign in for more tokens or wait until tomorrow.`,
      dailyRemaining: Math.max(0, RATE_LIMITS.anonymous.daily - tokensToday),
    };
  }

  return {
    allowed: true,
    dailyRemaining: RATE_LIMITS.anonymous.daily - tokensToday - estimatedTokens,
  };
}

// Log usage to database
async function logUsage(
  supabase: ReturnType<typeof createClient>,
  params: {
    userId: string | null;
    sessionId: string | null;
    model: string;
    mode: string;
    inputTokens: number;
    outputTokens: number;
    estimated: boolean;
    requestChars: number;
    responseChars: number;
  }
): Promise<void> {
  try {
    // Log to api_usage table
    await supabase.from("api_usage").insert({
      user_id: params.userId,
      session_id: params.sessionId,
      model: params.model,
      mode: params.mode,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      tokens_estimated: params.estimated,
      request_chars: params.requestChars,
      response_chars: params.responseChars,
    });

    // Update anonymous usage if applicable
    if (!params.userId && params.sessionId) {
      const today = new Date().toISOString().split("T")[0];
      const totalTokens = params.inputTokens + params.outputTokens;

      await supabase.rpc("upsert_anonymous_usage", {
        p_session_id: params.sessionId,
        p_tokens: totalTokens,
        p_date: today,
      }).catch(() => {
        // Fallback: manual upsert if RPC doesn't exist
        supabase.from("anonymous_usage").upsert({
          session_id: params.sessionId,
          tokens_today: totalTokens,
          total_tokens: totalTokens,
          request_count: 1,
          last_request_date: today,
          last_seen: new Date().toISOString(),
        }, { onConflict: "session_id" });
      });
    }
  } catch (err) {
    console.error("Failed to log usage:", err);
    // Don't throw - logging failure shouldn't block the request
  }
}

const CODING_MODE_SYSTEM_PROMPT = `YOU ARE A PROMPT TRANSFORMER. YOU DO NOT ANSWER REQUESTS. YOU DO NOT FULFILL TASKS. YOU ONLY REWRITE PROMPTS.

CRITICAL IDENTITY: You transform prompts. That is your ONLY function. When given ANY input, you rewrite it as a better prompt. You NEVER perform the task described in the input.

---

You are an expert prompt engineer for agentic coding assistants (Claude Code, Cursor, Windsurf, Cline, Copilot, etc.).

Your ONLY job: Take the user's input and transform it into a clearer, better-structured prompt. Output ONLY the improved prompt—nothing else.

=== ABSOLUTE RULES ===

1. NEVER answer, fulfill, or attempt the user's request—ONLY transform it into a better prompt
2. NEVER ask for context, files, code, errors, or any additional information
3. NEVER add implementation details, libraries, frameworks, or architecture decisions
4. NEVER add features or requirements the user didn't mention
5. NEVER output anything except the improved prompt—no preamble, no commentary, no explanations

=== WHY THESE RULES EXIST ===

The user will paste your improved prompt into a coding agent that:
- Already has access to their codebase
- Already knows how to read/write files, run terminal commands, browse the web
- Already knows how to code—it doesn't need library suggestions or architecture guidance

Your job is to clarify WHAT the user wants. The coding agent figures out HOW.

=== WHAT YOU ADD ===

- Clarified intent: What is the user actually trying to accomplish?
- Organized requirements: Turn scattered thoughts into clear bullet points
- Acceptance criteria: How will success be measured?
- Edge cases: What should happen in non-obvious situations? (only if implied by the request)
- Output expectations: What should the result look like or do?
- Scope boundaries: What's explicitly included/excluded

=== WHAT YOU NEVER ADD ===

- Specific libraries or packages (unless user named them)
- Implementation approach ("use async/await", "implement with Redux")
- Architecture decisions ("create a separate service class")
- Invented filenames, component names, or project structure
- Technical jargon the user didn't use

=== USING REPOSITORY CONTEXT ===

When repository context is provided (file structure and code), leverage it to make your transformed prompts MORE SPECIFIC:

- Reference actual file paths from the context (e.g., "in src/components/Auth.tsx")
- Mention specific functions, classes, or patterns you see in the code
- Use the project structure to scope the request appropriately
- If the user's request relates to code in the context, name the relevant files

Example with context showing a React app with src/hooks/useAuth.ts:
- Input: "fix the auth bug"
- Output: "Debug and fix the authentication bug. Start by examining the auth logic in src/hooks/useAuth.ts and trace through the authentication flow..."

WITHOUT context, keep prompts generic. WITH context, be specific.

=== HANDLING REFERENCES TO CONTEXT ===

When the user references files, code, errors, or content they'll provide:

WRONG: "Please provide the code and I'll help you..."
WRONG: "I'll need to see the error message first..."
RIGHT: Just write the improved prompt assuming context will be provided

Example:
- Input: "fix the bug in my auth flow"
- Output: "Debug and fix the bug in the authentication flow. Identify the root cause, implement the fix, and verify the flow works correctly. Explain what was broken and what you changed."

=== HANDLING VAGUE REQUESTS ===

Don't ask for clarification. Instead, write the prompt to cover reasonable interpretations or use conditional phrasing:

- "If authentication already exists, integrate with it; otherwise implement a simple auth solution"
- "Match the existing code style and patterns in the project"
- "Use whatever database is already configured, or set up a simple one if none exists"

=== EXAMPLES ===

INPUT: "add dark mode"

OUTPUT:
Add dark mode to the application.

Requirements:
- Add a toggle that lets users switch between light and dark mode
- Apply dark mode styling to all existing UI components
- Persist the user's preference across sessions
- Use system preference as the default for new users

Acceptance criteria:
- Toggle is easily accessible in the UI
- All text remains readable in both modes
- No flash of incorrect theme on page load

Match the existing styling patterns in the codebase.

---

INPUT: "the login is broken fix it"

OUTPUT:
Debug and fix the broken login functionality.

Steps:
1. Identify the root cause (check console errors, network requests, auth logic, backend responses)
2. Implement the fix
3. Verify the standard login flow works end-to-end

If you find multiple issues, fix all of them. After fixing, briefly explain what was broken and what you changed.

---

INPUT: "refactor this to be cleaner"

OUTPUT:
Refactor the provided code to improve clarity and maintainability.

Focus on:
- Reducing complexity and nesting
- Improving naming (variables, functions, classes)
- Extracting repeated logic into reusable functions
- Removing dead code or unused variables
- Adding clear separation of concerns where appropriate

Preserve all existing functionality—this is a refactor, not a feature change. Briefly explain the key changes you made.

---

INPUT: "make an api for user data"

OUTPUT:
Create a REST API for user data with full CRUD operations.

Endpoints:
- Create a new user
- Get user by ID
- Update user
- Delete user
- List users (with optional pagination)

Requirements:
- Validate input data and return clear error messages
- Use appropriate HTTP status codes
- Handle errors gracefully

Use whatever database and framework are already in the project, or make a sensible default choice if none exist. Keep it simple and conventional.

---

INPUT: "search the web for react best practices and update our code"

OUTPUT:
Search the web for current React best practices, then review and update the codebase to align with them.

Focus on:
- Component structure and organization
- State management patterns
- Performance optimizations
- Hook usage and custom hooks
- Error handling and loading states

For each change, briefly note what you updated and why. Prioritize impactful improvements over minor stylistic changes.

---

CRITICAL: Output ONLY the improved prompt text. Do NOT include:
- Headers like "Technical Prompt:" or "Improved Prompt:"
- Introductions like "Here's a better version:"
- Labels, prefixes, or formatting wrappers
- Explanations before or after

Just output the prompt content directly, ready to paste.

LANGUAGE: Always respond in the SAME LANGUAGE as the user's input. If the input is in Japanese, output in Japanese. If the input is in English, output in English. Match the input language exactly—do not translate.`;

const PROMPTING_MODE_SYSTEM_PROMPT = `YOU ARE A PROMPT TRANSFORMER. YOU DO NOT ANSWER REQUESTS. YOU DO NOT FULFILL TASKS. YOU ONLY REWRITE PROMPTS.

CRITICAL IDENTITY: You transform prompts. That is your ONLY function. When given ANY input, you rewrite it as a better prompt. You NEVER perform the task described in the input.

---

You are an expert prompt engineer for AI assistants—including chatbots (ChatGPT, Claude, Gemini) and tool-capable agents (those with browsing, search, code execution, file access).

Your ONLY job: Take the user's input and transform it into a clearer, better-structured prompt. Output ONLY the improved prompt—nothing else.

=== ABSOLUTE RULES ===

1. NEVER answer, fulfill, or attempt the user's request—ONLY transform it into a better prompt
2. NEVER ask for context, files, documents, images, or any additional information
3. NEVER add requirements or features the user didn't mention or clearly imply
4. NEVER output anything except the improved prompt—no preamble, no commentary, no explanations
5. NEVER turn simple capability words into technical jargon

=== WHY THESE RULES EXIST ===

The user will paste your improved prompt into an AI assistant (along with whatever context/files they have). Your job is to make the ASK clearer and better structured—not to fulfill it yourself or interrogate the user.

=== WHAT YOU ADD ===

- Role/persona: Give the AI a relevant expert identity when it helps (e.g., "Act as a financial advisor...")
- Clarified intent: Restate what the user wants in clear terms
- Structured deliverables: Break down what the response should include
- Output format: Specify tables, lists, step-by-step, comparisons, etc. when appropriate
- Quality guidance: "Be specific," "Include examples," "Verify current info," etc.
- Edge case handling: What should the AI do if information is missing or ambiguous—as an INSTRUCTION, not a question to the user

=== WHAT YOU NEVER ADD ===

- Technical implementation details ("use web scraping," "implement multi-threading," "call the API")
- Features the user didn't request
- Complexity that doesn't serve the request

=== HANDLING TOOL-CAPABLE AI (browsing, search, etc.) ===

When users reference AI capabilities like browsing, searching, or parallel work:

- Keep language natural: "search the web," "browse multiple sites," "check current prices"
- NEVER translate to technical specs: no "use Selenium," "implement async requests," "web scraping script"
- Add guidance on handling failures: "If you can't find X, note that and suggest alternatives"

=== HANDLING REFERENCES TO CONTEXT ===

When the user references documents, conversations, images, or data they'll provide:

WRONG: "Please provide the document and I'll analyze it..."
WRONG: "I'll need to see the conversation first..."
RIGHT: Just write the improved prompt assuming context will be attached

Example:
- Input: "analyze this convo between us founders"
- Output: The improved analysis prompt (see examples below)

=== EXAMPLES ===

INPUT: "analyze this convo between us founders n giv me the sentiment and other things u think would be good"

OUTPUT:
Analyze the conversation between founders provided below.

Assess:
- Overall sentiment (positive, negative, mixed, tense, collaborative, etc.)
- Communication dynamics—how are participants interacting?
- Key points of alignment and agreement
- Key points of tension, disagreement, or concern
- Underlying priorities or motivations each person seems to have
- Power dynamics or decision-making patterns

Flag any red flags or issues that might need addressing.

After analysis, provide:
- A brief summary of the relationship health based on this conversation
- 2-3 specific, actionable recommendations for improving communication or resolving tensions

Be direct and reference specific parts of the conversation to support your observations.

---

INPUT: "find me premium economy flights under $2k from JFK to Tokyo, at least 5 options, use the browser and work in parallel"

OUTPUT:
Act as an expert flight search assistant.

Find at least 5 one-way flight options in Premium Economy or Business Class that meet these criteria:
- Departure: JFK or LGA
- Arrival: HND or NRT
- Price: Under $2,000 USD per person (including taxes and fees)
- Nonstop flights only

Instructions:
- If travel dates are not specified, ask before searching
- Search multiple airline websites and booking platforms in parallel
- Prioritize official airline sites and reputable OTAs
- Verify each result actually meets ALL criteria before including it

Present results in a table:
| Airline | Flight # | Cabin | Route | Departure Time | Duration | Price (per person) | Total (2 passengers) | Booking Link |

After the table, provide:
- Best overall value pick
- Best comfort/service pick
- Any notable tradeoffs or considerations

---

INPUT: "explain how mortgages work"

OUTPUT:
Explain how mortgages work in clear, beginner-friendly terms.

Cover:
- What a mortgage is and how it differs from other loans
- Key components: principal, interest, down payment, loan term
- How monthly payments are structured (principal vs. interest over time)
- Fixed-rate vs. adjustable-rate mortgages—pros and cons of each
- What factors affect approval and interest rates
- Common mistakes first-time buyers make

Use simple language, avoid jargon, and include a concrete example with realistic numbers showing how a mortgage plays out over time.

---

INPUT: "help me write a cold email for my agency"

OUTPUT:
Write a cold outreach email for an agency.

The email should:
- Be under 150 words
- Have a compelling, non-spammy subject line
- Open with immediate relevance (not "I hope this finds you well")
- Clearly state one specific benefit or value proposition
- End with a low-friction call to action
- Sound human, not templated

Provide 2 versions:
1. More formal/professional tone
2. More casual/conversational tone

If the agency type, target audience, or key differentiator aren't clear from context, make reasonable assumptions and note them.

---

INPUT: "compare these two job offers"

OUTPUT:
Analyze and compare the two job offers provided below.

Compare across these dimensions:
- Total compensation (salary, bonus, equity, benefits)
- Role scope and growth potential
- Company trajectory and stability
- Work-life balance factors (hours, flexibility, remote policy)
- Learning and career development opportunities
- Team, culture, and management quality (based on available signals)
- Commute, location, or lifestyle factors

For each dimension, note which offer is stronger and why.

Provide:
- A summary table showing the key tradeoffs
- Your overall assessment of which offer is better for different priorities (e.g., "If you prioritize X, choose A; if you prioritize Y, choose B")
- Questions I should ask each company before deciding

---

INPUT: "make my resume better"

OUTPUT:
Review and improve the resume provided below.

Focus on:
- Clarity and impact of bullet points (use strong action verbs, quantify results where possible)
- Overall structure and visual hierarchy
- Relevance and ordering of sections
- Eliminating filler, redundancy, or weak language
- Consistency in formatting, tense, and style

Provide:
1. Specific line-by-line edits with explanations
2. General strategic feedback on positioning
3. The revised resume in full

If the target role or industry isn't clear, ask or note your assumptions.

---

INPUT: "research competitors to notion"

OUTPUT:
Research and analyze the top competitors to Notion in the productivity and workspace software market.

For each competitor (aim for 5-7), provide:
- Product name and company
- Target audience (individuals, teams, enterprises)
- Core value proposition—what they do better or differently than Notion
- Key features that differentiate them
- Pricing structure (free tier, paid plans, enterprise)
- Notable strengths and weaknesses
- Recent news (funding, acquisitions, major updates)

Present as a comparison table plus brief written summaries.

Conclude with:
- Which competitors are most threatening to Notion and why
- Gaps in the market that aren't well-served

---

CRITICAL: Output ONLY the improved prompt text. Do NOT include:
- Headers like "Technical Prompt:" or "Improved Prompt:"
- Introductions like "Here's a better version:"
- Labels, prefixes, or formatting wrappers
- Explanations before or after

Just output the prompt content directly, ready to paste.

LANGUAGE: Always respond in the SAME LANGUAGE as the user's input. If the input is in Japanese, output in Japanese. If the input is in English, output in English. Match the input language exactly—do not translate.`;

// Modifier appended to system prompts in beginner mode
const BEGINNER_MODE_MODIFIER = `

---

ADDITIONAL INSTRUCTION: Keep the transformed prompt clear and easy to understand. Use straightforward language and avoid unnecessary jargon.`;

// Helper to manage quotes
const preserveQuotes = (text: string) => {
  const placeholders: Record<string, string> = {};
  let counter = 0;
  
  // Match double or single quoted strings, handling escapes
  const masked = text.replace(/("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*')/g, (match) => {
    const placeholder = `{{QUOTE_${counter++}}}`;
    placeholders[placeholder] = match;
    return placeholder;
  });
  
  return { masked, placeholders };
};

const restoreQuotes = (text: string, placeholders: Record<string, string>) => {
  let result = text;
  for (const [placeholder, original] of Object.entries(placeholders)) {
    result = result.split(placeholder).join(original);
  }
  return result;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const { userPrompt, userContext, gitContext, model, mode, thinking, beginnerMode, sessionId } = await req.json();

    // ========================================================================
    // AUTHENTICATION & RATE LIMITING
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    const { userId, email, isUnlimited } = await getUserFromToken(authHeader);

    // Create service client for database operations
    let serviceClient: ReturnType<typeof createClient> | null = null;
    try {
      serviceClient = createServiceClient();
    } catch {
      console.warn("Rate limiting disabled: missing Supabase config");
    }

    // Estimate input tokens for rate limiting check
    const inputText = `${userPrompt || ""}${userContext || ""}${gitContext || ""}`;
    const estimatedInputTokens = estimateTokens(inputText);

    // Check rate limits (skip for unlimited users)
    let rateLimitResult: { allowed: boolean; error?: string; dailyRemaining?: number; monthlyRemaining?: number } = { allowed: true };

    if (serviceClient && !isUnlimited) {
      if (userId) {
        // Authenticated user
        rateLimitResult = await checkAuthenticatedLimits(serviceClient, userId, estimatedInputTokens);
      } else if (sessionId) {
        // Anonymous user with session
        rateLimitResult = await checkAnonymousLimits(serviceClient, sessionId, estimatedInputTokens);
      }
      // If no userId and no sessionId, allow (first-time user gets one free request)
    }

    // Return 429 if rate limited
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for ${userId || sessionId || "unknown"}: ${rateLimitResult.error}`);
      return new Response(
        JSON.stringify({
          error: rateLimitResult.error,
          code: "RATE_LIMIT_EXCEEDED",
          dailyRemaining: rateLimitResult.dailyRemaining,
          monthlyRemaining: rateLimitResult.monthlyRemaining,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Auth: " + (userId ? "user:" + userId.slice(0, 8) + "..." : sessionId ? "session:" + sessionId.slice(0, 8) + "..." : "anonymous") + ", unlimited: " + isUnlimited);

    // ========================================================================
    // SUBSCRIPTION CHECK (for authenticated users)
    // ========================================================================
    let subscriptionStatus: SubscriptionStatus | null = null;

    if (serviceClient && userId) {
      subscriptionStatus = await getSubscriptionStatus(serviceClient, userId);
      console.log("Subscription: " + (subscriptionStatus.hasSubscription ? subscriptionStatus.planName + " (" + subscriptionStatus.status + ")" : "none"));

      // For now, allow all authenticated users (free tier during development)
      // When ready to enforce, uncomment:
      // if (!subscriptionStatus.canTransform && !isUnlimited) {
      //   return new Response(
      //     JSON.stringify({
      //       error: subscriptionStatus.hasSubscription
      //         ? "Monthly limit reached. Upgrade your plan for more transformations."
      //         : "Subscription required. Please subscribe to continue.",
      //       code: subscriptionStatus.hasSubscription ? "LIMIT_REACHED" : "NO_SUBSCRIPTION",
      //       subscription: subscriptionStatus,
      //     }),
      //     {
      //       status: 403,
      //       headers: { ...corsHeaders, "Content-Type": "application/json" },
      //     }
      //   );
      // }
    }

    // Select system prompt based on mode
    let systemPrompt = mode === 'prompting'
      ? PROMPTING_MODE_SYSTEM_PROMPT
      : CODING_MODE_SYSTEM_PROMPT;

    // Beginner mode appends a modifier to keep output simple and jargon-free
    if (beginnerMode) {
      systemPrompt += BEGINNER_MODE_MODIFIER;
    }

    if (!userPrompt || typeof userPrompt !== "string") {
      throw new Error("userPrompt is required and must be a string");
    }

    // Preserve quotes
    const { masked: maskedPrompt, placeholders } = preserveQuotes(userPrompt);

    // Estimate total tokens (rough: 1 token ≈ 4 chars)
    const userContextChars = userContext?.length || 0;
    const gitContextChars = gitContext?.length || 0;
    const promptChars = userPrompt.length;
    const systemChars = systemPrompt.length;
    const totalChars = userContextChars + gitContextChars + promptChars + systemChars;
    const estimatedTokens = Math.ceil(totalChars / 4);

    // Warn if approaching limits but don't block (let the API handle it)
    const TOKEN_WARNING_THRESHOLD = 100000; // ~100k tokens is very large
    if (estimatedTokens > TOKEN_WARNING_THRESHOLD) {
      console.warn(`Large request: ~${estimatedTokens} estimated tokens`);
    }

    // Construct user message with optional context (no size limit)
    let userMessage = maskedPrompt;

    // Build context section if any context is provided
    const contextParts: string[] = [];

    // Add user context if provided
    if (userContext) {
      contextParts.push(`BACKGROUND CONTEXT:\n${userContext}`);
    }

    // Add git context if provided (only in coding mode)
    if (gitContext && mode === 'coding') {
      contextParts.push(`REPOSITORY CONTEXT:\n${gitContext}`);
    }

    // Combine context with prompt
    if (contextParts.length > 0) {
      userMessage = `${contextParts.join('\n\n')}\n\n---\n\nTransform this prompt:\n${maskedPrompt}`;
    }

    console.log(`=== HYOKAI REQUEST DEBUG ===`);
    console.log(`Model: ${model}`);
    console.log(`Mode: ${mode}`);
    console.log(`Beginner Mode: ${beginnerMode || false}`);
    console.log(`Thinking: ${thinking}`);
    console.log(`User context: ${userContext ? `${userContext.length} chars` : 'none'}`);
    console.log(`Git context: ${gitContext ? `${gitContext.length} chars` : 'none'}`);
    console.log(`User prompt (${userPrompt.length} chars): ${userPrompt.substring(0, 100)}...`);
    console.log(`System prompt length: ${systemPrompt.length} chars`);
    console.log(`Estimated total tokens: ~${estimatedTokens}`);

    // Build request body - OpenRouter uses OpenAI-compatible format for ALL models
    // System prompt goes in messages array with role: "system"
    // Increase max_tokens for larger contexts to allow complete transformations
    const requestBody: Record<string, unknown> = {
      model: model || "google/gemini-3-pro-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 8192, // Increased to handle larger context transformations
      temperature: 0.3,
    };

    // Add reasoning parameters for thinking mode
    // Different providers use different reasoning parameter formats
    if (thinking) {
      const modelLower = (model || "").toLowerCase();
      if (modelLower.includes("x-ai/grok-4") || modelLower.includes("x-ai/grok-4.1")) {
        // xAI Grok 4/4.1 models use { enabled: true }
        requestBody.reasoning = {
          enabled: true
        };
      } else {
        // Anthropic, Google, and xAI Grok 3 Mini use { effort: "high" }
        requestBody.reasoning = {
          effort: "high"
        };
      }
    }

    console.log(`Request body (messages count): ${(requestBody.messages as unknown[]).length}`);
    console.log(`First message role: ${(requestBody.messages as Array<{role: string}>)[0].role}`);
    console.log(`=== END DEBUG ===`);

    // Add timeout to prevent hanging on slow API responses
    const FETCH_TIMEOUT_MS = 120000; // 2 minutes - generous for large prompts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://hyokai.vercel.app",
          "X-Title": "Hyokai Technical Prompt Transformer",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error("Request timed out. The AI model is taking too long to respond. Please try again or select a faster model.");
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);

      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("Insufficient credits on OpenRouter. Please add credits to your account.");
      }
      // Handle context length errors
      if (response.status === 400 && (errorText.includes("context") || errorText.includes("token") || errorText.includes("length"))) {
        throw new Error(`Context too large for this model. Try reducing your context size or selecting a model with a larger context window. (${estimatedTokens} estimated tokens)`);
      }
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let result = data.choices?.[0]?.message?.content;

    if (!result) {
      throw new Error("No response received from the model");
    }

    // Restore preserved quotes
    result = restoreQuotes(result, placeholders);

    // Strip unwanted prefixes that models add despite instructions
    result = result.trim();

    // Remove header patterns like "Technical Prompt:", "Improved Prompt:", etc.
    const lowerResult = result.toLowerCase();
    const headers = [
      'technical prompt:',
      'technical prompt\n',
      'improved prompt:',
      'improved prompt\n',
      'enhanced prompt:',
      'refined prompt:',
      'better prompt:',
      'output:',
      "here's the improved prompt:",
      "here is the improved prompt:",
    ];

    for (const header of headers) {
      const idx = lowerResult.indexOf(header);
      if (idx >= 0 && idx < 50) {
        result = result.slice(idx + header.length).trim();
        break;
      }
    }

    // Also strip markdown header variants
    result = result.replace(/^[\s]*(?:\*\*)?(?:#{1,3}\s*)?(?:Technical|Improved|Enhanced|Refined|Better)\s+Prompt:?\*{0,2}\s*/i, '').trim();

    console.log(`Output length: ${result.length} characters`);

    // ========================================================================
    // LOG USAGE TO DATABASE
    // ========================================================================
    if (serviceClient) {
      const tokenUsage = parseTokenUsage(data);

      // If API didn't return usage, estimate it
      let inputTokens = tokenUsage.input;
      let outputTokens = tokenUsage.output;
      let tokensEstimated = tokenUsage.estimated;

      if (tokensEstimated) {
        // Conservative estimate: 4 chars per token for input, actual for output
        inputTokens = estimatedInputTokens;
        outputTokens = estimateTokens(result);
      }

      // Log usage asynchronously (don't block response)
      logUsage(serviceClient, {
        userId,
        sessionId: sessionId || null,
        model: model || "google/gemini-3-pro-preview",
        mode: mode || "coding",
        inputTokens,
        outputTokens,
        estimated: tokensEstimated,
        requestChars: inputText.length,
        responseChars: result.length,
      }).catch(err => console.error("Usage logging failed:", err));

      console.log("Tokens: " + inputTokens + " in + " + outputTokens + " out = " + (inputTokens + outputTokens) + " total (" + (tokensEstimated ? "estimated" : "actual") + ")");
    }

    // ========================================================================
    // INCREMENT SUBSCRIPTION USAGE (for subscribed users)
    // ========================================================================
    let usageIncrement: { success: boolean; isOverage: boolean; newUsage: number } | null = null;

    if (serviceClient && userId && subscriptionStatus?.hasSubscription) {
      usageIncrement = await incrementTransformationUsage(serviceClient, userId);
      if (usageIncrement.success) {
        console.log("Usage incremented: " + usageIncrement.newUsage + "/" + subscriptionStatus.transformationsLimit + (usageIncrement.isOverage ? " (OVERAGE)" : ""));

        // Update subscription status with new usage
        subscriptionStatus.transformationsUsed = usageIncrement.newUsage;
        subscriptionStatus.transformationsRemaining = Math.max(0, subscriptionStatus.transformationsLimit - usageIncrement.newUsage);
      }
    }

    // Include remaining tokens and subscription info in response for UI display
    return new Response(JSON.stringify({
      result,
      usage: {
        dailyRemaining: rateLimitResult.dailyRemaining,
        monthlyRemaining: rateLimitResult.monthlyRemaining,
        isUnlimited,
      },
      subscription: subscriptionStatus ? {
        planName: subscriptionStatus.planName,
        transformationsUsed: subscriptionStatus.transformationsUsed,
        transformationsLimit: subscriptionStatus.transformationsLimit,
        transformationsRemaining: subscriptionStatus.transformationsRemaining,
        isTrialing: subscriptionStatus.isTrialing,
        trialEndsAt: subscriptionStatus.trialEndsAt,
        isOverage: usageIncrement?.isOverage || false,
      } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Transform error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
