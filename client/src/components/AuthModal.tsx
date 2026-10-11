import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  KeyRound, 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '../context/AuthContext.js';

type AuthMethod = 'email' | 'phone';
type PhoneStep = 'input_phone' | 'input_otp';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    signInGoogle, 
    signInEmail, 
    signUpEmail, 
    sendPhoneCode, 
    confirmPhoneCode 
  } = useAuth();

  const [method, setMethod] = useState<AuthMethod>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone Form State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input_phone');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Common State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name');
        await signUpEmail(email, password, name.trim());
      } else {
        await signInEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      await signInGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      setError('Please enter your phone number with country code');
      return;
    }

    // Must be in international format (e.g., +1..., +91...)
    const formatted = trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
    if (formatted.length < 8) {
      setError('Please include valid country code and number (e.g. +1 555-0199 or +91 9876543210)');
      return;
    }

    setLoading(true);
    try {
      const result = await sendPhoneCode(formatted, 'recaptcha-container');
      setConfirmationResult(result);
      setPhoneStep('input_otp');
      setInfoMessage(`Verification code sent to ${formatted}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send SMS code';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError('Session expired. Please request a new verification code.');
      setPhoneStep('input_phone');
      return;
    }

    if (otpCode.trim().length < 6) {
      setError('Please enter the 6-digit code received via SMS.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await confirmPhoneCode(confirmationResult, otpCode.trim());
      // Modal closed automatically upon successful auth in context
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const resetPhoneFlow = () => {
    setPhoneStep('input_phone');
    setOtpCode('');
    setConfirmationResult(null);
    setError(null);
    setInfoMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-md rounded-2xl bg-card border border-border/70 p-6 sm:p-8 shadow-2xl space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 mx-auto shadow-lg shadow-purple-600/30">
            <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            {method === 'phone' 
              ? 'Phone Verification' 
              : isSignUp 
                ? 'Create Animora Account' 
                : 'Welcome Back'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {method === 'phone'
              ? 'Sign in securely with instant SMS OTP code'
              : isSignUp 
                ? 'Get 150 free generation credits upon registration' 
                : 'Access your studio, projects, and AI generations'}
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-purple-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary text-foreground text-xs font-semibold flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Auth Method Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-secondary/50 border border-border/50 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMethod('email');
              setError(null);
              setInfoMessage(null);
            }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              method === 'email' 
                ? 'bg-background text-foreground shadow-sm font-semibold' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod('phone');
              setError(null);
              setInfoMessage(null);
            }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              method === 'phone' 
                ? 'bg-background text-foreground shadow-sm font-semibold' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone OTP</span>
          </button>
        </div>

        {/* Invisible Recaptcha Anchor */}
        <div id="recaptcha-container" />

        {/* METHOD 1: EMAIL & PASSWORD */}
        {method === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. Alex Rivers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="creator@animora.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSignUp ? 'Create Free Account' : 'Sign In with Email'}</span>
            </button>

            <div className="text-center pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up with 150 free credits"}
              </button>
            </div>
          </form>
        )}

        {/* METHOD 2: PHONE NUMBER AUTHENTICATION */}
        {method === 'phone' && (
          <div className="space-y-4">
            {phoneStep === 'input_phone' ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Phone Number (with Country Code)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      placeholder="+1 650 555 1234 or +91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      autoFocus
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    Format: +[Country Code][Number]. Firebase SMS verification will be sent to this device.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !phoneNumber.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Send Verification Code</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={resetPhoneFlow}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change {phoneNumber}</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    6-Digit SMS Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-background border border-border/70 text-center tracking-[0.3em] font-mono text-base font-bold text-foreground placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Verify Code & Sign In</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={loading}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    Didn&apos;t receive code? Resend SMS
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

