"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import Image from "next/image";
import "@/src/i18n";

// --- IMPORTS ---
import { Navbar } from "@/components/main/navbar";
import { Mic, MicOff, Coffee, Code2 } from "lucide-react";
import dynamic from "next/dynamic";

const StudyRoomContent = dynamic(
  () => import("@/app/workstation/student/StudyRoomContent"),
  { ssr: false },
);
const StudentLoungeContent = dynamic(
  () => import("@/app/workstation/student/StudentLoungeContent"),
  { ssr: false },
);
const TeacherLoungeContent = dynamic(
  () => import("@/app/workstation/teacher/LoungeContent"),
  { ssr: false },
);
const ResearchesPage = dynamic(
  () => import("@/app/study-rooms/lounge/main-lounge/researches/page"),
  { ssr: false },
);
// Sala Projetos (Zaeon Code) — IDE agêntica. Auto-protegida (eligible interno).
const ProjectsContent = dynamic(
  () => import("@/app/research-lab/projects/ProjectsContent"),
  { ssr: false },
);

// ── Sidebar liquid-glass: estilo dos botões (mesma lógica das "pills") ──────────
// Vidro translúcido + borda suave + tint no hover; ativo = vidro colorido + ring + glow.
const NAV_BASE = "group flex items-center gap-3 p-2 rounded-2xl border backdrop-blur-md transition-all duration-300";
// Sidebar é cinza-quase-preto → ícones ociosos esmaecidos (cinza claro), sem fundo.
const NAV_IDLE = "bg-transparent border-transparent text-white/45 hover:text-white/90 hover:bg-white/[0.07] hover:border-white/10";
const NAV_ACTIVE: Record<string, string> = {
  purple: "bg-purple-500/15 dark:bg-purple-400/20 border-purple-400/50 text-purple-700 dark:text-purple-100 ring-1 ring-purple-400/40 shadow-[0_8px_24px_-8px_rgba(168,85,247,0.55)]",
  blue: "bg-blue-500/15 dark:bg-blue-400/20 border-blue-400/50 text-blue-700 dark:text-blue-100 ring-1 ring-blue-400/40 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.55)]",
  emerald: "bg-emerald-500/15 dark:bg-emerald-400/20 border-emerald-400/50 text-emerald-700 dark:text-emerald-100 ring-1 ring-emerald-400/40 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.55)]",
  violet: "bg-violet-500/15 dark:bg-violet-400/20 border-violet-400/50 text-violet-700 dark:text-violet-100 ring-1 ring-violet-400/40 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.55)]",
  cyan: "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-cyan-400/50 text-cyan-700 dark:text-cyan-100 ring-1 ring-cyan-400/40 shadow-[0_8px_24px_-8px_rgba(34,211,238,0.55)]",
};
// Selecionado = pill preta/degradê (mesma cor do framework da Sala de Pesquisa),
// uniforme em claro e escuro — sem mais um arco-íris de cores por aba.
// Selecionado: no ESCURO = mesma pill branca-glass das abas da Sala de Estudos;
// no CLARO = charcoal acinzentado (tom do frame de pesquisa, não um preto chapado).
// Selecionado = pílula BRANCA-glass sobre a sidebar escura (o branco é só do ativo).
const NAV_ACTIVE_PILL =
  "bg-white/[0.16] text-white border-white/30 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_18px_-8px_rgba(0,0,0,0.6)]";
function navItem(active: boolean, accent: keyof typeof NAV_ACTIVE) {
  void accent; // accent mantido por compatibilidade; o ativo agora é sempre a pill preta
  return `${NAV_BASE} ${active ? NAV_ACTIVE_PILL : NAV_IDLE}`;
}
import ResearchRoomTour from "@/components/onboard/ResearchRoomTour";
import OnboardingGuide from "@/components/onboard/OnboardingGuide";
import { startTour } from "@/lib/onboarding/tour";
import { capabilities } from "@/lib/runtime/mode";
import { useLibraryFiles } from "@/lib/useLibraryFiles";
import RichText from "@/components/research/RichText";
import { useWindowStore } from "@/lib/useWindowStore";

// --- ICONS ---
import {
  PlusIcon,
  ChevronRightIcon,
  BookmarkIcon,
  ClipboardIcon,
  SparklesIcon,
  TrashIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  ArrowPathIcon,
  CommandLineIcon,
  HeartIcon,
  CalculatorIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  RocketLaunchIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  BookOpenIcon,
  DocumentTextIcon,
  PlayCircleIcon,
  EyeIcon,
  PowerIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  DocumentChartBarIcon,
  CheckBadgeIcon,
  LanguageIcon,
  PhotoIcon,
  LockClosedIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  CloudArrowUpIcon,
  NewspaperIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

import NewsPanel from "@/components/research/NewsPanel";
import ProfilePanel from "@/components/research/ProfilePanel";
import EditableProfile from "@/components/research/EditableProfile";
import MiniTourToast from "@/components/research/MiniTourToast";
import SavedCitationsSection from "./SavedCitationsSection";
import LibrarySavedFiles from "./LibrarySavedFiles";
import { useSavedCitations } from "@/lib/useSavedCitations";
import { applyCitationDrop } from "@/lib/citationInsert";
import { extractCitationBlock } from "@/lib/scholar/chatCitation";
import ResearchShell from "./ResearchShell";

// --- COMPONENTS ---
import ResearchCardPDF from "@/components/ui/ResearchCardPDF";
import {
  ABNT_TEMPLATE,
  parseAbntMarkers,
  isEmptyOrTemplate,
  templateFor,
  buildDocFromDraft,
  type WorkType,
  type DraftFields,
} from "@/lib/abntTemplate";

// --- TYPES ---
interface StudyDoc {
  id: string;
  title: string;
  url: string;
  file?: File;
}

// --- UTILS ---
const generateSafeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- SUB-COMPONENTS ---
const IosLoader = ({ status }: { status?: string }) => (
  <div className="flex flex-col items-center justify-center space-y-4 py-4">
    <div className="relative w-8 h-8">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] h-[8px] bg-black dark:bg-white rounded-full"
          style={{
            left: "50%",
            top: "30%",
            transformOrigin: "50% 180%",
            rotate: i * 45,
          }}
          animate={{ opacity: [0.1, 1, 0.1] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
        />
      ))}
    </div>
    {/* texto opcional — o load das salas mostra só o ícone + spinner, sem texto */}
    {status ? (
      <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] animate-pulse">
        {status}
      </span>
    ) : null}
  </div>
);

const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  colorClass = "text-black dark:text-white hover:text-cyan-500",
}: any) => (
  <div className="group relative flex flex-col items-center z-[50]">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`p-2 bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-full transition-all ${colorClass}`}
    >
      <Icon className="w-4 h-4" />
    </button>
    <span className="absolute -top-8 scale-0 group-hover:scale-100 transition-all bg-black dark:bg-white text-white dark:text-black text-[9px] px-2 py-1 rounded font-bold uppercase whitespace-nowrap z-[100] shadow-xl pointer-events-none">
      {label}
    </span>
  </div>
);

