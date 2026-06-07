"use client";

import React, { useState, useRef, useEffect } from 'react';
// FIXED: Added 'MoreHorizontal' back to the imports
import { CheckCircle, TrendingUp, User, Sparkles, BrainCircuit, AlertTriangle, ChevronDown, Award, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
type Question = {
  id: number;
  type: 'choice' | 'input';
  question: string;
  options?: string[]; // Only for 'choice'
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

type ExamResult = {
  id: number;
  subject: string;
  grade: string;
  score: number;
  date: string;
  color: string;
  teacher: string;
  comment: string;
};

// --- MOCK FALLBACK ---
const FALLBACK_QUESTIONS: Question[] = [
    { id: 1, type: 'choice', difficulty: 'easy', question: "What is the standard tuning of a guitar?", options: ["EADGBE", "DADGAD", "DGCFAD", "EBGDAE"], correctAnswer: "EADGBE" },
    { id: 2, type: 'input', difficulty: 'medium', question: "How many tones are in a standard major chord?", correctAnswer: "3" },
];

export default function ExamsModule() {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- STATES ---
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  const [isExamActive, setIsExamActive] = useState(false);
  const [loadingExam, setLoadingExam] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [currentDifficulty, setCurrentDifficulty] = useState<'normal' | 'hard'>('normal');
  
  // Exam Execution States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [inputValue, setInputValue] = useState("");
  
  // Finish Screen State
  const [showFinishScreen, setShowFinishScreen] = useState(false);
  const [lastExamResult, setLastExamResult] = useState<ExamResult | null>(null);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedHistory = localStorage.getItem('zaeon_exam_history');
        if (savedHistory) setExamHistory(JSON.parse(savedHistory));

        const scheduleData = localStorage.getItem('zaeon_schedule_data');
        if (scheduleData) {
            const parsed = JSON.parse(scheduleData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const topics = Array.from(new Set(parsed.map((c: any) => c.name)));
                setAvailableTopics(topics as string[]);
                if (topics.length > 0) setSelectedTopic(topics[0] as string);
            }
        }
    }
  }, []);

  // --- 2. GENERATE EXAM (AI CONNECTION) ---
  const handleStartExam = async (difficultyOverride?: 'normal' | 'hard') => {
    setLoadingExam(true);
    const difficulty = difficultyOverride || 'normal';
    const numQuestions = 25; 

    const topicToUse = selectedTopic || "General Logic";

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Generate a JSON array of ${numQuestions} exam questions about: "${topicToUse}". 
                Difficulty Level: ${difficulty}.
                Mix 'choice' (multiple choice 4 options) and 'input' (short answer) types. 
                Structure: [{ "id": number, "type": "choice"|"input", "question": string, "options": string[], "correctAnswer": string, "difficulty": "easy"|"medium"|"hard" }]. 
                Return ONLY raw JSON.`,
                agent: "exam_generator", 
                systemContext: `Subject: ${topicToUse}`
            })
        });

        const data = await response.json();
        let cleanJson = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const arrayStart = cleanJson.indexOf('[');
        const arrayEnd = cleanJson.lastIndexOf(']');
        if (arrayStart !== -1 && arrayEnd !== -1) {
            cleanJson = cleanJson.substring(arrayStart, arrayEnd + 1);
        }

        const generatedQs = JSON.parse(cleanJson);

        if (Array.isArray(generatedQs) && generatedQs.length > 0) {
            setQuestions(generatedQs);
        } else {
            setQuestions(FALLBACK_QUESTIONS);
        }

    } catch (e) {
        console.error("AI Generation Failed", e);
        setQuestions(FALLBACK_QUESTIONS);
    } finally {
        setLoadingExam(false);
        setIsExamActive(true);
        setShowFinishScreen(false);
        setCurrentQIndex(0);
        setUserScore(0);
        setAnswerStatus('idle');
        setInputValue("");
        setCurrentDifficulty(difficulty);
    }
  };

  // --- 3. ANSWER LOGIC ---
  const handleAnswer = (answer: string) => {
    if (answerStatus !== 'idle') return; 

    const currentQ = questions[currentQIndex];
    if (!currentQ) return;

    const normalize = (s: string) => s.toLowerCase().replace(/\s/g, '').replace(/,/g, '');
    const isCorrect = normalize(answer) === normalize(currentQ.correctAnswer);

    if (isCorrect) {
        setAnswerStatus('correct');
        setUserScore(prev => prev + 1);
    } else {
        setAnswerStatus('wrong');
    }

    setTimeout(() => {
        setAnswerStatus('idle');
        setInputValue("");
        
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
        } else {
            finishExam();
        }
    }, 1200); 
  };

  // --- 4. FINISH & RANKING LOGIC ---
  const finishExam = () => {
    const totalQ = questions.length || 1;
    const finalScore = Math.round((userScore / totalQ) * 100);
    
    let grade = "F";
    let comment = "You need to study more.";
    let color = "from-red-500 to-orange-500";

    if (finalScore === 100) { grade = "SS"; comment = "Absolute Perfection. Master Class."; color = "from-cyan-400 to-blue-600"; }
    else if (finalScore >= 95) { grade = "S"; comment = "Superior Performance."; color = "from-purple-400 to-pink-600"; }
    else if (finalScore >= 90) { grade = "A+"; comment = "Excellent mastery."; color = "from-emerald-400 to-green-500"; }
    else if (finalScore >= 80) { grade = "A"; comment = "Great job."; color = "from-blue-400 to-indigo-500"; }
    else if (finalScore >= 70) { grade = "B"; comment = "Good, but room for improvement."; color = "from-amber-400 to-orange-500"; }
    else if (finalScore >= 60) { grade = "C"; comment = "Passed."; color = "from-yellow-500 to-orange-600"; }

    const newResult: ExamResult = {
        id: Date.now(),
        subject: selectedTopic || "General Assessment", 
        grade,
        score: finalScore,
        date: new Date().toLocaleDateString("en-US", { month: 'short', day: 'numeric' }),
        color,
        teacher: "AI Proctor",
        comment
    };

    const updatedHistory = [newResult, ...examHistory];
    setExamHistory(updatedHistory);
    localStorage.setItem('zaeon_exam_history', JSON.stringify(updatedHistory));
    
    setLastExamResult(newResult);
    setIsExamActive(false);
    setShowFinishScreen(true);
  };

  return (
    <div className="relative w-full flex flex-col gap-8 p-4 font-sans text-slate-200">
      
      <AnimatePresence mode="wait">
        
        {/* STATE 1: DASHBOARD / START EXAM */}
        {!isExamActive && !showFinishScreen && (
            <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2.5rem] blur-2xl opacity-50 pointer-events-none"></div>
                <div className="relative w-full min-h-[340px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col lg:flex-row gap-8 overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_20px_40px_-20px_rgba(0,0,0,0.7)]">
                    
                    <div className="flex-1 flex flex-col justify-between z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                                    Adaptive System
                                </span>
                                <span className="text-[10px] text-white/40 font-mono">Q: 25</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white leading-tight mb-4 drop-shadow-md">
                                Knowledge Check
                            </h2>
                            
                            {/* TOPIC SELECTOR */}
                            <div className="mb-6">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 block">
                                    Select Topic from Agenda
                                </label>
                                <div className="relative w-full max-w-xs">
                                    <select 
                                        value={selectedTopic}
                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                        className="w-full bg-[#0a0a0a]/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:border-cyan-500 outline-none"
                                    >
                                        <option value="" disabled>Select a subject...</option>
                                        {availableTopics.length > 0 ? (
                                            availableTopics.map((topic, i) => (
                                                <option key={i} value={topic}>{topic}</option>
                                            ))
                                        ) : (
                                            <option value="General">General Knowledge (No Agenda Data)</option>
                                        )}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                                </div>
                            </div>

                            <p className="text-sm text-white/60 max-w-md leading-relaxed">
                                This exam consists of 25 dynamic questions generated based on your selected topic. 
                                Completing this unlocks higher difficulty tiers.
                            </p>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <button 
                                onClick={() => handleStartExam('normal')}
                                disabled={loadingExam || (!selectedTopic && availableTopics.length > 0)}
                                className="group relative px-8 py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {loadingExam ? <Sparkles className="animate-spin w-4 h-4"/> : <BrainCircuit className="w-4 h-4" />}
                                    {loadingExam ? "Generating..." : "Start Assessment"}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}

        {/* STATE 2: ACTIVE EXAM INTERFACE */}
        {isExamActive && (
            <motion.div 
                key="exam"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full relative"
            >
                {/* Visual Feedback GLOW */}
                <motion.div 
                    animate={{ 
                        opacity: answerStatus !== 'idle' ? 0.4 : 0,
                        backgroundColor: answerStatus === 'correct' ? '#10b981' : answerStatus === 'wrong' ? '#ef4444' : 'transparent'
                    }}
                    className="absolute inset-0 rounded-[2.5rem] blur-3xl transition-colors duration-300"
                />

                <div className="relative w-full min-h-[400px] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
                    
                    <div className="absolute top-8 left-8 right-8 flex justify-between items-center text-white/40 text-[10px] font-bold uppercase tracking-widest">
                        <span>Q {currentQIndex + 1} / {questions.length}</span>
                        <span>Diff: {currentDifficulty.toUpperCase()}</span>
                    </div>

                    <motion.div 
                        animate={answerStatus === 'wrong' ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        className="w-full max-w-2xl text-center z-10"
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 leading-tight">
                            {questions[currentQIndex]?.question}
                        </h2>

                        {questions[currentQIndex]?.type === 'choice' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {questions[currentQIndex]?.options?.map((opt, idx) => {
                                    let btnColor = "bg-white/5 border-white/10 hover:bg-white/10";
                                    if (answerStatus === 'correct' && opt === questions[currentQIndex].correctAnswer) btnColor = "bg-green-500/20 border-green-500 text-green-400";
                                    if (answerStatus === 'wrong' && opt === questions[currentQIndex].correctAnswer) btnColor = "bg-green-500/20 border-green-500 text-green-400"; 
                                    if (answerStatus === 'wrong' && opt !== questions[currentQIndex].correctAnswer) btnColor = "opacity-30"; 

                                    return (
                                        <button
                                            key={idx}
                                            disabled={answerStatus !== 'idle'}
                                            onClick={() => handleAnswer(opt)}
                                            className={`p-6 rounded-2xl border text-left transition-all duration-300 ${btnColor}`}
                                        >
                                            <span className="text-sm font-medium text-white/90">{opt}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <input 
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={answerStatus !== 'idle'}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAnswer(inputValue)}
                                    placeholder="Type your answer..."
                                    className={`w-full max-w-md bg-transparent border-b-2 text-center text-xl p-2 outline-none transition-colors 
                                        ${answerStatus === 'idle' ? 'border-white/20 text-white focus:border-cyan-500' : 
                                          answerStatus === 'correct' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}
                                />
                                {answerStatus === 'idle' && (
                                    <button 
                                        onClick={() => handleAnswer(inputValue)}
                                        className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white mt-4"
                                    >
                                        Press Enter to Submit
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        )}

        {/* STATE 3: FINISH SCREEN & PROGRESSION */}
        {showFinishScreen && lastExamResult && (
            <motion.div 
                key="finish"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full relative"
            >
                <div className="relative w-full min-h-[400px] bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-b ${lastExamResult.color} opacity-10 pointer-events-none`}></div>
                    
                    <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center mb-6 bg-black">
                        <span className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br ${lastExamResult.color}`}>
                            {lastExamResult.grade}
                        </span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Assessment Complete</h2>
                    <p className="text-white/60 max-w-md mb-8">{lastExamResult.comment}</p>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowFinishScreen(false)}
                            className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 text-xs font-bold uppercase tracking-widest"
                        >
                            Return to Hub
                        </button>
                        
                        {lastExamResult.score >= 60 && (
                            <button 
                                onClick={() => handleStartExam('hard')}
                                className="px-6 py-3 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                            >
                                Start Harder Exam
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        )}

      </AnimatePresence>

      {/* --- SECTION 2: HISTORY --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <TrendingUp size={16} className="text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Performance History</h3>
        </div>

        {examHistory.length === 0 ? (
            <div className="text-center py-12 text-white/20 text-sm">No exam history yet. Start a test!</div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {examHistory.map((exam, index) => (
                    <motion.div 
                        key={exam.id}
                        layout 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                        className="group relative w-full bg-[#0a0a0a]/80 backdrop-blur-xl hover:bg-[#0a0a0a] border border-white/5 hover:border-white/10 rounded-[2rem] p-6 transition-all duration-300 flex flex-col md:flex-row gap-6 items-center shadow-lg"
                    >
                        <div className="flex items-center gap-6 w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/5 pb-4 md:pb-0 md:pr-4">
                            <div className="relative">
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${exam.color} blur-xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                                <div className="relative w-16 h-16 rounded-full bg-[#111] border border-white/10 flex items-center justify-center z-10">
                                    <span className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br ${exam.color}`}>
                                        {exam.grade}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <h4 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">{exam.subject}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-mono text-white/40">{exam.date}</span>
                                    <div className="h-1 w-1 rounded-full bg-white/20"></div>
                                    <span className="text-[10px] font-bold text-white/60">Score: {exam.score}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 w-full flex gap-4 items-start relative">
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                    <User size={18} className="text-white/50" />
                                </div>
                                <span className="text-[9px] font-bold text-white/30 text-center w-12 truncate">{exam.teacher}</span>
                            </div>

                            <div className="relative flex-1">
                                <div className="absolute top-3 -left-1.5 w-3 h-3 bg-white/5 border-l border-b border-white/10 transform rotate-45"></div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Award size={10} className="text-yellow-500/80" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Evaluation</span>
                                    </div>
                                    <p className="text-xs text-white/80 leading-relaxed font-medium">
                                        &quot;{exam.comment}&quot;
                                    </p>
                                </div>
                            </div>
                        </div>

                        <MoreHorizontal className="absolute top-6 right-6 text-white/10 group-hover:text-white/40 cursor-pointer transition-colors" size={20} />
                    </motion.div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}