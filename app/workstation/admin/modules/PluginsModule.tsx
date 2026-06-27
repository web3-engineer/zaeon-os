import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, TrashIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";

interface PluginData {
    id: string; name: string; author: string; description: string;
    category: "Essencial" | "Agentes" | "Mentorias";
    tag: string; imageUrl: string; price: number; actionUrl: string; status: string;
    isLocked: boolean; unlockRequirement: string;
}

export default function PluginsModule({ glassPanel }: { glassPanel: string }) {
    const [pluginList, setPluginList] = useState<PluginData[]>([]);
    const [currentPlugin, setCurrentPlugin] = useState<PluginData>({
        id: '', name: '', author: 'Zaeon Core', description: '',
        category: 'Essencial', tag: '', imageUrl: '', price: 0, actionUrl: '', status: 'active',
        isLocked: false, unlockRequirement: ''
    });

    const fetchPlugins = async () => { const res = await fetch('/api/plugins'); if (res.ok) setPluginList(await res.json()); };
    useEffect(() => { fetchPlugins(); }, []);

    const handleDeletePlugin = async (id: string) => {
        if (!confirm("🚨 Tem certeza? Este plugin será deletado permanentemente da loja para todos os usuários.")) return;
        try {
            const res = await fetch(`/api/plugins?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("🗑️ Módulo removido com sucesso.");
                fetchPlugins(); 
                if (currentPlugin.id === id) {
                    setCurrentPlugin({ id: '', name: '', author: 'Zaeon Core', description: '', category: 'Essencial', tag: '', imageUrl: '', price: 0, actionUrl: '', status: 'active', isLocked: false, unlockRequirement: '' });
                }
            } else { alert("❌ Erro ao deletar módulo."); }
        } catch (e) { alert("❌ Erro de conexão com o banco."); }
    };

    const handleSavePlugin = async () => {
        const payload = { ...currentPlugin };
        if (!payload.id) delete (payload as any).id;
        const res = await fetch('/api/plugins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) { alert("🛠 Plugin publicado."); fetchPlugins(); }
    };

    return (
        <div className="flex-1 flex gap-8 overflow-hidden w-full h-full">
            <div className={`w-[320px] rounded-[45px] flex flex-col overflow-hidden ${glassPanel}`}>
                <div className="p-8 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-black/20">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Plugins</h2>
                    <button onClick={() => setCurrentPlugin({ id: '', name: '', author: 'Zaeon Core', description: '', category: 'Essencial', tag: '', imageUrl: '', price: 0, actionUrl: '', status: 'active', isLocked: false, unlockRequirement: '' })} className="p-2 bg-slate-900 dark:bg-cyan-500 text-white dark:text-black rounded-full hover:scale-110 shadow-lg transition-transform">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {pluginList.map((p) => (
                        <div key={p.id} onClick={() => setCurrentPlugin(p)} className={`p-5 rounded-3xl cursor-pointer transition-all border group relative ${currentPlugin.id === p.id ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/20' : 'bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white pr-6">{p.name}</h4>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{p.category} {p.isLocked && "🔒"}</p>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeletePlugin(p.id); }} 
                                    className="absolute right-4 top-4 p-1.5 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={`flex-1 rounded-[45px] flex flex-col relative overflow-hidden ${glassPanel}`}>
                <div className="absolute top-8 right-8 z-20">
                    <button onClick={handleSavePlugin} className="px-8 py-3 rounded-2xl bg-slate-950 dark:bg-cyan-500 text-white dark:text-black font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all">
                        <RocketLaunchIcon className="w-5 h-5" /> Publicar plugin
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-12 pt-24 custom-scrollbar">
                    <div className="max-w-2xl mx-auto space-y-10">
                        <input type="text" placeholder="Nome do plugin..." className="w-full bg-transparent text-5xl font-black outline-none border-none placeholder:text-slate-200 dark:placeholder:text-white/10" value={currentPlugin.name} onChange={(e) => setCurrentPlugin({...currentPlugin, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-8">
                            <select className="w-full bg-slate-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold text-sm" value={currentPlugin.category} onChange={(e) => setCurrentPlugin({...currentPlugin, category: e.target.value as any})}><option value="Essencial">Essencial</option><option value="Agentes">Agentes</option><option value="Mentorias">Mentorias</option></select>
                            <div className="flex items-center gap-4 bg-slate-100 dark:bg-white/5 p-4 rounded-2xl">
                                <input type="checkbox" checked={currentPlugin.isLocked} onChange={(e) => setCurrentPlugin({...currentPlugin, isLocked: e.target.checked})} className="w-5 h-5 accent-cyan-500" />
                                <span className="text-[10px] font-black uppercase text-slate-400">Bloquear plugin</span>
                            </div>
                        </div>

                        {/* Imagem do plugin (URL) + prévia — sincroniza com o card da loja */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-cyan-600">Imagem (URL da capa)</label>
                            <div className="flex items-center gap-4">
                                <input type="text" placeholder="https://… (capa do plugin)" className="flex-1 bg-slate-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold text-sm" value={currentPlugin.imageUrl} onChange={(e) => setCurrentPlugin({...currentPlugin, imageUrl: e.target.value})} />
                                {currentPlugin.imageUrl
                                    ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={currentPlugin.imageUrl} alt="prévia" className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-white/10 shrink-0" />)
                                    : <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 shrink-0" />}
                            </div>
                        </div>
                        <AnimatePresence>
                            {currentPlugin.isLocked && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-cyan-600">Mensagem de bloqueio</label>
                                    <input type="text" placeholder="Ex: Nível 5 necessário ou Badge Alpha" className="w-full bg-slate-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold text-sm border border-cyan-500/30" value={currentPlugin.unlockRequirement} onChange={(e) => setCurrentPlugin({...currentPlugin, unlockRequirement: e.target.value})} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <textarea placeholder="Descrição detalhada..." className="w-full h-40 bg-slate-100 dark:bg-white/5 p-6 rounded-[30px] outline-none text-sm leading-relaxed" value={currentPlugin.description} onChange={(e) => setCurrentPlugin({...currentPlugin, description: e.target.value})} />
                    </div>
                </div>
            </div>
        </div>
    );
}