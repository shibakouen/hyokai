import { GitContext, getFileExtension } from './gitRepo';

/**
 * Format git context for injection into prompt transformation.
 * Creates a structured text representation of repository context.
 *
 * Order of sections (most valuable first):
 * 1. AI Summary - concise overview of the codebase
 * 2. Project Structure - file tree
 * 3. Key Files - auto-detected important files (package.json, configs, etc.)
 * 4. Selected Files - user-selected files
 */
export function formatGitContextForPrompt(context: GitContext): string {
  if (!context.repositories || context.repositories.length === 0) {
    return '';
  }

  const sections: string[] = [];

  for (const repo of context.repositories) {
    const repoSection: string[] = [];

    // Repository header
    repoSection.push(`=== REPOSITORY: ${repo.fullName} (${repo.branch}) ===`);
    repoSection.push('');

    // AI Summary (most valuable, most compact)
    if (repo.summary) {
      repoSection.push('CODEBASE OVERVIEW:');
      repoSection.push(repo.summary);
      repoSection.push('');
    }

    // File structure
    if (repo.structure.trim()) {
      repoSection.push('PROJECT STRUCTURE:');
      repoSection.push('```');
      repoSection.push(repo.structure);
      repoSection.push('```');
      repoSection.push('');
    }

    // Key files (auto-detected important files)
    if (repo.keyFiles && Object.keys(repo.keyFiles).length > 0) {
      repoSection.push('KEY FILES:');
      repoSection.push('');

      for (const [path, content] of Object.entries(repo.keyFiles)) {
        const ext = getFileExtension(path);
        const langHint = getLanguageHint(ext);

        repoSection.push(`--- ${path} ---`);
        repoSection.push(`\`\`\`${langHint}`);
        repoSection.push(content);
        repoSection.push('```');
        repoSection.push('');
      }
    }

    // Selected files with contents (user-selected)
    if (repo.selectedFiles.length > 0) {
      repoSection.push('SELECTED FILES:');
      repoSection.push('');

      for (const file of repo.selectedFiles) {
        const ext = getFileExtension(file.path);
        const langHint = getLanguageHint(ext);

        repoSection.push(`--- ${file.path} ---`);
        repoSection.push(`\`\`\`${langHint}`);
        repoSection.push(file.content);
        repoSection.push('```');
        repoSection.push('');
      }
    }

    sections.push(repoSection.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Get language hint for syntax highlighting in markdown.
 */
function getLanguageHint(ext: string): string {
  const langMap: Record<string, string> = {
    // JavaScript/TypeScript
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'mjs': 'javascript',
    'cjs': 'javascript',

    // Python
    'py': 'python',
    'pyi': 'python',

    // Ruby
    'rb': 'ruby',
    'rake': 'ruby',
    'gemspec': 'ruby',

    // Go
    'go': 'go',

    // Rust
    'rs': 'rust',

    // Java/Kotlin
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',

    // C/C++
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'h': 'c',
    'hpp': 'cpp',

    // C#
    'cs': 'csharp',

    // Swift
    'swift': 'swift',

    // PHP
    'php': 'php',

    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',

    // Data formats
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'xml': 'xml',

    // Documentation
    'md': 'markdown',
    'mdx': 'mdx',

    // Shell
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'zsh',
    'fish': 'fish',

    // SQL
    'sql': 'sql',

    // GraphQL
    'graphql': 'graphql',
    'gql': 'graphql',

    // Docker
    'dockerfile': 'dockerfile',

    // Vue/Svelte
    'vue': 'vue',
    'svelte': 'svelte',

    // Other
    'env': 'bash',
    'gitignore': 'gitignore',
  };

  return langMap[ext.toLowerCase()] || ext || 'plaintext';
}

/**
 * Summarize tech stack from file extensions.
 */
export function detectTechStack(filePaths: string[]): string[] {
  const techs = new Set<string>();

  for (const path of filePaths) {
    const ext = getFileExtension(path);
    const filename = path.split('/').pop()?.toLowerCase() || '';

    // Framework detection by config files
    if (filename === 'package.json') techs.add('Node.js');
    if (filename === 'tsconfig.json') techs.add('TypeScript');
    if (filename === 'next.config.js' || filename === 'next.config.mjs') techs.add('Next.js');
    if (filename === 'vite.config.ts' || filename === 'vite.config.js') techs.add('Vite');
    if (filename === 'tailwind.config.js' || filename === 'tailwind.config.ts') techs.add('Tailwind CSS');
    if (filename === 'requirements.txt' || filename === 'pyproject.toml') techs.add('Python');
    if (filename === 'gemfile') techs.add('Ruby');
    if (filename === 'cargo.toml') techs.add('Rust');
    if (filename === 'go.mod') techs.add('Go');
    if (filename === 'pom.xml') techs.add('Java/Maven');
    if (filename === 'build.gradle' || filename === 'build.gradle.kts') techs.add('Gradle');
    if (filename === 'dockerfile' || filename.includes('docker-compose')) techs.add('Docker');

    // Language detection by extension
    if (['ts', 'tsx'].includes(ext)) techs.add('TypeScript');
    if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) techs.add('JavaScript');
    if (['py', 'pyi'].includes(ext)) techs.add('Python');
    if (ext === 'rb') techs.add('Ruby');
    if (ext === 'go') techs.add('Go');
    if (ext === 'rs') techs.add('Rust');
    if (['java', 'kt', 'kts'].includes(ext)) techs.add('Java/Kotlin');
    if (['c', 'cpp', 'cc', 'h', 'hpp'].includes(ext)) techs.add('C/C++');
    if (ext === 'cs') techs.add('C#');
    if (ext === 'swift') techs.add('Swift');
    if (ext === 'php') techs.add('PHP');
    if (ext === 'vue') techs.add('Vue.js');
    if (ext === 'svelte') techs.add('Svelte');
  }

  return Array.from(techs).sort();
}
