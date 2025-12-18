import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  History,
  Code,
  Sparkles,
  GitCompare,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  HistoryEntry,
  loadHistory,
  saveHistory,
  deleteHistoryEntry,
  clearHistory,
  loadHistoryFromDb,
  addHistoryEntryToDb,
  deleteHistoryEntryFromDb,
  clearHistoryFromDb,
  formatTimestamp,
  truncateText,
} from "@/lib/history";

interface HistoryPanelProps {
  onRestore?: (entry: HistoryEntry) => void;
}

function HistoryEntryCard({
  entry,
  onDelete,
  onRestore,
}: {
  entry: HistoryEntry;
  onDelete: () => void;
  onRestore?: (entry: HistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const { t } = useLanguage();

  const handleCopyInput = async () => {
    await navigator.clipboard.writeText(entry.input);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyOutput = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const isCompare = entry.result.type === 'compare';
  const isCoding = entry.taskMode === 'coding';

  return (
    <div className="border border-border/50 rounded-lg bg-muted/20 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Mode badges */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isCoding ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">
                <Code className="w-3 h-3" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">
                <Sparkles className="w-3 h-3" />
              </span>
            )}
            {isCompare && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400">
                <GitCompare className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Preview text */}
          <span className="text-sm truncate text-foreground/80">
            {truncateText(entry.input, 60)}
          </span>
        </div>

        {/* Timestamp and expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(entry.timestamp)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/30 p-3 space-y-3">
          {/* Input section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t('history.input')}
              </span>
              <div className="flex items-center gap-1">
                {onRestore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-xs"
                    onClick={() => onRestore(entry)}
                  >
                    {t('history.restore')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleCopyInput}
                >
                  {copiedInput ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <pre className="text-xs bg-background/50 rounded p-2 whitespace-pre-wrap font-mono max-h-32 overflow-auto">
              {entry.input}
            </pre>
          </div>

          {/* Output section */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t('history.output')}
            </span>

            {isCompare && entry.result.type === 'compare' ? (
              // Compare mode results
              <div className="space-y-2">
                {entry.result.results.map((r, idx) => (
                  <div key={idx} className="bg-background/50 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">
                        {r.modelName}
                        <span className="text-muted-foreground ml-1">
                          ({r.modelProvider})
                        </span>
                      </span>
                      {r.elapsedTime && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {(r.elapsedTime / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    {r.error ? (
                      <span className="text-xs text-destructive">{r.error}</span>
                    ) : (
                      <pre className="text-xs whitespace-pre-wrap font-mono max-h-24 overflow-auto">
                        {r.output}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : entry.result.type === 'single' ? (
              // Single mode result
              <div className="bg-background/50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">
                    {entry.result.modelName}
                    <span className="text-muted-foreground ml-1">
                      ({entry.result.modelProvider})
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.result.elapsedTime && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(entry.result.elapsedTime / 1000).toFixed(1)}s
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => handleCopyOutput(entry.result.type === 'single' ? entry.result.output : '')}
                    >
                      {copiedOutput ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono max-h-48 overflow-auto">
                  {entry.result.output}
                </pre>
              </div>
            ) : null}
          </div>

          {/* Delete button */}
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {t('history.delete')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { t } = useLanguage();
  const { isAuthenticated, user, isLoading: isAuthLoading, wasEverAuthenticated } = useAuth();

  // Track if we've loaded from DB for current user to avoid duplicate loads
  const loadedUserIdRef = useRef<string | null>(null);
  // Track the last user.id we tried to load for
  const lastUserIdRef = useRef<string | null>(null);

  // Load history - ALWAYS show localStorage immediately, then enhance with DB data
  const loadHistoryData = useCallback(async () => {
    // Step 1: ALWAYS load and show localStorage immediately (no waiting for auth)
    const localHistory = loadHistory();

    // Only update state if we don't already have data or if local has more
    if (history.length === 0 || localHistory.length > history.length) {
      setHistory(localHistory);
    }

    // Step 2: If we have a user, try to load from database
    if (user?.id) {
      // Avoid duplicate loads for the same user
      if (loadedUserIdRef.current === user.id) {
        return;
      }

      // Mark that we're attempting to load for this user
      lastUserIdRef.current = user.id;

      setIsLoadingHistory(true);
      try {
        const dbHistory = await loadHistoryFromDb(user.id);

        // Check if user changed while we were loading
        if (lastUserIdRef.current !== user.id) {
          return;
        }

        if (dbHistory === null) {
          // Database load failed - keep localStorage data
          console.warn('[HistoryPanel] Database load failed, keeping localStorage data');
        } else if (dbHistory.length > 0) {
          // Got data from database
          console.log('[HistoryPanel] Loaded', dbHistory.length, 'entries from database');

          // Merge with any unsynced local entries
          const dbIds = new Set(dbHistory.map(e => e.id));
          const unsyncedLocal = localHistory.filter(e => !dbIds.has(e.id));

          // Sync unsynced entries to database (fire and forget)
          if (unsyncedLocal.length > 0) {
            console.log('[HistoryPanel] Syncing', unsyncedLocal.length, 'local entries to database');
            for (const entry of unsyncedLocal) {
              addHistoryEntryToDb(user.id, {
                input: entry.input,
                taskMode: entry.taskMode,
                result: entry.result,
              }).catch(e => console.error('[HistoryPanel] Failed to sync entry:', e));
            }
          }

          // Merge and sort
          const merged = [...dbHistory, ...unsyncedLocal]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50);

          setHistory(merged);
          saveHistory(merged); // Update localStorage cache
          loadedUserIdRef.current = user.id;

        } else if (localHistory.length > 0) {
          // Database is empty but we have local data - sync it
          console.log('[HistoryPanel] Database empty, syncing', localHistory.length, 'local entries');
          setHistory(localHistory);

          // Sync to database
          for (const entry of localHistory.slice(0, 50)) {
            addHistoryEntryToDb(user.id, {
              input: entry.input,
              taskMode: entry.taskMode,
              result: entry.result,
            }).catch(e => console.error('[HistoryPanel] Failed to sync entry:', e));
          }
          loadedUserIdRef.current = user.id;
        } else {
          // Both empty - that's fine
          loadedUserIdRef.current = user.id;
        }
      } catch (e) {
        console.error('[HistoryPanel] Error loading from database:', e);
        // Keep localStorage data
      } finally {
        setIsLoadingHistory(false);
      }
    }
  }, [user?.id, history.length]);

  // Load immediately when panel opens
  useEffect(() => {
    if (isOpen) {
      // Reset loaded state when panel opens to force reload
      loadedUserIdRef.current = null;
      loadHistoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Intentionally exclude loadHistoryData to prevent infinite loop

  // Reload when user becomes available (handles race condition with auth)
  useEffect(() => {
    if (isOpen && user?.id && loadedUserIdRef.current !== user.id) {
      loadHistoryData();
    }
  }, [isOpen, user?.id, loadHistoryData]);

  // Also reload when auth finishes loading (belt and suspenders)
  useEffect(() => {
    if (isOpen && !isAuthLoading && user?.id && loadedUserIdRef.current !== user.id) {
      loadHistoryData();
    }
  }, [isOpen, isAuthLoading, user?.id, loadHistoryData]);

  // Reset state when user logs out (only if they were previously authenticated)
  useEffect(() => {
    if (!isAuthenticated && !isAuthLoading && wasEverAuthenticated) {
      setHistory([]);
      loadedUserIdRef.current = null;
    }
  }, [isAuthenticated, isAuthLoading, wasEverAuthenticated]);

  const handleDelete = async (id: string) => {
    if (isAuthenticated && user) {
      await deleteHistoryEntryFromDb(user.id, id);
    }
    deleteHistoryEntry(id);
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAll = async () => {
    if (isAuthenticated && user) {
      await clearHistoryFromDb(user.id);
    }
    clearHistory();
    setHistory([]);
    loadedUserIdRef.current = null; // Reset so next open will try DB again
  };

  const handleRestore = (entry: HistoryEntry) => {
    onRestore?.(entry);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <History className="w-4 h-4" />
          <span className="ml-1.5 hidden sm:inline">{t('history.title')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {t('history.title')}
            </SheetTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={handleClearAll}
              >
                {t('history.clearAll')}
              </Button>
            )}
          </div>
        </SheetHeader>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{t('history.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(entry => (
              <HistoryEntryCard
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                onRestore={handleRestore}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        {history.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">{t('history.legend')}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  <Code className="w-3 h-3" />
                </span>
                {t('mode.coding')}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  <Sparkles className="w-3 h-3" />
                </span>
                {t('mode.prompting')}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  <GitCompare className="w-3 h-3" />
                </span>
                {t('compare.models')}
              </span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
