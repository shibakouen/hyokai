// Force deployment v2 - 25KB file limit
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_API_BASE = "https://api.github.com";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Files and directories to always exclude
const EXCLUDED_PATTERNS = [
  /^\.git\//,
  /node_modules\//,
  /\.next\//,
  /dist\//,
  /build\//,
  /coverage\//,
  /\.cache\//,
  /\.vscode\//,
  /\.idea\//,
  /__pycache__\//,
  /\.pyc$/,
  /\.min\.js$/,
  /\.map$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

function shouldExcludePath(path: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(path));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body once - can't call req.json() multiple times
    const requestBody = await req.json();
    const { action, pat, owner, repo, branch, paths, prompt, tree, summary, repoFullName, keyFiles, fileContents } = requestBody;

    // PAT is required for GitHub API actions, but not for AI-powered file selection
    const requiresPat = action !== 'selectRelevantFiles';
    if (requiresPat && !pat) {
      return new Response(
        JSON.stringify({ error: "Personal Access Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers: HeadersInit = {
      "Authorization": `Bearer ${pat}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Hyokai-App",
    };

    switch (action) {
      case "validatePat": {
        // Validate PAT by fetching user info
        const response = await fetch(`${GITHUB_API_BASE}/user`, { headers });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 401) {
            return new Response(
              JSON.stringify({ error: "Invalid or expired Personal Access Token" }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        const user = await response.json();
        return new Response(
          JSON.stringify({ user: { login: user.login } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "listRepos": {
        // Fetch user's accessible repositories
        const response = await fetch(
          `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`,
          { headers }
        );

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 401) {
            return new Response(
              JSON.stringify({ error: "Invalid or expired Personal Access Token" }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        const repos = await response.json();

        // Extract only necessary fields
        const cleanRepos = repos.map((r: {
          id: number;
          name: string;
          full_name: string;
          owner: { login: string };
          private: boolean;
          default_branch: string;
        }) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          owner: { login: r.owner.login },
          private: r.private,
          default_branch: r.default_branch,
        }));

        return new Response(
          JSON.stringify({ repos: cleanRepos }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getTree": {
        if (!owner || !repo || !branch) {
          return new Response(
            JSON.stringify({ error: "owner, repo, and branch are required for getTree" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get recursive tree for repository
        const response = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
          { headers }
        );

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 404) {
            return new Response(
              JSON.stringify({ error: "Repository or branch not found" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (response.status === 401) {
            return new Response(
              JSON.stringify({ error: "Invalid or expired Personal Access Token" }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Filter and process tree
        interface TreeEntry {
          path: string;
          type: 'blob' | 'tree';
          sha: string;
          size?: number;
        }

        const tree: TreeEntry[] = (data.tree || [])
          .filter((entry: TreeEntry) =>
            (entry.type === 'blob' || entry.type === 'tree') &&
            !shouldExcludePath(entry.path)
          )
          .slice(0, 5000) // Limit entries
          .map((entry: { path: string; type: 'blob' | 'tree'; sha: string; size?: number }) => ({
            path: entry.path,
            type: entry.type,
            sha: entry.sha,
            size: entry.size,
          }));

        return new Response(
          JSON.stringify({ tree, truncated: data.truncated || tree.length >= 5000 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getFileContents": {
        if (!owner || !repo || !branch || !paths || !Array.isArray(paths)) {
          return new Response(
            JSON.stringify({ error: "owner, repo, branch, and paths[] are required for getFileContents" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Process files in batches of 20 to avoid overwhelming the API
        const BATCH_SIZE = 20;
        const MAX_FILES = 100; // Safety limit
        const limitedPaths = paths.slice(0, MAX_FILES);
        const allContents: Array<{ path: string; content?: string; error?: string; truncated?: boolean }> = [];

        // Process in batches
        for (let i = 0; i < limitedPaths.length; i += BATCH_SIZE) {
          const batch = limitedPaths.slice(i, i + BATCH_SIZE);

          const batchContents = await Promise.all(
            batch.map(async (path: string) => {
            try {
              const response = await fetch(
                `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
                { headers }
              );

              if (!response.ok) {
                return { path, error: `HTTP ${response.status}` };
              }

              const data = await response.json();

              // Handle directory response
              if (Array.isArray(data)) {
                return { path, error: "Path is a directory" };
              }

              // Check if it's a file with content
              if (data.type !== 'file' || !data.content) {
                return { path, error: "Not a readable file" };
              }

              // Decode base64 content
              let content: string;
              try {
                content = atob(data.content.replace(/\n/g, ''));
              } catch {
                return { path, error: "Unable to decode file content" };
              }

              // Check for binary content (presence of null bytes or too many non-printable chars)
              // Using character codes to avoid linter issues with control characters in regex
              let nonPrintable = 0;
              for (let i = 0; i < content.length; i++) {
                const code = content.charCodeAt(i);
                // Check for control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F)
                if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31)) {
                  nonPrintable++;
                }
              }
              if (nonPrintable > content.length * 0.1) {
                return { path, error: "Binary file" };
              }

              // Truncate large files (25KB to capture edge functions fully)
              const maxSize = 25000;
              const truncated = content.length > maxSize;
              if (truncated) {
                content = content.slice(0, maxSize) + '\n\n... [file truncated at 25KB]';
              }

              return { path, content, truncated };
            } catch (e) {
              return { path, error: e instanceof Error ? e.message : "Unknown error" };
            }
          })
          );

          allContents.push(...batchContents);
        }

        return new Response(
          JSON.stringify({ contents: allContents }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "selectRelevantFiles": {
        // AI-powered file selection with CONTENT SEARCH (like Claude Code)
        // The AI can see actual file contents to match user's descriptions

        if (!prompt || !tree || !repoFullName) {
          return new Response(
            JSON.stringify({ error: "prompt, tree, and repoFullName are required for selectRelevantFiles" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
        if (!OPENROUTER_API_KEY) {
          return new Response(
            JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Build file list (only blobs/files, not directories)
        interface TreeItem { path: string; type: string }
        const files = (tree as TreeItem[])
          .filter(entry => entry.type === 'blob')
          .map(entry => entry.path)
          .slice(0, 500); // Limit for token budget

        const fileListString = files.join('\n');

        // Build searchable content from keyFiles and fileContents
        // This lets the AI search for exact text matches like "Real Results: See the Difference"
        const allContents: Record<string, string> = {
          ...(keyFiles as Record<string, string> || {}),
          ...(fileContents as Record<string, string> || {}),
        };

        // Create a searchable index showing file paths and their key content
        // CRITICAL: Extract visible text strings so AI can find exact matches
        let contentIndex = '';
        const contentEntries = Object.entries(allContents);

        if (contentEntries.length > 0) {
          contentIndex = '\n\nFILE CONTENTS (search for exact text matches in these files):\n';

          for (const [filePath, content] of contentEntries) {
            if (!content || typeof content !== 'string') continue;

            // Determine file importance for content allocation
            const isHighPriority = /\.(tsx|jsx|ts|js|py|go|rs)$/i.test(filePath);
            const isTranslationFile = /translations?|i18n|locale|lang/i.test(filePath);
            const isConfigFile = /\.(json|yaml|yml|toml)$/i.test(filePath);

            // Extract visible text for quick matching
            const textStrings = extractVisibleText(content);
            const textHint = textStrings.length > 0
              ? `\n[KEY TEXT: ${textStrings.slice(0, 30).join(' | ')}]\n`
              : '';

            // Allocate more content to important files
            let maxChars: number;
            if (isTranslationFile) {
              maxChars = 25000; // Translation files are critical — show almost all
            } else if (isHighPriority) {
              maxChars = 25000; // Code files get 25KB each (captures large edge functions)
            } else if (isConfigFile) {
              maxChars = 10000; // Config files get 10KB
            } else {
              maxChars = 5000;  // Other files get 5KB
            }

            const truncatedContent = content.length > maxChars
              ? content.slice(0, maxChars) + '\n... [truncated at ' + Math.round(maxChars/1000) + 'KB]'
              : content;

            contentIndex += `\n--- ${filePath} ---${textHint}${truncatedContent}\n`;
          }
        }

        // Helper function to extract visible text from JSX/HTML/Vue content
        function extractVisibleText(code: string): string[] {
          const texts: string[] = [];

          // Extract text between JSX tags (e.g., <h1>Hello World</h1>)
          const jsxTextRegex = />([^<>{}\n]+?)</g;
          let match;
          while ((match = jsxTextRegex.exec(code)) !== null) {
            const text = match[1].trim();
            if (text.length > 3 && text.length < 100 && !/^[\s{}()]+$/.test(text)) {
              texts.push(text);
            }
          }

          // Extract string literals in translation objects (t('key') or 'string')
          const stringRegex = /['"`]([^'"`\n]{4,80})['"`]/g;
          while ((match = stringRegex.exec(code)) !== null) {
            const text = match[1].trim();
            // Filter out code-like strings
            if (!/^[a-z_]+$/i.test(text) && !/^https?:/.test(text) && !/^[./#]/.test(text)) {
              texts.push(text);
            }
          }

          // Deduplicate
          return [...new Set(texts)];
        }

        const selectionPrompt = `You are an expert code analyst finding files relevant to a user's request.
You have access to the FULL file tree AND actual file contents. Use these to find EXACT matches.

Repository: ${repoFullName}

${summary ? `Repository Summary:\n${summary}\n` : ''}

Available Files:
\`\`\`
${fileListString}
\`\`\`
${contentIndex}

User's Request:
"${prompt}"

## YOUR TASK: Find files containing what the user mentioned

### Step 1: Identify what to search for
- If user mentions a section name like "Transform natural language" → search for that exact text
- If user mentions a heading like "Real Results" → search for that in h1/h2/h3 tags or translation keys
- If user mentions a feature → search for related component names

### Step 2: Search the FILE CONTENTS above
- Look at [VISIBLE TEXT: ...] hints to quickly find files containing specific strings
- Check the actual file content for the exact text the user mentioned
- Translation files (translations.ts, i18n) often contain all visible UI text

### Step 3: Return definitive matches
Priority order:
1. Files containing the EXACT text mentioned by user
2. Translation files if the text could be a translated string
3. Component files that render the section
4. CSS files if styling is involved

### CRITICAL: Be definitive, not guessing
- If you SEE the exact text in a file's content → include that file (high confidence)
- If the text is likely in translations.ts → include translations.ts
- Don't just guess from file names - verify from content

Return ONLY a JSON array of file paths (maximum 15). Example:
["src/lib/translations.ts", "src/components/Hero.tsx"]

If truly no relevant files found: []`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout (more content = more time)

          let response: Response;
          try {
            response = await fetch(OPENROUTER_API_URL, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://hyokai.app",
                "X-Title": "Hyokai",
              },
              body: JSON.stringify({
                model: "x-ai/grok-4-fast",
                messages: [{ role: "user", content: selectionPrompt }],
                max_tokens: 500,
                temperature: 0.1,
              }),
              signal: controller.signal,
            });
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              return new Response(
                JSON.stringify({ error: "File selection timed out", selectedPaths: [] }),
                { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            throw fetchError;
          } finally {
            clearTimeout(timeoutId);
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API error:", errorText);
            return new Response(
              JSON.stringify({ error: "Failed to select files", selectedPaths: [] }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content || '[]';

          // Parse the JSON response
          let selectedPaths: string[] = [];
          try {
            // Extract JSON array from response (handle markdown code blocks)
            const jsonMatch = content.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
              selectedPaths = JSON.parse(jsonMatch[0]);
            }
          } catch {
            console.error("Failed to parse file selection response:", content);
            selectedPaths = [];
          }

          // Filter to only include paths that actually exist in the tree
          const validPaths = selectedPaths.filter((p: string) =>
            files.includes(p)
          ).slice(0, 15); // Enforce max 15 files

          return new Response(
            JSON.stringify({ selectedPaths: validPaths }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          console.error("File selection error:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Failed to select files", selectedPaths: [] }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case "generateSummary": {
        // Fields already extracted from requestBody at the top

        if (!tree || !repoFullName) {
          return new Response(
            JSON.stringify({ error: "tree and repoFullName are required for generateSummary" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
        if (!OPENROUTER_API_KEY) {
          return new Response(
            JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Build tree structure string (limit to prevent token overflow)
        interface TreeItem { path: string; type: string }
        const limitedTree = (tree as TreeItem[]).slice(0, 300);
        const treeString = limitedTree
          .map((entry: TreeItem) => {
            const depth = entry.path.split('/').length - 1;
            const indent = '  '.repeat(Math.min(depth, 4));
            const name = entry.path.split('/').pop() || entry.path;
            const icon = entry.type === 'tree' ? '/' : '';
            return `${indent}${name}${icon}`;
          })
          .join('\n');

        // Build key files content
        const keyFilesContent = keyFiles && typeof keyFiles === 'object'
          ? Object.entries(keyFiles as Record<string, string>)
              .map(([path, content]) => {
                // Truncate very long files in summary context
                const truncatedContent = content.length > 3000
                  ? content.slice(0, 3000) + '\n... [truncated]'
                  : content;
                return `--- ${path} ---\n${truncatedContent}`;
              })
              .join('\n\n')
          : 'No key files available';

        const prompt = `Analyze this repository and provide a concise summary for a developer who needs to understand this codebase quickly.

Repository: ${repoFullName}

File Structure:
\`\`\`
${treeString}
\`\`\`

Key Files:
${keyFilesContent}

Provide a summary (400-600 words) covering:
1. **Project Type**: What this project is (web app, API, library, etc.) and its main purpose
2. **Tech Stack**: Languages, frameworks, key dependencies
3. **Architecture**: Main directories and their purposes, how code is organized
4. **Key Patterns**: State management, API approach, styling method, etc.
5. **Entry Points**: Where the app starts, main components/modules

Be specific - reference actual file paths and patterns you see in the code. This summary will help developers write better prompts for this codebase.`;

        try {
          // Add timeout to prevent hanging on slow API responses
          const FETCH_TIMEOUT_MS = 60000; // 60 seconds for summary generation
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

          let response: Response;
          try {
            response = await fetch(OPENROUTER_API_URL, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://hyokai.app",
                "X-Title": "Hyokai",
              },
              body: JSON.stringify({
                model: "x-ai/grok-4-fast",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1500,
                temperature: 0.3,
              }),
              signal: controller.signal,
            });
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              return new Response(
                JSON.stringify({ error: "Summary generation timed out. Please try again." }),
                { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            throw fetchError;
          } finally {
            clearTimeout(timeoutId);
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API error:", errorText);
            return new Response(
              JSON.stringify({ error: "Failed to generate summary", details: errorText }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const data = await response.json();
          const summary = data?.choices?.[0]?.message?.content || null;

          return new Response(
            JSON.stringify({ summary }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          console.error("Summary generation error:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Failed to generate summary" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("GitHub API error:", error);

    // Check for rate limiting
    if (error instanceof Error && error.message.includes("403")) {
      return new Response(
        JSON.stringify({ error: "GitHub API rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
