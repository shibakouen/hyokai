import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Plus, Save, Trash2, AlertTriangle, AlertCircle, Sparkles, Copy, Code, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useUserContext,
  MAX_SAVED_CONTEXTS_COUNT,
  CONTEXT_TOKEN_SOFT_LIMIT,
  CONTEXT_TOKEN_HARD_LIMIT,
  type SavedContext,
} from "@/contexts/UserContextContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const CODING_CONTEXT_PROMPT = `Analyze my current project and output a structured context summary for Hyokai (a prompt transformer). Format exactly as shown, under 1500 characters:

PROJECT: [name] - [one-line description]
STACK: [languages, frameworks, database, hosting]

KEY FILES:
- [path]: [purpose]
- [path]: [purpose]
- [path]: [purpose]

PATTERNS:
- [code organization pattern]
- [state management approach]
- [API/data fetching style]

STYLE:
- [CSS/UI framework]
- [component conventions]

CONSTRAINTS:
- [important rules or limitations]

Be dense and factual. No explanations, just the data. This context helps transform vague prompts into detailed specs matching my project's patterns.`;

const PROMPTING_CONTEXT_PROMPT = `Create a personal context profile for Hyokai (a prompt transformer for AI assistants). Format exactly as shown, under 1500 characters:

ROLE: [your profession/expertise, e.g., Marketing Manager, Student, Researcher]
GOALS: [what you typically use AI for]

PREFERENCES:
- Tone: [Professional/Casual/Academic/Creative]
- Format: [Bullet points/Paragraphs/Tables/Mixed]
- Length: [Concise/Detailed/Comprehensive]
- Language style: [Simple/Technical/Formal]

DOMAINS:
- [area of expertise or interest]
- [another relevant domain]

CONSTRAINTS:
- [e.g., Must cite sources, Avoid jargon, Kid-friendly]
- [e.g., Focus on actionable advice]

AUDIENCE:
- [who you're usually creating content for]

Be dense and factual. No explanations, just the data. This context helps transform vague prompts into detailed, personalized outputs matching your style.`;

type PromptType = 'coding' | 'prompting';

