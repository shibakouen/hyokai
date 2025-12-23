import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CheckoutSuccess() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);

  // Try to get email from URL params (passed from stripe-checkout)
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {/* Animated mail icon */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
            <Mail className="w-8 h-8 text-primary" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>

          <CardTitle className="text-2xl">
            {t('checkoutSuccess.title') || 'Check your email!'}
          </CardTitle>

          <CardDescription className="text-base mt-2">
            {t('checkoutSuccess.description') || "We've sent you a magic link to complete your account setup."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email display */}
          {email && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {t('checkoutSuccess.sentTo') || 'Email sent to'}
              </p>
              <p className="font-medium text-foreground">{email}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('checkoutSuccess.step1') || 'Open your email inbox'}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('checkoutSuccess.step2') || 'Click the "Set My Password" button in our email'}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('checkoutSuccess.step3') || "Create your password and you're all set!"}
              </p>
            </div>
          </div>

          {/* Spam warning */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t('checkoutSuccess.spamWarning') || "Don't see it? Check your spam folder. The email is from team@hyokai.ai"}
            </p>
          </div>

          {/* Back to landing button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = language === 'ja' ? 'https://hyokai.ai/ja' : 'https://hyokai.ai'}
          >
            {t('checkoutSuccess.backToHome') || 'Back to Home'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
