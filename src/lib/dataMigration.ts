import { supabase } from '@/integrations/supabase/client';

// localStorage keys to migrate
const STORAGE_KEYS = {
  USER_CONTEXT: 'hyokai-user-context',
  SAVED_CONTEXTS: 'hyokai-saved-contexts',
  ACTIVE_CONTEXT_ID: 'hyokai-active-context-id',
  GITHUB_PAT: 'hyokai-github-pat',
  GITHUB_REPOS: 'hyokai-github-repos',
  GITHUB_SETTINGS: 'hyokai-github-settings',
  MODE: 'hyokai-mode',
  BEGINNER_MODE: 'hyokai-beginner-mode',
  LANGUAGE: 'hyokai-language',
  SELECTED_MODEL_INDEX: 'hyokai-selected-model-index',
  COMPARE_MODEL_INDICES: 'hyokai-compare-model-indices',
  HISTORY: 'hyokai-history',
  SIMPLE_HISTORY: 'hyokai-simple-history',
};

export interface MigrationPreview {
  hasData: boolean;
  savedContexts: number;
  hasCurrentContext: boolean;
  hasGitHubPAT: boolean;
  githubRepos: number;
  hasPreferences: boolean;
  historyEntries: number;
  simpleHistoryEntries: number;
}

// Safe JSON parse that returns default value on error
function safeJsonParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

// Get preview of what will be migrated
export function getMigrationPreview(): MigrationPreview {
  const savedContexts = safeJsonParse<unknown[]>(localStorage.getItem(STORAGE_KEYS.SAVED_CONTEXTS), []);
  const currentContext = localStorage.getItem(STORAGE_KEYS.USER_CONTEXT);
  const githubPAT = localStorage.getItem(STORAGE_KEYS.GITHUB_PAT);
  const githubRepos = safeJsonParse<unknown[]>(localStorage.getItem(STORAGE_KEYS.GITHUB_REPOS), []);
  const history = safeJsonParse<unknown[]>(localStorage.getItem(STORAGE_KEYS.HISTORY), []);
  const simpleHistory = safeJsonParse<unknown[]>(localStorage.getItem(STORAGE_KEYS.SIMPLE_HISTORY), []);

  const hasPreferences = !!(
    localStorage.getItem(STORAGE_KEYS.MODE) ||
    localStorage.getItem(STORAGE_KEYS.BEGINNER_MODE) ||
    localStorage.getItem(STORAGE_KEYS.LANGUAGE) ||
    localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL_INDEX) ||
    localStorage.getItem(STORAGE_KEYS.COMPARE_MODEL_INDICES)
  );

  const hasData = savedContexts.length > 0 ||
    !!currentContext ||
    !!githubPAT ||
    githubRepos.length > 0 ||
    hasPreferences ||
    history.length > 0 ||
    simpleHistory.length > 0;

  return {
    hasData,
    savedContexts: savedContexts.length,
    hasCurrentContext: !!currentContext,
    hasGitHubPAT: !!githubPAT,
    githubRepos: githubRepos.length,
    hasPreferences,
    historyEntries: history.length,
    simpleHistoryEntries: simpleHistory.length,
  };
}

