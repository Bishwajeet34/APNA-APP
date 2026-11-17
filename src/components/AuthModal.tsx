import React, { useEffect, useState } from 'react';
import { Lock, Phone, ShieldCheck, Store, User as UserIcon, X } from 'lucide-react';
import type { LanguageCode, RoleName, User } from '../types/village';
import { apiFetch } from '../utils/api';

interface AuthModalProps {
  open: boolean;
  lang: LanguageCode;
  initialRole?: RoleName;
  onClose: () => void;
  onSuccess: (token: string, user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  lang,
  initialRole = 'user',
  onClose,
  onSuccess,
}) => {
  const [role, setRole] = useState<RoleName>(initialRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRole(initialRole);
      setOtpSent(false);
      setOtp('');
      setPreviewOtp(null);
      setError(null);
    }
  }, [open, initialRole]);

  if (!open) return null;

  const resetFlow = (nextRole: RoleName) => {
    setRole(nextRole);
    setOtpSent(false);
    setOtp('');
    setPreviewOtp(null);
    setError(null);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (role === 'admin') {
        const res = await apiFetch<{ ok: boolean; previewOtp?: string }>('/api/auth/admin/step1', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setOtpSent(true);
        setPreviewOtp(res.previewOtp || null);
      } else {
        const res = await apiFetch<{ ok: boolean; previewOtp?: string }>('/api/auth/send-otp', {
          method: 'POST',
          body: JSON.stringify({ phone, role, fullName }),
        });
        setOtpSent(true);
        setPreviewOtp(res.previewOtp || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = role === 'admin' ? '/api/auth/admin/step2' : '/api/auth/verify-otp';
      const payload =
        role === 'admin'
          ? { email, otp }
          : { phone, otp, role, fullName };
      const res = await apiFetch<{ token: string; user: User }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSuccess(res.token, res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickTest = (preset: RoleName) => {
    resetFlow(preset);
    if (preset === 'user') {
      setFullName('Ramesh Murmu');
      setPhone('9876543210');
    } else if (preset === 'business') {
      setFullName('Suresh Sah');
      setPhone('9876543211');
    } else {
      setEmail('admin@panchkathia.in');
      setPassword('Admin@816102');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-xl font-bold text-slate-900">
              {lang === 'hi' ? 'पंचकठिया बाजार में लॉगिन' : 'Sign in to Panchkathia Bazar'}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {lang === 'hi'
                ? 'अपनी भूमिका चुनें — ग्रामीण यूजर, दुकानदार/ड्राइवर या एडमिन'
                : 'Choose your role: Villager, Shop/Driver Partner, or Admin'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Selector */}
        <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => resetFlow('user')}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              role === 'user' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'hi' ? 'यूजर' : 'Villager'}</span>
          </button>
          <button
            type="button"
            onClick={() => resetFlow('business')}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              role === 'business' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'hi' ? 'दुकान/ऑटो' : 'Business'}</span>
          </button>
          <button
            type="button"
            onClick={() => resetFlow('admin')}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              role === 'admin' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'hi' ? 'एडमिन' : 'Admin'}</span>
          </button>
        </div>

        {/* Quick-Fill Demo Presets for immediate verification */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>{lang === 'hi' ? 'टेस्ट अकाउंट:' : 'Quick fill:'}</span>
          <button
            type="button"
            onClick={() => fillQuickTest('user')}
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            {lang === 'hi' ? 'ग्रामीण (9876543210)' : 'Resident'}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => fillQuickTest('business')}
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            {lang === 'hi' ? 'बिजनेस (9876543211)' : 'Business'}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => fillQuickTest('admin')}
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            Admin
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="mt-4 space-y-3.5">
          {role !== 'admin' ? (
            <>
              <div>
                <label htmlFor="auth-fullname" className="block text-xs font-semibold text-slate-700">
                  {lang === 'hi' ? 'पूरा नाम' : 'Full Name'}
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={otpSent}
                  placeholder={lang === 'hi' ? 'जैसे: रमेश मुर्मू' : 'e.g. Ramesh Murmu'}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none disabled:bg-slate-50"
                />
              </div>
              <div>
                <label htmlFor="auth-phone" className="block text-xs font-semibold text-slate-700">
                  {lang === 'hi' ? 'मोबाइल नंबर (10 अंक)' : 'Mobile Number (10 digits)'}
                </label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="auth-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpSent}
                    placeholder="9876543210"
                    className="font-mono-nums w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700">
                  {lang === 'hi' ? 'एडमिन ईमेल' : 'Admin Email'}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  placeholder="admin@panchkathia.in"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none disabled:bg-slate-50"
                />
              </div>
              <div>
                <label htmlFor="auth-pass" className="block text-xs font-semibold text-slate-700">
                  {lang === 'hi' ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="auth-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={otpSent}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>
            </>
          )}

          {otpSent && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <label htmlFor="auth-otp" className="block text-xs font-semibold text-emerald-950">
                {lang === 'hi' ? '6-अंकों का OTP दर्ज करें' : 'Enter 6-Digit OTP'}
              </label>
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                className="font-mono-nums mt-1.5 w-full rounded-lg border border-emerald-300 bg-white px-3.5 py-2.5 text-base font-semibold tracking-widest text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
              {previewOtp && (
                <p className="font-mono-nums mt-2 text-xs text-emerald-900">
                  {lang === 'hi'
                    ? `टेस्ट OTP कोड: ${previewOtp}`
                    : `Preview OTP code: ${previewOtp}`}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {otpSent && (
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setPreviewOtp(null);
                }}
                className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {lang === 'hi' ? 'बदलें' : 'Back'}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex-1 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading
                ? lang === 'hi'
                  ? 'प्रतीक्षा करें...'
                  : 'Please wait...'
                : otpSent
                ? lang === 'hi'
                  ? 'OTP सत्यापित करें'
                  : 'Verify & Sign In'
                : lang === 'hi'
                ? 'OTP प्राप्त करें'
                : 'Send OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
