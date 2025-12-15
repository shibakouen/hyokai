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
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl frost-glass border-white/20 shadow-sm">
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
            {isBeginnerMode ? (
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cb-blue" />
            ) : (
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
            )}
            <Label
              htmlFor="beginner-mode"
              className="text-[10px] sm:text-xs md:text-sm font-medium cursor-pointer hidden xs:inline"
            >
              {isBeginnerMode ? t("beginner.simpleMode") : t("beginner.advancedMode")}
            </Label>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-cb-blue transition-colors p-0.5 sm:p-1 rounded-full hover:bg-cb-blue/10"
                  aria-label={t("beginner.modeHelpAria")}
                >
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[260px] sm:max-w-[280px] p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg"
              >
                <p className="text-sm font-medium mb-1">
                  {isBeginnerMode ? t("beginner.simpleModeTitle") : t("beginner.advancedModeTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isBeginnerMode
                    ? t("beginner.simpleModeTooltip")
                    : t("beginner.advancedModeTooltip")}
                </p>
                {!isBeginnerMode && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    ⚠️ {t("beginner.advancedModeWarning")}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="beginner-mode"
            checked={isBeginnerMode}
            onCheckedChange={handleToggle}
            aria-label={t("beginner.toggleAria")}
            className="scale-90 sm:scale-100"
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
              className="bg-cb-blue hover:bg-cb-blue-dark text-white border-0 shadow-lg shadow-cb-blue/25"
            >
              {t("beginner.switchAdvanced")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