// Migrate all localStorage data to database
export async function migrateLocalStorageToDatabase(
  userId: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const totalSteps = 7;
  let currentStep = 0;

  const updateProgress = () => {
    currentStep++;
    onProgress?.((currentStep / totalSteps) * 100);
  };

  try {
    // Step 1: Migrate user preferences
    await migratePreferences(userId);
    updateProgress();

    // Step 2: Migrate saved contexts
    await migrateSavedContexts(userId);
    updateProgress();

    // Step 3: Migrate active context
    await migrateActiveContext(userId);
    updateProgress();

    // Step 4: Migrate GitHub PAT (via edge function for encryption)
    await migrateGitHubPAT(userId);
    updateProgress();

    // Step 5: Migrate GitHub repos
    await migrateGitHubRepos(userId);
    updateProgress();

    // Step 6: Migrate history
    await migrateHistory(userId);
    updateProgress();

    // Step 7: Mark migration as complete (preserve localStorage as cache)
    await markMigrationComplete(userId);
    markLocalStorageAsMigrated();
    updateProgress();

  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

async function migratePreferences(userId: string): Promise<void> {
  const mode = localStorage.getItem(STORAGE_KEYS.MODE);
  const beginnerMode = localStorage.getItem(STORAGE_KEYS.BEGINNER_MODE);
  const language = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
  const selectedModelIndex = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL_INDEX);
  const compareModelIndices = localStorage.getItem(STORAGE_KEYS.COMPARE_MODEL_INDICES);

  if (!mode && !beginnerMode && !language && !selectedModelIndex && !compareModelIndices) {
    return;
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      mode: mode || 'coding',
      beginner_mode: beginnerMode === 'true',
      language: language || 'en',
      selected_model_index: selectedModelIndex ? parseInt(selectedModelIndex, 10) : 0,
      compare_model_indices: compareModelIndices ? JSON.parse(compareModelIndices) : [0, 1],
    });

  if (error) {
    console.error('Failed to migrate preferences:', error);
    throw new Error('Failed to migrate preferences');
  }
}

async function migrateSavedContexts(userId: string): Promise<void> {
  const savedContextsStr = localStorage.getItem(STORAGE_KEYS.SAVED_CONTEXTS);
  if (!savedContextsStr) return;

  try {
    const savedContexts = JSON.parse(savedContextsStr);
    if (!Array.isArray(savedContexts) || savedContexts.length === 0) return;

    // Map local context format to database format
    const dbContexts = savedContexts.slice(0, 10).map((ctx: { id: string; name: string; content: string }) => ({
      id: ctx.id,
      user_id: userId,
      name: ctx.name,
      content: ctx.content,
    }));

    const { error } = await supabase
      .from('saved_contexts')
      .upsert(dbContexts);

    if (error) {
      console.error('Failed to migrate saved contexts:', error);
      throw new Error('Failed to migrate saved contexts');
    }
  } catch (e) {
    console.error('Error parsing saved contexts:', e);
    throw new Error('Failed to migrate saved contexts');
  }
}

async function migrateActiveContext(userId: string): Promise<void> {
  const currentContent = localStorage.getItem(STORAGE_KEYS.USER_CONTEXT);
  const activeContextId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONTEXT_ID);

  const { error } = await supabase
    .from('user_active_context')
    .upsert({
      user_id: userId,
      context_id: activeContextId || null,
      current_content: currentContent || '',
    });

  if (error) {
    console.error('Failed to migrate active context:', error);
    throw new Error('Failed to migrate active context');
  }
}

async function migrateGitHubPAT(userId: string): Promise<void> {
  const encodedPAT = localStorage.getItem(STORAGE_KEYS.GITHUB_PAT);
  if (!encodedPAT) return;

  try {
    // Decode the base64 PAT
    const pat = atob(encodedPAT);

    // Use edge function to encrypt and store PAT
    const { error } = await supabase.functions.invoke('user-data', {
      body: { action: 'savePAT', pat },
    });

    if (error) {
      console.error('Failed to migrate GitHub PAT:', error);
      throw new Error('Failed to migrate GitHub PAT');
    }
  } catch (e) {
    console.error('Error migrating GitHub PAT:', e);
    // Don't throw - PAT migration is not critical
  }
}

