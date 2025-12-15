import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMode } from "@/contexts/ModeContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { Sparkles, GraduationCap, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function BeginnerModeToggle() {
  const { isBeginnerMode, setIsBeginnerMode } = useMode();
  const { t } = useLanguage();
  const [showAdvancedWarning, setShowAdvancedWarning] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (!checked && isBeginnerMode) {
      // Switching from beginner to advanced - show warning
      setShowAdvancedWarning(true);
    } else {
      // Switching to beginner mode - no warning needed
      setIsBeginnerMode(checked);
    }
  };

  const confirmAdvancedMode = () => {
    setIsBeginnerMode(false);
    setShowAdvancedWarning(false);
  };

  return (
    <>
      <TooltipProvider>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isBeginnerMode ? (
              <Sparkles className="w-4 h-4 text-primary" />
            ) : (
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
            )}
            <Label
              htmlFor="beginner-mode"
              className="text-sm font-medium cursor-pointer"
            >
              {isBeginnerMode ? t("beginner.simpleMode") : t("beginner.advancedMode")}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t("beginner.modeHelpAria")}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px] text-center">
                <p className="text-sm">
                  {isBeginnerMode
                    ? t("beginner.simpleModeTooltip")
                    : t("beginner.advancedModeTooltip")}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="beginner-mode"
            checked={isBeginnerMode}
            onCheckedChange={handleToggle}
            aria-label={t("beginner.toggleAria")}
          />
        </div>
      </TooltipProvider>

      <AlertDialog open={showAdvancedWarning} onOpenChange={setShowAdvancedWarning}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              {t("beginner.advancedWarningTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t("beginner.advancedWarningMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary/20 hover:bg-primary/30 border-0">
              {t("beginner.staySimple")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAdvancedMode}
              className="bg-white/10 hover:bg-white/20 border border-white/20"
            >
              {t("beginner.switchAdvanced")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
