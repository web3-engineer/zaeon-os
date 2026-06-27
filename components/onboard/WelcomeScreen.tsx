"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import CourseSelector from './CourseSelector';
import Testimonials from './Testimonials';
import type { BrazilianUniversity } from '@/constants/universities';

export interface WelcomeCollectedData {
  name: string;
  age: string;
  gender: 'male' | 'female' | 'other';
  city: string;
  university: BrazilianUniversity;
}

interface Props {
  token: string;
  collectedData: WelcomeCollectedData;
}

export default function WelcomeScreen({ token, collectedData }: Props) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const welcomeMsg =
    collectedData.gender === 'female' ? `Seja bem-vinda, ${collectedData.name}!` :
    collectedData.gender === 'male'   ? `Seja bem-vindo, ${collectedData.name}!` :
                                        `Seja bem-vindo(a), ${collectedData.name}!`;

  const handleAuth = async (provider: 'google' | 'email') => {
    setIsSigningIn(true);
    const onboardPayload = JSON.stringify({
      name: collectedData.name,
      age: collectedData.age,
      gender: collectedData.gender,
      city: collectedData.city,
      university: collectedData.university.id,
      universityName: collectedData.university.name,
      course: selectedCourse,
      inviteToken: token,
    });
    // Regular cookie (not httpOnly) — persists through OAuth redirect
    document.cookie = `zaeon_onboard=${encodeURIComponent(onboardPayload)}; path=/; max-age=600; SameSite=Lax`;
    await signIn(provider, { callbackUrl: '/research-lab?tour=true' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[600px]">

        {/* LEFT PANEL — university logo + course selector */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-5 p-8 bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 rounded-3xl"
        >
          {/* University identity */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-md shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={collectedData.university.logoPath}
                alt={collectedData.university.acronym}
                className="w-12 h-12 object-contain"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${collectedData.university.acronym}&background=${collectedData.university.color.replace('#', '')}&color=fff&size=64`;
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-black text-black dark:text-white leading-tight">{welcomeMsg}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">A Zaeon.</p>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-white/10 shrink-0" />

          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shrink-0">
              Qual é o seu curso?
            </p>
            <div className="flex-1 overflow-hidden">
              <CourseSelector onSelect={setSelectedCourse} selected={selectedCourse} />
            </div>
          </div>

          <AnimatePresence>
            {selectedCourse && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded-2xl shrink-0"
              >
                <span className="text-cyan-600 dark:text-cyan-400 text-xs font-black">✓</span>
                <span className="text-cyan-700 dark:text-cyan-300 text-xs font-bold truncate">{selectedCourse}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT PANEL — social proof + auth */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col gap-5 p-8 bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 rounded-3xl"
        >
          <Testimonials />

          <div className="h-px bg-slate-200 dark:bg-white/10 shrink-0" />

          <AnimatePresence mode="wait">
            {selectedCourse ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center">
                  Criar sua conta
                </p>

                <button
                  onClick={() => handleAuth('google')}
                  disabled={isSigningIn}
                  className="group relative overflow-hidden flex items-center justify-center gap-3 w-full py-3.5 rounded-full text-white font-black text-sm shadow-[0_14px_34px_-12px_rgba(34,211,238,0.55)] transition-transform hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(6,182,212,0.95))" }}
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
                  <span className="relative z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </span>
                  <span className="relative z-10 tracking-widest uppercase">Entrar com Google</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                  <span className="text-slate-400 text-xs">ou</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                </div>

                <button
                  onClick={() => handleAuth('email')}
                  disabled={isSigningIn}
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  ✉ Continuar com outro email
                </button>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-2xl">
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed text-center">
                    <strong>Entraremos em contato para verificar sua identidade em breve.</strong><br />
                    Email acadêmico (.edu.br){' '}
                    <strong>acelera a verificação</strong> e garante{' '}
                    <span className="font-black text-blue-600 dark:text-blue-400">benefícios Pro grátis por 30 dias</span>.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-slate-400 dark:text-slate-500 text-sm py-4"
              >
                ← Selecione seu curso para continuar
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
