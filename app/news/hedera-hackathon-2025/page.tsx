"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import NextImage from "next/image";
import {
    ArrowLeftIcon,
    GlobeAltIcon,
    CodeBracketIcon,
    CpuChipIcon,
    LanguageIcon,
    ClockIcon,
    PlayCircleIcon,
    FireIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    LightBulbIcon,
    BoltIcon,
    BugAntIcon,
    DocumentCheckIcon,
    TrophyIcon
} from "@heroicons/react/24/outline";

// ============================================================================
// COMPONENTES DE UI (LIQUID GLASS DESIGN SYSTEM)
// ============================================================================

// --- Bloco de Imagem com Vidro Líquido ---
function StoryImage({ src, alt, caption }: { src: string, alt: string, caption: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
            className="my-20 w-full relative group"
        >
            <div className="w-full aspect-video md:aspect-[21/9] relative rounded-[2.5rem] overflow-hidden backdrop-blur-2xl bg-white/5 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-2">
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-slate-800/50">
                    {src ? (
                        <NextImage src={src} alt={alt} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                            <GlobeAltIcon className="w-8 h-8 mb-3 opacity-50" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Insira o link da imagem aqui</span>
                        </div>
                    )}
                </div>
            </div>
            {caption && (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium mt-6 px-8 leading-relaxed">
                    {caption}
                </p>
            )}
        </motion.div>
    );
}

// --- Bloco de Vídeo do YouTube (Novo Componente) ---
function YouTubeEmbed({ videoId, caption }: { videoId: string, caption: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }}
            className="my-20 w-full relative"
        >
            <div className="w-full aspect-video relative rounded-[2.5rem] overflow-hidden backdrop-blur-3xl bg-white/10 dark:bg-black/20 border border-white/30 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] p-2">
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-slate-900 group">
                    {videoId ? (
                        <iframe
                            className="w-full h-full absolute inset-0"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                            <PlayCircleIcon className="w-12 h-12 mb-3 opacity-50" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Insira o ID do Vídeo (Ex: dQw4w9WgXcQ)</span>
                        </div>
                    )}
                </div>
            </div>
            {caption && (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium mt-6 px-8 italic">
                    {caption}
                </p>
            )}
        </motion.div>
    );
}

// --- Componente de Semana (Design Padronizado para a Narrativa) ---
function WeekSection({ weekNum, title, icon: Icon, children }: { weekNum: number, title: string, icon: any, children: React.ReactNode }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} className="mb-16">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl backdrop-blur-xl bg-cyan-500/10 dark:bg-cyan-500/5 border border-cyan-500/20 flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-[11px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-widest leading-none mb-0.5">Sem</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold text-lg leading-none">{weekNum}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-3">
                    {title}
                </h2>
            </div>
            <div className="pl-4 md:pl-16 space-y-6">
                {children}
            </div>
        </motion.div>
    );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================
