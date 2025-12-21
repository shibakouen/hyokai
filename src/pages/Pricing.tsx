import { useState } from 'react';
import { Check, ArrowLeft, MessageSquare, Zap, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, PlanId, BillingInterval, PLAN_LIMITS } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Plan features matching landing page
const PLAN_FEATURES: Record<PlanId, string[]> = {
  starter: [
    '150 transformations/month',
    'All AI models',
    'Coding & General modes',
    'History sync',
    'Email support',
  ],
  pro: [
    '500 transformations/month',
    'All AI models',
    'Coding & General modes',
    'History sync',
    'GitHub context integration',
    'Priority support',
  ],
  business: [
    '1,500 transformations/month',
    'All AI models',
    'Coding & General modes',
    'History sync',
    'GitHub context integration',
    'Custom instructions',
    'Priority support',
  ],
  max: [
    '5,000 transformations/month',
    'All AI models',
    'Coding & General modes',
    'History sync',
    'GitHub context integration',
    'Custom instructions',
    'Dedicated support',
    'Early access to new features',
  ],
};

// Plan descriptions matching landing page
const PLAN_DESCRIPTIONS: Record<PlanId, { en: string; jp: string }> = {
  starter: { en: 'For Getting Started', jp: '入門プラン' },
  pro: { en: 'For Power Users', jp: 'パワーユーザー向け' },
  business: { en: 'For Teams', jp: 'チーム向け' },
  max: { en: 'For Heavy Users', jp: 'ヘビーユーザー向け' },
};