export function UserContextEditor() {
  const {
    userContext,
    setUserContext,
    savedContexts,
    activeContextId,
    saveContext,
    updateContext,
    deleteContext,
    switchContext,
    getContextSize,
  } = useUserContext();
  const { t } = useLanguage();

  const [draft, setDraft] = useState(userContext);
  const [open, setOpen] = useState(false);
  const [contextName, setContextName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contextToDelete, setContextToDelete] = useState<SavedContext | null>(null);
  const [promptType, setPromptType] = useState<PromptType>('coding');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(userContext);
      // Set name from active context if exists
      const activeCtx = savedContexts.find(c => c.id === activeContextId);
      setContextName(activeCtx?.name || "");
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    setUserContext(draft);
    setOpen(false);
  };

  const handleSaveAsNew = () => {
    if (draft.trim()) {
      const ctx = saveContext(contextName || `Context ${savedContexts.length + 1}`, draft);
      setContextName(ctx.name);
    }
  };

  const handleUpdateCurrent = () => {
    if (activeContextId && draft.trim()) {
      updateContext(activeContextId, {
        name: contextName || undefined,
        content: draft,
      });
      setUserContext(draft);
    }
  };

  const handleSwitchContext = (id: string) => {
    if (id === "new") {
      switchContext(null);
      setDraft("");
      setContextName("");
    } else {
      switchContext(id);
      const ctx = savedContexts.find(c => c.id === id);
      if (ctx) {
        setDraft(ctx.content);
        setContextName(ctx.name);
      }
    }
  };

  const handleDeleteClick = (ctx: SavedContext, e: React.MouseEvent) => {
    e.stopPropagation();
    setContextToDelete(ctx);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (contextToDelete) {
      deleteContext(contextToDelete.id);
      if (contextToDelete.id === activeContextId) {
        setDraft("");
        setContextName("");
      }
    }
    setDeleteDialogOpen(false);
    setContextToDelete(null);
  };

  const handleClear = () => {
    setDraft("");
    setContextName("");
  };

  const handleCopyLLMPrompt = async () => {
    try {
      const promptToCopy = promptType === 'coding' ? CODING_CONTEXT_PROMPT : PROMPTING_CONTEXT_PROMPT;
      await navigator.clipboard.writeText(promptToCopy);
      toast.success(t('context.llmPromptCopied'));
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const hasContext = userContext.trim().length > 0;
  const { chars, tokens, warning } = getContextSize(draft);

  const getWarningMessage = () => {
    if (warning === 'error') {
      return t('context.tokenError');
    } else if (warning === 'warning') {
      return t('context.tokenWarning');
    }
    return null;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
              >
                <User className="h-4 w-4" />
                {hasContext && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-ice-glow" />
                )}
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {hasContext ? t('context.active') : t('context.title')}
          </TooltipContent>
        </Tooltip>
        <SheetContent className="frost-glass w-[400px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('context.title')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('context.description')}
            </p>

            {/* Get Context from LLM */}
            <div className="p-3 rounded-lg bg-ice-glow/10 border border-ice-glow/30">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-ice-glow flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t('context.llmPromptTitle')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('context.llmPromptDescription')}
                  </p>
                  <Tabs value={promptType} onValueChange={(v) => setPromptType(v as PromptType)} className="mt-3">
                    <TabsList className="h-8">
                      <TabsTrigger value="coding" className="text-xs px-3 gap-1.5">
                        <Code className="h-3.5 w-3.5" />
                        {t('context.promptTypeCoding')}
                      </TabsTrigger>
                      <TabsTrigger value="prompting" className="text-xs px-3 gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t('context.promptTypePrompting')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLLMPrompt}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {t('context.copyPrompt')}
                </Button>
              </div>
            </div>

            {/* Context Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('context.savedContexts')}</label>
              <Select
                value={activeContextId || "new"}
                onValueChange={handleSwitchContext}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('context.selectContext')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {t('context.newContext')}
                    </span>
                  </SelectItem>
                  {savedContexts.map((ctx) => (
                    <SelectItem key={ctx.id} value={ctx.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{ctx.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.ceil(ctx.content.length / 4)}t
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savedContexts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {savedContexts.length}/{MAX_SAVED_CONTEXTS_COUNT} {t('context.slotsUsed')}
                </p>
              )}
            </div>

            {/* Context Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('context.contextName')}</label>
              <Input
                value={contextName}
                onChange={(e) => setContextName(e.target.value)}
                placeholder={t('context.namePlaceholder')}
                className="w-full"
              />
            </div>

            {/* Context Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('context.content')}</label>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('context.placeholder')}
                className="min-h-[300px] resize-y font-mono text-sm"
              />
            </div>

            {/* Size Info & Warnings */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {chars.toLocaleString()} {t('context.chars')} · ~{tokens.toLocaleString()} {t('context.tokens')}
                </span>
                {warning && (
                  <span className={`flex items-center gap-1 ${warning === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {warning === 'error' ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {getWarningMessage()}
                  </span>
                )}
              </div>
            </div>

            {/* Token Limit Info */}
            {warning && (
              <div className={`p-3 rounded-lg text-sm ${warning === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-600'}`}>
                {warning === 'error' ? (
                  <>
                    <strong>{t('context.tooLarge')}</strong> {t('context.tokenErrorDetail').replace('{limit}', CONTEXT_TOKEN_HARD_LIMIT.toLocaleString())}
                  </>
                ) : (
                  <>
                    <strong>{t('context.largeContext')}</strong> {t('context.tokenWarningDetail').replace('{limit}', CONTEXT_TOKEN_SOFT_LIMIT.toLocaleString())}
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={draft.length === 0}
              >
                {t('context.clear')}
              </Button>

              {activeContextId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ctx = savedContexts.find(c => c.id === activeContextId);
                    if (ctx) {
                      setContextToDelete(ctx);
                      setDeleteDialogOpen(true);
                    }
                  }}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('context.delete')}
                </Button>
              )}

              <div className="flex-1" />

              {activeContextId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateCurrent}
                  disabled={draft.length === 0}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {t('context.update')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsNew}
                  disabled={draft.length === 0 || savedContexts.length >= MAX_SAVED_CONTEXTS_COUNT}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('context.saveNew')}
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSave}
                className="bg-ice-glow hover:bg-ice-glow/90"
                disabled={warning === 'error'}
              >
                {t('context.apply')}
              </Button>
            </div>

            {/* Saved Contexts List */}
            {savedContexts.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium">{t('context.allContexts')}</label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {savedContexts.map((ctx) => (
                    <div
                      key={ctx.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        ctx.id === activeContextId
                          ? 'bg-ice-glow/20 border border-ice-glow/50'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => handleSwitchContext(ctx.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{ctx.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ctx.content.length.toLocaleString()} {t('context.chars')} · ~{Math.ceil(ctx.content.length / 4).toLocaleString()} {t('context.tokens')}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={(e) => handleDeleteClick(ctx, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('context.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('context.deleteConfirmMessage').replace('{name}', contextToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('context.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              {t('context.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
