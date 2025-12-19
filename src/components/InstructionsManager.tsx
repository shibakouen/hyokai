/**
 * Modal for managing saved instructions library
 * - Create, edit, delete instructions
 * - Set default instructions
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { SavedInstruction } from '@/hooks/useInstructions';
import { Plus, Pencil, Trash2, Star, StarOff, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InstructionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructions: SavedInstruction[];
  onCreateInstruction: (name: string, content: string, isDefault?: boolean) => Promise<SavedInstruction | null>;
  onUpdateInstruction: (id: string, updates: Partial<Pick<SavedInstruction, 'name' | 'content' | 'isDefault'>>) => Promise<boolean>;
  onDeleteInstruction: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

type Mode = 'list' | 'create' | 'edit';

export function InstructionsManager({
  open,
  onOpenChange,
  instructions,
  onCreateInstruction,
  onUpdateInstruction,
  onDeleteInstruction,
  isLoading = false,
}: InstructionsManagerProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setContent('');
    setIsDefault(false);
    setEditingId(null);
    setMode('list');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleCreate = () => {
    setMode('create');
    setName('');
    setContent('');
    setIsDefault(false);
  };

  const handleEdit = (instruction: SavedInstruction) => {
    setMode('edit');
    setEditingId(instruction.id);
    setName(instruction.name);
    setContent(instruction.content);
    setIsDefault(instruction.isDefault);
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      if (mode === 'create') {
        const result = await onCreateInstruction(name.trim(), content.trim(), isDefault);
        if (result) {
          resetForm();
        }
      } else if (mode === 'edit' && editingId) {
        const success = await onUpdateInstruction(editingId, {
          name: name.trim(),
          content: content.trim(),
          isDefault,
        });
        if (success) {
          resetForm();
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      await onDeleteInstruction(id);
      setDeleteConfirmId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDefault = async (instruction: SavedInstruction) => {
    await onUpdateInstruction(instruction.id, { isDefault: !instruction.isDefault });
  };

  const instructionToDelete = deleteConfirmId
    ? instructions.find(i => i.id === deleteConfirmId)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          data-testid="instructions-modal"
          className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        >
          <DialogHeader>
            <DialogTitle>
              {mode === 'list' && t('instructions.savedInstructions')}
              {mode === 'create' && t('instructions.addNew')}
              {mode === 'edit' && t('instructions.edit')}
            </DialogTitle>
          </DialogHeader>

          {mode === 'list' ? (
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : instructions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('instructions.noSavedInstructions')}
                </div>
              ) : (
                <div className="space-y-2">
                  {instructions.map(instruction => (
                    <div
                      key={instruction.id}
                      data-testid="instruction-item"
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{instruction.name}</span>
                          {instruction.isDefault && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {instruction.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {instruction.content.length} {t('instructions.chars')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleDefault(instruction)}
                          title={instruction.isDefault ? 'Remove default' : 'Set as default'}
                        >
                          {instruction.isDefault ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <StarOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(instruction)}
                          data-testid="edit-instruction"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(instruction.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instruction-name">{t('instructions.name')}</Label>
                <Input
                  id="instruction-name"
                  name="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('instructions.namePlaceholder')}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {name.length}/50 {t('instructions.chars')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instruction-content">{t('instructions.content')}</Label>
                <Textarea
                  id="instruction-content"
                  name="content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={t('instructions.contentPlaceholder')}
                  className="min-h-[150px] resize-y"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {content.length}/2000 {t('instructions.chars')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="instruction-default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked === true)}
                />
                <Label htmlFor="instruction-default" className="text-sm cursor-pointer">
                  {t('instructions.setAsDefault')}
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {mode === 'list' ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  {t('instructions.close')}
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('instructions.addNew')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={resetForm}>
                  {t('instructions.cancel')}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || !content.trim() || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {t('instructions.save')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('instructions.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('instructions.deleteConfirmMessage').replace('{name}', instructionToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('instructions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('instructions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