export default function HederaHackathonFeature() {
    const { scrollYProgress } = useScroll();
    const yHeader = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const opacityHeader = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] text-slate-800 dark:text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden font-sans">

            {/* Barra de Progresso Apple Style */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 origin-left z-50 backdrop-blur-md"
                style={{ scaleX: scrollYProgress }}
            />

            {/* HEADER LIQUID GLASS */}
            <div className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
                <motion.div style={{ y: yHeader, opacity: opacityHeader }} className="absolute inset-0 z-0">
                    {/* #870: a foto do Unsplash não existe mais (404) — no lugar, um fundo em degradê nas cores da notícia */}
                    <div aria-hidden className="absolute inset-0 opacity-40 dark:opacity-30 bg-[radial-gradient(ellipse_at_30%_20%,#6366f1_0%,transparent_55%),radial-gradient(ellipse_at_75%_60%,#a855f7_0%,transparent_50%),radial-gradient(ellipse_at_50%_100%,#22d3ee_0%,transparent_45%)]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f8fafc]/60 to-[#f8fafc] dark:via-[#020617]/60 dark:to-[#020617]" />
                </motion.div>

                <div className="relative z-10 w-full max-w-5xl mx-auto px-6 mt-20">
                    <div className="backdrop-blur-[40px] bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] rounded-[3rem] p-10 md:p-20 text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-[0.2em] mb-8"
                        >
                            <CpuChipIcon className="w-4 h-4" />
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-4xl md:text-6xl lg:text-7xl font-semibold text-slate-900 dark:text-white leading-[1.05] tracking-tight mb-8"
                        >
                            A Batalha do Milhão:<br className="hidden md:block" /> O Colosso de Hedera
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-4xl mx-auto"
                        >
                            Como a Zaeon orquestrou 468 mentes e 50 projetos nas salas da Unilab, unindo Brasil, Índia e África para enfrentar a pressão esmagadora do maior hackathon de blockchain da história.
                        </motion.p>
                    </div>
                </div>

                <Link href="/news" className="absolute top-8 left-8 z-20">
                    <button className="flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-sm rounded-full text-slate-800 dark:text-slate-200 text-xs font-semibold tracking-wide hover:bg-white/60 dark:hover:bg-white/10 transition-all">
                        <ArrowLeftIcon className="w-4 h-4" /> Retornar ao Lounge
                    </button>
                </Link>
            </div>

            {/* CONTEÚDO NARRATIVO */}
            <main className="max-w-[800px] mx-auto px-6 py-20 font-serif text-lg md:text-xl leading-[2.2] text-slate-700 dark:text-slate-300">

                {/* ----------------------------------------------------------------- */}
                {/* O INÍCIO - MAIO */}
                {/* ----------------------------------------------------------------- */}

                <WeekSection weekNum={1} title="O Chamado e o Tsunami Humano" icon={UserGroupIcon}>
                    <p>
                        A primeira semana de Maio não deveria ter sido um evento sísmico. Quando a DoraHacks abriu as inscrições para o <em>Hedera Hackathon Africa</em>, a Zaeon viu uma oportunidade pedagógica: utilizar as instalações da Unilab e o Campus dos Malês, na Bahia, para ensinar os fundamentos da Web3 para alguns poucos curiosos. O edital era focado no desenvolvimento regional, e a expectativa era reunir um par de dezenas de estudantes.
                    </p>
                    <p>
                        Mas a tecnologia descentralizada tem um magnetismo peculiar nas periferias do mundo. No primeiro dia oficial de atividades, os mentores da Zaeon abriram as portas das salas e se depararam com um tsunami. <strong>Quatrocentas e sessenta e oito pessoas</strong>. Estudantes do recôncavo baiano acotovelavam-se com intercambistas de Angola, Cabo Verde, Guiné-Bissau e São Tomé e Príncipe. Não havia cadeiras suficientes, não havia tomadas suficientes, e a internet do campus engasgou nos primeiros trinta minutos. O caos havia começado.
                    </p>
                </WeekSection>

                {/* 👇 VÍDEO DO YOUTUBE APÓS A SEMANA 1 👇 */}
                <YouTubeEmbed
                    videoId="MRHBCDmE20s" // COLOQUE O ID DO VÍDEO AQUI (Exemplo: "dQw4w9WgXcQ")
                    caption="Abertura e inauguração global nos primeiros contatos com a tecnologia Hedera Hashgraph."
                />

                <WeekSection weekNum={2} title="A Torre de Babel Tecnológica" icon={LanguageIcon}>
                    <p>
                        Com a infraestrutura estabilizada (à base de extensões elétricas compradas às pressas), a Semana 2 revelou um problema muito mais denso do que a falta de Wi-Fi: a linguagem. As documentações oficiais da Hedera estão intrinsecamente redigidas em um Inglês técnico e denso.
                    </p>
                    <p>
                        Em uma das mesas ao fundo da sala 3, ocorreu uma micro-história que definiria o espírito do hackathon. Amina, uma estudante senegalesa brilhante em lógica matemática, falava apenas Francês e Wolof. João, um desenvolvedor front-end de Salvador, falava apenas Português. Eles precisavam conectar uma interface React a um <em>Smart Contract</em> em Solidity. Durante três dias, a comunicação entre eles resumiu-se a apontar para a tela, balançar a cabeça e usar o Google Tradutor no celular. Aos poucos, perceberam que não precisavam de palavras perfeitas; <code>async function callContract()</code> soa igual em qualquer idioma. O código se tornou a ponte.
                    </p>
                </WeekSection>

                <WeekSection weekNum={3} title="O Paradigma Hashgraph" icon={LightBulbIcon}>
                    <p>
                        Na terceira semana, a curva de aprendizado atingiu seu ponto mais íngreme. A maioria dos que já conheciam blockchain estavam acostumados com Ethereum. A Zaeon precisou desconstruir meses de vícios de programação. &quot;Hedera não é uma blockchain tradicional&quot;, ecoavam os mentores pelas salas. &quot;É um Grafo Acíclico Dirigido (DAG). Esqueçam a lentidão; estamos falando de finalidade em segundos&quot;.
                    </p>
                    <p>
                        O <em>&quot;Aha! Moment&quot;</em> (momento de epifania) coletivo ocorreu na quarta-feira daquela semana. Quando a primeira equipe conseguiu emitir um token na Testnet usando o <em>Hedera Token Service (HTS)</em> pagando frações de centavo e processando a transação instantaneamente, os olhos brilharam. Eles entenderam o poder do que tinham nas mãos.
                    </p>
                </WeekSection>

                <WeekSection weekNum={4} title="O Chapéu Seletor" icon={UserGroupIcon}>
                    <p>
                        Maio chegava ao fim e a Zaeon instituiu o que chamaram de &quot;Chapéu Seletor&quot;. Dos 468 indivíduos presentes, as habilidades foram mapeadas em quadros brancos. Quem domina React? Quem entende de criptografia? Quem sabe vender uma ideia (Pitch)?
                    </p>
                    <p>
                        Foi um exercício brutal de diplomacia, unindo pessoas que mal se conheciam em células de combate tecnológico. No final da sexta-feira, o caos havia sido organizado: <strong>50 esquadrões (equipes)</strong> haviam nascido, cada um com um líder, um desenvolvedor backend, um frontend e um estrategista de negócios.
                    </p>
                </WeekSection>

                {/* 👇 IMAGEM 1 👇 */}
                <StoryImage
                    src="/assets/hedera/work3.jpg" // COLOQUE O LINK DA IMAGEM (Equipes na Unilab)
                    alt="o começo"
                    caption="O Começo."
                />

                {/* ----------------------------------------------------------------- */}
                {/* A PRESSÃO - JUNHO */}
                {/* ----------------------------------------------------------------- */}

                <WeekSection weekNum={5} title="As Primeiras Linhas de Código" icon={CodeBracketIcon}>
                    <p>
                        Junho começou silencioso. O barulho das vozes foi substituído pelo som frenético de centenas de teclados. A Semana 5 foi dedicada à configuração de ambientes locais. Instalar Docker, configurar nós locais da Hedera, sincronizar repositórios no GitHub. Para muitos, era a primeira vez utilizando controle de versão em equipe. Conflitos de <em>merge</em> geraram brigas pequenas, rapidamente resolvidas com café e intervenção dos mentores da Zaeon.
                    </p>
                </WeekSection>

                <WeekSection weekNum={6} title="A Luta Pela Interface" icon={GlobeAltIcon}>
                    <p>
                        A Semana 6 trouxe uma dura lição: um contrato inteligente brilhante não vale nada se a interface do usuário parecer um site dos anos 90. Equipes que haviam focado 100% no <em>backend</em> perceberam que seus DApps (Aplicativos Descentralizados) eram inavegáveis. Houve uma corrida desesperada para aprender Tailwind CSS e Framer Motion. As noites começaram a ficar mais longas. Os seguranças do campus passaram a se acostumar com a luz das salas acesas às 3 da manhã.
                    </p>
                </WeekSection>

                <WeekSection weekNum={7} title="A Revelação do Colosso" icon={FireIcon}>
                    <p>
                        Quinta-feira, 15 de Junho. Esse dia está gravado na memória de todos. O painel global da DoraHacks, plataforma que hospedava o evento, atualizou suas métricas públicas. As 50 equipes da Unilab olharam para o projetor, e a realidade bateu como um soco no estômago.
                    </p>
                    <p>
                        O <em>Hedera Hackathon Africa</em> havia extrapolado suas barreiras continentais. Mais de <strong>1.000 projetos</strong> estavam sendo construídos simultaneamente por startups financiadas na Europa, programadores veteranos na Ásia e gênios do Vale do Silício. Para piorar (ou melhorar), a premiação total anunciada ultrapassava <strong>1 Milhão de Dólares</strong>.
                    </p>
                    <p>
                        A síndrome do impostor varreu a sala. Um estudante de Cabo Verde levantou-se, olhou para seu notebook com tela trincada e disse: <em>&quot;Nós estamos jogando xadrez contra o Deep Blue&quot;</em>. A moral da tropa despencou.
                    </p>
                </WeekSection>

                <WeekSection weekNum={8} title="O Sangue Frio da Zaeon" icon={ShieldCheckIcon}>
                    <p>
                        A Semana 8 exigiu que a Zaeon atuasse menos como engenheira de software e mais como psicóloga de trincheira. Uma reunião geral foi convocada. A mensagem passada pelos mentores foi cirúrgica: <em>&quot;Restrições geram criatividade. Um dev no Vale do Silício não entende os problemas reais do Sul Global. Eles estão construindo cassinos virtuais; vocês estão construindo soluções de remessa transfronteiriça para famílias desbancarizadas. A realidade é o nosso diferencial.&quot;</em>
                    </p>
                    <p>
                        A fala funcionou. O medo deu lugar a uma teimosia voraz. A partir daquela semana, os projetos deixaram de ser genéricos e se voltaram agressivamente para dores reais do continente africano e brasileiro: agricultura rastreável, identidades digitais para refugiados e micropagamentos.
                    </p>
                </WeekSection>

                {/* ESTATÍSTICAS LIQUID GLASS */}
                <div className="my-24 grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                    <div className="p-8 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] text-center">
                        <CodeBracketIcon className="w-8 h-8 mx-auto text-indigo-600 dark:text-indigo-400 mb-4" />
                        <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">50</div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Projetos Lapidados</div>
                    </div>
                    <div className="p-8 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] text-center">
                        <BugAntIcon className="w-8 h-8 mx-auto text-rose-500 mb-4" />
                        <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">10k+</div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Bugs Corrigidos</div>
                    </div>
                    <div className="p-8 rounded-[2rem] backdrop-blur-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] text-center">
                        <ClockIcon className="w-8 h-8 mx-auto text-amber-500 mb-4" />
                        <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">1.000</div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Concorrentes Globais</div>
                    </div>
                </div>

                {/* ----------------------------------------------------------------- */}
                {/* O CAOS - JULHO */}
                {/* ----------------------------------------------------------------- */}

                <WeekSection weekNum={9} title="A Moedor de Carne" icon={BoltIcon}>
                    <p>
                        Julho iniciou com a contagem regressiva oficial. O prazo de entrega era no final do mês. A Semana 9 marcou o início do <em>&quot;Crunch Time&quot;</em>. Energéticos, cafés requentados e salgados da cantina viraram a base da pirâmide alimentar. O desgaste físico era evidente. Estudantes dormiam sobre os teclados, acordavam com marcas de teclas no rosto e continuavam digitando.
                    </p>
                </WeekSection>

                <WeekSection weekNum={10} title="Câmera, Luz e Pânico" icon={DocumentCheckIcon}>
                    <p>
                        Além de código, a DoraHacks exigia um <em>Pitch Deck</em> (apresentação de negócios) e um vídeo de demonstração do produto. A Semana 10 foi um festival de vergonha e superação. Alunos que mal falavam Inglês precisaram gravar e regravar seus roteiros dezenas de vezes para a câmera do celular. Mentores da Zaeon atuaram como diretores de arte, corrigindo iluminação, postura e pronúncia. Um bom código sem um bom vídeo não ganharia 1 milhão de dólares.
                    </p>
                </WeekSection>

                <WeekSection weekNum={11} title="O Colapso da Testnet" icon={BugAntIcon}>
                    <p>
                        Na Semana 11, a Lei de Murphy imperou. Com o mundo inteiro testando as aplicações para a entrega final, a Testnet (rede de testes) da Hedera apresentou lentidões esporádicas. Códigos que funcionavam perfeitamente no dia anterior agora retornavam erros de <code>TIMEOUT</code>. O pânico generalizou-se. &quot;Meu contrato não faz o deploy, o hackathon acaba em 5 dias!&quot;, gritava um líder de equipe.
                    </p>
                </WeekSection>

                <WeekSection weekNum={12} title="A Fita Adesiva Digital" icon={CodeBracketIcon}>
                    <p>
                        A Semana 12 foi a aceitação do imperfeito. Sob a orientação da Zaeon, as equipes pararam de criar <em>features</em> novas. A ordem era: <em>&quot;Comentem o código que está quebrado. Escondam botões que não funcionam. Garantam o Caminho Feliz (Happy Path)&quot;</em>. Tratava-se de fita adesiva digital. As 50 equipes embalaram seus projetos, orgulhosos de suas criações capengas, mas funcionais. O botão de enviar já brilhava na tela.
                    </p>
                </WeekSection>

                <WeekSection weekNum={13} title="O E-mail que Mudou Tudo" icon={ClockIcon}>
                    <p>
                        Era sexta-feira, véspera do fechamento. O silêncio da exaustão pairava no ar. E então, o som uníssono de 50 celulares recebendo uma notificação. O assunto do e-mail da DoraHacks dizia: <strong>&quot;Update: Deadline Extended&quot;</strong>.
                    </p>
                    <p className="p-6 rounded-[2rem] bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 italic text-slate-900 dark:text-slate-100 mt-6 shadow-sm">
                        O hackathon não terminaria em Julho. O escopo global do evento obrigou a organização a adiar o prazo para o final de Outubro — exatamente no Dia das Bruxas.
                    </p>
                    <p className="mt-6">
                        Ouviram-se risos histéricos e xingamentos em quatro idiomas diferentes. Seis meses de prazo extra significavam que os 1.000 adversários teriam tempo para construir obras de arte. As equipes da Unilab teriam que arrancar sua &quot;fita adesiva digital&quot; e reescrever a fundação de seus projetos do zero absoluto.
                    </p>
                </WeekSection>

                {/* 👇 IMAGEM 2 👇 */}
                <StoryImage
                    src="/assets/hedera/block.jpg" // COLOQUE O LINK DA IMAGEM DE TENSÃO/TRABALHO NOTURNO
                    alt="Estudantes exaustos trabalhando de madrugada"
                    caption="Semanas finais de Julho: O cansaço físico era nítido. A prorrogação foi recebida como uma bênção mascarada de tortura prolongada."
                />

                {/* ----------------------------------------------------------------- */}
                {/* A LAPIDAÇÃO - AGOSTO A OUTUBRO */}
                {/* ----------------------------------------------------------------- */}

                <WeekSection weekNum={14} title="O Shutdown Forçado" icon={ShieldCheckIcon}>
                    <p>
                        A primeira reação da Zaeon na Semana 14 (início de Agosto) foi drástica. Eles trancaram as portas do laboratório. <em>&quot;Vão para casa, vão dormir, vão ver a família. Ninguém toca em um teclado por sete dias&quot;</em>. A prevenção do <em>burnout</em> era vital. Aquela semana de silêncio salvou a sanidade do grupo.
                    </p>
                </WeekSection>

                <WeekSection weekNum={15} title="O Despertar da Vergonha" icon={LightBulbIcon}>
                    <p>
                        Ao retornarem na Semana 15 com mentes descansadas, os alunos olharam para o código que quase enviaram em Julho e sentiram calafrios. &quot;Como íamos submeter isso?&quot;, riu Amina, a estudante do Senegal. A prorrogação permitiu que a mediocridade ditada pela pressa fosse completamente extirpada. O padrão mudou de &quot;Hackathon&quot; para &quot;Startup Grade&quot; (Nível de Empresa).
                    </p>
                </WeekSection>

                <WeekSection weekNum={18} title="O Esquadrão Vermelho" icon={BugAntIcon}>
                    <p>
                        Pulando para o final de Setembro (Semana 18), a Zaeon implementou a <em>&quot;Red Team Week&quot;</em>. Os mentores assumiram o papel de hackers maliciosos. O objetivo? Quebrar os contratos inteligentes dos alunos, drenar os tokens falsos e roubar identidades na Testnet. Foi um banho de sangue digital. Projetos de meses foram hackeados em 5 minutos. A lição foi dura, mas garantiu que as 50 soluções se tornassem verdadeiros cofres na blockchain.
                    </p>
                </WeekSection>

                <WeekSection weekNum={21} title="O Refinamento UX/UI" icon={CpuChipIcon}>
                    <p>
                        Outubro trouxe a brisa final. Nas Semanas 21 e 22, o <em>backend</em> foi &quot;congelado&quot;. Nenhuma linha lógica poderia ser alterada. O foco migrou 100% para o design. Os DApps da Unilab ganharam animações fluidas, temas escuros, acessibilidade e interfaces desenhadas para funcionar em smartphones antigos — uma necessidade vital para a usabilidade real na África e no interior do Brasil.
                    </p>
                </WeekSection>

                <WeekSection weekNum={24} title="O Halloween e o Alívio" icon={TrophyIcon}>
                    <p>
                        Semana 24. O dia 31 de Outubro amanheceu denso. As salas do Campus dos Malês, que outrora pareciam um mercado caótico de linguagens e desespero, agora exalavam o silêncio focado de um centro de controle aeroespacial.
                    </p>
                    <p>
                        Um por um, os 50 repositórios no GitHub foram tornados públicos. Os vídeos de Pitch, agora profissionais e confiantes, foram upados. Às 23h45, quinze minutos antes do limite global, a última equipe apertou o botão &quot;Submit&quot;.
                    </p>
                    <p>
                        Não houve gritos, apenas um longo suspiro coletivo e palmas lentas que começaram no fundo da sala e contagiaram o corredor. O Colosso de Hedera havia sido domado.
                    </p>
                </WeekSection>

                {/* 👇 IMAGEM 3 👇 */}
                <StoryImage
                    src="/assets/hedera/image.png" // COLOQUE O LINK DA IMAGEM DE SUBMISSÃO FINAL/COMEMORAÇÃO
                    alt="seminario de IA da unilab"
                    caption="Semana 24: Seminário sobre IA foi organizado no final do evento."
                />

                {/* CONCLUSÃO EDITORIAL */}
                <div className="mt-24 p-12 md:p-16 rounded-[3rem] backdrop-blur-[40px] bg-indigo-500/5 dark:bg-white/5 border border-indigo-500/10 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                    <p className="text-xl md:text-3xl font-serif italic text-slate-900 dark:text-slate-100 leading-relaxed font-medium">
                        &quot;O Hedera Hackathon Africa de 2025 ainda durou mais 120 dias e veio acabar oficialmente apenas em março de 2026, após exaustiva implementação dos projetos vencedores na prática. Infelizmente a Zaeon atrasou a prestação de contas com a FUNCAP, nossa equipe foi de apenas 3 pessoas e tivemos que conciliar muitas coisas. Mas conseguimos graças a Deus.&quot;
                    </p>
                </div>

                {/* RODAPÉ E METADADOS */}
                <div className="mt-20 pt-10 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 font-sans pb-20">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-bold text-lg shadow-sm">
                            ZN
                        </div>
                        <div>
                            <div className="text-base font-semibold tracking-tight text-slate-900 dark:text-white"></div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-widest">Zaeon • 2026</div>
                        </div>
                    </div>
                    <a
                        href="https://dorahacks.io/hackathon/hederahackafrica/buidl"
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-2 px-6 py-3 rounded-full backdrop-blur-xl bg-indigo-500/10 dark:bg-white/5 border border-indigo-500/20 dark:border-white/10 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white dark:hover:bg-white/10 transition-all"
                    >
                        Conferir submissões do hackathon
                        <ArrowLeftIcon className="w-4 h-4 group-hover:-rotate-45 rotate-135 transition-transform" />
                    </a>
                </div>

            </main>
        </div>
    );
}