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
    const { action, pat, owner, repo, branch, paths } = await req.json();

    if (!pat) {
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

              // Truncate large files
              const maxSize = 10000;
              const truncated = content.length > maxSize;
              if (truncated) {
                content = content.slice(0, maxSize) + '\n\n... [file truncated at 10KB]';
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

      case "generateSummary": {
        const { tree, keyFiles, repoFullName } = await req.json();

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
          const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://hyokai.app",
              "X-Title": "Hyokai",
            },
            body: JSON.stringify({
              model: "anthropic/claude-3-haiku",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 1500,
              temperature: 0.3,
            }),
          });

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
