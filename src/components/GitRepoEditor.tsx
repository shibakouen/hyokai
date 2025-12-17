import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GitBranch,
  Plus,
  Check,
  X,
  Loader2,
  ExternalLink,
  Lock,
  Globe,
  Search,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGitRepo } from "@/contexts/GitRepoContext";
import { GitRepoConnectionCard } from "@/components/GitRepoConnectionCard";
import { LIMITS, generateRepoId, type GitHubRepository } from "@/lib/gitRepo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GitRepoEditor() {
  const { t } = useLanguage();
  const {
    pat,
    setPat,
    patStatus,
    validatePat,
    patUsername,
    connections,
    addConnection,
    removeConnection,
    refreshCache,
    isRefreshing,
    setSelectedPaths,
    fetchFileContents,
    settings,
    updateSettings,
    hasActiveGitContext,
    availableRepos,
    fetchAvailableRepos,
    isFetchingRepos,
  } = useGitRepo();

  const [open, setOpen] = useState(false);
  const [patInput, setPatInput] = useState(pat || "");
  const [showAddRepoDialog, setShowAddRepoDialog] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");

  // Sync PAT input with stored PAT
  useEffect(() => {
    if (pat) {
      setPatInput(pat);
    }
  }, [pat]);

  // Fetch repos when dialog opens and PAT is valid
  useEffect(() => {
    if (showAddRepoDialog && patStatus === "valid" && availableRepos.length === 0) {
      fetchAvailableRepos();
    }
  }, [showAddRepoDialog, patStatus, availableRepos.length, fetchAvailableRepos]);

  const handlePatSave = async () => {
    if (!patInput.trim()) {
      setPat(null);
      return;
    }

    const isValid = await validatePat(patInput.trim());
    if (isValid) {
      setPat(patInput.trim());
      toast.success(t("git.connectionValid"));
    } else {
      toast.error(t("git.connectionInvalid"));
    }
  };

  const handleAddRepo = (repo: typeof availableRepos[number]) => {
    if (!repo) return;

    const newRepo: GitHubRepository = {
      id: generateRepoId(),
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      connectedAt: Date.now(),
      lastRefreshed: null,
    };

    addConnection(newRepo);
    setShowAddRepoDialog(false);
    toast.success(t("git.repoAdded").replace("{name}", repo.full_name));

    // Auto-refresh to fetch tree
    setTimeout(() => {
      refreshCache(newRepo.id);
    }, 100);
  };

  const handleRemoveRepo = (repoId: string) => {
    removeConnection(repoId);
  };

  const filteredRepos = availableRepos.filter(repo => {
    if (!repoSearchQuery.trim()) return true;
    const query = repoSearchQuery.toLowerCase();
    return (
      repo.full_name.toLowerCase().includes(query) ||
      repo.name.toLowerCase().includes(query)
    );
  });

  // Check if repo is already connected
  const isRepoConnected = (fullName: string) =>
    connections.some(c => c.repository.fullName === fullName);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
              >
                <GitBranch className="h-4 w-4" />
                {hasActiveGitContext && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
                )}
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {hasActiveGitContext ? t("git.active") : t("git.title")}
          </TooltipContent>
        </Tooltip>

        <SheetContent className="frost-glass w-full max-w-[400px] sm:max-w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {t("git.title")}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <p className="text-sm text-foreground/80">
              {t("git.description")}
            </p>

            {/* PAT Section */}
            <div className="space-y-3 p-4 rounded-lg bg-white/30 dark:bg-slate-700/30 border border-foreground/10">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("git.patTitle")}</Label>
                {patStatus === "valid" && patUsername && (
                  <span className="flex items-center gap-1.5 text-xs text-green-500">
                    <Check className="h-3 w-3" />
                    {patUsername}
                  </span>
                )}
                {patStatus === "invalid" && (
                  <span className="flex items-center gap-1.5 text-xs text-red-500">
                    <X className="h-3 w-3" />
                    {t("git.connectionInvalid")}
                  </span>
                )}
              </div>

              <p className="text-xs text-foreground/70">
                {t("git.patDescription")}{" "}
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cb-blue hover:underline inline-flex items-center gap-1"
                >
                  GitHub Settings
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>

              <div className="flex gap-2">
                <Input
                  type="password"
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  placeholder={t("git.patPlaceholder")}
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePatSave}
                  disabled={patStatus === "validating"}
                >
                  {patStatus === "validating" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("git.testConnection")
                  )}
                </Button>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">{t("git.settings")}</Label>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm text-foreground">{t("git.autoInclude")}</Label>
                  <p className="text-xs text-foreground/70">
                    {t("git.autoIncludeDescription")}
                  </p>
                </div>
                <Switch
                  checked={settings.autoIncludeInCoding}
                  onCheckedChange={(checked) =>
                    updateSettings({ autoIncludeInCoding: checked })
                  }
                />
              </div>
            </div>

            {/* Connected Repositories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("git.connectedRepos")}</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddRepoDialog(true)}
                  disabled={patStatus !== "valid" || connections.length >= LIMITS.MAX_REPOS}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("git.addRepo")}
                </Button>
              </div>

              {connections.length === 0 ? (
                <div className="text-center py-8 text-foreground/60 text-sm">
                  {patStatus !== "valid" ? (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 opacity-60" />
                      <p>{t("git.enterPatFirst")}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <GitBranch className="h-8 w-8 opacity-60" />
                      <p>{t("git.noRepos")}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map((connection) => (
                    <GitRepoConnectionCard
                      key={connection.repository.id}
                      connection={connection}
                      onRefresh={() => refreshCache(connection.repository.id)}
                      onRemove={() => handleRemoveRepo(connection.repository.id)}
                      onSelectPaths={(paths) =>
                        setSelectedPaths(connection.repository.id, paths)
                      }
                      onFetchContents={(paths) =>
                        fetchFileContents(connection.repository.id, paths)
                      }
                      isRefreshing={isRefreshing === connection.repository.id}
                    />
                  ))}
                </div>
              )}

              {connections.length > 0 && (
                <p className="text-xs text-foreground/60 text-center">
                  {connections.length}/{LIMITS.MAX_REPOS} {t("git.reposConnected")}
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Repository Dialog */}
      <Dialog open={showAddRepoDialog} onOpenChange={setShowAddRepoDialog}>
        <DialogContent className="frost-glass sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("git.selectRepo")}</DialogTitle>
            <DialogDescription>
              {t("git.selectRepoDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={repoSearchQuery}
                onChange={(e) => setRepoSearchQuery(e.target.value)}
                placeholder={t("git.searchRepos")}
                className="pl-9"
              />
            </div>

            {/* Repository List */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-[200px] max-h-[400px]">
              {isFetchingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-foreground/60" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-foreground/60 text-sm">
                  {repoSearchQuery ? t("git.noMatchingRepos") : t("git.noReposAvailable")}
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const connected = isRepoConnected(repo.full_name);
                  return (
                    <button
                      key={repo.id}
                      onClick={() => !connected && handleAddRepo(repo)}
                      disabled={connected}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        connected
                          ? "bg-cb-blue/15 border border-cb-blue/40 cursor-not-allowed"
                          : "hover:bg-white/30 dark:hover:bg-slate-700/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {repo.private ? (
                          <Lock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <Globe className="h-4 w-4 text-foreground/60 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate text-foreground">{repo.full_name}</div>
                          <div className="text-xs text-foreground/60">
                            {repo.default_branch}
                          </div>
                        </div>
                      </div>
                      {connected && (
                        <span className="flex items-center gap-1 text-xs text-cb-blue flex-shrink-0">
                          <Check className="h-3 w-3" />
                          {t("git.connected")}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAvailableRepos}
              disabled={isFetchingRepos}
              className="w-full"
            >
              {isFetchingRepos ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t("git.refreshRepoList")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
