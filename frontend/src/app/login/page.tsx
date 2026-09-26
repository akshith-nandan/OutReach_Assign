'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Sparkles, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef(loginWithGoogle);
  loginRef.current = loginWithGoogle;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.');
      return;
    }
    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            setLoading(true);
            setError('');
            await loginRef.current({ credential });
            window.location.assign('/');
          } catch (loginError: any) {
            setError(loginError.response?.data?.error || 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: String(Math.min(360, googleButtonRef.current.clientWidth || 320)),
        text: 'continue_with',
      });
    };
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (window.google) {
      renderGoogleButton();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      script.onerror = () => setError('Could not load Google sign-in. Check your network connection.');
      document.head.appendChild(script);
    }
  }, []);
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-slate-100 text-center space-y-6">
        {/* Brand Logo */}
        <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
          <Mail className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">ReachInbox</h1>
          <p className="text-sm font-semibold text-blue-600 mt-0.5">Full-stack Email Job Scheduler</p>
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
            Production-grade delayed email scheduler powered by BullMQ, Redis, PostgreSQL & Ethereal SMTP.
          </p>
        </div>
        {/* Value Prop Badges */}
        <div className="grid grid-cols-3 gap-2 py-2 text-[11px] font-semibold text-slate-600">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center">
            <Zap className="w-4 h-4 text-blue-600 mb-1" />
            <span>BullMQ Jobs</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
            <span>Rate Limiting</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col items-center">
            <Sparkles className="w-4 h-4 text-purple-600 mb-1" />
            <span>Elasticsearch</span>
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div ref={googleButtonRef} className={`flex min-h-11 w-full max-w-sm justify-center ${loading ? 'pointer-events-none opacity-60' : ''}`} />
        {loading && <p className="text-xs text-slate-500">Verifying your Google account...</p>}
        <p className="text-[11px] text-slate-400">
          By continuing, you log in to the ReachInbox Email Job Scheduler console.
        </p>
      </div>
    </div>
  );
}
