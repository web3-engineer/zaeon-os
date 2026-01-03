"use client";

import { motion } from "framer-motion";
import { BookOpenIcon, BeakerIcon } from "@heroicons/react/24/outline";
import MatrixRain from "@/components/main/star-background";

export default function HomeworkPage() {
    return (
        <div className="relative w-full h-screen bg-[#050014] overflow-hidden flex flex-col items-center justify-center">
            <MatrixRain />

            <div className="z-20 w-full max-w-4xl px-4 flex flex-col items-center text-center">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/50 text-purple-300 text-sm font-bold uppercase tracking-widest mb-6">
                        <BookOpenIcon className="w-5 h-5" />
                        Student Mode Active
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                        Homework <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Session</span>
                    </h1>

                    <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Welcome to your dedicated study space. Here you can review past sessions,
                        generate summaries from books, and prepare for exams using the Zaeon Neural Network.
                    </p>
                </motion.div>

                {/* Placeholder cards for future features */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
                >
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Review Notes</h3>
                        <p className="text-white/40 text-sm">Access your saved chat history and generated documents.</p>
                    </div>

                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all cursor-pointer group">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Quiz Mode</h3>
                        <p className="text-white/40 text-sm">Generate practice questions based on your research topics.</p>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}