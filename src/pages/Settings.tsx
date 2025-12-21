import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  CreditCard,
  Settings2,
  Lock,
  Mail,
  Sparkles,
  Calendar,
  TrendingUp,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, PLAN_LIMITS, PlanId } from '@/contexts/SubscriptionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    subscription,
    hasSubscription,
    isTrialing,
    usagePercentage,
    openPortal,
    isLoading: isSubLoading,
  } = useSubscription();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Check for checkout success
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast({
        title: t('settings.checkoutSuccess') || 'Welcome to Hyokai!',
        description: t('settings.checkoutSuccessMessage') || 'Your subscription is now active. Enjoy!',
      });
      // Remove the query param
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams, t]);

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation
    if (newPassword.length < 6) {
      setPasswordError(t('auth.passwordTooShort') || 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordMismatch') || 'Passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast({
          title: t('settings.passwordChanged') || 'Password updated',
          description: t('settings.passwordChangedMessage') || 'Your password has been changed successfully.',
        });
      }
    } catch (err) {
      setPasswordError(t('settings.passwordChangeError') || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // If not authenticated, redirect to home
  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('settings.signInRequired') || 'Sign in required'}</CardTitle>
            <CardDescription>
              {t('settings.signInRequiredMessage') || 'Please sign in to access your account settings.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('settings.backToApp') || 'Back to App'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>{t('settings.backToApp') || 'Back to App'}</span>
          </Link>
          <div className="font-semibold text-xl">Hyokai</div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{t('settings.title') || 'Account Settings'}</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.profile') || 'Profile'}</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.subscription') || 'Subscription'}</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('settings.preferences') || 'Preferences'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Email Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {t('settings.email') || 'Email'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <Badge variant="secondary">
                    <Check className="w-3 h-3 mr-1" />
                    {t('settings.verified') || 'Verified'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Password Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  {t('settings.changePassword') || 'Change Password'}
                </CardTitle>
                <CardDescription>
                  {t('settings.changePasswordDescription') || 'Update your password to keep your account secure.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">
                      {t('settings.newPassword') || 'New Password'}
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      {t('settings.confirmPassword') || 'Confirm Password'}
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>

                  {passwordError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  )}

                  {passwordSuccess && (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        {t('settings.passwordChanged') || 'Password updated successfully'}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={isChangingPassword || !newPassword || !confirmPassword}>
                    {isChangingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t('settings.updatePassword') || 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            {hasSubscription && subscription ? (
              <>
                {/* Current Plan Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        {t('settings.currentPlan') || 'Current Plan'}
                      </CardTitle>
                      {isTrialing && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          {t('billing.trial') || 'Trial'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold capitalize">{subscription.planId}</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.billingInterval === 'annual'
                            ? (t('settings.billedAnnually') || 'Billed annually')
                            : (t('settings.billedMonthly') || 'Billed monthly')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          ${(PLAN_LIMITS[subscription.planId as PlanId]?.monthlyPrice || 0) / 100}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                      </div>
                    </div>

                    {subscription.cancelAtPeriodEnd && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t('settings.canceledAt') || 'Your subscription will end on'} {formatDate(subscription.currentPeriodEnd)}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Usage Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {t('settings.usage') || 'Usage'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('settings.transformationsUsed') || 'Transformations used'}</span>
                        <span className="font-medium">
                          {subscription.transformationsUsed} / {subscription.transformationsLimit}
                        </span>
                      </div>
                      <Progress value={usagePercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {subscription.transformationsRemaining} {t('settings.remaining') || 'remaining'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {t('settings.resetsOn') || 'Resets on'} {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  </CardContent>
                </Card>

                {/* Billing Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {t('settings.billing') || 'Billing'}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.billingDescription') || 'Manage your payment method, view invoices, or cancel your subscription.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    <Button onClick={() => openPortal()} disabled={isSubLoading}>
                      {isSubLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('settings.manageBilling') || 'Manage Billing'}
                    </Button>
                    <Link to="/pricing">
                      <Button variant="outline">
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t('settings.changePlan') || 'Change Plan'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* No subscription */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    {t('settings.noSubscription') || 'No Active Subscription'}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.noSubscriptionMessage') || 'Upgrade to unlock more transformations and features.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/pricing">
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('settings.viewPlans') || 'View Plans'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {t('settings.language') || 'Language'}
                </CardTitle>
                <CardDescription>
                  {t('settings.languageDescription') || 'Choose your preferred language for the interface.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={language} onValueChange={(value: 'en' | 'ja') => setLanguage(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
