import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Cloud, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth, AUTH_FIRST_LOGIN_EVENT } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { migrateLocalStorageToDatabase, getMigrationPreview, type MigrationPreview } from '@/lib/dataMigration';

type MigrationStatus = 'idle' | 'preview' | 'migrating' | 'success' | 'error';

export function MigrationDialog() {
  const { user, needsMigration, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<MigrationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for first login event
  useEffect(() => {
    const handleFirstLogin = async () => {
      if (needsMigration) {
        const migrationPreview = getMigrationPreview();
        if (migrationPreview.hasData) {
          setPreview(migrationPreview);
          setStatus('preview');
          setIsOpen(true);
        }
      }
    };

    window.addEventListener(AUTH_FIRST_LOGIN_EVENT, handleFirstLogin);

    // Also check on mount if migration is needed
    if (needsMigration) {
      handleFirstLogin();
    }

    return () => {
      window.removeEventListener(AUTH_FIRST_LOGIN_EVENT, handleFirstLogin);
    };
  }, [needsMigration]);

  const handleMigrate = async () => {
    if (!user) return;

    setStatus('migrating');
    setProgress(0);
    setError(null);

    try {
      await migrateLocalStorageToDatabase(user.id, (p) => {
        setProgress(p);
      });

      setStatus('success');
      setProgress(100);

      // Refresh profile to update migrated_at
      await refreshProfile();

      // Close dialog after a delay
      setTimeout(() => {
        setIsOpen(false);
        // Reload the page to refresh all contexts with database data
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Migration error:', err);
      setError(err instanceof Error ? err.message : 'Migration failed');
      setStatus('error');
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    setStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && status !== 'migrating') {
        setIsOpen(false);
      }
    }}>
      <DialogContent className="frost-glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-cb-blue" />
            {t('migration.title')}
          </DialogTitle>
          <DialogDescription>
            {status === 'preview' && t('migration.description')}
            {status === 'migrating' && t('migration.inProgress')}
            {status === 'success' && t('migration.success')}
            {status === 'error' && t('migration.error')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {status === 'preview' && preview && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('migration.willImport')}
              </p>
              <ul className="space-y-2 text-sm">
                {preview.savedContexts > 0 && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {preview.savedContexts} {t('migration.contexts')}
                  </li>
                )}
                {preview.historyEntries > 0 && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {preview.historyEntries} {t('migration.historyEntries')}
                  </li>
                )}
                {preview.simpleHistoryEntries > 0 && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {preview.simpleHistoryEntries} {t('migration.simpleHistoryEntries')}
                  </li>
                )}
                {preview.hasGitHubPAT && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t('migration.githubPAT')}
                  </li>
                )}
                {preview.githubRepos > 0 && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {preview.githubRepos} {t('migration.githubRepos')}
                  </li>
                )}
                {preview.hasPreferences && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t('migration.preferences')}
                  </li>
                )}
              </ul>
            </div>
          )}

          {status === 'migrating' && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-sm text-center">
                {t('migration.successMessage')}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-center text-destructive">
                {error || t('migration.errorMessage')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {status === 'preview' && (
            <>
              <Button variant="ghost" onClick={handleSkip}>
                {t('migration.skip')}
              </Button>
              <Button onClick={handleMigrate} className="bg-cb-blue hover:bg-cb-blue/90">
                <Cloud className="w-4 h-4 mr-2" />
                {t('migration.import')}
              </Button>
            </>
          )}

          {status === 'migrating' && (
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('migration.importing')}
            </Button>
          )}

          {status === 'error' && (
            <>
              <Button variant="ghost" onClick={handleSkip}>
                {t('migration.close')}
              </Button>
              <Button onClick={handleMigrate}>
                {t('migration.retry')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
