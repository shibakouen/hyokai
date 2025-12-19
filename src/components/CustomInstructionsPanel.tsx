/**
 * Panel for custom instructions
 * - Toggle to enable/disable
 * - Ad-hoc textarea for quick instructions
 * - Saved instructions with checkboxes for selection
 * - Button to open library manager
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { SavedInstruction } from '@/hooks/useInstructions';
import { InstructionsManager } from '@/components/InstructionsManager';
import { Settings2, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomInstructionsPanelProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  customInstructions: string;
  onCustomInstructionsChange: (text: string) => void;
  savedInstructions: SavedInstruction[];
  selectedInstructionIds: string[];
  onToggleSelection: (id: string) => void;
  onCreateInstruction: (name: string, content: string, isDefault?: boolean) => Promise<SavedInstruction | null>;
  onUpdateInstruction: (id: string, updates: Partial<Pick<SavedInstruction, 'name' | 'content' | 'isDefault'>>) => Promise<boolean>;
  onDeleteInstruction: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

export function CustomInstructionsPanel({
  isEnabled,
  onToggle,
  customInstructions,
  onCustomInstructionsChange,
  savedInstructions,
  selectedInstructionIds,
  onToggleSelection,
  onCreateInstruction,
  onUpdateInstruction,
  onDeleteInstruction,
  isLoading = false,
}: CustomInstructionsPanelProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleSaveCurrent = async () => {
    if (!customInstructions.trim() || !saveName.trim()) return;

    setIsSavingCurrent(true);
    try {
      const result = await onCreateInstruction(saveName.trim(), customInstructions.trim());
      if (result) {
        setSaveName('');
        setShowSaveForm(false);
      }
    } finally {
      setIsSavingCurrent(false);
    }
  };

  const selectedCount = selectedInstructionIds.length + (customInstructions.trim() ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Toggle Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            id="instructions-toggle"
            data-testid="instructions-toggle"
            checked={isEnabled}
            onCheckedChange={onToggle}
          />
          <Label
            htmlFor="instructions-toggle"
            className="text-sm font-medium cursor-pointer"
          >
            {t('instructions.toggle')}
          </Label>
          {isEnabled && selectedCount > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {selectedCount} active
            </span>
          )}
        </div>

        {isEnabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded Content */}
      {isEnabled && isExpanded && (
        <div
          data-testid="instructions-panel"
          className={cn(
            'space-y-4 pl-1 border-l-2 border-primary/20 ml-5',
            'animate-in slide-in-from-top-2 duration-200'
          )}
        >
          {/* Ad-hoc Instructions */}
          <div className="pl-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                {t('instructions.placeholder').split('(')[0].trim()}
              </Label>
              {customInstructions.trim() && !showSaveForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveForm(true)}
                  className="h-6 text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {t('instructions.saveCurrent')}
                </Button>
              )}
            </div>

            <Textarea
              data-testid="custom-instructions-input"
              value={customInstructions}
              onChange={e => onCustomInstructionsChange(e.target.value)}
              placeholder={t('instructions.placeholder')}
              className="min-h-[80px] resize-y text-sm"
              maxLength={2000}
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{customInstructions.length}/2000 {t('instructions.chars')}</span>
            </div>

            {/* Save Current Form */}
            {showSaveForm && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder={t('instructions.namePlaceholder')}
                  className="flex-1 text-sm bg-transparent border-none focus:outline-none placeholder:text-muted-foreground"
                  maxLength={50}
                />
                <Button
                  size="sm"
                  onClick={handleSaveCurrent}
                  disabled={!saveName.trim() || isSavingCurrent}
                  className="h-7"
                >
                  {isSavingCurrent ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    t('instructions.save')
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSaveForm(false);
                    setSaveName('');
                  }}
                  className="h-7"
                >
                  {t('instructions.cancel')}
                </Button>
              </div>
            )}
          </div>

          {/* Saved Instructions Selection */}
          {savedInstructions.length > 0 && (
            <div className="pl-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  {t('instructions.selectToAppend')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsManagerOpen(true)}
                  className="h-6 text-xs"
                  data-testid="manage-instructions-btn"
                >
                  <Settings2 className="w-3 h-3 mr-1" />
                  {t('instructions.manageLibrary')}
                </Button>
              </div>

              <div className="space-y-1">
                {savedInstructions.slice(0, 5).map(instruction => (
                  <div
                    key={instruction.id}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-lg transition-colors',
                      selectedInstructionIds.includes(instruction.id)
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-muted/30 hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      id={`instruction-${instruction.id}`}
                      data-testid="instruction-checkbox"
                      checked={selectedInstructionIds.includes(instruction.id)}
                      onCheckedChange={() => onToggleSelection(instruction.id)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`instruction-${instruction.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{instruction.name}</span>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {instruction.content}
                      </p>
                    </Label>
                  </div>
                ))}

                {savedInstructions.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsManagerOpen(true)}
                    className="w-full text-xs text-muted-foreground"
                  >
                    +{savedInstructions.length - 5} more...
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Manage Library Button (when no saved instructions) */}
          {savedInstructions.length === 0 && (
            <div className="pl-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManagerOpen(true)}
                className="w-full"
                data-testid="manage-instructions-btn"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                {t('instructions.manageLibrary')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Instructions Manager Modal */}
      <InstructionsManager
        open={isManagerOpen}
        onOpenChange={setIsManagerOpen}
        instructions={savedInstructions}
        onCreateInstruction={onCreateInstruction}
        onUpdateInstruction={onUpdateInstruction}
        onDeleteInstruction={onDeleteInstruction}
        isLoading={isLoading}
      />
    </div>
  );
}
