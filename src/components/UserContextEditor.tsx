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
import { Settings, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserContext, USER_CONTEXT_MAX_LENGTH } from "@/contexts/UserContextContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function UserContextEditor() {
  const { userContext, setUserContext } = useUserContext();
  const { t } = useLanguage();
  const [draft, setDraft] = useState(userContext);
  const [open, setOpen] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(userContext);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    setUserContext(draft);
    setOpen(false);
  };

  const handleClear = () => {
    setDraft("");
  };

  const hasContext = userContext.trim().length > 0;

  return (
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
      <SheetContent className="frost-glass w-[400px] sm:w-[540px]">
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
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, USER_CONTEXT_MAX_LENGTH))}
            placeholder={t('context.placeholder')}
            className="min-h-[200px] resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{USER_CONTEXT_MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={draft.length === 0}
              >
                {t('context.clear')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-ice-glow hover:bg-ice-glow/90"
              >
                {t('context.save')}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
