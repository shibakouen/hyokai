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
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  SimpleHistoryEntry,
  loadSimpleHistory,
  saveSimpleHistory,
  deleteSimpleHistoryEntry,
  clearSimpleHistory,
  loadSimpleHistoryFromDb,
  addSimpleHistoryEntryToDb,
  deleteSimpleHistoryEntryFromDb,
  clearSimpleHistoryFromDb,
  formatSimpleTimestamp,
  truncateSimpleText,
} from "@/lib/simpleHistory";

interface SimpleHistoryPanelProps {
  onRestore?: (entry: SimpleHistoryEntry) => void;
}

function SimpleHistoryEntryCard({
  entry,
  onDelete,
  onRestore,
}: {
  entry: SimpleHistoryEntry;
  onDelete: () => void;
  onRestore?: (entry: SimpleHistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const { t } = useLanguage();

  const handleCopyInput = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(entry.input);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyOutput = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(entry.output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestore?.(entry);
  };

  return (
    <div className="border border-foreground/10 rounded-xl bg-white/30 dark:bg-slate-700/30 overflow-hidden">
      {/* Header - clickable to expand */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/40 dark:hover:bg-slate-700/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate text-foreground block">
            {truncateSimpleText(entry.input, 50)}
          </span>
        </div>

        {/* Timestamp and expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-foreground/60">
            {formatSimpleTimestamp(entry.timestamp)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-foreground/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-foreground/60" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-foreground/10 p-3 space-y-3">
          {/* Input section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/70">
                {t('simpleHistory.input')}
              </span>
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
            <pre className="text-xs bg-white/50 dark:bg-slate-800/50 rounded-lg p-2 whitespace-pre-wrap font-mono max-h-24 overflow-auto text-foreground">
              {entry.input}
            </pre>
          </div>

          {/* Output section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground/70">
                  {t('simpleHistory.output')}
                </span>
                {entry.elapsedTime && (
                  <span className="text-xs text-foreground/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(entry.elapsedTime / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={handleCopyOutput}
              >
                {copiedOutput ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
            <pre className="text-xs bg-white/50 dark:bg-slate-800/50 rounded-lg p-2 whitespace-pre-wrap font-mono max-h-32 overflow-auto text-foreground">
              {entry.output}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {t('simpleHistory.delete')}
            </Button>

            {onRestore && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs border-cb-blue/50 text-cb-blue hover:bg-cb-blue/10"
                onClick={handleRestore}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {t('simpleHistory.restore')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SimpleHistoryPanel({ onRestore }: SimpleHistoryPanelProps) {
  const [history, setHistory] = useState<SimpleHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { t } = useLanguage();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

  // Track if we've loaded from DB for current user to avoid duplicate loads
  const loadedUserIdRef = useRef<string | null>(null);
  // Track the last user.id we tried to load for
  const lastUserIdRef = useRef<string | null>(null);

  // Load history - ALWAYS show localStorage immediately, then enhance with DB data
  const loadHistoryData = useCallback(async () => {
    // Step 1: ALWAYS load and show localStorage immediately (no waiting for auth)
    const localHistory = loadSimpleHistory();

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
        const dbHistory = await loadSimpleHistoryFromDb(user.id);

        // Check if user changed while we were loading
        if (lastUserIdRef.current !== user.id) {
          return;
        }

        if (dbHistory === null) {
          // Database load failed - keep localStorage data
          console.warn('[SimpleHistoryPanel] Database load failed, keeping localStorage data');
        } else if (dbHistory.length > 0) {
          // Got data from database
          console.log('[SimpleHistoryPanel] Loaded', dbHistory.length, 'entries from database');

          // Merge with any unsynced local entries
          const dbIds = new Set(dbHistory.map(e => e.id));
          const unsyncedLocal = localHistory.filter(e => !dbIds.has(e.id));

          // Sync unsynced entries to database (fire and forget)
          if (unsyncedLocal.length > 0) {
            console.log('[SimpleHistoryPanel] Syncing', unsyncedLocal.length, 'local entries to database');
            for (const entry of unsyncedLocal) {
              addSimpleHistoryEntryToDb(user.id, {
                input: entry.input,
                output: entry.output,
                elapsedTime: entry.elapsedTime,
              }).catch(e => console.error('[SimpleHistoryPanel] Failed to sync entry:', e));
            }
          }

          // Merge and sort
          const merged = [...dbHistory, ...unsyncedLocal]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 30);

          setHistory(merged);
          saveSimpleHistory(merged); // Update localStorage cache
          loadedUserIdRef.current = user.id;

        } else if (localHistory.length > 0) {
          // Database is empty but we have local data - sync it
          console.log('[SimpleHistoryPanel] Database empty, syncing', localHistory.length, 'local entries');
          setHistory(localHistory);

          // Sync to database
          for (const entry of localHistory.slice(0, 30)) {
            addSimpleHistoryEntryToDb(user.id, {
              input: entry.input,
              output: entry.output,
              elapsedTime: entry.elapsedTime,
            }).catch(e => console.error('[SimpleHistoryPanel] Failed to sync entry:', e));
          }
          loadedUserIdRef.current = user.id;
        } else {
          // Both empty - that's fine
          loadedUserIdRef.current = user.id;
        }
      } catch (e) {
        console.error('[SimpleHistoryPanel] Error loading from database:', e);
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
  }, [isOpen]);

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

  const handleDelete = async (id: string) => {
    if (isAuthenticated && user) {
      await deleteSimpleHistoryEntryFromDb(user.id, id);
    }
    deleteSimpleHistoryEntry(id);
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAll = async () => {
    if (isAuthenticated && user) {
      await clearSimpleHistoryFromDb(user.id);
    }
    clearSimpleHistory();
    setHistory([]);
    loadedUserIdRef.current = null; // Reset so next open will try DB again
  };

  const handleRestore = (entry: SimpleHistoryEntry) => {
    onRestore?.(entry);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-foreground/70 hover:text-foreground"
        >
          <History className="w-4 h-4" />
          <span className="ml-1.5 hidden sm:inline">{t('simpleHistory.title')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="frost-glass w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <History className="w-5 h-5" />
              {t('simpleHistory.title')}
            </SheetTitle>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={handleClearAll}
              >
                {t('simpleHistory.clearAll')}
              </Button>
            )}
          </div>
        </SheetHeader>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-foreground/60">
            <History className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">{t('simpleHistory.empty')}</p>
            <p className="text-xs mt-1 text-foreground/50">{t('simpleHistory.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(entry => (
              <SimpleHistoryEntryCard
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
                onRestore={handleRestore}
              />
            ))}
          </div>
        )}

        {/* Info footer */}
        {history.length > 0 && (
          <div className="mt-6 pt-4 border-t border-foreground/10">
            <p className="text-xs text-foreground/50 text-center">
              {t('simpleHistory.count').replace('{count}', String(history.length))}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
