"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
    // 1. INGLÊS (EN)
    en: {
        translation: {
            menu: { new: "New Account", load: "Load Account", options: "Options", manual: "Manual", back: "Back to Menu" },
            roles: { student: "Student", researcher: "Researcher", professional: "Professional", entrepreneur: "Entrepreneur" },
            options: { language: "Language", node: "Blockchain Node", tutorials: "Tutorials", on: "ON", off: "OFF" },
            modal: { title: "New Account", name: "Full Name", email: "Email", phone: "Phone", continue: "Continue", cancel: "Cancel", use_wallet: "Use Wallet Address", use_id: "Use Role ID", wallet_label: "Movement Wallet Address", wallet_placeholder: "0x...", ph_student: "000.000.000-00 (ID)", ph_researcher: "ORCID or Lattes ID", ph_professional: "Tax ID / SSN", ph_entrepreneur: "Company Tax ID", lbl_student: "Enter your ID", lbl_researcher: "Enter ORCID/ID", lbl_professional: "Enter Tax ID", lbl_entrepreneur: "Enter Company ID" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: { about: "About Us", homework: "Homework", workstation: "Research Lab", study_rooms: "Study Rooms" },
            encryption: { title: "AI Agents from Another Dimension.", subtitle: "They came to help you to be the best.", button: "Learn more" },
            // NOVA SEÇÃO STUDY ROOMS
            study_rooms: {
                system: "SYSTEM_OPTIMAL",
                secure: "SECURE_CHANNEL",
                encrypted: "ENCRYPTED",
                highlight: "Find your Squad. Research. Publish.",
                together: "TOGETHER.",
                lobby_status: "Lobby_Status: LIVE",
                find_party: "Find Your Party",
                select_cluster: "Select a research cluster",
                join: "Join Session",
                select: "Select a Room",
                rooms: {
                    cyber_name: "Cybernetics Hall", cyber_topic: "Computer Science",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Medicine & Health",
                    quantum_name: "Quantum Field", quantum_topic: "Mathematics",
                    global_name: "Global Lounge", global_topic: "General Studies"
                }
            },
            agents: {
                zenita: { role: "Technology" },
                ballena: { role: "Health" },
                ethernaut: { role: "Math" }
            },
            workstation: {
                focus_mode: "Focus Mode",
                system_init: "System initialized. Agents standing by.",
                connected: "Connected",
                metamask: "MetaMask",
                wepin: "Wepin",
                active_agent: "Active Agent",
                clear_history: "Clear History",
                send: "SEND",
                auto_fix: "AUTO-FIX",
                generate: "GENERATE",
                processing: "Processing...",
                terminal_title: "TERMINAL (MOVEMENT NETWORK)",
                session_homework: "Homework Session",
                session_save: "Save Session",
                chat_placeholder: "What topic from {{role}} do you want to research?",
                doc_title_placeholder: "Enter Document Title...",
                doc_content_placeholder: "Waiting for generated output... (You can write here too)",
                logs: {
                    switched: "Switched active agent: {{name}}",
                    gen_protocol: "Initiating generation protocol via {{name}}...",
                    content_gen: "Content generated. Encrypting for IPFS...",
                    ipfs_success: "IPFS Storage Confirmed: {{hash}}",
                    blockchain_init: "Initiating Blockchain Transaction...",
                    blockchain_securing: "Blockchain: Securing data on Movement Network...",
                    success: "SUCCESS: Proof of Knowledge established!",
                    error: "ERROR: Upload failed."
                }
            }
        }
    },
    // 2. CHINÊS (ZH)
    zh: {
        translation: {
            menu: { new: "新账户", load: "加载账户", options: "选项", manual: "手册", back: "返回菜单" },
            roles: { student: "学生", researcher: "研究员", professional: "专业人士", entrepreneur: "企业家" },
            options: { language: "语言", node: "区块链节点", tutorials: "教程", on: "开启", off: "关闭" },
            modal: { title: "新账户", name: "姓名", email: "电子邮件", phone: "电话号码", continue: "继续", cancel: "取消", use_wallet: "使用钱包地址", use_id: "使用身份证", wallet_label: "Movement 钱包地址", wallet_placeholder: "0x...", ph_student: "身份证号码", ph_researcher: "ORCID 或 Lattes ID", ph_professional: "纳税人识别号", ph_entrepreneur: "公司注册号", lbl_student: "输入身份证号", lbl_researcher: "输入 ORCID", lbl_professional: "输入税号", lbl_entrepreneur: "输入公司 ID" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / 测试网" },
            navbar: { about: "关于我们", homework: "课业", workstation: "研究实验室", study_rooms: "自习室" },
            encryption: { title: "来自另一个维度的 AI 代理。", subtitle: "它们来帮助你成为最好的自己。", button: "了解更多" },
            study_rooms: {
                system: "系统最佳",
                secure: "安全通道",
                encrypted: "已加密",
                highlight: "寻找你的小队。研究。发布。",
                together: "一起。",
                lobby_status: "大厅状态：在线",
                find_party: "寻找你的队伍",
                select_cluster: "选择研究集群",
                join: "加入会话",
                select: "选择房间",
                rooms: {
                    cyber_name: "控制论大厅", cyber_topic: "计算机科学",
                    bio_name: "生物实验室 Alpha", bio_topic: "医学与健康",
                    quantum_name: "量子场", quantum_topic: "数学",
                    global_name: "全球休息室", global_topic: "通识教育"
                }
            },
            agents: {
                zenita: { role: "科技" },
                ballena: { role: "健康" },
                ethernaut: { role: "数学" }
            },
            workstation: {
                focus_mode: "专注模式",
                system_init: "系统初始化。智能体待命。",
                connected: "已连接",
                metamask: "MetaMask",
                wepin: "Wepin",
                active_agent: "当前智能体",
                clear_history: "清除历史",
                send: "发送",
                auto_fix: "自动修复",
                generate: "生成",
                processing: "处理中...",
                terminal_title: "终端 (MOVEMENT 网络)",
                session_homework: "作业会话",
                session_save: "保存会话",
                chat_placeholder: "您想研究 {{role}} 的哪个主题？",
                doc_title_placeholder: "输入文档标题...",
                doc_content_placeholder: "等待生成输出... (您也可以在此处书写)",
                logs: {
                    switched: "已切换智能体: {{name}}",
                    gen_protocol: "正在通过 {{name}} 启动生成协议...",
                    content_gen: "内容已生成。正在加密至 IPFS...",
                    ipfs_success: "IPFS 存储已确认: {{hash}}",
                    blockchain_init: "正在启动区块链交易...",
                    blockchain_securing: "区块链: 正在 Movement 网络上确保存储...",
                    success: "成功: 知识证明已建立！",
                    error: "错误: 上传失败。"
                }
            }
        }
    },
    // 3. COREANO (KO)
    ko: {
        translation: {
            menu: { new: "새 계정", load: "계정 불러오기", options: "옵션", manual: "매뉴얼", back: "메뉴로 돌아가기" },
            roles: { student: "학생", researcher: "연구원", professional: "전문가", entrepreneur: "기업가" },
            options: { language: "언어", node: "블록체인 노드", tutorials: "튜토리얼", on: "켜짐", off: "꺼짐" },
            modal: { title: "새 계정", name: "이름", email: "이메일", phone: "전화번호", continue: "계속", cancel: "취소", use_wallet: "지갑 주소 사용", use_id: "ID 사용", wallet_label: "Movement 지갑 주소", wallet_placeholder: "0x...", ph_student: "학번 또는 ID", ph_researcher: "ORCID 또는 연구자 ID", ph_professional: "납세자 번호", ph_entrepreneur: "사업자 등록 번호", lbl_student: "ID 입력", lbl_researcher: "ORCID 입력", lbl_professional: "세금 ID 입력", lbl_entrepreneur: "사업자 ID 입력" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: { about: "소개", homework: "과제", workstation: "연구실", study_rooms: "스터디 룸" },
            encryption: { title: "다른 차원에서 온 AI 에이전트.", subtitle: "최고가 될 수 있도록 돕기 위해 왔습니다.", button: "더 알아보기" },
            study_rooms: {
                system: "시스템 최적",
                secure: "보안 채널",
                encrypted: "암호화됨",
                highlight: "팀을 찾으세요. 연구하고, 게시하세요.",
                together: "함께.",
                lobby_status: "로비 상태: 라이브",
                find_party: "파티 찾기",
                select_cluster: "연구 클러스터 선택",
                join: "세션 참여",
                select: "방 선택",
                rooms: {
                    cyber_name: "사이버네틱스 홀", cyber_topic: "컴퓨터 과학",
                    bio_name: "바이오 랩 알파", bio_topic: "의학 및 건강",
                    quantum_name: "양자 필드", quantum_topic: "수학",
                    global_name: "글로벌 라운지", global_topic: "일반 연구"
                }
            },
            agents: {
                zenita: { role: "기술" },
                ballena: { role: "건강/의학" },
                ethernaut: { role: "수학" }
            },
            workstation: {
                focus_mode: "집중 모드",
                system_init: "시스템 초기화 완료. 에이전트 대기 중.",
                connected: "연결됨",
                metamask: "메타마스크",
                wepin: "위핀 (Wepin)",
                active_agent: "활성 에이전트",
                clear_history: "기록 지우기",
                send: "전송",
                auto_fix: "자동 수정",
                generate: "생성",
                processing: "처리 중...",
                terminal_title: "터미널 (MOVEMENT 네트워크)",
                session_homework: "숙제 세션",
                session_save: "세션 저장",
                chat_placeholder: "{{role}}의 어떤 주제를 연구하시겠습니까?",
                doc_title_placeholder: "문서 제목 입력...",
                doc_content_placeholder: "생성된 결과를 기다리는 중... (직접 작성할 수도 있습니다)",
                logs: {
                    switched: "활성 에이전트 변경: {{name}}",
                    gen_protocol: "{{name}}를 통해 생성 프로토콜 시작...",
                    content_gen: "콘텐츠 생성 완료. IPFS 암호화 중...",
                    ipfs_success: "IPFS 저장 확인됨: {{hash}}",
                    blockchain_init: "블록체인 트랜잭션 시작...",
                    blockchain_securing: "블록체인: Movement 네트워크에 데이터 보호 중...",
                    success: "성공: 지식 증명(Proof of Knowledge) 수립됨!",
                    error: "오류: 업로드 실패."
                }
            }
        }
    },
    // 4. FRANCÊS (FR)
    fr: {
        translation: {
            menu: { new: "Nouveau Compte", load: "Charger Compte", options: "Options", manual: "Manuel", back: "Retour au Menu" },
            roles: { student: "Étudiant", researcher: "Chercheur", professional: "Professionnel", entrepreneur: "Entrepreneur" },
            options: { language: "Langue", node: "Nœud Blockchain", tutorials: "Tutoriels", on: "MARCHE", off: "ARRÊT" },
            modal: { title: "Nouveau Compte", name: "Nom Complet", email: "E-mail", phone: "Téléphone", continue: "Continuer", cancel: "Annuler", use_wallet: "Utiliser Portefeuille", use_id: "Utiliser ID", wallet_label: "Adresse Portefeuille Movement", wallet_placeholder: "0x...", ph_student: "ID Étudiant", ph_researcher: "ORCID ou ID", ph_professional: "ID Fiscal", ph_entrepreneur: "ID Entreprise", lbl_student: "Entrez votre ID", lbl_researcher: "Entrez ORCID", lbl_professional: "Entrez ID Fiscal", lbl_entrepreneur: "Entrez ID Entreprise" },
            footer: { powered: "Propulsé par Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: { about: "À Propos", homework: "Exercices", workstation: "Labo de Recherche", study_rooms: "Salles d'Étude" },
            encryption: { title: "Agents IA d'une Autre Dimension.", subtitle: "Ils sont venus pour vous aider à être le meilleur.", button: "En savoir plus" },
            study_rooms: {
                system: "SYSTÈME OPTIMAL",
                secure: "CANAL SÉCURISÉ",
                encrypted: "CHIFFRÉ",
                highlight: "Trouvez votre équipe. Recherchez. Publiez.",
                together: "ENSEMBLE.",
                lobby_status: "Statut du Lobby : EN DIRECT",
                find_party: "Trouvez votre Groupe",
                select_cluster: "Sélectionnez un groupe de recherche",
                join: "Rejoindre la Session",
                select: "Sélectionner une Salle",
                rooms: {
                    cyber_name: "Hall Cybernétique", cyber_topic: "Informatique",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Médecine & Santé",
                    quantum_name: "Champ Quantique", quantum_topic: "Mathématiques",
                    global_name: "Salon Global", global_topic: "Études Générales"
                }
            },
            agents: {
                zenita: { role: "Technologie" },
                ballena: { role: "Santé" },
                ethernaut: { role: "Mathématiques" }
            },
            workstation: {
                focus_mode: "Mode Concentration",
                system_init: "Système initialisé. Agents en attente.",
                connected: "Connecté",
                metamask: "MetaMask",
                wepin: "Wepin",
                active_agent: "Agent Actif",
                clear_history: "Effacer l'historique",
                send: "ENVOYER",
                auto_fix: "CORRIGER",
                generate: "GÉNÉRER",
                processing: "Traitement...",
                terminal_title: "TERMINAL (RÉSEAU MOVEMENT)",
                session_homework: "Session Devoirs",
                session_save: "Sauvegarder la session",
                chat_placeholder: "Quel sujet de {{role}} voulez-vous rechercher ?",
                doc_title_placeholder: "Entrez le titre du document...",
                doc_content_placeholder: "En attente de la sortie générée... (Vous pouvez écrire ici aussi)",
                logs: {
                    switched: "Agent actif changé : {{name}}",
                    gen_protocol: "Lancement du protocole de génération via {{name}}...",
                    content_gen: "Contenu généré. Chiffrement pour IPFS...",
                    ipfs_success: "Stockage IPFS confirmé : {{hash}}",
                    blockchain_init: "Lancement de la transaction Blockchain...",
                    blockchain_securing: "Blockchain : Sécurisation des données sur le réseau Movement...",
                    success: "SUCCÈS : Preuve de connaissance établie !",
                    error: "ERREUR : Échec du téléchargement."
                }
            }
        }
    },
    // 5. PORTUGUÊS (PT)
    pt: {
        translation: {
            menu: { new: "Nova Conta", load: "Carregar Conta", options: "Opções", manual: "Manual", back: "Voltar ao Menu" },
            roles: { student: "Estudante", researcher: "Pesquisador", professional: "Profissional", entrepreneur: "Empresário" },
            options: { language: "Idioma", node: "Nó Blockchain", tutorials: "Tutoriais", on: "LIGADO", off: "DESLIGADO" },
            modal: { title: "Nova Conta", name: "Nome Completo", email: "E-mail", phone: "Celular", continue: "Continuar", cancel: "Cancelar", use_wallet: "Usar Carteira", use_id: "Usar ID", wallet_label: "Endereço da Carteira", wallet_placeholder: "0x...", ph_student: "000.000.000-00 (CPF)", ph_researcher: "ORCID ou Lattes", ph_professional: "CPF ou CNPJ", ph_entrepreneur: "CNPJ da Empresa", lbl_student: "Digite seu CPF", lbl_researcher: "Informe ORCID/Lattes", lbl_professional: "Informe CPF/CNPJ", lbl_entrepreneur: "Informe o CNPJ" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: { about: "Sobre Nós", homework: "Estudo Dirigido", workstation: "Laboratório de Pesquisa", study_rooms: "Salas de Estudo" },
            encryption: { title: "Agentes de IA vindos de Outra Dimensão.", subtitle: "Eles vieram para ajudar você a ser o melhor.", button: "Saiba mais" },
            study_rooms: {
                system: "SISTEMA IDEAL",
                secure: "CANAL SEGURO",
                encrypted: "ENCRIPTADO",
                highlight: "Encontre seu Esquadrão. Pesquise. Publique.",
                together: "JUNTOS.",
                lobby_status: "Status do Lobby: AO VIVO",
                find_party: "Encontre sua Equipe",
                select_cluster: "Selecione um grupo de pesquisa",
                join: "Entrar na Sessão",
                select: "Selecione uma Sala",
                rooms: {
                    cyber_name: "Hall Cibernético", cyber_topic: "Ciência da Computação",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Medicina e Saúde",
                    quantum_name: "Campo Quântico", quantum_topic: "Matemática",
                    global_name: "Lounge Global", global_topic: "Estudos Gerais"
                }
            },
            agents: {
                zenita: { role: "Tecnologia" },
                ballena: { role: "Saúde" },
                ethernaut: { role: "Matemática" }
            },
            workstation: {
                focus_mode: "Modo Foco",
                system_init: "Sistema inicializado. Agentes aguardando.",
                connected: "Conectado",
                metamask: "MetaMask",
                wepin: "Wepin",
                active_agent: "Agente Ativo",
                clear_history: "Limpar Histórico",
                send: "ENVIAR",
                auto_fix: "CORRIGIR",
                generate: "GERAR",
                processing: "Processando...",
                terminal_title: "TERMINAL (REDE MOVEMENT)",
                session_homework: "Sessão Estudo Dirigido",
                session_save: "Salvar Sessão",
                chat_placeholder: "Qual tópico de {{role}} você quer pesquisar?",
                doc_title_placeholder: "Digite o Título do Documento...",
                doc_content_placeholder: "Aguardando saída gerada... (Você pode escrever aqui também)",
                logs: {
                    switched: "Agente ativo alterado: {{name}}",
                    gen_protocol: "Iniciando protocolo de geração via {{name}}...",
                    content_gen: "Conteúdo gerado. Encriptando para IPFS...",
                    ipfs_success: "Armazenamento IPFS Confirmado: {{hash}}",
                    blockchain_init: "Iniciando Transação Blockchain...",
                    blockchain_securing: "Blockchain: Assegurando dados na Rede Movement...",
                    success: "SUCESSO: Prova de Conhecimento estabelecida!",
                    error: "ERRO: Falha no upload."
                }
            }
        }
    },
    // 6. ESPANHOL (ES)
    es: {
        translation: {
            menu: { new: "Nueva Cuenta", load: "Cargar Cuenta", options: "Opciones", manual: "Manual", back: "Volver al Menú" },
            roles: { student: "Estudiante", researcher: "Investigador", professional: "Profesional", entrepreneur: "Empresario" },
            options: { language: "Idioma", node: "Nodo Blockchain", tutorials: "Tutoriales", on: "ENCENDIDO", off: "APAGADO" },
            modal: { title: "Nueva Cuenta", name: "Nombre Completo", email: "Correo", phone: "Teléfono", continue: "Continuar", cancel: "Cancelar", use_wallet: "Usar Billetera", use_id: "Usar ID", wallet_label: "Dirección de Billetera Movement", wallet_placeholder: "0x...", ph_student: "Documento de Identidad", ph_researcher: "ORCID o ID", ph_professional: "ID Fiscal", ph_entrepreneur: "ID de la Empresa", lbl_student: "Ingrese su ID", lbl_researcher: "Ingrese ORCID", lbl_professional: "Ingrese ID Fiscal", lbl_entrepreneur: "Ingrese ID Empresa" },
            footer: { powered: "Powered by Movement", version: "Zaeon OS - v0.1 / Testnet" },
            navbar: { about: "Sobre Nosotros", homework: "Actividades", workstation: "Lab. de Investigación", study_rooms: "Salas de Estudio" },
            encryption: { title: "Agentes de IA de Otra Dimensión.", subtitle: "Vinieron para ayudarte a ser el mejor.", button: "Saber más" },
            study_rooms: {
                system: "SISTEMA ÓPTIMO",
                secure: "CANAL SEGURO",
                encrypted: "ENCRIPTADO",
                highlight: "Encuentra tu Escuadrón. Investiga. Publica.",
                together: "JUNTOS.",
                lobby_status: "Estado del Lobby: EN VIVO",
                find_party: "Encuentra tu Grupo",
                select_cluster: "Selecciona un grupo de investigación",
                join: "Unirse a la Sesión",
                select: "Seleccionar una Sala",
                rooms: {
                    cyber_name: "Salón Cibernético", cyber_topic: "Ciencias de la Computación",
                    bio_name: "Bio-Lab Alpha", bio_topic: "Medicina y Salud",
                    quantum_name: "Campo Cuántico", quantum_topic: "Matemáticas",
                    global_name: "Salón Global", global_topic: "Estudios Generales"
                }
            },
            agents: {
                zenita: { role: "Tecnología" },
                ballena: { role: "Salud" },
                ethernaut: { role: "Matemáticas" }
            },
            workstation: {
                focus_mode: "Modo Enfoque",
                system_init: "Sistema inicializado. Agentes en espera.",
                connected: "Conectado",
                metamask: "MetaMask",
                wepin: "Wepin",
                active_agent: "Agente Activo",
                clear_history: "Borrar Historial",
                send: "ENVIAR",
                auto_fix: "CORREGIR",
                generate: "GENERAR",
                processing: "Procesando...",
                terminal_title: "TERMINAL (RED MOVEMENT)",
                session_homework: "Sesión de Actividades",
                session_save: "Guardar Sesión",
                chat_placeholder: "¿Qué tema de {{role}} quieres investigar?",
                doc_title_placeholder: "Ingrese el Título del Documento...",
                doc_content_placeholder: "Esperando salida generada... (También puedes escribir aquí)",
                logs: {
                    switched: "Agente activo cambiado: {{name}}",
                    gen_protocol: "Iniciando protocolo de generación vía {{name}}...",
                    content_gen: "Contenido generado. Cifrando para IPFS...",
                    ipfs_success: "Almacenamiento IPFS Confirmado: {{hash}}",
                    blockchain_init: "Iniciando Transacción Blockchain...",
                    blockchain_securing: "Blockchain: Asegurando datos en Red Movement...",
                    success: "ÉXITO: ¡Prueba de Conocimiento establecida!",
                    error: "ERROR: Falló la carga."
                }
            }
        }
    }
};

// Inicialização segura para Next.js (Client Side Only)
if (typeof window !== 'undefined' && !i18n.isInitialized) {
    i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources,
            fallbackLng: "en",
            supportedLngs: ["en", "zh", "ko", "fr", "pt", "es"], // ORDEM CORRETA
            nonExplicitSupportedLngs: true,
            load: 'languageOnly',
            interpolation: {
                escapeValue: false
            },
            react: {
                useSuspense: false
            }
        });
}

export default i18n;