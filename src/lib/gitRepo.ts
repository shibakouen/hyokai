// Git Repository Integration Types and Utilities

// ==================== Types ====================

export interface GitHubRepository {
  id: string;                    // Generated unique ID
  owner: string;                 // GitHub username or org
  name: string;                  // Repository name
  fullName: string;              // "owner/name"
  defaultBranch: string;         // e.g., "main"
  isPrivate: boolean;
  connectedAt: number;           // Timestamp
  lastRefreshed: number | null;  // Timestamp of last cache refresh
}

export interface GitHubTreeEntry {
  path: string;                  // Full path from repo root
  type: 'blob' | 'tree';         // File or directory
  sha: string;
  size?: number;                 // Only for blobs (files)
}

export interface CachedRepoData {
  repoId: string;
  branch: string;
  tree: GitHubTreeEntry[];       // Flat list of all entries
  selectedPaths: string[];       // User-selected directories/files for context
  fileContents: Record<string, string>; // Cached file contents
  fetchedAt: number;
  summary?: string;              // AI-generated codebase summary
  keyFiles?: Record<string, string>;  // Auto-fetched key files
}

export interface GitRepoConnection {
  repository: GitHubRepository;
  cache: CachedRepoData | null;
}

export interface GitContextSettings {
  enabled: boolean;              // Master toggle for git context
  autoIncludeInCoding: boolean;  // Auto-include in Coding mode (default: true)
  maxContextTokens: number;      // Limit context size (default: 4000)
}

// GitHub API request/response types
export interface GitHubApiRequest {
  action: 'validatePat' | 'listRepos' | 'getTree' | 'getFileContents';
  pat: string;
  owner?: string;
  repo?: string;
  branch?: string;
  paths?: string[];
}

export interface GitHubApiResponse {
  error?: string;
  repos?: Array<{
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    private: boolean;
    default_branch: string;
  }>;
  tree?: GitHubTreeEntry[];
  truncated?: boolean;
  contents?: Array<{
    path: string;
    content?: string;
    error?: string;
    truncated?: boolean;
  }>;
  user?: { login: string };
}

// Context passed to transform-prompt
export interface GitContext {
  repositories: Array<{
    fullName: string;
    branch: string;
    structure: string;           // Formatted tree structure
    summary?: string;            // AI-generated codebase summary
    keyFiles?: Record<string, string>;  // Auto-fetched key files
    selectedFiles: Array<{
      path: string;
      content: string;
    }>;
  }>;
}

// ==================== Constants ====================

export const STORAGE_KEYS = {
  PAT: 'hyokai-github-pat',
  CONNECTIONS: 'hyokai-github-repos',
  SETTINGS: 'hyokai-github-settings',
} as const;

export const LIMITS = {
  MAX_TREE_ENTRIES: 5000,        // Truncate tree if larger
  MAX_SELECTED_PATHS: 20,        // User can select up to 20 files/dirs
  MAX_FILE_SIZE: 10000,          // Truncate files over 10KB
  MAX_CONTEXT_TOKENS: 8000,      // Total git context token limit
  DEFAULT_CONTEXT_TOKENS: 4000,  // Default limit
  MAX_REPOS: 5,                  // Max connected repositories
} as const;

// Files to always exclude from tree
export const EXCLUDED_PATTERNS = [
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

// Key files to auto-fetch for codebase understanding
export const KEY_FILE_PATTERNS = [
  // Package managers & configs
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'tailwind.config.ts',
  'tailwind.config.js',
  // Entry points
  'src/main.tsx',
  'src/main.ts',
  'src/index.tsx',
  'src/index.ts',
  'src/App.tsx',
  'src/App.jsx',
  'app/layout.tsx',
  'app/page.tsx',
  // Documentation
  'README.md',
  // Python
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  // Rust
  'Cargo.toml',
  // Go
  'go.mod',
  // Other
  '.env.example',
] as const;

// ==================== Utilities ====================

export const generateRepoId = () =>
  `repo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Rough token estimation (1 token ~ 4 chars)
export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);

// Base64 encode/decode for PAT obfuscation (not encryption!)
export const encodePAT = (pat: string): string => {
  try {
    return btoa(pat);
  } catch {
    return pat;
  }
};

export const decodePAT = (encoded: string): string => {
  try {
    return atob(encoded);
  } catch {
    return encoded;
  }
};

// Check if a path should be excluded
export const shouldExcludePath = (path: string): boolean => {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(path));
};

// Filter tree entries based on exclusion rules
export const filterTreeEntries = (entries: GitHubTreeEntry[]): GitHubTreeEntry[] => {
  return entries.filter(entry => !shouldExcludePath(entry.path));
};

// Build a visual tree structure string from flat entries
export const buildTreeString = (
  entries: GitHubTreeEntry[],
  selectedPaths: string[] = [],
  maxDepth: number = 4
): string => {
  // Filter to selected paths and their parents if selections exist
  let filteredEntries = entries;

  if (selectedPaths.length > 0) {
    const selectedSet = new Set<string>();
    selectedPaths.forEach(path => {
      selectedSet.add(path);
      // Add parent directories
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) {
        selectedSet.add(parts.slice(0, i).join('/'));
      }
    });
    filteredEntries = entries.filter(e => selectedSet.has(e.path));
  }

  // Sort by path
  const sorted = [...filteredEntries].sort((a, b) => a.path.localeCompare(b.path));

  // Build tree structure
  const lines: string[] = [];

  sorted.forEach(entry => {
    const depth = entry.path.split('/').length - 1;
    if (depth > maxDepth) return;

    const indent = '  '.repeat(depth);
    const name = entry.path.split('/').pop() || entry.path;
    const icon = entry.type === 'tree' ? '/' : '';
    lines.push(`${indent}${name}${icon}`);
  });

  return lines.join('\n');
};

// Get default settings
export const getDefaultSettings = (): GitContextSettings => ({
  enabled: true,
  autoIncludeInCoding: true,
  maxContextTokens: LIMITS.DEFAULT_CONTEXT_TOKENS,
});

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Format timestamp for display
export const formatTimestamp = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString();
};

// Get file extension
export const getFileExtension = (path: string): string => {
  const parts = path.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

// Determine if a file is likely code/text (vs binary)
const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'pyi', 'rb', 'php', 'java', 'kt', 'kts',
  'go', 'rs', 'c', 'cpp', 'cc', 'h', 'hpp',
  'cs', 'fs', 'swift', 'scala', 'clj', 'ex', 'exs',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'json', 'yaml', 'yml', 'toml', 'xml', 'csv',
  'md', 'mdx', 'txt', 'rst', 'adoc',
  'sql', 'graphql', 'gql',
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
  'dockerfile', 'makefile', 'cmake',
  'env', 'gitignore', 'gitattributes', 'editorconfig',
  'eslintrc', 'prettierrc', 'babelrc', 'nvmrc',
  'vue', 'svelte', 'astro',
]);

export const isCodeFile = (path: string): boolean => {
  const ext = getFileExtension(path);
  const filename = path.split('/').pop()?.toLowerCase() || '';

  // Check extension
  if (CODE_EXTENSIONS.has(ext)) return true;

  // Check filename patterns
  if (filename.startsWith('.')) {
    const withoutDot = filename.slice(1);
    if (CODE_EXTENSIONS.has(withoutDot)) return true;
  }

  // Special filenames
  const specialFiles = ['dockerfile', 'makefile', 'rakefile', 'gemfile', 'procfile'];
  if (specialFiles.includes(filename)) return true;

  return false;
};