export default function Pricing() {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { subscription, hasSubscription, openCheckout, openGuestCheckout, isLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const popularBadge = language === 'en' ? 'Most Popular' : '人気No.1';

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  const getPrice = (planId: PlanId) => {
    const plan = PLAN_LIMITS[planId];
    return billingInterval === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  const getMonthlyEquivalent = (planId: PlanId) => {
    const plan = PLAN_LIMITS[planId];
    if (billingInterval === 'annual') {
      return plan.annualPrice / 12;
    }
    return plan.monthlyPrice;
  };

  const getSavings = (planId: PlanId) => {
    const plan = PLAN_LIMITS[planId];
    const monthlyTotal = plan.monthlyPrice * 12;
    const annualTotal = plan.annualPrice;
    return Math.round(((monthlyTotal - annualTotal) / monthlyTotal) * 100);
  };

  const isCurrentPlan = (planId: PlanId) => {
    return hasSubscription && subscription?.planId === planId;
  };

  const handleSelectPlan = async (planId: PlanId) => {
    setIsRedirecting(true);
    try {
      if (!isAuthenticated) {
        // Guest checkout - Stripe will collect email, account created via webhook
        await openGuestCheckout(planId, billingInterval);
      } else {
        // Authenticated user checkout
        await openCheckout(planId, billingInterval);
      }
    } catch (err) {
      toast({
        title: t('pricing.checkoutError') || 'Checkout failed',
        description: err instanceof Error ? err.message : 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
      setIsRedirecting(false);
    }
  };

  const getButtonText = (planId: PlanId) => {
    if (isCurrentPlan(planId)) {
      return t('pricing.currentPlan') || 'Current Plan';
    }
    if (hasSubscription) {
      return t('pricing.switchPlan') || 'Switch Plan';
    }
    return t('pricing.startTrial') || 'Start Free Trial';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50/50 to-sky-100">
      {/* Header */}
      <header className="border-b border-white/50 bg-white/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="https://hyokai.ai" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('pricing.backToWebsite') || 'Back to website'}</span>
          </a>
          <div className="font-semibold text-xl text-slate-900">Hyokai</div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        {/* Title section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-light text-slate-900 mb-6">
            {t('pricing.title') || 'Simple, transparent pricing'}
          </h1>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            {t('pricing.subtitle') || 'Start with a 3-day free trial. Cancel anytime.'}
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm ${billingInterval === 'monthly' ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
              {t('pricing.monthly') || 'Monthly'}
            </span>
            <Switch
              checked={billingInterval === 'annual'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'annual' : 'monthly')}
            />
            <span className={`text-sm ${billingInterval === 'annual' ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
              {t('pricing.annual') || 'Annual'}
            </span>
            {billingInterval === 'annual' && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 border-green-200">
                {t('pricing.save') || 'Save'} ~17%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing cards - matching landing page exactly */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-[1240px] mx-auto items-stretch">

          {/* TIER 1: STARTER */}
          <div className={`ice-block rounded-[2rem] p-6 md:p-8 flex flex-col items-center hover:bg-blue-50/50 transition-all duration-300 transform hover:-translate-y-2 relative group h-full border border-blue-100/50 ${isCurrentPlan('starter') ? 'ring-2 ring-cb-blue' : ''}`}>
            {isCurrentPlan('starter') && (
              <div className="absolute -top-3 right-4">
                <Badge variant="outline" className="bg-white text-cb-blue border-cb-blue">
                  {t('pricing.currentPlan') || 'Current Plan'}
                </Badge>
              </div>
            )}
            <h3 className="text-xl font-medium text-slate-800 mb-2 capitalize">Starter</h3>
            <p className="text-xs text-cb-blue mb-4 font-medium uppercase tracking-wider">
              {PLAN_DESCRIPTIONS.starter[language === 'jp' ? 'jp' : 'en']}
            </p>
            <div className="h-1 w-12 bg-cb-blue-light rounded-full mb-6"></div>

            <div className="text-4xl font-light text-slate-900 mb-2 tracking-tighter">
              {formatPrice(getMonthlyEquivalent('starter'))}
            </div>
            <div className="text-sm text-slate-500 mb-2">{t('pricing.perMonth') || '/month'}</div>
            {billingInterval === 'annual' && (
              <div className="text-xs text-green-600 mb-6">
                {t('pricing.youSave') || 'You save'} {getSavings('starter')}%
              </div>
            )}
            {billingInterval === 'monthly' && <div className="mb-6"></div>}

            <ul className="space-y-4 mb-8 text-left w-full text-sm flex-grow">
              <li className="flex items-center gap-3 text-slate-900 font-semibold">
                <MessageSquare className="w-4 h-4 text-cb-blue flex-shrink-0" />
                {PLAN_FEATURES.starter[0]}
              </li>
              {PLAN_FEATURES.starter.slice(1).map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-600">
                  <Check className="w-4 h-4 text-cb-blue-light flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan('starter')}
              disabled={isCurrentPlan('starter') || isLoading || isRedirecting}
              className="w-full py-3 rounded-xl border border-cb-blue-light text-cb-blue-dark font-semibold hover:bg-cb-blue hover:text-white transition-colors bg-white/80 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {getButtonText('starter')}
            </button>
          </div>

          {/* TIER 2: PRO (Featured - Most Popular) */}
          <div className={`rounded-[2.5rem] px-8 pb-8 pt-14 flex flex-col items-center bg-gradient-to-br from-slate-900 via-cb-blue-dark to-slate-900 text-white relative overflow-hidden shadow-2xl border border-white/10 transform md:scale-105 z-10 h-full ${isCurrentPlan('pro') ? 'ring-2 ring-cyan-400' : ''}`}>
            <div className="absolute top-4 right-4 text-[9px] font-bold tracking-widest text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-full uppercase bg-cyan-900/30 backdrop-blur-sm">
              {popularBadge}
            </div>
            {isCurrentPlan('pro') && (
              <div className="absolute top-4 left-4">
                <Badge variant="outline" className="bg-cyan-900/50 text-cyan-300 border-cyan-400/50 text-[9px]">
                  {t('pricing.currentPlan') || 'Current'}
                </Badge>
              </div>
            )}

            {/* Glow effect */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>

            <h3 className="text-2xl font-semibold mb-2 relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 capitalize">Pro</h3>
            <p className="text-xs text-cyan-200/70 mb-4 font-medium uppercase tracking-wider relative z-10">
              {PLAN_DESCRIPTIONS.pro[language === 'jp' ? 'jp' : 'en']}
            </p>
            <div className="h-1 w-12 bg-cyan-500 rounded-full mb-6 relative z-10 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>

            <div className="text-5xl font-light mb-2 relative z-10 tracking-tighter text-white">
              {formatPrice(getMonthlyEquivalent('pro')).split('.')[0]}
              <span className="text-lg text-cyan-200/50 font-normal">.{formatPrice(getMonthlyEquivalent('pro')).split('.')[1]}</span>
            </div>
            <div className="text-sm text-cyan-200/50 mb-2 relative z-10">{t('pricing.perMonth') || '/month'}</div>
            {billingInterval === 'annual' && (
              <div className="text-xs text-cyan-300 mb-6 relative z-10">
                {t('pricing.youSave') || 'You save'} {getSavings('pro')}%
              </div>
            )}
            {billingInterval === 'monthly' && <div className="mb-6"></div>}

            <ul className="space-y-4 mb-8 text-left w-full relative z-10 pl-2 text-sm flex-grow">
              <li className="flex items-center gap-3 text-white font-bold text-base">
                <MessageSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                {PLAN_FEATURES.pro[0]}
              </li>
              {PLAN_FEATURES.pro.slice(1).map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-cyan-50/90">
                  <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-white text-[10px] shadow-lg shadow-cyan-500/50 flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan('pro')}
              disabled={isCurrentPlan('pro') || isLoading || isRedirecting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-cb-blue text-white font-bold hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all duration-300 relative z-10 border border-white/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {getButtonText('pro')}
            </button>
          </div>

          {/* TIER 3: BUSINESS */}
          <div className={`ice-block rounded-[2rem] p-6 md:p-8 flex flex-col items-center hover:bg-emerald-50/50 transition-all duration-300 transform hover:-translate-y-2 relative group h-full border-2 border-emerald-100 ${isCurrentPlan('business') ? 'ring-2 ring-emerald-500' : ''}`}>
            {isCurrentPlan('business') && (
              <div className="absolute -top-3 right-4">
                <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-500">
                  {t('pricing.currentPlan') || 'Current Plan'}
                </Badge>
              </div>
            )}
            <h3 className="text-xl font-medium text-slate-800 mb-2 capitalize">Business</h3>
            <p className="text-xs text-emerald-600 mb-4 font-medium uppercase tracking-wider">
              {PLAN_DESCRIPTIONS.business[language === 'jp' ? 'jp' : 'en']}
            </p>
            <div className="h-1 w-12 bg-emerald-400 rounded-full mb-6"></div>

            <div className="text-4xl font-light text-slate-900 mb-2 tracking-tighter">
              {formatPrice(getMonthlyEquivalent('business'))}
            </div>
            <div className="text-sm text-slate-500 mb-2">{t('pricing.perMonth') || '/month'}</div>
            {billingInterval === 'annual' && (
              <div className="text-xs text-green-600 mb-6">
                {t('pricing.youSave') || 'You save'} {getSavings('business')}%
              </div>
            )}
            {billingInterval === 'monthly' && <div className="mb-6"></div>}

            <ul className="space-y-4 mb-8 text-left w-full text-sm flex-grow">
              <li className="flex items-center gap-3 text-slate-900 font-semibold">
                <MessageSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {PLAN_FEATURES.business[0]}
              </li>
              {PLAN_FEATURES.business.slice(1).map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-600">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan('business')}
              disabled={isCurrentPlan('business') || isLoading || isRedirecting}
              className="w-full py-3 rounded-xl border border-emerald-400 text-emerald-700 font-semibold hover:bg-emerald-500 hover:text-white transition-colors bg-white/80 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {getButtonText('business')}
            </button>
          </div>

          {/* TIER 4: MAX */}
          <div className={`rounded-[2rem] p-6 md:p-8 flex flex-col items-center bg-gradient-to-b from-slate-950 to-deep-water text-white relative overflow-hidden shadow-xl border border-slate-700 group h-full ${isCurrentPlan('max') ? 'ring-2 ring-purple-500' : ''}`}>
            {/* Subtle shine animation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

            {isCurrentPlan('max') && (
              <div className="absolute top-4 right-4">
                <Badge variant="outline" className="bg-purple-900/50 text-purple-300 border-purple-400/50 text-[9px]">
                  {t('pricing.currentPlan') || 'Current'}
                </Badge>
              </div>
            )}

            <h3 className="text-xl font-medium text-slate-200 mb-2 capitalize">Max</h3>
            <p className="text-xs text-purple-300 mb-4 font-medium uppercase tracking-wider">
              {PLAN_DESCRIPTIONS.max[language === 'jp' ? 'jp' : 'en']}
            </p>
            <div className="h-1 w-12 bg-purple-500 rounded-full mb-6"></div>

            <div className="text-4xl font-light text-white mb-2 tracking-tighter">
              {formatPrice(getMonthlyEquivalent('max'))}
            </div>
            <div className="text-sm text-slate-400 mb-2">{t('pricing.perMonth') || '/month'}</div>
            {billingInterval === 'annual' && (
              <div className="text-xs text-purple-300 mb-6">
                {t('pricing.youSave') || 'You save'} {getSavings('max')}%
              </div>
            )}
            {billingInterval === 'monthly' && <div className="mb-6"></div>}

            <ul className="space-y-4 mb-8 text-left w-full text-sm flex-grow">
              <li className="flex items-center gap-3 text-white font-bold text-base">
                <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
                {PLAN_FEATURES.max[0]}
              </li>
              {PLAN_FEATURES.max.slice(1).map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <Star className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan('max')}
              disabled={isCurrentPlan('max') || isLoading || isRedirecting}
              className="w-full py-3 rounded-xl border border-purple-500/50 text-purple-200 font-semibold hover:bg-purple-900/50 hover:text-white transition-colors bg-purple-900/20 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {getButtonText('max')}
            </button>
          </div>
        </div>

        {/* FAQ section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-light text-slate-900 text-center mb-10">
            {t('pricing.faq') || 'Frequently Asked Questions'}
          </h2>

          <div className="space-y-8">
            <div className="ice-block rounded-2xl p-6">
              <h3 className="font-medium text-slate-800 mb-2">{t('pricing.faq.trial') || 'How does the free trial work?'}</h3>
              <p className="text-slate-600 text-sm">
                {t('pricing.faq.trialAnswer') || 'You get full access to your chosen plan for 3 days. Your card is required upfront but won\'t be charged until the trial ends. Cancel anytime before to avoid charges.'}
              </p>
            </div>

            <div className="ice-block rounded-2xl p-6">
              <h3 className="font-medium text-slate-800 mb-2">{t('pricing.faq.overage') || 'What happens if I exceed my monthly limit?'}</h3>
              <p className="text-slate-600 text-sm">
                {t('pricing.faq.overageAnswer') || 'You can continue using Hyokai beyond your limit. Overage transformations are charged at a per-use rate based on your plan. Upgrade anytime for a higher limit.'}
              </p>
            </div>

            <div className="ice-block rounded-2xl p-6">
              <h3 className="font-medium text-slate-800 mb-2">{t('pricing.faq.cancel') || 'Can I cancel anytime?'}</h3>
              <p className="text-slate-600 text-sm">
                {t('pricing.faq.cancelAnswer') || 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.'}
              </p>
            </div>

            <div className="ice-block rounded-2xl p-6">
              <h3 className="font-medium text-slate-800 mb-2">{t('pricing.faq.switch') || 'Can I switch plans?'}</h3>
              <p className="text-slate-600 text-sm">
                {t('pricing.faq.switchAnswer') || 'Absolutely! You can upgrade or downgrade at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, your new rate starts at the next billing cycle.'}
              </p>
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4">
            {t('pricing.questions') || 'Have questions? We\'re here to help.'}
          </p>
          <Button variant="outline" asChild className="border-cb-blue text-cb-blue hover:bg-cb-blue hover:text-white">
            <a href="mailto:support@hyokai.app">
              {t('pricing.contactUs') || 'Contact Us'}
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}
