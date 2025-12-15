import { useMemo } from 'react';
import { useGitRepo } from '@/contexts/GitRepoContext';
import { useMode } from '@/contexts/ModeContext';
import { formatGitContextForPrompt } from '@/lib/gitContextBuilder';

/**
 * Hook for getting the formatted git context string for prompt injection.
 * Only returns context when in Coding mode and git context is enabled.
 */
export function useGitContext() {
  const { mode } = useMode();
  const { getActiveGitContext, settings, hasActiveGitContext } = useGitRepo();

  const formattedContext = useMemo(() => {
    // Only include git context in Coding mode
    if (mode !== 'coding' || !settings.autoIncludeInCoding) {
      return null;
    }

    const gitContext = getActiveGitContext();
    if (!gitContext) {
      return null;
    }

    return formatGitContextForPrompt(gitContext);
  }, [mode, settings.autoIncludeInCoding, getActiveGitContext]);

  return {
    gitContext: formattedContext,
    hasGitContext: hasActiveGitContext && mode === 'coding' && settings.autoIncludeInCoding,
    isEnabled: settings.autoIncludeInCoding,
  };
}
