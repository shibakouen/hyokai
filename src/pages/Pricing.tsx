import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowLeft, Sparkles, Zap, Building2, Rocket, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, PlanId, BillingInterval, PLAN_LIMITS } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  starter: <Sparkles className="h-6 w-6" />,
  pro: <Zap className="h-6 w-6" />,
  business: <Building2 className="h-6 w-6" />,
  max: <Rocket className="h-6 w-6" />,
};

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

export default function Pricing() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { subscription, hasSubscription, openCheckout, openGuestCheckout, isLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  // Email dialog state for guest checkout
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);

  const handleEmailDialogClose = (open: boolean) => {
    setShowEmailDialog(open);
    if (!open) {
      setEmail('');
      setEmailError(null);
      setPendingPlan(null);
    }
  };

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    // Validate email
    if (!email || !email.includes('@') || !email.includes('.')) {
      setEmailError(t('pricing.invalidEmail') || 'Please enter a valid email address');
      return;
    }

    if (!pendingPlan) return;

    setIsSubmitting(true);

    try {
      await openGuestCheckout(email, pendingPlan, billingInterval);
      // Will redirect to Stripe, no need to close dialog
    } catch (err) {
      setEmailError(t('pricing.checkoutError') || 'Failed to start checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  const plans: PlanId[] = ['starter', 'pro', 'business', 'max'];

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
    if (!isAuthenticated) {
      // Show email dialog for guest checkout
      setPendingPlan(planId);
      setShowEmailDialog(true);
      return;
    }
    await openCheckout(planId, billingInterval);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('pricing.backToApp') || 'Back to app'}</span>
          </Link>
          <div className="font-semibold text-xl">Hyokai</div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        {/* Title section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('pricing.title') || 'Simple, transparent pricing'}</h1>
          <p className="text-xl text-muted-foreground mb-8">
            {t('pricing.subtitle') || 'Start with a 3-day free trial. Cancel anytime.'}
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={billingInterval === 'monthly' ? 'font-medium' : 'text-muted-foreground'}>
              {t('pricing.monthly') || 'Monthly'}
            </span>
            <Switch
              checked={billingInterval === 'annual'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'annual' : 'monthly')}
            />
            <span className={billingInterval === 'annual' ? 'font-medium' : 'text-muted-foreground'}>
              {t('pricing.annual') || 'Annual'}
            </span>
            {billingInterval === 'annual' && (
              <Badge variant="secondary" className="ml-2">
                {t('pricing.save') || 'Save'} ~17%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((planId) => {
            const isCurrent = isCurrentPlan(planId);
            const isPopular = planId === 'pro';

            return (
              <Card
                key={planId}
                className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      {t('pricing.mostPopular') || 'Most Popular'}
                    </Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-background">
                      {t('pricing.currentPlan') || 'Current Plan'}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 text-primary w-fit">
                    {PLAN_ICONS[planId]}
                  </div>
                  <CardTitle className="capitalize">{planId}</CardTitle>
                  <CardDescription>
                    {t(`pricing.${planId}Description`) || `Perfect for ${planId === 'starter' ? 'getting started' : planId === 'pro' ? 'power users' : planId === 'business' ? 'teams' : 'heavy users'}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold">
                      {formatPrice(getMonthlyEquivalent(planId))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('pricing.perMonth') || '/month'}
                      {billingInterval === 'annual' && (
                        <span className="block text-xs">
                          {t('pricing.billedAnnually') || 'billed annually'} ({formatPrice(getPrice(planId))})
                        </span>
                      )}
                    </div>
                    {billingInterval === 'annual' && (
                      <div className="text-sm text-green-600 mt-1">
                        {t('pricing.youSave') || 'You save'} {getSavings(planId)}%
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {PLAN_FEATURES[planId].map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrent || isLoading}
                    onClick={() => handleSelectPlan(planId)}
                  >
                    {isCurrent
                      ? (t('pricing.currentPlan') || 'Current Plan')
                      : hasSubscription
                        ? (t('pricing.switchPlan') || 'Switch Plan')
                        : (t('pricing.startTrial') || 'Start Free Trial')}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t('pricing.faq') || 'Frequently Asked Questions'}</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">{t('pricing.faq.trial') || 'How does the free trial work?'}</h3>
              <p className="text-muted-foreground">
                {t('pricing.faq.trialAnswer') || 'You get full access to your chosen plan for 3 days. Your card is required upfront but won\'t be charged until the trial ends. Cancel anytime before to avoid charges.'}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">{t('pricing.faq.overage') || 'What happens if I exceed my monthly limit?'}</h3>
              <p className="text-muted-foreground">
                {t('pricing.faq.overageAnswer') || 'You can continue using Hyokai beyond your limit. Overage transformations are charged at a per-use rate based on your plan. Upgrade anytime for a higher limit.'}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">{t('pricing.faq.cancel') || 'Can I cancel anytime?'}</h3>
              <p className="text-muted-foreground">
                {t('pricing.faq.cancelAnswer') || 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.'}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">{t('pricing.faq.switch') || 'Can I switch plans?'}</h3>
              <p className="text-muted-foreground">
                {t('pricing.faq.switchAnswer') || 'Absolutely! You can upgrade or downgrade at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, your new rate starts at the next billing cycle.'}
              </p>
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            {t('pricing.questions') || 'Have questions? We\'re here to help.'}
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:support@hyokai.app">
              {t('pricing.contactUs') || 'Contact Us'}
            </a>
          </Button>
        </div>
      </main>

      {/* Email Dialog for guest checkout */}
      <Dialog open={showEmailDialog} onOpenChange={handleEmailDialogClose}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {t('pricing.enterEmail') || 'Enter your email'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {pendingPlan && (
                <span className="block">
                  {t('pricing.startTrialFor') || 'Start your 3-day free trial for'}{' '}
                  <span className="font-medium capitalize">{pendingPlan}</span>
                </span>
              )}
              <span className="block mt-1 text-sm">
                {t('pricing.emailForAccount') || 'Your account will be created after payment.'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGuestCheckout} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email" className="text-gray-900 font-medium">
                {t('auth.email') || 'Email'}
              </Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {t('pricing.continueToPayment') || 'Continue to Payment'}
            </Button>
            <p className="text-xs text-center text-gray-500">
              {t('pricing.secureCheckout') || 'Secure checkout powered by Stripe'}
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
