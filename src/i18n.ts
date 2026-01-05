"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
    // 1. INGLÊS (EN)
    en: {
        translation: {
            navbar: { about: "About Us", homework: "Homework", workstation: "Research Lab", study_rooms: "Study Rooms" },
            menu: { new: "New Account", load: "Load Account", options: "Options", manual: "Manual", back: "Back" },
            roles: { student: "Student", researcher: "Researcher", professional: "Professional", entrepreneur: "Entrepreneur" },
            options: { language: "Language", node: "Node", tutorials: "Tutorials", on: "ON", off: "OFF" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1" },
            modal: {
                title: "New Account", name: "Full Name", email: "Email", phone: "Phone",
                continue: "Continue", cancel: "Cancel", use_wallet: "Use Wallet", use_id: "Use ID",
                wallet_label: "Movement Wallet", wallet_placeholder: "0x...",
                lbl_student: "Student ID", ph_student: "000...",
                lbl_researcher: "ORCID ID", ph_researcher: "ID...",
                lbl_professional: "Tax ID", ph_professional: "...",
                lbl_entrepreneur: "Company ID", ph_entrepreneur: "...",
                name_ph: "John Doe", email_ph: "you@email.com", phone_ph: "(00) 00000-0000"
            },
            homework: {
                study_title: "Study Files", add_files: "Add PDF",
                citations_title: "AI Citations", citations_empty: "Waiting for analysis...",
                videos_title: "Videos", status_digesting: "Digesting Document",
                status_typing: "Generating notes...", chat_header: "Research Insights",
                chat_placeholder: "Interact with the desk...",
                reload: "Reload", save_all: "Save All", paste_link: "Paste Link", suggest: "Suggest"
            },
            encryption: {
                title: "AI Agents from Another Dimension.",
                subtitle: "They came to help you be the best.",
                button: "Learn more"
            },
            study_rooms: {
                system: "SYSTEM_OPTIMAL", secure: "SECURE_CHANNEL", encrypted: "ENCRYPTED",
                highlight: "Find your Squad. Research. Publish.", together: "TOGETHER.",
                lobby_status: "LOBBY_STATUS: LIVE", find_party: "Find Your Party",
                select_cluster: "Select a research cluster", join: "Join Session", select: "Select a Room",
                rooms: {
                    cyber_name: "Cybernetics Hall", cyber_topic: "Computer Science",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Medicine & Health",
                    quantum_name: "Quantum Field", quantum_topic: "Mathematics",
                    global_name: "Global Lounge", global_topic: "General Studies"
                }
            },
            workstation: {
                focus_mode: "Focus Mode", system_init: "System initialized. Agents ready.",
                connected: "Connected", welcome: "Welcome", login: "Login", active_agent: "Active Agent",
                clear_history: "Clear History", send: "SEND", generate: "GENERATE", processing: "Processing...",
                session_save: "Save Session", auto_fix: "AUTO-FIX", no_wallet: "Connect Wallet",
                doc_title_placeholder: "Document Title...", doc_content_placeholder: "Waiting for output...",
                chat_placeholder: "Ask Zaeon about {{role}}...",
                logs: { switched: "Switched to {{name}}", gen_protocol: "Protocol initiated via {{name}}", content_gen: "Content generated.", ipfs_success: "IPFS Success: {{hash}}", blockchain_init: "Securing on Movement...", success: "Success!", error: "Error." }
            },
            agents: { zenita: { role: "Technology" }, ballena: { role: "Health" }, ethernaut: { role: "Mathematics" } }
        }
    },

    // 2. PORTUGUÊS (PT)
    pt: {
        translation: {
            navbar: { about: "Sobre Nós", homework: "Estudo Dirigido", workstation: "Laboratório", study_rooms: "Salas de Estudo" },
            menu: { new: "Nova Conta", load: "Carregar Conta", options: "Opções", manual: "Manual", back: "Voltar" },
            roles: { student: "Estudante", researcher: "Pesquisador", professional: "Profissional", entrepreneur: "Empresário" },
            options: { language: "Idioma", node: "Nó", tutorials: "Tutoriais", on: "LIGADO", off: "DESLIGADO" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1" },
            modal: {
                title: "Nova Conta", name: "Nome Completo", email: "E-mail", phone: "Celular",
                continue: "Continuar", cancel: "Cancelar", use_wallet: "Usar Carteira", use_id: "Usar ID",
                wallet_label: "Carteira Movement", wallet_placeholder: "0x...",
                lbl_student: "CPF do Estudante", ph_student: "000.000...",
                lbl_researcher: "ORCID ou Lattes", ph_researcher: "ID...",
                lbl_professional: "CPF ou CNPJ", ph_professional: "...",
                lbl_entrepreneur: "CNPJ da Empresa", ph_entrepreneur: "...",
                name_ph: "João Silva", email_ph: "voce@email.com", phone_ph: "(11) 99999-9999"
            },
            homework: {
                study_title: "Arquivos de Estudo", add_files: "Adicionar PDF",
                citations_title: "Citações de IA", citations_empty: "Aguardando análise...",
                videos_title: "Vídeos", status_digesting: "Digerindo Documento",
                status_typing: "Gerando anotações...", chat_header: "Insights de Pesquisa",
                chat_placeholder: "Interagir com a mesa...",
                reload: "Recarregar", save_all: "Salvar Tudo", paste_link: "Colar Link", suggest: "Sugerir"
            },
            encryption: {
                title: "Agentes de IA de Outra Dimensão.",
                subtitle: "Eles vieram para ajudar você a ser o melhor.",
                button: "Saiba mais"
            },
            study_rooms: {
                system: "SISTEMA_IDEAL", secure: "CANAL_SEGURO", encrypted: "ENCRIPTADO",
                highlight: "Encontre seu Esquadrão. Pesquise. Publique.", together: "JUNTOS.",
                lobby_status: "STATUS_LOBBY: AO VIVO", find_party: "Encontre sua Equipe",
                select_cluster: "Selecione um grupo de pesquisa", join: "Entrar na Sessão", select: "Selecione uma Sala",
                rooms: {
                    cyber_name: "Hall Cibernético", cyber_topic: "Ciência da Computação",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Medicina e Saúde",
                    quantum_name: "Campo Quântico", quantum_topic: "Matemática",
                    global_name: "Lounge Global", global_topic: "Estudos Gerais"
                }
            },
            workstation: {
                focus_mode: "Modo Foco", system_init: "Sistema iniciado. Agentes prontos.",
                connected: "Logado", welcome: "Bem-vindo", login: "Entrar", active_agent: "Agente Ativo",
                clear_history: "Limpar Histórico", send: "ENVIAR", generate: "GERAR", processing: "Processando...",
                session_save: "Salvar Sessão", auto_fix: "CORRIGIR", no_wallet: "Conectar Carteira",
                doc_title_placeholder: "Título do Doc...", doc_content_placeholder: "Aguardando saída...",
                chat_placeholder: "Pergunte à Zaeon sobre {{role}}...",
                logs: { switched: "Alterado para {{name}}", gen_protocol: "Protocolo iniciado via {{name}}", content_gen: "Conteúdo gerado.", ipfs_success: "IPFS Sucesso: {{hash}}", blockchain_init: "Assegurando na Movement...", success: "Sucesso!", error: "Erro." }
            },
            agents: { zenita: { role: "Tecnologia" }, ballena: { role: "Saúde" }, ethernaut: { role: "Matemática" } }
        }
    },

    // 3. CHINÊS (ZH)
    zh: {
        translation: {
            navbar: { about: "关于我们", homework: "课业", workstation: "研究实验室", study_rooms: "自习室" },
            menu: { new: "新账户", load: "加载账户", options: "选项", manual: "手册", back: "返回" },
            roles: { student: "学生", researcher: "研究员", professional: "专业人士", entrepreneur: "企业家" },
            options: { language: "语言", node: "节点", tutorials: "教程", on: "开启", off: "关闭" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1" },
            modal: {
                title: "新账户", name: "全名", email: "电子邮件", phone: "电话",
                continue: "继续", cancel: "取消", use_wallet: "使用钱包", use_id: "使用 ID",
                wallet_label: "Movement 钱包", wallet_placeholder: "0x...",
                lbl_student: "学生 ID", ph_student: "000...",
                lbl_researcher: "ORCID ID", ph_researcher: "ID...",
                lbl_professional: "税号", ph_professional: "...",
                lbl_entrepreneur: "公司 ID", ph_entrepreneur: "...",
                name_ph: "李雷", email_ph: "nihao@email.com", phone_ph: "138 0000 0000"
            },
            homework: {
                study_title: "学习文件", add_files: "添加 PDF",
                citations_title: "AI 引用", citations_empty: "等待分析...",
                videos_title: "视频", status_digesting: "正在消化文档",
                status_typing: "正在生成笔记...", chat_header: "研究洞察",
                chat_placeholder: "向 Zaeon 提问...",
                reload: "重载", save_all: "保存全部", paste_link: "粘贴链接", suggest: "建议"
            },
            encryption: { title: "来自另一个维度的 AI 代理。", subtitle: "它们来帮助你成为最好的自己。", button: "了解更多" },
            study_rooms: {
                system: "系统最佳", secure: "安全通道", encrypted: "已加密",
                highlight: "寻找你的小队。研究。发布。", together: "一起。",
                lobby_status: "大厅状态：在线", find_party: "寻找你的队伍",
                select_cluster: "选择研究集群", join: "加入会话", select: "选择房间",
                rooms: {
                    cyber_name: "控制论大厅", cyber_topic: "计算机科学",
                    bio_name: "生物实验室 Alpha", bio_topic: "医学与健康",
                    quantum_name: "量子场", quantum_topic: "数学",
                    global_name: "全球休息室", global_topic: "通识教育"
                }
            },
            workstation: {
                focus_mode: "专注模式", system_init: "系统初始化。智能体待命。",
                connected: "已登录", welcome: "欢迎", login: "登录", active_agent: "当前智能体",
                clear_history: "清除历史", send: "发送", generate: "生成", processing: "处理中...",
                session_save: "保存会话", auto_fix: "自动修复", no_wallet: "连接钱包",
                doc_title_placeholder: "文档标题...", doc_content_placeholder: "等待输出...",
                chat_placeholder: "向 Zaeon 咨询关于 {{role}} 的问题...",
                logs: { switched: "已切换至 {{name}}", gen_protocol: "协议已启动 via {{name}}", content_gen: "内容已生成。", ipfs_success: "IPFS 成功: {{hash}}", blockchain_init: "正在 Movement 上加固...", success: "成功！", error: "错误。" }
            },
            agents: { zenita: { role: "科技" }, ballena: { role: "健康" }, ethernaut: { role: "数学" } }
        }
    },

    // 4. COREANO (KO)
    ko: {
        translation: {
            navbar: { about: "소개", homework: "과제", workstation: "연구실", study_rooms: "스터디 룸" },
            menu: { new: "새 계정", load: "계정 불러오기", options: "옵션", manual: "매뉴얼", back: "뒤로" },
            roles: { student: "학생", researcher: "연구원", professional: "전문가", entrepreneur: "기업가" },
            options: { language: "언어", node: "노드", tutorials: "튜토리얼", on: "켜짐", off: "꺼짐" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1" },
            modal: {
                title: "새 계정", name: "이름", email: "이메일", phone: "전화번호",
                continue: "계속", cancel: "취소", use_wallet: "지갑 사용", use_id: "ID 사용",
                wallet_label: "Movement 지갑", wallet_placeholder: "0x...",
                lbl_student: "학생 ID", ph_student: "000...",
                lbl_researcher: "ORCID ID", ph_researcher: "ID...",
                lbl_professional: "세금 ID", ph_professional: "...",
                lbl_entrepreneur: "기업 ID", ph_entrepreneur: "...",
                name_ph: "홍길동", email_ph: "you@email.com", phone_ph: "010-0000-0000"
            },
            homework: {
                study_title: "학습 파일", add_files: "PDF 추가",
                citations_title: "AI 인용", citations_empty: "분석 대기 중...",
                videos_title: "비디오", status_digesting: "문서 분석 중",
                status_typing: "노트 생성 중...", chat_header: "연구 통찰",
                chat_placeholder: "Zaeon에게 질문...",
                reload: "새로고침", save_all: "모두 저장", paste_link: "링크 붙여넣기", suggest: "제안"
            },
            encryption: { title: "다른 차원에서 온 AI 에이전트.", subtitle: "최고가 될 수 있도록 돕기 위해 왔습니다.", button: "더 알아보기" },
            study_rooms: {
                system: "시스템 최적", secure: "보안 채널", encrypted: "암호화됨",
                highlight: "팀을 찾으세요. 연구하고, 게시하세요.", together: "함께.",
                lobby_status: "로비 상태: 라이브", find_party: "파티 찾기",
                select_cluster: "연구 클러스터 선택", join: "세션 참여", select: "방 선택",
                rooms: {
                    cyber_name: "사이버네틱스 홀", cyber_topic: "컴퓨터 과학",
                    bio_name: "바이오 랩 알파", bio_topic: "의학 및 건강",
                    quantum_name: "양자 필드", quantum_topic: "수학",
                    global_name: "글로벌 라운지", global_topic: "일반 연구"
                }
            },
            workstation: {
                focus_mode: "집중 모드", system_init: "시스템 초기화 완료. 에이전트 대기 중.",
                connected: "로그인됨", welcome: "환영합니다", login: "로그인", active_agent: "활성 에이전트",
                clear_history: "기록 지우기", send: "전송", generate: "생성", processing: "처리 중...",
                session_save: "세션 저장", auto_fix: "자동 수정", no_wallet: "지갑 연결",
                doc_title_placeholder: "문서 제목...", doc_content_placeholder: "결과 대기 중...",
                chat_placeholder: "{{role}}에 대해 Zaeon에게 질문하세요...",
                logs: { switched: "{{name}}로 변경됨", gen_protocol: "{{name}}를 통해 프로토콜 시작", content_gen: "콘텐츠 생성됨.", ipfs_success: "IPFS 성공: {{hash}}", blockchain_init: "Movement에서 보안 중...", success: "성공!", error: "오류." }
            },
            agents: { zenita: { role: "기술" }, ballena: { role: "건강/의학" }, ethernaut: { role: "수학" } }
        }
    },

    // 5. ESPANHOL (ES)
    es: {
        translation: {
            navbar: { about: "Sobre Nosotros", homework: "Actividades", workstation: "Laboratorio", study_rooms: "Salas de Estudio" },
            menu: { new: "Nueva Cuenta", load: "Cargar Cuenta", options: "Opciones", manual: "Manual", back: "Volver" },
            roles: { student: "Estudiante", researcher: "Investigador", professional: "Profesional", entrepreneur: "Empresario" },
            options: { language: "Idioma", node: "Nodo", tutorials: "Tutoriales", on: "ENCENDIDO", off: "APAGADO" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1" },
            modal: {
                title: "Nueva Cuenta", name: "Nombre Completo", email: "Correo", phone: "Teléfono",
                continue: "Continuar", cancel: "Cancelar", use_wallet: "Usar Billetera", use_id: "Usar ID",
                wallet_label: "Billetera Movement", wallet_placeholder: "0x...",
                lbl_student: "ID Estudiante", ph_student: "000...",
                lbl_researcher: "ORCID ID", ph_researcher: "ID...",
                lbl_professional: "ID Fiscal", ph_professional: "...",
                lbl_entrepreneur: "ID Empresa", ph_entrepreneur: "...",
                name_ph: "Juan Pérez", email_ph: "tu@email.com", phone_ph: "(00) 00000-0000"
            },
            homework: {
                study_title: "Archivos de Estudio", add_files: "Añadir PDF",
                citations_title: "Citas de IA", citations_empty: "Esperando análisis...",
                videos_title: "Videos", status_digesting: "Digiriendo Documento",
                status_typing: "Generando notas...", chat_header: "Insights",
                chat_placeholder: "Pregunta a Zaeon...",
                reload: "Recargar", save_all: "Guardar Todo", paste_link: "Pegar Enlace", suggest: "Sugerir"
            },
            encryption: { title: "Agentes de IA de Otra Dimensión.", subtitle: "Vinieron para ayudarte a ser el mejor.", button: "Saber más" },
            study_rooms: {
                system: "SISTEMA ÓPTIMO", secure: "CANAL SEGURO", encrypted: "ENCRIPTADO",
                highlight: "Encuentra tu Escuadrón. Investiga. Publica.", together: "JUNTOS.",
                lobby_status: "ESTADO_LOBBY: EN VIVO", find_party: "Encuentra tu Grupo",
                select_cluster: "Selecciona un grupo de investigación", join: "Unirse a la Sesión", select: "Seleccionar una Sala",
                rooms: {
                    cyber_name: "Salón Cibernético", cyber_topic: "Ciencias de la Computación",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Medicina y Salud",
                    quantum_name: "Campo Cuántico", quantum_topic: "Matemáticas",
                    global_name: "Salón Global", global_topic: "Estudos Generales"
                }
            },
            workstation: {
                focus_mode: "Modo Enfoque", system_init: "Sistema iniciado. Agentes listos.",
                connected: "Conectado", welcome: "Bienvenido", login: "Entrar", active_agent: "Agente Activo",
                clear_history: "Borrar Historial", send: "ENVIAR", generate: "GENERAR", processing: "Procesando...",
                session_save: "Guardar Sesión", auto_fix: "CORREGIR", no_wallet: "Conectar Billetera",
                doc_title_placeholder: "Título...", doc_content_placeholder: "Esperando salida...",
                chat_placeholder: "Pregunta a Zaeon sobre {{role}}...",
                logs: { switched: "Cambiado a {{name}}", gen_protocol: "Protocolo iniciado via {{name}}", content_gen: "Contenido generado.", ipfs_success: "IPFS Éxito: {{hash}}", blockchain_init: "Asegurando en Movement...", success: "¡Éxito!", error: "Error." }
            },
            agents: { zenita: { role: "Tecnología" }, ballena: { role: "Salud" }, ethernaut: { role: "Matemáticas" } }
        }
    },

    // 6. FRANCÊS (FR)
    fr: {
        translation: {
            navbar: { about: "À Propos", homework: "Exercices", workstation: "Laboratoire", study_rooms: "Salles d'Étude" },
            menu: { new: "Nouveau Compte", load: "Charger Compte", options: "Options", manual: "Manuel", back: "Retour" },
            roles: { student: "Étudiant", researcher: "Chercheur", professional: "Professionnel", entrepreneur: "Entrepreneur" },
            options: { language: "Langue", node: "Nœud", tutorials: "Tutoriels", on: "MARCHE", off: "ARRÊT" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1" },
            modal: {
                title: "Nouveau Compte", name: "Nom Complet", email: "E-mail", phone: "Téléphone",
                continue: "Continuer", cancel: "Annuler", use_wallet: "Utiliser Portefeuille", use_id: "Utiliser ID",
                wallet_label: "Portefeuille Movement", wallet_placeholder: "0x...",
                lbl_student: "ID Étudiant", ph_student: "000...",
                lbl_researcher: "ORCID ID", ph_researcher: "ID...",
                lbl_professional: "ID Fiscal", ph_professional: "...",
                lbl_entrepreneur: "ID Entreprise", ph_entrepreneur: "...",
                name_ph: "Pierre Dupont", email_ph: "vous@email.com", phone_ph: "06 00 00 00 00"
            },
            homework: {
                study_title: "Fichiers d'Étude", add_files: "Ajouter PDF",
                citations_title: "Citations IA", citations_empty: "En attente d'analyse...",
                videos_title: "Vidéos", status_digesting: "Analyse du Document",
                status_typing: "Génération de notes...", chat_header: "Insights",
                chat_placeholder: "Demandez à Zaeon...",
                reload: "Recharger", save_all: "Sauvegarder", paste_link: "Coller Lien", suggest: "Suggérer"
            },
            encryption: { title: "Agents IA d'une Autre Dimension.", subtitle: "Ils sont venus pour vous aider à être le meilleur.", button: "En savoir plus" },
            study_rooms: {
                system: "SYSTÈME OPTIMAL", secure: "CANAL SÉCURISÉ", encrypted: "CHIFFRÉ",
                highlight: "Trouvez votre équipe. Recherchez. Publiez.", together: "ENSEMBLE.",
                lobby_status: "STATUT_LOBBY: EN DIRECT", find_party: "Trouvez votre Groupe",
                select_cluster: "Sélectionnez un groupe de recherche", join: "Rejoindre la Session", select: "Sélectionner une Salle",
                rooms: {
                    cyber_name: "Hall Cybernétique", cyber_topic: "Informatique",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Médecine & Santé",
                    quantum_name: "Champ Quantique", quantum_topic: "Mathématiques",
                    global_name: "Salon Global", global_topic: "Études Générales"
                }
            },
            workstation: {
                focus_mode: "Mode Concentration", system_init: "Système initialisé. Agents prêts.",
                connected: "Connecté", welcome: "Bienvenue", login: "Connexion", active_agent: "Agent Actif",
                clear_history: "Effacer l'historique", send: "ENVOYER", generate: "GÉNÉRER", processing: "Traitement...",
                session_save: "Sauvegarder", auto_fix: "CORRIGER", no_wallet: "Connecter Wallet",
                doc_title_placeholder: "Titre...", doc_content_placeholder: "En attente...",
                chat_placeholder: "Demandez à Zaeon sur {{role}}...",
                logs: { switched: "Cambié pour {{name}}", gen_protocol: "Protocole initié via {{name}}", content_gen: "Contenu généré.", ipfs_success: "IPFS Succès: {{hash}}", blockchain_init: "Sécurisation sur Movement...", success: "Succès!", error: "Erreur." }
            },
            agents: { zenita: { role: "Technologie" }, ballena: { role: "Santé" }, ethernaut: { role: "Mathématiques" } }
        }
    }
};

// Inicialização segura para SSR
if (typeof window !== 'undefined' && !i18n.isInitialized) {
    i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources,
            fallbackLng: "en",
            supportedLngs: ["en", "pt", "zh", "ko", "es", "fr"],
            interpolation: { escapeValue: false },
            react: { useSuspense: false }
        });
}

export default i18n;