async function migrateGitHubRepos(userId: string): Promise<void> {
  const reposStr = localStorage.getItem(STORAGE_KEYS.GITHUB_REPOS);
  const settingsStr = localStorage.getItem(STORAGE_KEYS.GITHUB_SETTINGS);

  // Migrate settings
  if (settingsStr) {
    try {
      const settings = JSON.parse(settingsStr);
      await supabase
        .from('github_settings')
        .upsert({
          user_id: userId,
          enabled: settings.enabled || false,
          auto_include_in_coding: settings.autoIncludeInCoding || false,
        });
    } catch (e) {
      console.error('Error migrating GitHub settings:', e);
    }
  }

  // Migrate repos
  if (!reposStr) return;

  try {
    const connections = JSON.parse(reposStr);
    if (!Array.isArray(connections) || connections.length === 0) return;

    for (const conn of connections.slice(0, 5)) {
      const repo = conn.repository;

      // Insert repo
      const { data: insertedRepo, error: repoError } = await supabase
        .from('github_repos')
        .upsert({
          id: repo.id,
          user_id: userId,
          owner: repo.owner,
          name: repo.name,
          full_name: repo.fullName,
          default_branch: repo.defaultBranch,
        })
        .select()
        .single();

      if (repoError) {
        console.error('Failed to migrate repo:', repoError);
        continue;
      }

      // Insert cache if exists
      if (conn.cache && insertedRepo) {
        await supabase
          .from('github_repo_cache')
          .upsert({
            repo_id: insertedRepo.id,
            tree: conn.cache.tree || [],
            selected_paths: conn.cache.selectedPaths || [],
            file_contents: conn.cache.fileContents || {},
          });
      }
    }
  } catch (e) {
    console.error('Error migrating GitHub repos:', e);
    // Don't throw - repos migration is not critical
  }
}

async function migrateHistory(userId: string): Promise<void> {
  // Migrate advanced history
  const historyStr = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (historyStr) {
    try {
      const history = JSON.parse(historyStr);
      if (Array.isArray(history) && history.length > 0) {
        const dbEntries = history.slice(0, 50).map((entry: {
          id: string;
          timestamp: number;
          input: string;
          taskMode: string;
          result: object;
        }) => ({
          id: entry.id,
          user_id: userId,
          timestamp: new Date(entry.timestamp).toISOString(),
          input: entry.input,
          task_mode: entry.taskMode,
          result_data: entry.result,
        }));

        await supabase.from('history_entries').upsert(dbEntries);
      }
    } catch (e) {
      console.error('Error migrating history:', e);
    }
  }

  // Migrate simple history
  const simpleHistoryStr = localStorage.getItem(STORAGE_KEYS.SIMPLE_HISTORY);
  if (simpleHistoryStr) {
    try {
      const simpleHistory = JSON.parse(simpleHistoryStr);
      if (Array.isArray(simpleHistory) && simpleHistory.length > 0) {
        const dbEntries = simpleHistory.slice(0, 30).map((entry: {
          id: string;
          timestamp: number;
          input: string;
          output: string;
          elapsedTime?: number;
        }) => ({
          id: entry.id,
          user_id: userId,
          timestamp: new Date(entry.timestamp).toISOString(),
          input: entry.input,
          output: entry.output,
          elapsed_time: entry.elapsedTime || null,
        }));

        await supabase.from('simple_history_entries').upsert(dbEntries);
      }
    } catch (e) {
      console.error('Error migrating simple history:', e);
    }
  }
}

async function markMigrationComplete(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ migrated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Failed to mark migration complete:', error);
    throw new Error('Failed to mark migration complete');
  }
}

// Mark localStorage as migrated without clearing (preserves data as fallback cache)
function markLocalStorageAsMigrated(): void {
  localStorage.setItem('hyokai-migration-complete', new Date().toISOString());
}

// Check if localStorage has been migrated to database
export function isLocalStorageMigrated(): boolean {
  return !!localStorage.getItem('hyokai-migration-complete');
}

// Legacy function - no longer clears localStorage, just marks as migrated
// Keeping for backward compatibility if called elsewhere
function clearLocalStorage(): void {
  // Previously cleared all localStorage keys, which caused data loss
  // when database loads failed after migration.
  // Now we preserve localStorage as a fallback cache.
  markLocalStorageAsMigrated();
}
