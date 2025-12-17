import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  GitHubRepository,
  GitHubTreeEntry,
  CachedRepoData,
  GitRepoConnection,
  GitContextSettings,
  GitContext,
  GitHubApiResponse,
  STORAGE_KEYS,
  LIMITS,
  KEY_FILE_PATTERNS,
  generateRepoId,
  getDefaultSettings,
  encodePAT,
  decodePAT,
  buildTreeString,
  estimateTokens,
  filterTreeEntries,
} from '@/lib/gitRepo';

interface GitRepoContextType {
  // PAT Management
  pat: string | null;
  setPat: (token: string | null) => void;
  patStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  validatePat: (token: string) => Promise<boolean>;
  patUsername: string | null;

  // Repository Connections
  connections: GitRepoConnection[];
  addConnection: (repo: GitHubRepository) => void;
  removeConnection: (repoId: string) => void;

  // Cache Management
  updateCache: (repoId: string, cache: CachedRepoData) => void;
  refreshCache: (repoId: string) => Promise<void>;
  isRefreshing: string | null; // repoId being refreshed

  // Selection Management
  setSelectedPaths: (repoId: string, paths: string[]) => void;

  // File Contents
  fetchFileContents: (repoId: string, paths: string[]) => Promise<void>;

  // Settings
  settings: GitContextSettings;
  updateSettings: (settings: Partial<GitContextSettings>) => void;

  // Computed
  getActiveGitContext: () => GitContext | null;
  hasActiveGitContext: boolean;

  // Available Repos (from GitHub)
  availableRepos: GitHubApiResponse['repos'];
  fetchAvailableRepos: () => Promise<void>;
  isFetchingRepos: boolean;
}

const GitRepoContext = createContext<GitRepoContextType | undefined>(undefined);