// 🔥 CHAT BUBBLE REDESENHADO (Avatar + Nome na Esquerda)
const ChatBubble = ({
  role,
  text,
  agentName,
  agentImg,
  userImg,
}: {
  role: string;
  text: string;
  agentName: string;
  agentImg: string;
  userImg?: string | null;
}) => {
  const isUser = role === "user";
  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6`}
    >
      {!isUser && (
        <div className="flex flex-col items-start gap-1.5 mr-3 max-w-[85%]">
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 shadow-sm flex items-center justify-center bg-white dark:bg-black shrink-0">
              <img
                src={agentImg}
                alt={agentName}
                className="w-full h-full object-cover"
                onError={(e) =>
                  (e.currentTarget.src = `https://ui-avatars.com/api/?name=${agentName}&background=random`)
                }
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {agentName}
            </span>
          </div>
          <div className="p-4 rounded-2xl rounded-tl-sm text-[13px] md:text-[14px] leading-relaxed shadow-sm font-medium bg-slate-100 dark:bg-white/10 text-black dark:text-white border border-slate-300 dark:border-white/20">
            <RichText text={text} />
          </div>
        </div>
      )}
      {isUser && (
        <div className="flex items-end gap-2 max-w-[85%]">
          <div className="p-4 rounded-2xl rounded-tr-sm text-[13px] md:text-[14px] leading-relaxed shadow-sm w-fit font-medium bg-cyan-600 text-white">
            <RichText text={text} />
          </div>
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-300 dark:border-white/20 shadow-sm flex items-center justify-center bg-white dark:bg-black mb-1">
            {userImg ? (
              <img
                src={userImg}
                alt="User"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-5 h-5 text-black dark:text-white" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 🔥 COMPONENTE DE INPUT UNIFICADO (COM VOZ)
const ChatInput = ({
  value,
  onChange,
  onSend,
  isTyping,
  placeholder,
  lang = "pt-BR",
}: any) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = lang;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        onChange(transcript);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [lang, onChange]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      onChange("");
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSendClick = () => {
    if (isListening) toggleListening();
    onSend();
  };

  return (
    <div className="flex flex-col gap-2 w-full mt-2">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center gap-2 mb-1"
          >
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-tighter">
              Ouvindo...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 bg-white dark:bg-black/60 rounded-full border border-slate-300 dark:border-white/20 p-1.5 pl-4 focus-within:ring-2 focus-within:ring-cyan-500/30 transition-all shadow-sm">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendClick()}
          disabled={isTyping}
          placeholder={isListening ? "Fale agora..." : placeholder}
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-black dark:text-white placeholder:text-slate-400"
        />
        <button
          onClick={toggleListening}
          disabled={isTyping}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${isListening ? "bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-cyan-500"}`}
        >
          {isListening ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <MicOff size={14} />
            </motion.div>
          ) : (
            <Mic size={14} />
          )}
        </button>
        <button
          onClick={handleSendClick}
          disabled={isTyping || !value.trim()}
          className="w-9 h-9 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
        >
          <PaperAirplaneIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const MuralCard = ({
  post,
  currentUserEmail,
  onLike,
  onAddComment,
  onDeleteComment,
  showToast,
}: {
  post: any;
  currentUserEmail: string;
  onLike: (id: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  showToast: (msg: string) => void;
}) => {
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const isLiked = post.likes?.includes(currentUserEmail);
  const isPrivate = post.tags?.includes("private");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-[32px] border-2 border-slate-300 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-xl flex flex-col gap-4 relative overflow-hidden text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-black flex items-center justify-center shrink-0">
          <img
            src={post.userImage || "/agents/aura.png"}
            alt={post.user}
            className="w-full h-full object-cover"
            onError={(e) =>
              (e.currentTarget.src = `https://ui-avatars.com/api/?name=${post.user}&background=random`)
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-sm font-black text-black dark:text-white truncate">
              {post.user}
            </span>
            {post.isSeed ? (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                ledger
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                user
              </span>
            )}
            {isPrivate ? (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                <LockClosedIcon className="w-2.5 h-2.5" /> privado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <GlobeAltIcon className="w-2.5 h-2.5" /> público
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black text-black dark:text-white mb-2 leading-snug">
          {post.title}
        </h3>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {post.images.map((img: string, i: number) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden aspect-video border border-slate-300 dark:border-white/10 bg-black cursor-pointer hover:opacity-90 transition-opacity"
            >
              <img
                src={
                  img.startsWith("data:") ? img : `data:image/png;base64,${img}`
                }
                alt={`Imagem ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {((post.attachments?.files && post.attachments.files.length > 0) ||
        (post.attachments?.citations &&
          post.attachments.citations.length > 0)) && (
        <div className="mt-2 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3">
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <BookOpenIcon className="w-3.5 h-3.5" /> Bibliotecas e Fontes
          </span>

          {post.attachments.files && post.attachments.files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.attachments.files.map((file: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl text-[10px] font-bold bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-sm"
                >
                  <DocumentTextIcon className="w-3.5 h-3.5 text-red-500" />
                  {file}
                </span>
              ))}
            </div>
          )}

          {post.attachments.citations &&
            post.attachments.citations.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-slate-200 dark:border-white/5 pt-2.5">
                {post.attachments.citations.map((cit: any, i: number) => (
                  <div
                    key={i}
                    className="text-xs text-slate-600 dark:text-slate-400 font-serif italic border-l-2 border-cyan-500 pl-3 py-0.5 leading-normal"
                  >
                    {typeof cit === "string" ? cit : cit.text}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      <div className="flex items-center gap-6 border-t border-slate-200 dark:border-white/5 pt-4 mt-auto">
        <button
          onClick={() => {
            if (post.isSeed) {
              showToast("LEDGER de nó integrado: interação desabilitada.");
              return;
            }
            onLike(post.id);
          }}
          className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-colors ${isLiked ? "text-rose-500" : "text-slate-500 hover:text-rose-500"}`}
        >
          <HeartIcon
            className={`w-5 h-5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
          />
          <span>{post.likes?.length || 0}</span>
        </button>

        {!isPrivate && (
          <button
            onClick={() => setIsCommentOpen(!isCommentOpen)}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-colors ${isCommentOpen ? "text-cyan-500" : "text-slate-500 hover:text-cyan-500"}`}
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            <span>{post.comments?.length || 0}</span>
          </button>
        )}

        {isPrivate && (
          <span className="text-[10px] text-slate-500 font-bold uppercase ml-auto tracking-widest flex items-center gap-1">
            <LockClosedIcon className="w-3.5 h-3.5" /> Interações restritas
          </span>
        )}
      </div>

      <AnimatePresence>
        {isCommentOpen && !isPrivate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-200 dark:border-white/5 pt-4 flex flex-col gap-4"
          >
            {post.comments && post.comments.length > 0 && (
              <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1 bg-slate-50/50 dark:bg-black/20 p-3 rounded-2xl">
                {post.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="flex gap-2.5 items-start text-xs border-b border-slate-100 dark:border-white/5 pb-2.5 last:border-b-0 last:pb-0 text-left"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-black flex items-center justify-center shrink-0">
                      <img
                        src={comment.userImage || "/logo.png"}
                        alt={comment.user}
                        className="w-full h-full object-cover"
                        onError={(e) =>
                          (e.currentTarget.src = `https://ui-avatars.com/api/?name=${comment.user}&background=random`)
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-black dark:text-white truncate">
                          {comment.user}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed mt-0.5">
                        {comment.content}
                      </p>
                    </div>
                    {(comment.userEmail === currentUserEmail ||
                      comment.userId === currentUserEmail) && (
                      <button
                        onClick={() => onDeleteComment(post.id, comment.id)}
                        className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/60 rounded-full border border-slate-300 dark:border-white/20 p-1.5 pl-4 focus-within:ring-2 focus-within:ring-cyan-500/30 transition-all shadow-sm">
              <input
                type="text"
                placeholder="Adicione um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commentText.trim()) {
                    onAddComment(post.id, commentText);
                    setCommentText("");
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none text-[12px] text-black dark:text-white placeholder:text-slate-400"
              />
              <button
                onClick={() => {
                  if (commentText.trim()) {
                    onAddComment(post.id, commentText);
                    setCommentText("");
                  }
                }}
                disabled={!commentText.trim()}
                className="w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
              >
                <PaperAirplaneIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function HomeworkPage({
  isEmbedded = false,
}: {
  isEmbedded?: boolean;
}) {
  const { t } = useTranslation();
  const { data: session, status } = useSession();

  // --- TAB STATES ---
  // Inicializa JÁ a partir do ?tab= da URL (deep-link do menu inicial), pra a aba certa
  // nascer no 1º render — sem depender de efeito (que tinha corrida e fazia "Estudos" cair
  // em "pesquisa", o default). SSR cai no default; o cliente corrige no mount.
  const initialTab = (() => {
    if (typeof window === "undefined") return "pesquisa";
    const t = new URLSearchParams(window.location.search).get("tab");
    const VALID = ["pesquisa", "sala-de-estudos", "pesquisas", "lounge", "pevem", "projetos", "news", "profile"];
    return t && VALID.includes(t) ? t : "pesquisa";
  })();
  const [activeTab, setActiveTab] = useState<
    | "pesquisa"
    | "sala-de-estudos"
    | "pesquisas"
    | "lounge"
    | "pevem"
    | "projetos"
    | "news"
    | "profile"
  >(initialTab as any);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [muralSearchQuery, setMuralSearchQuery] = useState("");
  const [muralPosts, setMuralPosts] = useState<any[]>([]);
  const [isMuralLoading, setIsMuralLoading] = useState(false);
  // --- CORE STATES ---
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatLeft, setIsChatLeft] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "pdf" | "examiner" | "doc" | null
  >(null);
  const [showTour, setShowTour] = useState(false);
  const [onboardSaved, setOnboardSaved] = useState(false);
  const [miniTourTab, setMiniTourTab] = useState<string | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set());

  // --- NOTIFICATION STATE ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- WORK STATES ---
  const [workType, setWorkType] = useState<
    "Artigo" | "Relatório" | "TCC" | null
  >(null);
  const [editorZoom, setEditorZoom] = useState(1); // zoom da fonte do editor (0.7–2.2)
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [citInsertFlash, setCitInsertFlash] = useState(false); // barrinha sutil ao soltar citação
  const [isWorkTypeMenuOpen, setIsWorkTypeMenuOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("minha_pesquisa.pdf");
  const [docContent, setDocContent] = useState(ABNT_TEMPLATE);
  // MEMÓRIA POR TIPO: cada formato (TCC/Artigo/Relatório) é uma sessão de escrita própria.
  const docsRef = useRef<Record<string, { content: string; title: string }>>({});
  const workTypeRef = useRef<WorkType | null>(null);
  const [hintOpen, setHintOpen] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [activeProject, setActiveProject] = useState<any>(null);

  // --- DATA STATES ---
  const [studyFiles, setStudyFiles] = useState<StudyDoc[]>([]);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [activeFileContext, setActiveFileContext] = useState<string | null>(
    null,
  );
  const [liteContext, setLiteContext] = useState<string | null>(null); // resumo leve (Vercel): metadados, sem PDF
  // Conversar com o DOCUMENTO GERADO (estudo/pesquisa do editor): usa o texto que o app
  // já tem (docContent), não o proxy de PDF (que dá 403 p/ docs internos). → /api/ai/doc/chat.
  const [internalDoc, setInternalDoc] = useState<{ title: string; content: string } | null>(null);
  // Cache do PDF no Vertex (token-saving): o chat usa o cacheName em vez de reenviar o PDF.
  const [pdfCache, setPdfCache] = useState<{ name: string; expireTime: string } | null>(null);
  const [crossPickerOpen, setCrossPickerOpen] = useState(false); // dropdown "Cruzar com pesquisa salva"
  const { files: libraryFiles, save: saveLibraryFile } = useLibraryFiles();
  // Window store SUBIDO pra cá — pra o merge também abrir abas (não só o play).
  const {
    windows: wWindows,
    activeId: wActiveId,
    setActiveId: wSetActiveId,
    addWindow: wAddWindow,
    removeWindow: wRemoveWindow,
  } = useWindowStore();
  const [relSummaries, setRelSummaries] = useState<
    Record<string, { title: string; text: string; loading?: boolean }>
  >({});
  const [processingFileId, setProcessingFileId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<"pdf" | "ai" | null>(
    null,
  );
  const [activePdfTab, setActivePdfTab] = useState<"chat" | "citations">(
    "chat",
  );

  const { citations: persistedCitations, save: savePersistedCitation } =
    useSavedCitations();
  const [savedChatCits, setSavedChatCits] = useState<string[]>([]);
  // Forma legada {id, text} usada pela publicação/attachments (preserva o contrato dos consumidores).
  const citationNotes = persistedCitations.map((c) => ({
    id: c.id,
    text: c.abnt,
  }));

  // Saved research sessions — for the 📁 folder panel in ResearchShell
  const [sessions, setSessions] = useState<
    { id: string; title: string; updatedAt?: string }[]
  >([]);
  useEffect(() => {
    fetch("/api/ai/scholar/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.sessions)) {
          setSessions(
            data.sessions.map(
              (s: { id: string; title?: string; createdAt?: string }) => ({
                id: s.id,
                title: s.title ?? "Pesquisa sem título",
                updatedAt: s.createdAt
                  ? new Date(s.createdAt).toLocaleDateString("pt-BR")
                  : undefined,
              }),
            ),
          );
        }
      })
      .catch(() => {});
  }, []);
  const [citationContent, setCitationContent] = useState<string | null>(null);
  const [activeCitationText, setActiveCitationText] = useState<string | null>(
    null,
  );

  // 🔥 ESTADOS CONTROLADOS PARA OS PROMPTS (Para a voz funcionar perfeitamente)
  const [pdfPrompt, setPdfPrompt] = useState("");
  const [examinerPrompt, setExaminerPrompt] = useState("");

  const [pdfChatHistory, setPdfChatHistory] = useState<
    { role: "ai" | "user"; text: string }[]
  >([]);
  const [specialistChatHistory, setSpecialistChatHistory] = useState<{
    examiner: { role: "ai" | "user"; text: string }[];
  }>({ examiner: [] });

  // --- LOADING & ACTION STATES ---
  const [isPdfTyping, setIsPdfTyping] = useState(false);
  const [isExaminerTyping, setIsExaminerTyping] = useState(false);
  const [isCitationTyping, setIsCitationTyping] = useState(false);
  const [isSystemProcessing, setIsSystemProcessing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  // --- ABNT EXPORT STATES ---
  const [abntStep, setAbntStep] = useState<1 | 2>(1);
  const [abntMeta, setAbntMeta] = useState({
    institution: "",
    advisor: "",
    city: "",
    year: new Date().getFullYear().toString(),
    fontChoice: "Times New Roman" as "Times New Roman" | "Arial",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string[]>([]);
  const [abntWarnings, setAbntWarnings] = useState<string[]>([]);

  // --- MODALS ---
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishFormat, setPublishFormat] = useState<"pdf" | "docx" | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfChatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceLoadingId, setVoiceLoadingId] = useState<number | null>(null);
  const examinerChatRef = useRef<HTMLDivElement>(null);

  const fetchMuralData = async () => {
    setIsMuralLoading(true);
    try {
      const [resResearch, resPosts] = await Promise.all([
        fetch("/api/research"),
        fetch("/api/posts?room=research"),
      ]);
      const researchData = await resResearch.json();
      const postsData = await resPosts.json();

      const mappedResearch = researchData.map((project: any) => {
        return {
          id: `seed-${project.id}`,
          user: "AI Core Ledger",
          userId: "system",
          userEmail: "system@zaeon.ai",
          userImage: "/logo.png",
          title: project.title,
          content: `Iniciamos a pesquisa do protocolo de nível ${project.details?.rank || "A"}. Participantes ativos: ${project.participants?.grads || 0} Graduandos, ${project.participants?.masters || 0} Mestrandos e ${project.participants?.phds || 0} Doutores. O progresso atual do desenvolvimento é de ${project.progress}%. Agentes envolvidos no processamento de nós: ${project.details?.agents?.join(", ") || "Nenhum"}.`,
          images: [],
          tags: ["Ledger", project.details?.rank || "A", project.status].filter(
            Boolean,
          ),
          attachments: {
            citations: [
              {
                id: `cit-${project.id}`,
                text: `Protocol Node ${project.id} - Rank ${project.details?.rank}`,
              },
            ],
            files:
              project.details?.agents?.map(
                (a: string) =>
                  `${a.toLowerCase().replace(/ /g, "_")}_report.pdf`,
              ) || [],
          },
          createdAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * (Number(project.id) % 10 || 1),
          ).toISOString(),
          likes: ["system@zaeon.ai"],
          room: "research",
          comments: [],
          isSeed: true,
        };
      });

      const combined = [...postsData, ...mappedResearch].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setMuralPosts(combined);
    } catch (error) {
      console.error("Erro ao carregar Mural:", error);
      showToast("Erro ao carregar dados do Mural.");
    } finally {
      setIsMuralLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const response = await fetch("/api/posts/like", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (response.ok) {
        const data = await response.json();
        setMuralPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: data.likes } : p)),
        );
      } else {
        showToast("Erro ao curtir pesquisa.");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar ao servidor.");
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    try {
      const response = await fetch("/api/posts/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: text }),
      });
      if (response.ok) {
        const newComment = await response.json();
        setMuralPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                comments: [...(p.comments || []), newComment],
              };
            }
            return p;
          }),
        );
        showToast("Comentário publicado!");
      } else {
        showToast("Erro ao comentar.");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar ao servidor.");
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      const response = await fetch(`/api/posts/comment?id=${commentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMuralPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                comments: (p.comments || []).filter(
                  (c: any) => c.id !== commentId,
                ),
              };
            }
            return p;
          }),
        );
        showToast("Comentário removido.");
      } else {
        showToast("Erro ao remover comentário.");
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar ao servidor.");
    }
  };

  const handlePublishToMural = async (visibility: "public" | "private") => {
    setIsSystemProcessing(true);
    try {
      const payload = {
        content: docContent || "Nenhum conteúdo descritivo fornecido.",
        room: "research",
        title: docTitle || "Pesquisa sem título",
        images: selectedImages,
        tags: [visibility, workType].filter(Boolean),
        attachments: {
          citations: citationNotes,
          files: studyFiles.map((f) => f.title),
        },
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao publicar pesquisa.");
      }

      showToast(
        `Pesquisa publicada como ${visibility === "public" ? "Pública" : "Privada"}!`,
      );
      setIsPublishOpen(false);

      await fetchMuralData();
      setActiveTab("pesquisas");
    } catch (error) {
      console.error(error);
      showToast("Erro ao publicar na rede.");
    } finally {
      setIsSystemProcessing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedProject = localStorage.getItem("zaeon_active_project");
      if (savedProject) {
        try {
          const parsed = JSON.parse(savedProject);
          setActiveProject(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (status !== "loading") {
      fetchMuralData();
    }
  }, [status]);

  useEffect(() => {
    if (pdfChatRef.current)
      pdfChatRef.current.scrollTo({
        top: pdfChatRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [pdfChatHistory, isPdfTyping, activePdfTab]);
  useEffect(() => {
    if (examinerChatRef.current)
      examinerChatRef.current.scrollTo({
        top: examinerChatRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [specialistChatHistory.examiner, isExaminerTyping]);

  // Voz automática: fala a última resposta da Aura quando o toggle está ligado.
  useEffect(() => {
    if (!voiceOn) return;
    const last = pdfChatHistory[pdfChatHistory.length - 1];
    if (last && last.role === "ai") {
      const { clean } = extractCitationBlock(last.text);
      void playVoice(clean || last.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfChatHistory.length, voiceOn]);

  // Zoom do editor por Ctrl/Cmd + scroll (passive:false p/ não deixar a PÁGINA dar zoom)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setEditorZoom((z) =>
          Math.min(2.2, Math.max(0.7, +(z - e.deltaY * 0.0015).toFixed(3))),
        );
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // PERSISTÊNCIA POR TIPO — cada formato (TCC/Artigo/Relatório) guarda seu próprio
  // rascunho (sessão). Trocar de tipo NÃO converte: abre a sessão daquele tipo.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("zaeon_research_docs");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.docs && typeof d.docs === "object") docsRef.current = d.docs;
        const wt: WorkType | null = d.activeWorkType ?? null;
        if (wt && docsRef.current[wt]) {
          setWorkType(wt);
          setDocContent(docsRef.current[wt].content);
          setDocTitle(docsRef.current[wt].title);
          return;
        }
        if (wt) setWorkType(wt);
        return;
      }
      // Compat: rascunho antigo (único) → migra pra sessão do tipo salvo (ou TCC).
      const legacy = localStorage.getItem("zaeon_research_draft");
      if (legacy) {
        const d = JSON.parse(legacy);
        const wt: WorkType = d.workType || "TCC";
        if (typeof d.docContent === "string" && d.docContent.trim()) {
          docsRef.current[wt] = { content: d.docContent, title: d.docTitle || docTitle };
          setWorkType(wt);
          setDocContent(d.docContent);
          if (d.docTitle) setDocTitle(d.docTitle);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (workType) docsRef.current[workType] = { content: docContent, title: docTitle };
      localStorage.setItem(
        "zaeon_research_docs",
        JSON.stringify({ docs: docsRef.current, activeWorkType: workType }),
      );
    } catch {}
  }, [docContent, docTitle, workType]);

  // Troca o tipo SEM converter: salva a sessão atual e abre a do novo tipo (ou template vazio).
  const switchWorkType = (next: WorkType) => {
    if (next === workType) return;
    if (workType) docsRef.current[workType] = { content: docContent, title: docTitle };
    const saved = docsRef.current[next];
    if (saved) {
      setDocContent(saved.content);
      setDocTitle(saved.title);
    } else {
      setDocContent(templateFor(next));
    }
    setWorkType(next);
  };
  workTypeRef.current = workType; // mantém o ref do tipo ativo p/ handlers de evento

  // "Minhas coisas": novo trabalho (zera a folha do tipo atual) e excluir uma pesquisa salva.
  const handleNewWork = () => {
    setDocTitle("minha_pesquisa.pdf");
    setDocContent(templateFor(workType));
  };
  const handleDeleteWork = (id: string) => {
    fetch(`/api/ai/scholar/sessions?id=${id}`, { method: "DELETE" })
      .then(() => setSessions((prev) => prev.filter((s) => s.id !== id)))
      .catch(() => {});
  };

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("zaeon-focus-mode", { detail: false }),
      );
    };
  }, []);

  // Save onboard cookie data after OAuth if present
  useEffect(() => {
    if (status !== "authenticated" || onboardSaved) return;
    if (!document.cookie.includes("zaeon_onboard=")) return;
    fetch("/api/onboard/save", { method: "POST" })
      .then(() => setOnboardSaved(true))
      .catch(console.error);
  }, [status, onboardSaved]);

  // Mount tour on first login when ?tour=true
  useEffect(() => {
    if (status === "authenticated") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tour") === "true") {
        const timer = setTimeout(() => setShowTour(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [status]);

  // Handle ?tab= query param for deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (
      tabParam &&
      [
        "pesquisa",
        "sala-de-estudos",
        "pesquisas",
        "lounge",
        "pevem",
        "projetos",
        "news",
        "profile",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam as any);
    }
  }, []);

  // Deep-link ?session=<id> (vindo do menu inicial → Pesquisas): abre a ABA PESQUISA e
  // carrega aquela pesquisa salva como DOCUMENTO (título + conteúdo) na folha de escrita.
  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("session");
    if (!sid) return;
    setActiveTab("pesquisa");
    fetch(`/api/ai/scholar/sessions?id=${sid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.session ?? d;
        if (!s) return;
        if (s.query) setDocTitle(String(s.query).slice(0, 120));
        const ans =
          (typeof s?.thread?.answer === "string" && s.thread.answer) ||
          (typeof s?.thread?.synthesized === "string" && s.thread.synthesized) ||
          (typeof s?.thread === "string" && s.thread) || "";
        if (ans) setDocContent(String(ans));
      })
      .catch(() => {});
  }, []);

  // Troca de sala em TEMPO REAL pela Zaeon (voz/chat): a widget dispara este evento
  // mesmo já estando no research-lab — o deep-link só roda no mount, então sem isto
  // a troca por voz não funcionaria estando na página. Ver lib/agent + LoungeChatWidget.
  useEffect(() => {
    const VALID = ["pesquisa", "sala-de-estudos", "pesquisas", "lounge", "pevem", "projetos", "news", "profile"];
    const onSetTab = (e: any) => {
      const tab = e?.detail;
      if (typeof tab === "string" && VALID.includes(tab)) setActiveTab(tab as any);
    };
    window.addEventListener("zaeon:set-tab", onSetTab);
    return () => window.removeEventListener("zaeon:set-tab", onSetTab);
  }, []);

  // "Iniciar pesquisa" (sugestão) → abre um DOCUMENTO NOVO na aba Pesquisa com o título.
  // Pesquisa é estritamente pesquisa (não joga pra Sala de Estudos).
  useEffect(() => {
    const onNewDoc = (e: any) => {
      const t = e?.detail?.title;
      const fields = e?.detail?.fields as DraftFields | undefined;
      const c = e?.detail?.content;
      if (typeof t === "string" && t.trim()) {
        const wt: WorkType = workTypeRef.current ?? "TCC";
        setDocTitle(t.trim().slice(0, 120));
        // Esboço gerado → encaixa os CAMPOS no framework do tipo ativo (sem repetir as seções).
        if (fields && typeof fields === "object") {
          setDocContent(buildDocFromDraft(wt, fields));
        } else {
          setDocContent(typeof c === "string" && c.trim() ? c : templateFor(wt));
        }
        if (!workTypeRef.current) setWorkType("TCC");
        setActiveTab("pesquisa");
      }
    };
    window.addEventListener("zaeon:research:newdoc", onNewDoc);
    return () => window.removeEventListener("zaeon:research:newdoc", onNewDoc);
  }, []);

  // Deep-link ?worktype=TCC|Artigo|Relatório (menu inicial → Pesquisas): abre a aba
  // Pesquisa NAQUELE tipo (a sessão salva dele), sem cair na Sala de Estudos.
  useEffect(() => {
    const wt = new URLSearchParams(window.location.search).get("worktype");
    if (wt !== "TCC" && wt !== "Artigo" && wt !== "Relatório") return;
    setActiveTab("pesquisa");
    const saved = docsRef.current[wt];
    if (saved) { setDocContent(saved.content); setDocTitle(saved.title); }
    else setDocContent(templateFor(wt as WorkType));
    setWorkType(wt as WorkType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tour guiado da Zaeon: começa quando vem ?onboard=1 (card de boas-vindas) e o
  // usuário ainda não fez (localStorage). O registro no servidor (User.tourDone) é
  // feito ao concluir/pular. Garante a aba inicial = Sala de Estudos.
  useEffect(() => {
    try {
      const onboardParam = new URLSearchParams(window.location.search).get("onboard");
      const replayOn = localStorage.getItem("zaeon.tourReplay") === "1";
      const done = localStorage.getItem("zaeon.tourDone") === "1";
      // ?onboard=replay → liga o replay persistente (testar à vontade até dar o Ok).
      if (onboardParam === "replay") {
        setActiveTab("sala-de-estudos");
        setTimeout(() => startTour({ replay: true }), 600);
      } else if (replayOn) {
        // Replay ligado: reabre o tour a cada visita, ignorando o "feito".
        setActiveTab("sala-de-estudos");
        setTimeout(() => startTour(), 600);
      } else if (onboardParam === "1" && !done) {
        setActiveTab("sala-de-estudos");
        setTimeout(() => startTour(), 600);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFocusMode = () => {
    const newMode = !isFocusMode;
    setIsFocusMode(newMode);
    if (typeof window !== "undefined") {
      const event = new CustomEvent("zaeon-focus-mode", { detail: newMode });
      window.dispatchEvent(event);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === "application/pdf",
    );
    if (pdfFiles.length > 0) {
      setPendingUpload(pdfFiles[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmUpload = () => {
    if (!pendingUpload) return;
    const id = generateSafeId();
    const url = URL.createObjectURL(pendingUpload);
    setStudyFiles((prev) => [
      ...prev,
      { id, title: pendingUpload.name, url, file: pendingUpload },
    ]);
    // CORREÇÃO: o upload caía só em studyFiles (que não renderiza). Salva na biblioteca
    // → aparece como DocIcon em "Documentos" (useLibraryFiles sincroniza os painéis via evento).
    saveLibraryFile({
      id,
      title: pendingUpload.name,
      pdfUrl: url,
      source: "upload",
      savedAt: Date.now(),
    });
    setPendingUpload(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const buildSystemContext = () => {
    let ctx = "";
    if (activeProject)
      ctx += `[ACTIVE PROJECT]: ${JSON.stringify(activeProject)}\n`;
    if (workType)
      ctx += `[TARGET WORK TYPE]: User is writing a ${workType.toUpperCase()}.\n`;
    return ctx;
  };

  // 🔥 FETCH CORRECTO PARA O RESUMO DO PDF
  const handlePlayDocument = async (doc: StudyDoc) => {
    if (!doc.file || isPdfTyping || processingFileId) return;
    setProcessingFileId(doc.id);
    setIsPdfTyping(true);
    setActiveSection("pdf");
    try {
      const base64Data = await fileToBase64(doc.file);
      setActiveFileContext(base64Data);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analise o documento "${doc.title}" e gere um resumo.`,
          agent: "aura",
          fileData: base64Data,
          systemContext: buildSystemContext(),
        }),
      });
      const data = await response.json();
      if (data.text) setPdfChatHistory([{ role: "ai", text: data.text }]);
    } catch (e) {
      showToast("Erro ao processar o PDF.");
    } finally {
      setIsPdfTyping(false);
      setProcessingFileId(null);
    }
  };

  // Play de um arquivo SALVO (remoto): busca o PDF pelo proxy → base64 → workspace + resumo da Aura.
  const handlePlaySavedDoc = async (file: {
    id: string;
    title: string;
    pdfUrl: string;
  }) => {
    if (isPdfTyping || processingFileId) return;
    setProcessingFileId(file.id);
    setProcessingStage("pdf");
    setIsPdfTyping(true);
    setActiveSection("pdf");
    setInternalDoc(null); // sai do modo "documento gerado" ao abrir um arquivo da biblioteca
    setPdfCache(null); // cache do PDF anterior não vale mais

    // MODO LEVE (Vercel): resume do abstract/metadados — NÃO baixa o PDF, sem 502, via Groq.
    if (!capabilities().heavyRag) {
      setProcessingStage("ai");
      setDocTitle(file.title);
      try {
        const r = await fetch("/api/ai/summarize-lite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfUrl: file.pdfUrl, title: file.title }),
        });
        const d = await r.json();
        setActiveFileContext(null);
        setPdfCache(null);
        setLiteContext(d.context || null);
        setPdfChatHistory([
          { role: "ai", text: d.text || "Não consegui resumir agora." },
        ]);
      } catch {
        showToast("Erro ao gerar o resumo leve.");
      } finally {
        setIsPdfTyping(false);
        setProcessingFileId(null);
        setProcessingStage(null);
      }
      return;
    }

    try {
      const res = await fetch(
        `/api/ai/scholar/pdf?url=${encodeURIComponent(file.pdfUrl)}`,
      );
      if (!res.ok) {
        // O proxy de PDF falhou (400/403: upload/blob ou paper fora das referências).
        // Em vez de travar, cai no resumo LEVE por metadados → dá pra conversar pelo
        // abstract em vez de não abrir nada.
        setProcessingStage("ai");
        setDocTitle(file.title);
        try {
          const r = await fetch("/api/ai/summarize-lite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfUrl: file.pdfUrl, title: file.title }),
          });
          const d = await r.json();
          setActiveFileContext(null);
          setPdfCache(null);
          setLiteContext(d.context || null);
          setPdfChatHistory([
            {
              role: "ai",
              text:
                d.text ||
                "Não consegui abrir o PDF, mas posso conversar pelos metadados deste trabalho.",
            },
          ]);
        } catch {
          showToast("Não consegui abrir esse arquivo agora.");
        }
        return; // o finally externo limpa os estados de processamento
      }
      const blob = await res.blob();
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
      });
      setActiveFileContext(base64Data);
      setProcessingStage("ai");
      setDocTitle(file.title);
      // Cacheia o PDF uma vez (Vertex) → os turnos seguintes usam o cacheName (sem reenviar
      // o PDF). Falhou/pequeno demais → cache null e seguimos inline (base64Data).
      let cache: { name: string; expireTime: string } | null = null;
      try {
        const cr = await fetch("/api/ai/pdf/cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: base64Data, title: file.title }),
        });
        const cd = await cr.json().catch(() => null);
        if (cd?.cacheName) cache = { name: cd.cacheName, expireTime: cd.expireTime || "" };
      } catch {
        /* sem cache → inline */
      }
      setPdfCache(cache);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analise o documento "${file.title}" e gere um resumo.`,
          agent: "aura",
          ...(cache ? { cacheName: cache.name } : { fileData: base64Data }),
          systemContext: buildSystemContext(),
        }),
      });
      const data = await response.json();
      if (data.text) setPdfChatHistory([{ role: "ai", text: data.text }]);
    } catch (e) {
      showToast("Erro ao abrir o arquivo salvo.");
    } finally {
      setIsPdfTyping(false);
      setProcessingFileId(null);
      setProcessingStage(null);
    }
  };

  // Baixa um PDF salvo pelo proxy e devolve base64 (ou null se falhar — upload/blob/403/400).
  const fetchPdfBase64 = async (pdfUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/ai/scholar/pdf?url=${encodeURIComponent(pdfUrl)}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve((reader.result as string).split(",")[1] || null);
        reader.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  };

  // Arrastar uma pesquisa sobre outra → resumo da RELAÇÃO.
  // Tenta a comparação RICA (os 2 PDFs inteiros → Gemini multimodal). Se algum PDF não
  // baixar (upload/blob/403), cai no nível metadados (título+abstract) — sem 400.
  const handleRelateFiles = async (sourceId: string, targetId: string) => {
    const a = libraryFiles.find((f) => f.id === sourceId);
    const b = libraryFiles.find((f) => f.id === targetId);
    if (!a || !b) {
      showToast("Não achei um dos documentos.");
      return;
    }
    // PASSIVO: abre uma ABA NOVA "A × B" (deletável) com barrinha sutil. Não troca a view —
    // a aba aparece e o usuário clica quando quiser (regra: docs/RESEARCH_ROOM_RULES.md).
    const relId = "rel-" + generateSafeId();
    const shortA = a.title.length > 12 ? a.title.slice(0, 12) + "…" : a.title;
    const shortB = b.title.length > 12 ? b.title.slice(0, 12) + "…" : b.title;
    const title = `${a.title} × ${b.title}`;
    wAddWindow({
      id: relId,
      label: `${shortA} × ${shortB}`,
      emoji: "🔗",
      type: "document",
    });
    wSetActiveId(relId); // mostra a aba de relação na hora (antes abria passiva → parecia que "nada acontecia")
    setRelSummaries((prev) => ({
      ...prev,
      [relId]: { title, text: "", loading: true },
    }));
    showToast("Cruzando os dois trabalhos — carregando ✨");
    try {
      // Baixa os dois PDFs em paralelo. Ambos OK → comparação rica (Gemini lê os PDFs
      // inteiros); senão → metadados (o route faz o fallback, sem 400).
      const [aPdf, bPdf] = await Promise.all([
        fetchPdfBase64(a.pdfUrl),
        fetchPdfBase64(b.pdfUrl),
      ]);
      const bothPdfs = !!aPdf && !!bPdf;
      const res = await fetch("/api/ai/relate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          bothPdfs
            ? {
                mode: "gemini",
                a: { pdfUrl: a.pdfUrl, title: a.title, fileData: aPdf },
                b: { pdfUrl: b.pdfUrl, title: b.title, fileData: bPdf },
              }
            : {
                mode: "vercel",
                a: { pdfUrl: a.pdfUrl, title: a.title },
                b: { pdfUrl: b.pdfUrl, title: b.title },
              },
        ),
      });
      const d = await res.json();
      setRelSummaries((prev) => ({
        ...prev,
        [relId]: {
          title,
          text: d.text || "Não consegui relacionar agora.",
          loading: false,
        },
      }));
    } catch {
      setRelSummaries((prev) => ({
        ...prev,
        [relId]: {
          title,
          text: "Erro ao relacionar os documentos.",
          loading: false,
        },
      }));
    }
  };

  // Cruzar o DOCUMENTO GERADO (texto do editor) com uma PESQUISA SALVA — relação pelo
  // TEXTO dos dois (sem PDF, sem 403). Carrega o conteúdo da sessão (mesmo formato do
  // deep-link ?session=) e manda os dois corpos pro /api/ai/relate (modo texto).
  const handleCrossDocWithSession = async (sid: string, sTitle: string) => {
    setCrossPickerOpen(false);
    if (!docContent.trim()) {
      showToast("Escreva algo no documento primeiro.");
      return;
    }
    const relId = "rel-" + generateSafeId();
    const shortA = docTitle.length > 12 ? docTitle.slice(0, 12) + "…" : docTitle;
    const shortB = sTitle.length > 12 ? sTitle.slice(0, 12) + "…" : sTitle;
    const title = `${docTitle} × ${sTitle}`;
    wAddWindow({ id: relId, label: `${shortA} × ${shortB}`, emoji: "🔗", type: "document" });
    wSetActiveId(relId); // mostra a aba de relação na hora
    setRelSummaries((prev) => ({ ...prev, [relId]: { title, text: "", loading: true } }));
    showToast("Cruzando os dois documentos — carregando ✨");
    try {
      const sr = await fetch(`/api/ai/scholar/sessions?id=${encodeURIComponent(sid)}`);
      const sd = sr.ok ? await sr.json() : null;
      const s = sd?.session ?? sd;
      const otherText =
        (typeof s?.thread?.answer === "string" && s.thread.answer) ||
        (typeof s?.thread?.synthesized === "string" && s.thread.synthesized) ||
        (typeof s?.thread === "string" && s.thread) ||
        "";
      if (!otherText) {
        setRelSummaries((prev) => ({
          ...prev,
          [relId]: { title, text: "Essa pesquisa salva não tem conteúdo pra cruzar.", loading: false },
        }));
        return;
      }
      const res = await fetch("/api/ai/relate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: { title: docTitle, text: docContent },
          b: { title: sTitle, text: otherText },
        }),
      });
      const d = await res.json();
      setRelSummaries((prev) => ({
        ...prev,
        [relId]: { title, text: d.text || "Não consegui relacionar agora.", loading: false },
      }));
    } catch {
      setRelSummaries((prev) => ({
        ...prev,
        [relId]: { title, text: "Erro ao cruzar os documentos.", loading: false },
      }));
    }
  };

  // 🔥 FETCH CORRECTO PARA CHAT AURA
  const handlePdfQuestion = async () => {
    if (!pdfPrompt.trim() || (!activeFileContext && !liteContext && !internalDoc))
      return;
    const currentPrompt = pdfPrompt;
    setPdfPrompt("");
    setPdfChatHistory((prev) => [
      ...prev,
      { role: "user", text: currentPrompt },
    ]);
    setIsPdfTyping(true);

    try {
      const historyForGemini = pdfChatHistory.map((m) => ({
        role: m.role === "ai" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

      // DOCUMENTO INTERNO GERADO → conversa pelo texto (sem PDF, sem 403). Gemini/Vertex.
      if (internalDoc && !activeFileContext) {
        const r = await fetch("/api/ai/doc/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentPrompt,
            title: internalDoc.title,
            content: internalDoc.content,
            history: historyForGemini,
          }),
        });
        const d = await r.json();
        if (d.text)
          setPdfChatHistory((prev) => [...prev, { role: "ai", text: d.text }]);
        setIsPdfTyping(false);
        return;
      }

      // PDF cacheado → manda o cacheName (sem reenviar o PDF). Cache expirou
      // ({ cacheExpired }) → recria UMA vez a partir do base64 e tenta de novo; se não
      // der, cai pro inline daquele turno.
      const chatBody = (extra: Record<string, unknown>) => ({
        prompt: currentPrompt,
        agent: liteContext && !activeFileContext ? "groq_bypassed" : "aura",
        history: historyForGemini,
        systemContext:
          buildSystemContext() +
          (liteContext && !activeFileContext
            ? `\n\n[DOCUMENTO (metadados do artigo)]:\n${liteContext}`
            : ""),
        ...extra,
      });
      const post = (extra: Record<string, unknown>) =>
        fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatBody(extra)),
        }).then((r) => r.json());

      let data: any;
      if (pdfCache) {
        data = await post({ cacheName: pdfCache.name });
        if (data?.cacheExpired) {
          let recreated: { name: string; expireTime: string } | null = null;
          if (activeFileContext) {
            try {
              const cr = await fetch("/api/ai/pdf/cache", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileData: activeFileContext }),
              });
              const cd = await cr.json().catch(() => null);
              if (cd?.cacheName) recreated = { name: cd.cacheName, expireTime: cd.expireTime || "" };
            } catch {
              /* segue pro inline */
            }
          }
          setPdfCache(recreated);
          data = recreated
            ? await post({ cacheName: recreated.name })
            : await post(activeFileContext ? { fileData: activeFileContext } : {});
        }
        // Turno cacheado falhou sem ser cacheExpired (ex.: 500) → tenta inline uma vez,
        // pra não engolir a pergunta em silêncio.
        if (!data?.text && !data?.cacheExpired && activeFileContext) {
          data = await post({ fileData: activeFileContext });
        }
      } else {
        data = await post(activeFileContext ? { fileData: activeFileContext } : {});
      }
      if (data?.text) {
        setPdfChatHistory((prev) => [...prev, { role: "ai", text: data.text }]);
      } else if (!data?.cacheExpired) {
        // resposta sem texto (erro do servidor) → avisa em vez de sumir com o turno
        showToast("Não consegui responder agora.");
      }
    } catch (e) {
      console.error(e);
      showToast("Falha de conexão.");
    } finally {
      setIsPdfTyping(false);
    }
  };

  // 🔊 Voz da Aura — SEMPRE a voz premium (engine HQ via /api/ai/voice).
  // Nada de speechSynthesis do navegador (a "voz do Google" foi removida de vez).
  const playVoice = async (text: string, msgId?: number) => {
    const clean = text.trim();
    if (!clean) return;

    if (msgId != null) setVoiceLoadingId(msgId);
    try {
      const res = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) {
        showToast("Voz indisponível agora.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.audio_base64) {
        audioRef.current?.pause();
        const audio = new Audio(
          `data:${data.mime || "audio/wav"};base64,${data.audio_base64}`,
        );
        audioRef.current = audio;
        await audio.play().catch(() => {});
      }
    } catch {
      showToast("Voz indisponível agora.");
    } finally {
      if (msgId != null) setVoiceLoadingId(null);
    }
  };

  const handleGenerateCitations = async () => {
    if (!activeFileContext) return;
    setIsCitationTyping(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Gere 3 citações ABNT",
          agent: "scholar",
          fileData: activeFileContext,
        }),
      });
      const data = await response.json();
      if (data.text) setCitationContent(data.text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCitationTyping(false);
    }
  };

  const handleSaveCitation = () => {
    if (!citationContent) return;
    savePersistedCitation({
      id: generateSafeId(),
      abnt: citationContent,
      title: docTitle || "Citação",
      authors: [],
      savedAt: Date.now(),
    });
    setActiveCitationText(citationContent);
    setCitationContent(null);
    showToast("Citação salva na aba Citações.");
  };

  // Salva uma citação proposta pela Aura no chat (store persistente → aba Citações).
  const saveChatCitation = (citation: string) => {
    savePersistedCitation({
      id: generateSafeId(),
      abnt: citation,
      title: docTitle || "Citação do chat",
      authors: [],
      savedAt: Date.now(),
    });
    setSavedChatCits((prev) =>
      prev.includes(citation) ? prev : [...prev, citation],
    );
    showToast("Citação salva na aba Citações.");
  };

  // Soltar uma citação salva no editor: a FRASE vai onde o cursor estava, a REFERÊNCIA (ABNT) vai pras Referências.
  const handleCitationDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const raw = e.dataTransfer.getData("text/zaeon-citation");
    if (!raw) return; // não é uma citação nossa → deixa o comportamento padrão
    e.preventDefault();
    let cit: { quote: string; abnt: string };
    try {
      cit = JSON.parse(raw);
    } catch {
      return;
    }
    const ta = textareaRef.current;
    // O caret já está no ponto do drop (o browser move durante o dragover).
    const cursor = ta
      ? (ta.selectionStart ?? docContent.length)
      : docContent.length;
    const next = applyCitationDrop(docContent, cursor, cit);
    setDocContent(next);
    // barrinha sutil de confirmação (regra de UX: nada agressivo)
    setCitInsertFlash(true);
    setTimeout(() => setCitInsertFlash(false), 650);
    showToast("Citação inserida — referência adicionada às Referências.");
  };

  // 🔥 FETCH CORRECTO PARA O EXAMINER (Quiz)
  const handleSpecialistQuery = async (
    specialistType: "examiner",
    inputVal: string,
  ) => {
    if (!inputVal.trim()) return;
    setIsExaminerTyping(true);
    setExaminerPrompt("");

    setSpecialistChatHistory((prev) => ({
      ...prev,
      [specialistType]: [
        ...prev[specialistType],
        { role: "user", text: inputVal },
      ],
    }));

    try {
      const currentHistory = specialistChatHistory[specialistType];
      const historyForGemini = currentHistory.map((m) => ({
        role: m.role === "ai" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputVal,
          agent: specialistType,
          fileData: activeFileContext,
          history: historyForGemini,
          systemContext: buildSystemContext(),
        }),
      });
      const data = await response.json();

      if (data.text) {
        setSpecialistChatHistory((prev) => ({
          ...prev,
          [specialistType]: [
            ...prev[specialistType],
            { role: "ai", text: data.text },
          ],
        }));
      }
    } catch (e) {
      console.error(e);
      showToast("Falha de conexão.");
    } finally {
      setIsExaminerTyping(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copiado para a área de transferência!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWorkspace = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saveState === "saving") return;

    setSaveState("saving");
    try {
      const payload = {
        userId: session?.user?.email || "anonymous_user",
        workTitle: docTitle,
        workContent: docContent,
        workType: workType,
        citations: JSON.stringify(citationNotes),
      };

      await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      console.error(error);
      setSaveState("idle");
      showToast("Erro ao salvar progresso.");
    }
  };

  const handlePublish = async () => {
    if (!publishFormat) return;
    setIsSystemProcessing(true);
    try {
      const blob = new Blob([docContent], {
        type:
          publishFormat === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docTitle.replace(/\s+/g, "_")}.${publishFormat === "pdf" ? "pdf" : "docx"}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsPublishOpen(false);
      setPublishFormat(null);
      showToast("Documento publicado com sucesso.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSystemProcessing(false);
    }
  };

  const handleABNTExport = async (format: "pdf" | "docx") => {
    setIsExporting(true);
    setAbntWarnings([]);
    setExportProgress(["Estruturando seções com IA (ABNT Structurer)..."]);

    // Tenta parsear marcadores estruturados do editor
    const parsedSections = parseAbntMarkers(docContent);

    try {
      const response = await fetch("/api/documents/abnt-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle.replace(/\.pdf$/i, "").replace(/\.docx$/i, ""),
          content: docContent,
          workType: workType || "Artigo",
          citations: citationNotes,
          author: session?.user?.name || "Autor",
          institution: abntMeta.institution,
          course: (session?.user as any)?.course || "",
          advisor: abntMeta.advisor || undefined,
          city: abntMeta.city,
          year: abntMeta.year,
          format,
          fontChoice: abntMeta.fontChoice,
          parsedSections: parsedSections ?? undefined,
        }),
      });

      setExportProgress((prev) => [
        ...prev,
        "Aplicando normas NBR 14724:2011...",
        "Gerando arquivo final...",
      ]);

      if (response.status === 503) {
        const json = await response.json();
        showToast("Serviço ABNT offline. Rode o abnt-service na porta 8001.");
        return;
      }

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        showToast(json.error || "Erro ao gerar documento ABNT.");
        return;
      }

      // Exibe warnings retornados pelo agente
      const warningsHeader = response.headers.get("X-ABNT-Warnings");
      if (warningsHeader) {
        const warns = JSON.parse(warningsHeader) as string[];
        if (warns.length > 0) setAbntWarnings(warns);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (docTitle || "pesquisa")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_\-]/g, "");
      a.download = `${safeName}_ABNT.${format === "pdf" ? "pdf" : "docx"}`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(`Documento ABNT exportado com sucesso!`);
      setIsSaveModalOpen(false);
      setAbntStep(1);
    } catch (err) {
      console.error(err);
      showToast("Erro inesperado ao exportar documento ABNT.");
    } finally {
      setIsExporting(false);
      setExportProgress([]);
    }
  };

  const getCardStyle = (sectionName: string) => {
    const isActive = activeSection === sectionName;
    return `transition-all duration-300 border-2 ${isActive ? "border-cyan-500 ring-4 ring-cyan-500/10" : "border-slate-300 dark:border-white/10"} bg-white dark:bg-[#0f172a] shadow-xl`;
  };

  const triggerMiniTour = (tab: string) => {
    if (["news", "profile"].includes(tab)) {
      setMiniTourTab(tab);
      setTimeout(() => setMiniTourTab(null), 6000);
    }
  };

  const handleTabChange = (tab: string) => {
    if (!visitedTabs.has(tab)) {
      setVisitedTabs((prev) => new Set([...prev, tab]));
      triggerMiniTour(tab);
    }
    setActiveTab(tab as any);
  };

  const isTeacher = (session?.user as any)?.role === "teacher";

  const getTabMeta = () => {
    switch (activeTab) {
      case "sala-de-estudos":
        return {
          title: "Sala de Estudos",
          subtitle: "Aulas, comunidade, provas e projetos do seu curso",
        };
      case "pesquisas":
        return {
          title: "Pesquisas",
          subtitle: "Todas as pesquisas iniciadas via agente",
        };
      case "lounge":
        return {
          title: "Lounge",
          subtitle: isTeacher
            ? "Espaço informal para conversa entre docentes"
            : "Espaço informal para conversa entre estudantes",
        };
      case "pevem":
        return {
          title: "Pevem News",
          subtitle: "Notificações e atualizações do sistema Pevem",
        };
      case "news":
        return {
          title: "Central de Notícias",
          subtitle:
            "Atualizações, relatórios e eventos do ecossistema acadêmico",
        };
      case "profile":
        return {
          title: "Identidade Neural",
          subtitle: "Seu perfil, conquistas e rede de colaboração",
        };
      default:
        return {
          title: "Sala de Pesquisa",
          subtitle: "Agente de pesquisa, biblioteca de PDFs e exportação ABNT",
        };
    }
  };
  const tabMeta = getTabMeta();

  if (!mounted || status === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-[#030014]">
        <IosLoader />
      </div>
    );
  }

  return (
    <div
      className={`relative transition-all duration-500 overflow-hidden flex font-sans w-full bg-slate-100 dark:bg-[#030014]
            ${isEmbedded ? "h-full" : "h-screen"}
            ${!isEmbedded ? (isFocusMode ? "pt-4" : "pt-[100px]") : ""}
        `}
    >
      {/* NOTIFICAÇÃO FLUTUANTE (TOAST) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full shadow-2xl text-[11px] font-bold tracking-widest flex items-center gap-3 border border-slate-800 dark:border-slate-200"
          >
            <CheckBadgeIcon className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar — apenas fora do modo embutido */}
      {!isEmbedded && (
        <AnimatePresence>
          {!isFocusMode && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="absolute top-0 left-0 w-full z-50"
            >
              <Navbar />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* SIDEBAR ULTRA-FINA — oculta quando embutido (workstation provê a navegação) */}
      {!isEmbedded && (
        <motion.nav
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
          animate={{ width: isSidebarOpen ? 180 : 54 }}
          className={`fixed ${isChatLeft ? "right-4" : "left-4"} z-[550] flex flex-col py-6 rounded-[24px] border backdrop-blur-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] bg-[rgba(22,22,34,0.55)] border-white/10 overflow-hidden transition-all duration-500 ${isFocusMode ? "top-4 h-[calc(100vh-32px)]" : "top-[100px] h-[calc(100vh-140px)]"}`}
        >
          <div className="flex flex-col gap-3 px-2.5">
            {/* Sala de Estudos — topo da sidebar */}
            <button
              data-tour="estudos"
              onClick={() => setActiveTab("sala-de-estudos")}
              className={navItem(activeTab === "sala-de-estudos", "blue")}
            >
              <DocumentTextIcon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase whitespace-nowrap">
                  Sala de Estudos
                </span>
              )}
            </button>

            {/* Sala de Pesquisa (antiga "Pesquisa") */}
            <button
              data-tour="pesquisa"
              onClick={() => setActiveTab("pesquisa")}
              className={navItem(activeTab === "pesquisa", "purple")}
            >
              <AcademicCapIcon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase whitespace-nowrap">
                  Sala de Pesquisa
                </span>
              )}
            </button>

            {/* Projetos — Zaeon Code (IDE agêntica; auto-protegida por plano/curso) */}
            <button
              onClick={() => setActiveTab("projetos")}
              className={navItem(activeTab === "projetos", "cyan")}
            >
              <Code2 className="w-5 h-5 shrink-0" />
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase whitespace-nowrap">
                  Projetos
                </span>
              )}
            </button>

            {/* Lounge */}
            <button
              data-tour="lounge"
              onClick={() => setActiveTab("lounge")}
              className={navItem(activeTab === "lounge", "violet")}
            >
              <Coffee className="w-5 h-5 shrink-0" />
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase whitespace-nowrap">
                  Lounge
                </span>
              )}
            </button>

            <div className="h-[1px] bg-slate-300 dark:bg-white/10 my-1" />

            {/* Perfil */}
            <button
              data-tour="profile-tab"
              onClick={() => setActiveTab("profile")}
              className={navItem(activeTab === "profile", "violet")}
            >
              <UserCircleIcon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase whitespace-nowrap">
                  Perfil
                </span>
              )}
            </button>
          </div>

          {/* EXTRAS — layout + foco; pb-16 deixa o cantinho inferior livre pro FAB da Zaeon encaixar */}
          <div className="mt-auto px-2.5 pt-3 pb-16 flex flex-col gap-3">
            <div className="h-[1px] bg-slate-300 dark:bg-white/10" />
            <button
              data-tour="layout-toggle"
              onClick={() => setIsChatLeft(!isChatLeft)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-black dark:text-white group"
            >
              <ArrowsRightLeftIcon className="w-5 h-5 shrink-0 group-hover:text-cyan-500" />
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase whitespace-nowrap">
                  Layout
                </span>
              )}
            </button>
            <button
              data-tour="focus-mode"
              onClick={toggleFocusMode}
              className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isFocusMode ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "text-black dark:text-white hover:bg-slate-100 dark:hover:bg-white/5"}`}
            >
              {isFocusMode ? (
                <EyeIcon className="w-5 h-5" />
              ) : (
                <PowerIcon className="w-5 h-5" />
              )}
              {isSidebarOpen && (
                <span className="text-[10px] font-black uppercase">Foco</span>
              )}
            </button>
          </div>
        </motion.nav>
      )}

      <main
        className={`flex-1 flex flex-col ${!isEmbedded ? (isChatLeft ? "pr-[80px]" : "pl-[80px]") : ""} h-full overflow-hidden ${(activeTab === "sala-de-estudos" || activeTab === "pesquisa") ? "px-6 pb-10" : "p-6"} gap-6`}
      >
        {/* CABEÇALHO — oculto na Sala de Estudos: a barra do Omega assume o topo,
                    alinhada à borda superior da sidebar */}
        {!["sala-de-estudos", "pesquisa", "profile", "pesquisas", "projetos", "lounge"].includes(activeTab) && (
          <div className="flex items-end justify-between shrink-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                {tabMeta.title}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                {tabMeta.subtitle}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-8 overflow-hidden h-full">
          {activeTab === "pesquisa" && (
            <div className="flex-1 overflow-hidden">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
              />
              <ResearchShell
                flipped={isChatLeft}
                workType={workType}
                onWorkType={switchWorkType}
                onRelate={handleRelateFiles}
                windows={wWindows}
                activeId={wActiveId}
                onSelectWindow={wSetActiveId}
                addWindow={wAddWindow}
                removeWindow={wRemoveWindow}
                relSummaries={relSummaries}
                processingFileId={processingFileId}
                processingStage={processingStage}
                onPlayFile={handlePlaySavedDoc}
                onAdd={() => fileInputRef.current?.click()}
                sessions={sessions}
                onNewWork={handleNewWork}
                onDeleteWork={handleDeleteWork}
                onOpenSession={() => {
                  setActiveTab("sala-de-estudos");
                }}
                researchWindowContent={
                  <div
                    onClick={() => setActiveSection("doc")}
                    className={`h-full flex flex-col bg-white dark:bg-[#0f172a] overflow-hidden transition-all border-4 ${activeSection === "doc" ? "border-cyan-500 ring-8 ring-cyan-500/10" : "border-transparent"}`}
                  >
                    {/* CABEÇALHO DA FOLHA — só o título (texto). Abas e tipo vivem nos pills, ACIMA da linha. */}
                    <div className="h-14 flex items-center px-8 shrink-0 border-b border-slate-100 dark:border-white/5 bg-transparent">
                      <input
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="Minha Pesquisa"
                        className="bg-transparent text-black dark:text-white text-lg font-black focus:outline-none w-full placeholder:text-slate-300"
                      />
                    </div>

                    {/* ÁREA DE TEXTO DA FOLHA — abaixo da linha, SÓ TEXTO */}
                    <div
                      ref={editorRef}
                      className="relative flex-1 px-8 md:px-12 py-8 overflow-y-auto custom-scrollbar flex flex-col gap-4"
                    >
                      {/* Barrinha sutil: pisca ao soltar uma citação */}
                      {citInsertFlash && (
                        <div
                          className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden z-10"
                          style={{ background: "rgba(120,120,150,0.12)" }}
                        >
                          <div
                            className="h-full rounded-full animate-pulse"
                            style={{
                              width: "100%",
                              background:
                                "linear-gradient(90deg,#8b5cf6,#22d3ee)",
                            }}
                          />
                        </div>
                      )}
                      {!reviewMode && (
                        <textarea
                          ref={textareaRef}
                          value={docContent}
                          onChange={(e) => setDocContent(e.target.value)}
                          onDragOver={(e) => {
                            if (
                              e.dataTransfer.types.includes(
                                "text/zaeon-citation",
                              )
                            ) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "copy";
                            }
                          }}
                          onDrop={handleCitationDrop}
                          style={{
                            fontSize: `${Math.round(17 * editorZoom)}px`,
                          }}
                          className="w-full flex-1 min-h-[400px] resize-none outline-none bg-transparent leading-loose text-black dark:text-white placeholder:text-slate-400 font-serif"
                          placeholder="Sua pesquisa começa aqui..."
                        />
                      )}
                    </div>

                    {/* RODAPÉ DA FOLHA (AÇÕES) */}
                    <div className="p-6 flex justify-between items-center px-10 bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5">
                      {/* Zoom do editor — liquid glass. Ctrl/Cmd + scroll, ou os botões */}
                      <div
                        className="flex items-center gap-1 p-1 rounded-[12px] bg-white/50 dark:bg-black/30 border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        title="Ctrl/Cmd + scroll para dar zoom no texto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditorZoom((z) =>
                              Math.max(0.7, +(z - 0.1).toFixed(2)),
                            );
                          }}
                          className="w-7 h-7 rounded-[9px] text-slate-500 dark:text-white/60 hover:text-cyan-500 hover:bg-cyan-500/10 font-black text-lg leading-none transition-colors"
                        >
                          −
                        </button>
                        <span className="text-[10px] font-black tabular-nums text-slate-500 dark:text-white/60 w-12 text-center">
                          {Math.round(editorZoom * 100)}%
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditorZoom((z) =>
                              Math.min(2.2, +(z + 0.1).toFixed(2)),
                            );
                          }}
                          className="w-7 h-7 rounded-[9px] text-slate-500 dark:text-white/60 hover:text-cyan-500 hover:bg-cyan-500/10 font-black text-lg leading-none transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex gap-3">
                        {/* CONVERSAR COM ESTE DOCUMENTO — chat pelo texto gerado (sem PDF/403). */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!docContent.trim()) {
                              showToast("Escreva algo no documento primeiro.");
                              return;
                            }
                            setActiveFileContext(null);
                            setLiteContext(null);
                            setPdfCache(null);
                            setInternalDoc({ title: docTitle, content: docContent });
                            setPdfChatHistory([
                              {
                                role: "ai",
                                text: `Pode perguntar o que quiser sobre **${docTitle}** — respondo com base no que está escrito aqui.`,
                              },
                            ]);
                            showToast("Conversa aberta — pergunte sobre o documento 💬");
                          }}
                          className="px-6 py-2.5 rounded-full text-[11px] font-black flex items-center gap-2 border-2 border-cyan-500 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 uppercase tracking-widest transition-colors justify-center"
                        >
                          💬 Conversar
                        </button>
                        {/* CRUZAR COM UMA PESQUISA SALVA — relação pelo texto dos dois (sem PDF/403). */}
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setCrossPickerOpen((o) => !o)}
                            className="px-6 py-2.5 rounded-full text-[11px] font-black flex items-center gap-2 border-2 border-violet-500 text-violet-600 dark:text-violet-300 hover:bg-violet-500/10 uppercase tracking-widest transition-colors justify-center"
                          >
                            🔗 Cruzar
                          </button>
                          {crossPickerOpen && (
                            <div className="absolute bottom-full mb-2 left-0 z-20 w-64 max-h-60 overflow-y-auto custom-scrollbar rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl p-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1">
                                Cruzar com pesquisa salva
                              </p>
                              {sessions.length === 0 && (
                                <p className="text-[11px] text-slate-500 px-2 py-2">
                                  Nenhuma pesquisa salva ainda.
                                </p>
                              )}
                              {sessions.map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => handleCrossDocWithSession(s.id, s.title)}
                                  className="w-full text-left px-2 py-2 rounded-lg text-[12px] text-slate-700 dark:text-white/80 hover:bg-violet-500/10 truncate"
                                  title={s.title}
                                >
                                  {s.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* BOTÃO SALVAR QUE ABRE O MODAL */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSaveModalOpen(true);
                          }}
                          className="px-6 py-2.5 rounded-full text-[11px] font-black flex items-center gap-2 border-2 border-black dark:border-white text-black dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 uppercase tracking-widest transition-colors w-[120px] justify-center"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" /> Salvar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPublishOpen(true);
                          }}
                          className="px-8 py-2.5 rounded-full text-[11px] font-black flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest shadow-xl"
                        >
                          Publicar
                        </button>
                      </div>
                    </div>
                  </div>
                }
                documentWindowContent={
                  <div className="h-full flex flex-col bg-white dark:bg-[#0f172a]">
                    <div className="flex items-center justify-end px-4 pt-3 shrink-0">
                      <button
                        onClick={() => setVoiceOn((v) => !v)}
                        title="Aura fala cada nova resposta"
                        className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${voiceOn ? "bg-cyan-600 text-white border-cyan-600" : "text-slate-500 dark:text-white/50 border-slate-300/60 dark:border-white/15 hover:border-cyan-400/50"}`}
                      >
                        {voiceOn
                          ? "🔊 Voz automática: ON"
                          : "🔈 Voz automática: OFF"}
                      </button>
                    </div>
                    <div
                      ref={pdfChatRef}
                      className="flex-1 px-5 py-3 overflow-y-auto space-y-2 custom-scrollbar bg-slate-50 dark:bg-black/50"
                    >
                      {pdfChatHistory.length === 0 && (
                        <span className="text-xs text-black dark:text-white font-medium italic">
                          Nenhum resumo gerado.
                        </span>
                      )}
                      {pdfChatHistory.map((msg, i) => {
                        if (msg.role !== "ai")
                          return (
                            <ChatBubble
                              key={i}
                              role={msg.role}
                              text={msg.text}
                              agentName="Aura"
                              agentImg="/agents/aura.png"
                              userImg={session?.user?.image}
                            />
                          );
                        const parsed = extractCitationBlock(msg.text);
                        const already = savedChatCits.includes(
                          parsed.citation || "",
                        );
                        return (
                          <div key={i}>
                            <ChatBubble
                              role={msg.role}
                              text={parsed.clean || msg.text}
                              agentName="Aura"
                              agentImg="/agents/aura.png"
                              userImg={session?.user?.image}
                            />
                            <button
                              onClick={() =>
                                playVoice(parsed.clean || msg.text, i)
                              }
                              disabled={voiceLoadingId === i}
                              className="ml-12 mb-1 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 hover:underline disabled:opacity-50"
                            >
                              {voiceLoadingId === i ? "🔊 …" : "🔊 ouvir"}
                            </button>
                            {parsed.citation && (
                              <div className="ml-12 mt-1 mb-2 p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300/60 dark:border-cyan-400/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300 mb-1">
                                  ✦ Citação sugerida
                                </p>
                                <p className="text-[12px] italic text-slate-700 dark:text-white/80 leading-snug">
                                  {parsed.citation}
                                </p>
                                <button
                                  onClick={() =>
                                    saveChatCitation(parsed.citation!)
                                  }
                                  disabled={already}
                                  className={`mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full text-white transition-colors ${already ? "bg-emerald-600" : "bg-cyan-600 hover:bg-cyan-500"}`}
                                >
                                  {already
                                    ? "Salva ✓"
                                    : "Salvar na aba Citações"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isPdfTyping && (
                        <div className="text-[10px] font-bold animate-pulse text-cyan-600 ml-12">
                          Aura está a analisar...
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-white/10 shrink-0">
                      <ChatInput
                        value={pdfPrompt}
                        onChange={setPdfPrompt}
                        onSend={handlePdfQuestion}
                        isTyping={isPdfTyping}
                        placeholder={internalDoc ? "Pergunte sobre este documento..." : "Pergunte ao PDF..."}
                      />
                    </div>
                  </div>
                }
              />
            </div>
          )}

          {/* Sempre montado (escondido fora da aba) — preserva a pesquisa do Omega
                        em andamento ao trocar de aba (não reseta o stream/estado). */}
          <div
            className={`w-full h-full overflow-hidden ${activeTab === "sala-de-estudos" ? "" : "hidden"}`}
          >
            <StudyRoomContent flushTop />
          </div>

          {activeTab === "pesquisas" && (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              <ResearchesPage />
            </div>
          )}

          {activeTab === "lounge" && (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              {isTeacher ? <TeacherLoungeContent /> : <StudentLoungeContent />}
            </div>
          )}

          {activeTab === "pevem" && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
              <div className="w-20 h-20 rounded-[28px] bg-orange-500/10 flex items-center justify-center">
                <RocketLaunchIcon className="w-10 h-10 text-orange-500" />
              </div>
              <div className="text-center max-w-sm">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2">
                  Pevem News
                </h2>
                <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed">
                  Esta seção estará disponível em breve. Aqui você receberá
                  notificações e atualizações do sistema Pevem integrado à
                  Zaeon.
                </p>
              </div>
              <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.3em] border border-orange-500/30 px-4 py-2 rounded-full bg-orange-500/5">
                Em Desenvolvimento
              </span>
            </div>
          )}

          {activeTab === "projetos" && (
            <div className="w-full h-full overflow-hidden">
              <ProjectsContent />
            </div>
          )}

          {activeTab === "news" && (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              <NewsPanel className="pb-24" />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="w-full h-full overflow-hidden">
              <EditableProfile />
            </div>
          )}
        </div>
      </main>

      {/* MODALS - CONFIRMAR PREVIEW PDF */}
      <AnimatePresence>
        {pendingUpload && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingUpload(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#0a0a0a] rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                <div>
                  <h3 className="text-lg font-black text-black dark:text-white">
                    Previsão do Documento
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    {pendingUpload.name}
                  </p>
                </div>
                <button
                  onClick={() => setPendingUpload(null)}
                  className="p-2 bg-slate-200 dark:bg-white/10 rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-black dark:text-white" />
                </button>
              </div>
              <div className="flex-1 bg-slate-200 dark:bg-black/50 p-4 overflow-hidden">
                <iframe
                  src={URL.createObjectURL(pendingUpload)}
                  className="w-full h-full rounded-xl border border-slate-300 dark:border-white/10"
                />
              </div>
              <div className="p-6 bg-white dark:bg-[#0a0a0a] border-t border-slate-100 dark:border-white/5 flex justify-end gap-4">
                <button
                  onClick={() => setPendingUpload(null)}
                  className="px-6 py-3 rounded-full text-xs font-black border-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmUpload}
                  className="px-8 py-3 rounded-full text-xs font-black bg-black dark:bg-white text-white dark:text-black hover:scale-105 uppercase tracking-widest shadow-xl transition-all"
                >
                  Confirmar Upload
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL — SALVAR & EXPORTAR ABNT */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isExporting) {
                  setIsSaveModalOpen(false);
                  setAbntStep(1);
                  setAbntWarnings([]);
                }
              }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 32 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-white/10 text-left"
            >
              {!isExporting && (
                <button
                  onClick={() => {
                    setIsSaveModalOpen(false);
                    setAbntStep(1);
                    setAbntWarnings([]);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}

              {/* ── PROCESSANDO ── */}
              {isExporting && (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="relative w-12 h-12">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-[2px] h-[10px] bg-cyan-500 rounded-full"
                        style={{
                          left: "50%",
                          top: "20%",
                          transformOrigin: "50% 200%",
                          rotate: i * 45,
                        }}
                        animate={{ opacity: [0.1, 1, 0.1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.8,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                  <div className="w-full flex flex-col gap-2">
                    {exportProgress.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                        {step}
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest animate-pulse">
                    Aguarde — formatando conforme ABNT NBR 14724:2011...
                  </p>
                </div>
              )}

              {/* ── PASSO 1: METADADOS ── */}
              {!isExporting && abntStep === 1 && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500">
                        Passo 1 de 2
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-black dark:text-white">
                      Exportar com ABNT
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                      Preencha os metadados do trabalho
                    </p>
                  </div>

                  {/* Warnings de sessões anteriores */}
                  {abntWarnings.length > 0 && (
                    <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30">
                      {abntWarnings.map((w, i) => (
                        <p
                          key={i}
                          className="text-[10px] text-amber-700 dark:text-amber-400 font-bold"
                        >
                          ⚠ {w}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                        Instituição *
                      </label>
                      <input
                        value={abntMeta.institution}
                        onChange={(e) =>
                          setAbntMeta((prev) => ({
                            ...prev,
                            institution: e.target.value,
                          }))
                        }
                        placeholder="Universidade Federal..."
                        className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-black dark:text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                      />
                    </div>

                    {workType === "TCC" && (
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Orientador(a)
                        </label>
                        <input
                          value={abntMeta.advisor}
                          onChange={(e) =>
                            setAbntMeta((prev) => ({
                              ...prev,
                              advisor: e.target.value,
                            }))
                          }
                          placeholder="Prof. Dr. Nome Sobrenome"
                          className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-black dark:text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                        />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Cidade *
                        </label>
                        <input
                          value={abntMeta.city}
                          onChange={(e) =>
                            setAbntMeta((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                          placeholder="São Paulo"
                          className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-black dark:text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Ano *
                        </label>
                        <input
                          value={abntMeta.year}
                          onChange={(e) =>
                            setAbntMeta((prev) => ({
                              ...prev,
                              year: e.target.value,
                            }))
                          }
                          placeholder="2026"
                          maxLength={4}
                          className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-black dark:text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                        Fonte
                      </label>
                      <div className="flex gap-2">
                        {(["Times New Roman", "Arial"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() =>
                              setAbntMeta((prev) => ({
                                ...prev,
                                fontChoice: f,
                              }))
                            }
                            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black border-2 transition-all ${abntMeta.fontChoice === f ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400" : "border-slate-200 dark:border-white/10 text-slate-500"}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Salvar na nuvem — mantém funcionalidade original */}
                    <div className="pt-1 border-t border-slate-100 dark:border-white/5">
                      <button
                        onClick={async (e) => {
                          setIsSaveModalOpen(false);
                          await handleSaveWorkspace(e);
                        }}
                        className="w-full py-3 px-4 rounded-2xl text-[11px] font-black border-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-cyan-500 hover:text-cyan-500 flex items-center gap-3 transition-all"
                      >
                        <CloudArrowUpIcon className="w-5 h-5 text-cyan-500 shrink-0" />
                        Salvar na Nuvem (sem formatação ABNT)
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setAbntStep(2)}
                      disabled={
                        !abntMeta.institution.trim() ||
                        !abntMeta.city.trim() ||
                        !abntMeta.year.trim()
                      }
                      className="px-8 py-3 rounded-full text-[11px] font-black bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white uppercase tracking-widest shadow-xl transition-all flex items-center gap-2"
                    >
                      Próximo → Formato
                    </button>
                  </div>
                </>
              )}

              {/* ── PASSO 2: ESCOLHA DO FORMATO ── */}
              {!isExporting && abntStep === 2 && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => setAbntStep(1)}
                        className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-cyan-500 transition-colors"
                      >
                        ← Voltar
                      </button>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500">
                        Passo 2 de 2
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-black dark:text-white">
                      Escolha o formato
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">
                      O documento será formatado automaticamente pela IA com
                      todas as regras ABNT NBR 14724:2011.
                    </p>
                  </div>

                  {/* Resumo dos metadados */}
                  <div className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] text-slate-500 space-y-0.5">
                    <p>
                      <span className="font-black text-black dark:text-white">
                        Instituição:
                      </span>{" "}
                      {abntMeta.institution}
                    </p>
                    {abntMeta.advisor && (
                      <p>
                        <span className="font-black text-black dark:text-white">
                          Orientador:
                        </span>{" "}
                        {abntMeta.advisor}
                      </p>
                    )}
                    <p>
                      <span className="font-black text-black dark:text-white">
                        Local/Ano:
                      </span>{" "}
                      {abntMeta.city}, {abntMeta.year}
                    </p>
                    <p>
                      <span className="font-black text-black dark:text-white">
                        Fonte:
                      </span>{" "}
                      {abntMeta.fontChoice} 12pt
                    </p>
                    <p>
                      <span className="font-black text-black dark:text-white">
                        Citações:
                      </span>{" "}
                      {citationNotes.length} referência(s) salva(s)
                    </p>
                  </div>

                  <div
                    className="flex flex-col gap-3"
                    data-tour="save-research"
                  >
                    <button
                      onClick={() => handleABNTExport("pdf")}
                      className="w-full py-5 px-5 rounded-2xl text-xs font-black border-2 border-slate-200 dark:border-white/20 text-black dark:text-white hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-4 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <DocumentTextIcon className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="font-black text-sm text-black dark:text-white">
                          PDF — ABNT
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal normal-case mt-0.5">
                          Download em PDF com formatação acadêmica completa
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleABNTExport("docx")}
                      className="w-full py-5 px-5 rounded-2xl text-xs font-black border-2 border-slate-200 dark:border-white/20 text-black dark:text-white hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-4 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-black text-sm text-black dark:text-white">
                          Word (.docx) — ABNT
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal normal-case mt-0.5">
                          Download editável com todas as normas aplicadas
                        </div>
                      </div>
                    </button>
                  </div>

                  <p className="mt-4 text-[9px] text-slate-400 text-center leading-relaxed">
                    A IA irá estruturar, revisar e formatar seu texto.
                    <br />
                    Margens 3/2/3/2cm · {abntMeta.fontChoice} 12pt · Entrelinha
                    1,5
                  </p>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALS - PUBLICAR NO MURAL */}
      <AnimatePresence>
        {isPublishOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPublishOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-white/10 text-left"
            >
              <button
                onClick={() => setIsPublishOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-black text-black dark:text-white mb-2">
                Publicar no Mural
              </h3>
              <p className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-wider">
                Escolha a visibilidade da publicação:
              </p>

              <div className="flex flex-col gap-3">
                {/* Opção Público */}
                <button
                  onClick={() => handlePublishToMural("public")}
                  className="w-full py-4 px-5 rounded-2xl text-xs font-black border-2 border-slate-200 dark:border-white/20 text-black dark:text-white hover:border-cyan-500 hover:text-cyan-500 flex items-center gap-4 transition-all text-left uppercase tracking-wider"
                >
                  <GlobeAltIcon className="w-6 h-6 text-cyan-500 shrink-0" />
                  <div>
                    <div className="font-black text-sm">Público</div>
                    <div className="text-[10px] text-slate-500 normal-case font-normal font-sans">
                      Aparece no Mural de todos. Permite likes e comentários.
                    </div>
                  </div>
                </button>

                {/* Opção Privado */}
                <button
                  onClick={() => handlePublishToMural("private")}
                  className="w-full py-4 px-5 rounded-2xl text-xs font-black border-2 border-slate-200 dark:border-white/20 text-black dark:text-white hover:border-purple-500 hover:text-purple-500 flex items-center gap-4 transition-all text-left uppercase tracking-wider"
                >
                  <LockClosedIcon className="w-6 h-6 text-purple-500 shrink-0" />
                  <div>
                    <div className="font-black text-sm">Privado</div>
                    <div className="text-[10px] text-slate-500 normal-case font-normal font-sans">
                      Fica visível apenas para você no seu Mural feed.
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive onboarding tour for first-time users */}
      {showTour && <ResearchRoomTour onComplete={() => setShowTour(false)} />}
      {/* Tour guiado da Zaeon (golden path) */}
      <OnboardingGuide />
    </div>
  );
}
