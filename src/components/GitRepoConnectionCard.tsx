import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Lock,
  Globe,
  Loader2,
  FolderTree,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { GitRepoSelector } from "@/components/GitRepoSelector";
import { GitRepoConnection, formatTimestamp, estimateTokens } from "@/lib/gitRepo";

interface GitRepoConnectionCardProps {
  connection: GitRepoConnection;
  onRefresh: () => void;
  onRemove: () => void;
  onSelectPaths: (paths: string[]) => void;
  onFetchContents: (paths: string[]) => void;
  isRefreshing: boolean;
}

export function GitRepoConnectionCard({
  connection,
  onRefresh,
  onRemove,
  onSelectPaths,
  onFetchContents,
  isRefreshing,
}: GitRepoConnectionCardProps) {
  const { t } = useLanguage();
  const { repository, cache } = connection;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const selectedCount = cache?.selectedPaths.length || 0;
  const hasCache = cache !== null;

  // Estimate tokens for current selection
  const estimatedTokens = cache
    ? estimateTokens(
        cache.selectedPaths
          .map((p) => cache.fileContents[p] || "")
          .join("\n")
      )
    : 0;

  return (
    <>
      <div className="p-3 rounded-lg bg-white/5 border border-border/50 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {repository.isPrivate ? (
              <Lock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-medium truncate text-sm">
                {repository.fullName}
              </div>
              <div className="text-xs text-muted-foreground">
                {repository.defaultBranch} · {t("git.lastRefreshed")}:{" "}
                {formatTimestamp(repository.lastRefreshed)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-500"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Selection Info */}
        {hasCache && (
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSelector ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <FolderTree className="h-3.5 w-3.5" />
              {t("git.selectFiles")}
            </button>

            <span className="text-muted-foreground">
              {selectedCount > 0 ? (
                <>
                  {selectedCount} {t("git.filesSelected")} · ~{estimatedTokens}{" "}
                  {t("context.tokens")}
                </>
              ) : (
                t("git.noFilesSelected")
              )}
            </span>
          </div>
        )}

        {/* Not cached warning */}
        {!hasCache && !isRefreshing && (
          <div className="text-xs text-muted-foreground text-center py-2">
            {t("git.clickRefreshToLoad")}
          </div>
        )}

        {/* Loading indicator */}
        {isRefreshing && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("git.loadingTree")}
          </div>
        )}

        {/* File Selector */}
        {showSelector && hasCache && (
          <GitRepoSelector
            tree={cache.tree}
            selectedPaths={cache.selectedPaths}
            fileContents={cache.fileContents}
            onSelectionChange={(paths) => {
              onSelectPaths(paths);
              // Fetch contents for newly selected files
              const newPaths = paths.filter(
                (p) => !cache.selectedPaths.includes(p)
              );
              if (newPaths.length > 0) {
                onFetchContents(newPaths);
              }
            }}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("git.removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("git.removeConfirmMessage").replace(
                "{name}",
                repository.fullName
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("git.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onRemove}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("git.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
