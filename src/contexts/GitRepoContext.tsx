import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  // Load PAT from localStorage
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

  // Load connections from localStorage
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

  // Load settings from localStorage
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

  // Persist PAT
  useEffect(() => {
    if (pat) {
      localStorage.setItem(STORAGE_KEYS.PAT, encodePAT(pat));
    } else {
      localStorage.removeItem(STORAGE_KEYS.PAT);
    }
  }, [pat]);

  // Persist connections
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(connections));
  }, [connections]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Validate PAT on load if exists
  useEffect(() => {
    if (pat && patStatus === 'idle') {
      validatePat(pat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - intentionally empty deps

  // Set PAT
  const setPat = useCallback((token: string | null) => {
    setPatState(token);
    if (!token) {
      setPatStatus('idle');
      setPatUsername(null);
      setAvailableRepos([]);
    }
  }, []);

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
      setPatUsername(data?.user?.login || null);
      return true;
    } catch {
      setPatStatus('invalid');
      setPatUsername(null);
      return false;
    }
  }, []);

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

      return [...prev, { repository: repo, cache: null }];
    });
  }, []);

  // Remove connection
  const removeConnection = useCallback((repoId: string) => {
    setConnections(prev => prev.filter(c => c.repository.id !== repoId));
  }, []);

  // Update cache
  const updateCache = useCallback((repoId: string, cache: CachedRepoData) => {
    setConnections(prev => prev.map(c =>
      c.repository.id === repoId ? { ...c, cache } : c
    ));
  }, []);

  // Refresh cache for a repo
  const refreshCache = useCallback(async (repoId: string) => {
    if (!pat || patStatus !== 'valid' || isRefreshing) return;

    const connection = connections.find(c => c.repository.id === repoId);
    if (!connection) return;

    setIsRefreshing(repoId);

    try {
      const { repository } = connection;

      // Fetch tree
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

      // Create or update cache
      const newCache: CachedRepoData = {
        repoId,
        branch: repository.defaultBranch,
        tree,
        selectedPaths: connection.cache?.selectedPaths || [],
        fileContents: connection.cache?.fileContents || {},
        fetchedAt: Date.now(),
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
    } catch (e) {
      console.error('Failed to refresh cache:', e);
    } finally {
      setIsRefreshing(null);
    }
  }, [pat, patStatus, isRefreshing, connections]);

  // Set selected paths
  const setSelectedPaths = useCallback((repoId: string, paths: string[]) => {
    setConnections(prev => prev.map(c => {
      if (c.repository.id !== repoId || !c.cache) return c;
      return {
        ...c,
        cache: { ...c.cache, selectedPaths: paths.slice(0, LIMITS.MAX_SELECTED_PATHS) },
      };
    }));
  }, []);

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
    } catch (e) {
      console.error('Failed to fetch file contents:', e);
    }
  }, [pat, patStatus, connections]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<GitContextSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Get active git context for prompt injection
  const getActiveGitContext = useCallback((): GitContext | null => {
    if (!settings.enabled || !settings.autoIncludeInCoding) return null;

    const activeConnections = connections.filter(c =>
      c.cache && c.cache.selectedPaths.length > 0
    );

    if (activeConnections.length === 0) return null;

    let totalTokens = 0;
    const repositories: GitContext['repositories'] = [];

    for (const conn of activeConnections) {
      if (!conn.cache) continue;

      const { repository, cache } = conn;

      // Build tree structure for selected paths
      const structure = buildTreeString(cache.tree, cache.selectedPaths);

      // Get file contents for selected files
      const selectedFiles: Array<{ path: string; content: string }> = [];
      for (const path of cache.selectedPaths) {
        const content = cache.fileContents[path];
        if (content) {
          selectedFiles.push({ path, content });
        }
      }

      // Estimate tokens for this repo
      const repoContext = `${structure}\n${selectedFiles.map(f => f.content).join('\n')}`;
      const repoTokens = estimateTokens(repoContext);

      // Check if adding this repo would exceed limit
      if (totalTokens + repoTokens > settings.maxContextTokens) {
        break;
      }

      totalTokens += repoTokens;

      repositories.push({
        fullName: repository.fullName,
        branch: cache.branch,
        structure,
        selectedFiles,
      });
    }

    return repositories.length > 0 ? { repositories } : null;
  }, [settings, connections]);

  // Computed: has active git context
  const hasActiveGitContext = settings.enabled &&
    settings.autoIncludeInCoding &&
    connections.some(c => c.cache && c.cache.selectedPaths.length > 0);

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
