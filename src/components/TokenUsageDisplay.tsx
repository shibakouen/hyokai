import React from 'react';
import { useUsage } from '@/contexts/UsageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Zap, Infinity, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface TokenUsageDisplayProps {
  compact?: boolean;
  className?: string;
}

export function TokenUsageDisplay({ compact = false, className = '' }: TokenUsageDisplayProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { limits, stats, isLoading } = useUsage();

  // Don't show if still loading
  if (isLoading) {
    return null;
  }

  // Unlimited users see a simple badge
  if (limits.isUnlimited) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 text-emerald-400 ${className}`}>
            <Infinity className="w-4 h-4" />
            {!compact && <span className="text-xs font-medium">{t('usage.unlimited')}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
          <p className="text-sm">{t('usage.unlimitedAccess')}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Calculate percentages
  const dailyPercent = Math.min(100, Math.max(0,
    ((limits.dailyLimit - stats.dailyRemaining) / limits.dailyLimit) * 100
  ));
  const monthlyPercent = Math.min(100, Math.max(0,
    ((limits.monthlyLimit - stats.monthlyRemaining) / limits.monthlyLimit) * 100
  ));

  // Determine warning state
  const isLow = stats.dailyRemaining < limits.dailyLimit * 0.2 ||
                stats.monthlyRemaining < limits.monthlyLimit * 0.2;
  const isExhausted = stats.dailyRemaining <= 0 || stats.monthlyRemaining <= 0;

  // Color based on state
  const getColor = () => {
    if (isExhausted) return 'text-red-400';
    if (isLow) return 'text-amber-400';
    return 'text-cyan-400';
  };

  // Compact view (for header)
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 cursor-help ${getColor()} ${className}`}>
            {isExhausted ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span className="text-xs font-medium tabular-nums">
              {stats.dailyRemaining.toLocaleString()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-800 border-slate-700 p-3 max-w-xs">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{t('usage.today')}</span>
                <span className={getColor()}>
                  {stats.dailyRemaining.toLocaleString()} / {limits.dailyLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={dailyPercent} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{t('usage.thisMonth')}</span>
                <span className={getColor()}>
                  {stats.monthlyRemaining.toLocaleString()} / {limits.monthlyLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={monthlyPercent} className="h-1.5" />
            </div>
            {!isAuthenticated && (
              <p className="text-xs text-slate-500 pt-1 border-t border-slate-700">
                {t('usage.signInForMore')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full view (for settings panel or dedicated section)
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Zap className={`w-4 h-4 ${getColor()}`} />
        <span className="text-sm font-medium text-slate-200">{t('usage.tokenUsage')}</span>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">{t('usage.dailyTokens')}</span>
            <span className={getColor()}>
              {stats.dailyRemaining.toLocaleString()} {t('usage.remaining')}
            </span>
          </div>
          <Progress value={dailyPercent} className="h-2" />
          <p className="text-xs text-slate-500 mt-0.5">
            {(limits.dailyLimit - stats.dailyRemaining).toLocaleString()} / {limits.dailyLimit.toLocaleString()} {t('usage.used')}
          </p>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">{t('usage.monthlyTokens')}</span>
            <span className={getColor()}>
              {stats.monthlyRemaining.toLocaleString()} {t('usage.remaining')}
            </span>
          </div>
          <Progress value={monthlyPercent} className="h-2" />
          <p className="text-xs text-slate-500 mt-0.5">
            {(limits.monthlyLimit - stats.monthlyRemaining).toLocaleString()} / {limits.monthlyLimit.toLocaleString()} {t('usage.used')}
          </p>
        </div>
      </div>

      {isExhausted && (
        <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-300">
            {stats.dailyRemaining <= 0
              ? t('usage.dailyLimitReached')
              : t('usage.monthlyLimitReached')}
          </p>
        </div>
      )}

      {!isAuthenticated && !isExhausted && (
        <p className="text-xs text-slate-500">
          {t('usage.signInForMore')}
        </p>
      )}
    </div>
  );
}

export default TokenUsageDisplay;
