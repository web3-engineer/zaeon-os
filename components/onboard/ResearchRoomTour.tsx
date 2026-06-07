"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

interface TourStep {
  id: string;
  target: string | null;
  title: string;
  description: string;
  position: 'center' | 'right' | 'left' | 'top' | 'bottom';
  isLast?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: '🎉 Bem-vindo(a) à sua Sala de Pesquisa!',
    description: 'Este é o coração do Zaeon. Aqui você organiza tudo para o seu TCC. Vamos te apresentar cada ferramenta — são simples, prometo!',
    position: 'center',
  },
  {
    id: 'focus-mode',
    target: '[data-tour="focus-mode"]',
    title: '🎯 Modo Foco',
    description: 'Ativa um ambiente limpo e sem distrações. A navbar some e o layout simplifica. Clique para ver! (Lembre-se: clique de novo para voltar ao normal.)',
    position: 'right',
  },
  {
    id: 'layout-toggle',
    target: '[data-tour="layout-toggle"]',
    title: '↔️ Escolha seu Layout',
    description: 'Prefere a barra de ferramentas à esquerda ou à direita? Clique para alternar. A Zaeon se adapta ao seu jeito de estudar.',
    position: 'right',
  },
  {
    id: 'pdf-upload',
    target: '[data-tour="pdf-upload"]',
    title: '📄 Upload de PDFs',
    description: 'Arraste qualquer PDF aqui — artigos, livros, apostilas. O agente lê e referencia automaticamente.',
    position: 'right',
  },
  {
    id: 'ai-chat',
    target: '[data-tour="ai-chat"]',
    title: '🤖 Agente de Pesquisa',
    description: 'Pergunte qualquer coisa ao seu agente. Ele busca artigos, resume documentos, sugere referências e até corrige seu texto.',
    position: 'top',
  },
  {
    id: 'citations',
    target: '[data-tour="citations"]',
    title: '📌 Notas e Citações',
    description: 'Salve trechos importantes com um clique. Tudo fica organizado com a fonte correta para suas referências ABNT.',
    position: 'bottom',
  },
  {
    id: 'youtube',
    target: '[data-tour="youtube"]',
    title: '🎬 Vídeos de Apoio',
    description: 'Adicione links do YouTube. O agente transcreve e extrai os pontos principais para você.',
    position: 'right',
  },
  {
    id: 'specialists',
    target: '[data-tour="specialists"]',
    title: '👩‍🔬 Especialistas IA',
    description: 'Use o Examiner (Quiz) para testar seus conhecimentos sobre a sua pesquisa com perguntas desafiadoras — avaliação crítica e construtiva.',
    position: 'right',
  },
  {
    id: 'save-research',
    target: '[data-tour="save-research"]',
    title: '💾 Salvar Pesquisa — ABNT',
    description: 'Ao salvar, sua pesquisa é formatada automaticamente nas normas ABNT. Título, referências, citações — tudo no padrão correto para TCC.',
    position: 'left',
  },
  {
    id: 'layout-toggle-2',
    target: '[data-tour="layout-toggle"]',
    title: '↔️ Layout Flexível',
    description: 'Você pode organizar o workspace do jeito que preferir a qualquer momento. Experimente!',
    position: 'right',
  },
  {
    id: 'news-tab',
    target: '[data-tour="news-tab"]',
    title: '📰 Aba de Notícias',
    description: 'Acesse relatórios mensais e novidades do ecossistema Zaeon direto na sua sala. Publicações filtradas por relevância acadêmica.',
    position: 'right',
  },
  {
    id: 'profile-tab',
    target: '[data-tour="profile-tab"]',
    title: '🧬 Seu Perfil Neural',
    description: 'Visualize seu progresso, objetivos e identidade acadêmica. A Matriz de Objetivos registra seus checkpoints diários.',
    position: 'right',
  },
  {
    id: 'mural-teaser',
    target: null,
    title: '🌐 Próximo: O Mural da Comunidade',
    description: 'Explore o Mural — onde você se conecta com outros estudantes, compartilha descobertas e colabora em tempo real.',
    position: 'center',
  },
  {
    id: 'finish',
    target: null,
    title: '✅ Tudo certo!',
    description: 'Você está pronto para usar a Zaeon. Bons estudos! Qualquer dúvida, o agente está sempre aqui. 🚀',
    position: 'center',
    isLast: true,
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  onComplete: () => void;
}

export default function ResearchRoomTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const current = TOUR_STEPS[step];

  const updateSpotlight = useCallback(() => {
    if (!current.target) {
      setSpotlight(null);
      return;
    }
    const el = document.querySelector(current.target);
    if (!el) {
      setSpotlight(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setSpotlight({
      top: rect.top - 8,
      left: rect.left - 8,
      width: rect.width + 16,
      height: rect.height + 16,
    });
  }, [current.target]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight]);

  const handleNext = useCallback(() => {
    if (current.isLast) {
      onComplete();
      return;
    }
    setStep(s => s + 1);
  }, [current, onComplete]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onComplete(); return; }
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, handleNext, onComplete]);

  const getCardStyle = (): React.CSSProperties => {
    if (!spotlight || current.position === 'center') return {};
    const { top, left, width, height } = spotlight;
    const margin = 16;
    const vw = window.innerWidth;
    if (current.position === 'right') return { top: Math.max(top, 16), left: Math.min(left + width + margin, vw - 340) };
    if (current.position === 'left') return { top: Math.max(top, 16), right: Math.max(vw - left + margin, 16) };
    if (current.position === 'top') return { bottom: window.innerHeight - top + margin, left: Math.max(left, 16) };
    if (current.position === 'bottom') return { top: top + height + margin, left: Math.max(left, 16) };
    return {};
  };

  const isPositioned = spotlight && current.position !== 'center';

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* Dark overlay — click advances tour */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={handleNext}
      />

      {/* Spotlight cutout */}
      {spotlight && (
        <div
          className="absolute rounded-2xl border-2 border-cyan-400/70 pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6), 0 0 30px rgba(34,211,238,0.3)',
          }}
        />
      )}

      {/* Tour card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22 }}
          className={`absolute w-80 pointer-events-auto ${
            !isPositioned ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
          }`}
          style={isPositioned ? getCardStyle() : undefined}
        >
          <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/15 rounded-3xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-black text-base text-black dark:text-white leading-snug">{current.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">{current.description}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onComplete(); }}
                className="shrink-0 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all ${
                      i === step ? 'w-4 h-1.5 bg-cyan-400' : 'w-1.5 h-1.5 bg-slate-200 dark:bg-white/20'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); setStep(s => s - 1); }}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-all"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleNext(); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                  {current.isLast ? 'Concluir' : 'Próximo'}
                  {!current.isLast && <ChevronRightIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              onClick={e => { e.stopPropagation(); onComplete(); }}
              className="text-center text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all uppercase tracking-widest font-bold"
            >
              Pular tour (ESC)
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
