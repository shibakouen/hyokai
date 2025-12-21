import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Zap } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function UsageMeter() {
  const { isAuthenticated } = useAuth();
  const { subscription, hasSubscription, usagePercentage, isTrialing } = useSubscription();
  const { t } = useLanguage();

  // Don't show for non-authenticated users
  if (!isAuthenticated) {
    return null;
  }

  // Show upgrade prompt if no subscription
  if (!hasSubscription) {
    return (
      <Link
        to="/pricing"
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <Sparkles className="w-3 h-3" />
        <span>{t('usage.getUnlimited')}</span>
      </Link>
    );
  }

  // Show usage meter for subscribers
  const isWarning = usagePercentage >= 80;
  const isCritical = usagePercentage >= 95;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 min-w-[120px]">
        <Zap className={`w-3 h-3 ${isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-green-500'}`} />
        <div className="flex-1">
          <Progress
            value={usagePercentage}
            className={`h-1.5 ${isCritical ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {subscription?.transformationsUsed}/{subscription?.transformationsLimit}
        </span>
      </div>
      {isTrialing && (
        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
          {t('billing.trial')}
        </span>
      )}
    </div>
  );
}

// Compact version for header
export function UsageMeterCompact() {
  const { isAuthenticated } = useAuth();
  const { subscription, hasSubscription, usagePercentage, isTrialing } = useSubscription();
  const { t } = useLanguage();

  if (!isAuthenticated || !hasSubscription) {
    return null;
  }

  const isWarning = usagePercentage >= 80;
  const isCritical = usagePercentage >= 95;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Zap className={`w-3 h-3 ${isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-green-500'}`} />
      <span>{subscription?.transformationsRemaining}</span>
      {isTrialing && (
        <span className="text-xs bg-amber-100/50 text-amber-700 px-1 py-0.5 rounded text-[10px]">
          {t('billing.trial')}
        </span>
      )}
    </div>
  );
}