export function GitRepoProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  // Load PAT from localStorage (for guests)
  const [pat, setPatState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PAT);
        return stored ? decodePAT(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [patStatus, setPatStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [patUsername, setPatUsername] = useState<string | null>(null);

  // Load connections from localStorage (for guests)
  const [connections, setConnections] = useState<GitRepoConnection[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Load settings from localStorage (for guests)
  const [settings, setSettings] = useState<GitContextSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return stored ? { ...getDefaultSettings(), ...JSON.parse(stored) } : getDefaultSettings();
      } catch {
        return getDefaultSettings();
      }
    }
    return getDefaultSettings();
  });

  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [availableRepos, setAvailableRepos] = useState<GitHubApiResponse['repos']>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);

  // Track if we've loaded from database
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  // Load from database when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || hasLoadedFromDb) return;

    const loadFromDatabase = async () => {
      try {
        // Load PAT from encrypted storage via edge function
        const { data: patData, error: patError } = await supabase.functions.invoke('user-data', {
          body: { action: 'getPAT' },
        });

        if (!patError && patData?.pat) {
          setPatState(patData.pat);
          if (patData.username) {
            setPatUsername(patData.username);
            setPatStatus('valid');
          }
        }

        // Load settings from database
        const { data: settingsData, error: settingsError } = await supabase
          .from('github_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!settingsError && settingsData) {
          setSettings({
            enabled: settingsData.enabled,
            autoIncludeInCoding: settingsData.auto_include_in_coding,
            maxContextTokens: settingsData.max_context_tokens,
          });
        }

        // Load repos from database
        const { data: reposData, error: reposError } = await supabase
          .from('github_repos')
          .select('*, github_repo_cache(*)')
          .eq('user_id', user.id);

        if (!reposError && reposData) {
          const loadedConnections: GitRepoConnection[] = reposData.map(repo => {
            const cache = repo.github_repo_cache?.[0];
            return {
              repository: {
                id: repo.id,
                owner: repo.owner,
                name: repo.name,
                fullName: repo.full_name,
                defaultBranch: repo.default_branch,
                lastRefreshed: repo.last_refreshed ? new Date(repo.last_refreshed).getTime() : undefined,
              },
              cache: cache ? {
                repoId: repo.id,
                branch: cache.branch,
                tree: cache.tree as GitHubTreeEntry[],
                selectedPaths: cache.selected_paths || [],
                fileContents: cache.file_contents || {},
                fetchedAt: new Date(cache.fetched_at).getTime(),
                summary: cache.summary || undefined,
                keyFiles: cache.key_files || undefined,
              } : null,
            };
          });
          setConnections(loadedConnections);
        }

        setHasLoadedFromDb(true);
      } catch (e) {
        console.error('Failed to load git data from database:', e);
        setHasLoadedFromDb(true);
      }
    };

    loadFromDatabase();
  }, [isAuthenticated, user, hasLoadedFromDb]);

  // Reset loaded flag when user changes
  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoadedFromDb(false);
    }
  }, [isAuthenticated]);

  // Persist PAT to localStorage (always, for guests and as fallback)
  useEffect(() => {
    if (pat) {
      localStorage.setItem(STORAGE_KEYS.PAT, encodePAT(pat));
    } else {
      localStorage.removeItem(STORAGE_KEYS.PAT);
    }
  }, [pat]);

  // Persist connections to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(connections));
  }, [connections]);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Sync settings to database when they change (for authenticated users)
  useEffect(() => {
    if (!isAuthenticated || !user || !hasLoadedFromDb) return;

    const syncSettings = async () => {
      try {
        await supabase
          .from('github_settings')
          .upsert({
            user_id: user.id,
            enabled: settings.enabled,
            auto_include_in_coding: settings.autoIncludeInCoding,
            max_context_tokens: settings.maxContextTokens,
          });
      } catch (e) {
        console.error('Failed to sync git settings:', e);
      }
    };

    const timeout = setTimeout(syncSettings, 500);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, user, hasLoadedFromDb, settings]);

  // Validate PAT on load if exists (only for guests or after DB load)
  useEffect(() => {
    if (pat && patStatus === 'idle' && (!isAuthenticated || hasLoadedFromDb)) {
      validatePat(pat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedFromDb]); // Run when DB load completes or on mount for guests

  // Set PAT
  const setPat = useCallback((token: string | null) => {
    setPatState(token);
    if (!token) {
      setPatStatus('idle');
      setPatUsername(null);
      setAvailableRepos([]);

      // Delete from database if authenticated
      if (isAuthenticated && user) {
        supabase.functions.invoke('user-data', {
          body: { action: 'deletePAT' },
        }).catch(e => console.error('Failed to delete PAT from database:', e));
      }
    }
  }, [isAuthenticated, user]);

  // Validate PAT
  const validatePat = useCallback(async (token: string): Promise<boolean> => {
    setPatStatus('validating');

    try {
      const { data, error } = await supabase.functions.invoke('github-api', {
        body: { action: 'validatePat', pat: token },
      });

      if (error || data?.error) {
        setPatStatus('invalid');
        setPatUsername(null);
        return false;
      }

      setPatStatus('valid');
      const username = data?.user?.login || null;
      setPatUsername(username);

      // Save to encrypted database storage if authenticated
      if (isAuthenticated && user && hasLoadedFromDb) {
        supabase.functions.invoke('user-data', {
          body: { action: 'savePAT', pat: token, username },
        }).catch(e => console.error('Failed to save PAT to database:', e));
      }

      return true;
    } catch {
      setPatStatus('invalid');
      setPatUsername(null);
      return false;
    }
  }, [isAuthenticated, user, hasLoadedFromDb]);

  // Fetch available repos
  const fetchAvailableRepos = useCallback(async () => {
    if (!pat || patStatus !== 'valid') return;

    setIsFetchingRepos(true);

    try {
      const { data, error } = await supabase.functions.invoke('github-api', {
        body: { action: 'listRepos', pat },
      });

      if (error || data?.error) {
        console.error('Failed to fetch repos:', data?.error || error);
        return;
      }

      setAvailableRepos(data?.repos || []);
    } catch (e) {
      console.error('Failed to fetch repos:', e);
    } finally {
      setIsFetchingRepos(false);
    }
  }, [pat, patStatus]);

  // Add connection
  const addConnection = useCallback((repo: GitHubRepository) => {
    setConnections(prev => {
      // Check if already connected
      if (prev.some(c => c.repository.fullName === repo.fullName)) {
        return prev;
      }

      // Enforce max repos
      if (prev.length >= LIMITS.MAX_REPOS) {
        return prev;
      }

      // Save to database if authenticated
      if (isAuthenticated && user) {
        supabase
          .from('github_repos')
          .insert({
            id: repo.id,
            user_id: user.id,
            owner: repo.owner,
            name: repo.name,
            full_name: repo.fullName,
            default_branch: repo.defaultBranch,
          })
          .then(({ error }) => {
            if (error) console.error('Failed to add repo to database:', error);
          });
      }

      return [...prev, { repository: repo, cache: null }];
    });
  }, [isAuthenticated, user]);

  // Remove connection
  const removeConnection = useCallback((repoId: string) => {
    setConnections(prev => prev.filter(c => c.repository.id !== repoId));

    // Delete from database if authenticated
    if (isAuthenticated && user) {
      // Cache is deleted automatically via ON DELETE CASCADE
      supabase
        .from('github_repos')
        .delete()
        .eq('user_id', user.id)
        .eq('id', repoId)
        .then(({ error }) => {
          if (error) console.error('Failed to remove repo from database:', error);
        });
    }
  }, [isAuthenticated, user]);

  // Update cache
  const updateCache = useCallback((repoId: string, cache: CachedRepoData) => {
    setConnections(prev => prev.map(c =>
      c.repository.id === repoId ? { ...c, cache } : c
    ));

    // Sync cache to database if authenticated
    if (isAuthenticated && user) {
      supabase
        .from('github_repo_cache')
        .upsert({
          repo_id: repoId,
          branch: cache.branch,
          tree: cache.tree,
          selected_paths: cache.selectedPaths,
          file_contents: cache.fileContents,
          fetched_at: new Date(cache.fetchedAt).toISOString(),
          summary: cache.summary || null,
          key_files: cache.keyFiles || null,
        })
        .then(({ error }) => {
          if (error) console.error('Failed to update cache in database:', error);
        });
    }
  }, [isAuthenticated, user]);

  // Refresh cache for a repo - fetches tree, key files, and generates AI summary
  const refreshCache = useCallback(async (repoId: string) => {
    if (!pat || patStatus !== 'valid' || isRefreshing) return;

    const connection = connections.find(c => c.repository.id === repoId);
    if (!connection) return;

    setIsRefreshing(repoId);

    try {
      const { repository } = connection;

      // Step 1: Fetch tree
      const { data, error } = await supabase.functions.invoke('github-api', {
        body: {
          action: 'getTree',
          pat,
          owner: repository.owner,
          repo: repository.name,
          branch: repository.defaultBranch,
        },
      });

      if (error || data?.error) {
        console.error('Failed to fetch tree:', data?.error || error);
        return;
      }

      const tree = filterTreeEntries(data?.tree || []);

      // Step 2: Identify key files that exist in this repo
      const existingKeyFiles = KEY_FILE_PATTERNS.filter(pattern =>
        tree.some(entry => entry.path === pattern && entry.type === 'blob')
      );

      // Step 3: Fetch key file contents
      let keyFiles: Record<string, string> = {};
      if (existingKeyFiles.length > 0) {
        const { data: keyFilesData, error: keyFilesError } = await supabase.functions.invoke('github-api', {
          body: {
            action: 'getFileContents',
            pat,
            owner: repository.owner,
            repo: repository.name,
            branch: repository.defaultBranch,
            paths: existingKeyFiles.slice(0, 10), // Limit to 10 key files
          },
        });

        if (!keyFilesError && keyFilesData?.contents) {
          for (const item of keyFilesData.contents) {
            if (item.content && !item.error) {
              keyFiles[item.path] = item.content;
            }
          }
        }
      }

      // Step 4: Generate AI summary
      let summary: string | undefined;
      try {
        const { data: summaryData, error: summaryError } = await supabase.functions.invoke('github-api', {
          body: {
            action: 'generateSummary',
            pat, // Still needed for auth
            tree: tree.slice(0, 500), // Limit tree size for summary
            keyFiles,
            repoFullName: repository.fullName,
          },
        });

        if (!summaryError && summaryData?.summary) {
          summary = summaryData.summary;
        }
      } catch (summaryErr) {
        console.error('Failed to generate summary:', summaryErr);
        // Continue without summary - it's optional
      }

      // Step 5: Create or update cache with all data
      const newCache: CachedRepoData = {
        repoId,
        branch: repository.defaultBranch,
        tree,
        selectedPaths: connection.cache?.selectedPaths || [],
        fileContents: connection.cache?.fileContents || {},
        fetchedAt: Date.now(),
        summary,
        keyFiles,
      };

      // Update repository's lastRefreshed
      setConnections(prev => prev.map(c =>
        c.repository.id === repoId
          ? {
              repository: { ...c.repository, lastRefreshed: Date.now() },
              cache: newCache,
            }
          : c
      ));

      // Sync to database if authenticated
      if (isAuthenticated && user) {
        // Update repo's lastRefreshed
        supabase
          .from('github_repos')
          .update({ last_refreshed: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('id', repoId)
          .then(({ error }) => {
            if (error) console.error('Failed to update repo lastRefreshed:', error);
          });

        // Upsert cache
        supabase
          .from('github_repo_cache')
          .upsert({
            repo_id: repoId,
            branch: newCache.branch,
            tree: newCache.tree,
            selected_paths: newCache.selectedPaths,
            file_contents: newCache.fileContents,
            fetched_at: new Date(newCache.fetchedAt).toISOString(),
            summary: newCache.summary || null,
            key_files: newCache.keyFiles || null,
          })
          .then(({ error }) => {
            if (error) console.error('Failed to sync cache to database:', error);
          });
      }
    } catch (e) {
      console.error('Failed to refresh cache:', e);
    } finally {
      setIsRefreshing(null);
    }
  }, [pat, patStatus, isRefreshing, connections, isAuthenticated, user]);

  // Set selected paths
  const setSelectedPaths = useCallback((repoId: string, paths: string[]) => {
    const limitedPaths = paths.slice(0, LIMITS.MAX_SELECTED_PATHS);

    setConnections(prev => prev.map(c => {
      if (c.repository.id !== repoId || !c.cache) return c;
      return {
        ...c,
        cache: { ...c.cache, selectedPaths: limitedPaths },
      };
    }));

    // Sync to database if authenticated
    if (isAuthenticated && user) {
      supabase
        .from('github_repo_cache')
        .update({ selected_paths: limitedPaths })
        .eq('repo_id', repoId)
        .then(({ error }) => {
          if (error) console.error('Failed to sync selected paths:', error);
        });
    }
  }, [isAuthenticated, user]);

  // Fetch file contents for selected paths
  const fetchFileContents = useCallback(async (repoId: string, paths: string[]) => {
    if (!pat || patStatus !== 'valid') return;

    const connection = connections.find(c => c.repository.id === repoId);
    if (!connection || !connection.cache) return;

    // Filter to only blob (file) paths
    const filePaths = paths.filter(p => {
      const entry = connection.cache?.tree.find(e => e.path === p);
      return entry?.type === 'blob';
    });

    if (filePaths.length === 0) return;

    try {
      const { repository } = connection;

      const { data, error } = await supabase.functions.invoke('github-api', {
        body: {
          action: 'getFileContents',
          pat,
          owner: repository.owner,
          repo: repository.name,
          branch: repository.defaultBranch,
          paths: filePaths,
        },
      });

      if (error || data?.error) {
        console.error('Failed to fetch file contents:', data?.error || error);
        return;
      }

      // Update cache with file contents
      const newContents: Record<string, string> = { ...connection.cache.fileContents };
      for (const item of data?.contents || []) {
        if (item.content && !item.error) {
          newContents[item.path] = item.content;
        }
      }

      setConnections(prev => prev.map(c =>
        c.repository.id === repoId && c.cache
          ? { ...c, cache: { ...c.cache, fileContents: newContents } }
          : c
      ));

      // Sync to database if authenticated
      if (isAuthenticated && user) {
        supabase
          .from('github_repo_cache')
          .update({ file_contents: newContents })
          .eq('repo_id', repoId)
          .then(({ error: dbError }) => {
            if (dbError) console.error('Failed to sync file contents:', dbError);
          });
      }
    } catch (e) {
      console.error('Failed to fetch file contents:', e);
    }
  }, [pat, patStatus, connections, isAuthenticated, user]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<GitContextSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Get active git context for prompt injection
  const getActiveGitContext = useCallback((): GitContext | null => {
    if (!settings.enabled || !settings.autoIncludeInCoding) return null;

    // Include repos that have summary/keyFiles OR selected paths
    const activeConnections = connections.filter(c =>
      c.cache && (c.cache.summary || c.cache.selectedPaths.length > 0)
    );

    if (activeConnections.length === 0) return null;

    let totalTokens = 0;
    const repositories: GitContext['repositories'] = [];

    for (const conn of activeConnections) {
      if (!conn.cache) continue;

      const { repository, cache } = conn;

      // Build tree structure (full tree if no selections, otherwise filtered)
      const structure = cache.selectedPaths.length > 0
        ? buildTreeString(cache.tree, cache.selectedPaths)
        : buildTreeString(cache.tree, [], 3); // Show top 3 levels for full tree

      // Get file contents for selected files
      const selectedFiles: Array<{ path: string; content: string }> = [];
      for (const path of cache.selectedPaths) {
        const content = cache.fileContents[path];
        if (content) {
          selectedFiles.push({ path, content });
        }
      }

      // Estimate tokens for this repo (including summary and key files)
      const summaryTokens = cache.summary ? estimateTokens(cache.summary) : 0;
      const keyFilesTokens = cache.keyFiles
        ? estimateTokens(Object.values(cache.keyFiles).join('\n'))
        : 0;
      const structureTokens = estimateTokens(structure);
      const selectedFilesTokens = estimateTokens(selectedFiles.map(f => f.content).join('\n'));
      const repoTokens = summaryTokens + keyFilesTokens + structureTokens + selectedFilesTokens;

      // Check if adding this repo would exceed limit
      if (totalTokens + repoTokens > settings.maxContextTokens) {
        break;
      }

      totalTokens += repoTokens;

      repositories.push({
        fullName: repository.fullName,
        branch: cache.branch,
        structure,
        summary: cache.summary,
        keyFiles: cache.keyFiles,
        selectedFiles,
      });
    }

    return repositories.length > 0 ? { repositories } : null;
  }, [settings, connections]);

  // Computed: has active git context (summary/keyFiles OR selected paths)
  const hasActiveGitContext = settings.enabled &&
    settings.autoIncludeInCoding &&
    connections.some(c => c.cache && (c.cache.summary || c.cache.selectedPaths.length > 0));

  return (
    <GitRepoContext.Provider value={{
      pat,
      setPat,
      patStatus,
      validatePat,
      patUsername,
      connections,
      addConnection,
      removeConnection,
      updateCache,
      refreshCache,
      isRefreshing,
      setSelectedPaths,
      fetchFileContents,
      settings,
      updateSettings,
      getActiveGitContext,
      hasActiveGitContext,
      availableRepos,
      fetchAvailableRepos,
      isFetchingRepos,
    }}>
      {children}
    </GitRepoContext.Provider>
  );
}

export function useGitRepo() {
  const context = useContext(GitRepoContext);
  if (context === undefined) {
    throw new Error('useGitRepo must be used within a GitRepoProvider');
  }
  return context;
}
