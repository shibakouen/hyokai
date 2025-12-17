import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Cloud, CloudOff, Loader2, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type AuthMode = 'signIn' | 'signUp' | 'confirmation';

export function AuthButton() {
  const { user, userProfile, isAuthenticated, isLoading, signUp, signIn, signOut, resendConfirmation } = useAuth();
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setAuthMode('signIn');
    setConfirmationEmail(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setConfirmationEmail(email);
          setAuthMode('confirmation');
        } else {
          setError(t('auth.invalidCredentials'));
        }
      } else {
        setIsDialogOpen(false);
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, needsConfirmation } = await signUp(email, password);
      if (error) {
        if (error.message.includes('already registered')) {
          setError(t('auth.emailAlreadyRegistered'));
        } else {
          setError(error.message);
        }
      } else if (needsConfirmation) {
        setConfirmationEmail(email);
        setAuthMode('confirmation');
      } else {
        setIsDialogOpen(false);
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await resendConfirmation(confirmationEmail);
      if (error) {
        setError(t('auth.resendError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="h-8 px-2" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  // Guest state - show sign in button
  if (!isAuthenticated) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 border-cb-blue/50 text-cb-blue hover:bg-cb-blue/10"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('auth.signIn')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
          {authMode === 'confirmation' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-gray-900">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  {t('auth.checkEmail')}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {t('auth.confirmationSent', { email: confirmationEmail })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg">
                  <Mail className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {t('auth.confirmationInstructions')}
                </p>
                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleResendConfirmation}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    {t('auth.resendConfirmation')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAuthMode('signIn');
                      setConfirmationEmail(null);
                      setError(null);
                    }}
                    className="w-full text-gray-600 hover:text-gray-900"
                  >
                    {t('auth.backToSignIn')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900">
                  {authMode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {authMode === 'signIn' ? t('auth.signInDescription') : t('auth.signUpDescription')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={authMode === 'signIn' ? handleSignIn : handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900 font-medium">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-900 font-medium">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                  {authMode === 'signUp' && (
                    <p className="text-xs text-gray-500">{t('auth.passwordHint')}</p>
                  )}
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {authMode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
                </Button>
                <div className="text-center text-sm">
                  {authMode === 'signIn' ? (
                    <p className="text-gray-600">
                      {t('auth.noAccount')}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signUp');
                          setError(null);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        {t('auth.signUp')}
                      </button>
                    </p>
                  ) : (
                    <p className="text-gray-600">
                      {t('auth.hasAccount')}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signIn');
                          setError(null);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        {t('auth.signIn')}
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Authenticated state - show avatar dropdown
  const initials = userProfile?.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-1.5 gap-1.5">
          <Avatar className="w-6 h-6">
            <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || ''} />
            <AvatarFallback className="text-xs bg-cb-blue/20 text-cb-blue">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Cloud className="w-3.5 h-3.5 text-green-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 frost-glass">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">
            {userProfile?.display_name || t('auth.user')}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
          <Cloud className="w-3.5 h-3.5 mr-2 text-green-500" />
          {t('auth.syncEnabled')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for mobile
export function AuthButtonCompact() {
  const { isAuthenticated, isLoading, signOut, userProfile, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <CloudOff className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 shadow-xl">
          <AuthDialogContent onClose={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  const initials = userProfile?.display_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Avatar className="w-6 h-6">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-cb-blue/20 text-cb-blue">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="frost-glass">
        <DropdownMenuItem onClick={signOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Shared auth dialog content for compact version
function AuthDialogContent({ onClose }: { onClose: () => void }) {
  const { signUp, signIn, resendConfirmation } = useAuth();
  const { t } = useLanguage();
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setConfirmationEmail(email);
          setAuthMode('confirmation');
        } else {
          setError(t('auth.invalidCredentials'));
        }
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { error, needsConfirmation } = await signUp(email, password);
      if (error) {
        if (error.message.includes('already registered')) {
          setError(t('auth.emailAlreadyRegistered'));
        } else {
          setError(error.message);
        }
      } else if (needsConfirmation) {
        setConfirmationEmail(email);
        setAuthMode('confirmation');
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!confirmationEmail) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await resendConfirmation(confirmationEmail);
      if (error) {
        setError(t('auth.resendError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authMode === 'confirmation') {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {t('auth.checkEmail')}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {t('auth.confirmationSent', { email: confirmationEmail })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg">
            <Mail className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 text-center">
            {t('auth.confirmationInstructions')}
          </p>
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          <Button
            onClick={handleResendConfirmation}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {t('auth.resendConfirmation')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-gray-900">
          {authMode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        </DialogTitle>
        <DialogDescription className="text-gray-600">
          {authMode === 'signIn' ? t('auth.signInDescription') : t('auth.signUpDescription')}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={authMode === 'signIn' ? handleSignIn : handleSignUp} className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="compact-email" className="text-gray-900 font-medium">{t('auth.email')}</Label>
          <Input
            id="compact-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="compact-password" className="text-gray-900 font-medium">{t('auth.password')}</Label>
          <Input
            id="compact-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
          {authMode === 'signUp' && (
            <p className="text-xs text-gray-500">{t('auth.passwordHint')}</p>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          {authMode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        </Button>
        <div className="text-center text-sm">
          {authMode === 'signIn' ? (
            <p className="text-gray-600">
              {t('auth.noAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signUp');
                  setError(null);
                }}
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                {t('auth.signUp')}
              </button>
            </p>
          ) : (
            <p className="text-gray-600">
              {t('auth.hasAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signIn');
                  setError(null);
                }}
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                {t('auth.signIn')}
              </button>
            </p>
          )}
        </div>
      </form>
    </>
  );
}
