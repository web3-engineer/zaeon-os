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
            agents: { zenita: { role: "Technology" }, ballena: { role: "Health" }, ethernaut: { role: "Mathematics" } },
            about: {
                back: "Back",
                scroll_down: "scroll down to learn everything",
                title_secondary: "The school of the future.",
                title_main: "HAPPENING NOW.",
                genesis: {
                    title: "The Genesis of the Protocol",
                    p1: "Today, our attention is stolen by large corporations seeking only profit, capturing the focus of millions while their algorithms erode human intelligence.",
                    p2: "Zaeon emerges to change this: we've come to rescue the joy of learning again: with depth, modernity, and fun. While traditional education stopped in time, we unlock your true potential through powerful AI Agents. Here, humans and machines work for a better world ",
                    p2_highlight: "within the Blockchain."
                },
                mission: {
                    title: "Our Mission",
                    p1: "To empower the next generation of students, researchers, and teachers by offering high-impact tools for the daily life of those seeking knowledge and education.",
                    p2: "We use Movement technology to record your evolution in a way that no one can erase or alter. Here, your research isn't a copied and pasted text; it's an eternal and secure digital record.",
                    quote: "Knowledge should not just be acquired; it must be preserved and secured."
                },
                architecture: {
                    title: "The Zaeon Architecture",
                    subtitle: "Innovative technology set to impact millions of students worldwide.",
                    card1_t: "Intelligent Agents",
                    card1_d: "We offer expert mentors with refined knowledge tailored to each country, institution, and field of study. Everything is customizable and specific to you.",
                    card2_t: "Trusted Blockchain",
                    card2_d: "Movement acts as a high-performance database, ensuring every document generated is your intellectual property and acting as a credential validator.",
                    card3_t: "Hybrid Study",
                    card3_d: "Agents encourage regional study groups while controlling digital environments where global collaboration happens in real-time."
                },
                cta: {
                    wait: "The future awaits your connection",
                    join: "Join Zaeon",
                    button: "Start Protocol"
                }
            }
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
            agents: { zenita: { role: "Tecnologia" }, ballena: { role: "Saúde" }, ethernaut: { role: "Matemática" } },
            about: {
                back: "Voltar",
                scroll_down: "deslize para baixo pra saber tudo",
                title_secondary: "A escola do futuro.",
                title_main: "ACONTECENDO AGORA.",
                genesis: {
                    title: "A Gênese do Protocolo",
                    p1: "Hoje, nossa atenção é roubada por grandes empresas que buscam apenas o lucro, roubando a atenção de milhões enquanto seus algoritmos destróem a inteligência humana.",
                    p2: "A Zaeon surge para mudar isso: viemos resgatar o prazer de aprender novamente: Com profundidade, modernidade e diversão. Enquanto o ensino tradicional parou no tempo e não acompanha a tecnologia, nós destravamos o seu verdadeiro potencial através de Agentes de IA poderosos. Aqui, humanos e máquinas irão trabalhar por um mundo melhor ",
                    p2_highlight: "dentro da Blockchain."
                },
                mission: {
                    title: "Nossa Missão",
                    p1: "Capacitar a próxima geração de estudantes, pesquisadores e professores, oferecendo ferramentas de alto impacto para o dia-a-dia de quem busca conhecimento e educação.",
                    p2: "Usamos a tecnologia Movement para gravar sua evolução de um jeito que ninguém pode apagar ou alterar. Aqui, sua pesquisa não é um texto copiado e colado, é um registro digital eterno e seguro, que prova para o mundo tudo o que você aprendeu e está desenvolvendo.",
                    quote: "O conhecimento não deve apenas ser adquirido, deve ser preservado e assegurado."
                },
                architecture: {
                    title: "A Arquitetura Zaeon",
                    subtitle: "A inovadora tecnologia que vai impactar milhões de estudantes no mundo todo.",
                    card1_t: "Agentes Inteligentes",
                    card1_d: "Oferecemos mentores especialistas com conhecimento refinado de acordo com cada país, estado, instituição e área do conhecimento. tudo personalizável e específico, feito para você.",
                    card2_t: "Blockchain confiável",
                    card2_d: "A Movement atua como banco de dados de alta performance, garantindo que cada documento gerado seja sua propriedade intelectual, além de atuar como validador de credenciais escolares.",
                    card3_t: "Estudo Híbrido",
                    card3_d: "Agentes incentivam grupos de estudo regionais, ao mesmo tempo que controlam ambientes digitais onde a colaboração acontece em tempo real, com estudantes do mundo todo, sem barreiras de linguagem."
                },
                cta: {
                    wait: "O futuro aguarda sua conexão",
                    join: "Junte-se à Zaeon",
                    button: "Iniciar Protocolo"
                }
            }
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
            agents: { zenita: { role: "科技" }, ballena: { role: "健康" }, ethernaut: { role: "数学" } },
            about: {
                back: "返回",
                scroll_down: "向下滚动了解全部内容",
                title_secondary: "未来的学校。",
                title_main: "就在当下。",
                genesis: {
                    title: "协议的起源",
                    p1: "如今，大公司正在夺走我们的注意力，通过算法破坏人类智力，只为追求利润。",
                    p2: "Zaeon 为改变这一现状而生：我们来拯救学习的乐趣。通过强大的 AI 代理，解锁您的真实潜力。在这里，人类和机器将共同努力 ",
                    p2_highlight: "在区块链上创造更美好的世界。"
                },
                mission: {
                    title: "我们的使命",
                    p1: "为下一代学生、研究人员和教师提供高效工具，助力每日知识探索。",
                    p2: "我们使用 Movement 技术记录您的成长，确保记录不可篡改。在这里，您的研究是永恒且安全的数字资产。",
                    quote: "知识不应只是被获取，更应被妥善保护。"
                },
                architecture: {
                    title: "Zaeon 架构",
                    subtitle: "即将改变全球数百万学生学习方式的创新技术。",
                    card1_t: "智能代理",
                    card1_d: "提供针对不同国家、机构和领域的专业导师。一切都是为您量身定制的。",
                    card2_t: "可信区块链",
                    card2_d: "Movement 作为高性能数据库，确保生成的每一份文档都是您的知识产权。",
                    card3_t: "混合学习",
                    card3_d: "代理鼓励区域学习小组，同时建立无语言障碍的全球实时协作数字环境。"
                },
                cta: {
                    wait: "未来期待您的连接",
                    join: "加入 Zaeon",
                    button: "启动协议"
                }
            }
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
            agents: { zenita: { role: "기술" }, ballena: { role: "건강/의학" }, ethernaut: { role: "수학" } },
            about: {
                back: "뒤로",
                scroll_down: "모든 내용을 보려면 아래로 스크롤하세요",
                title_secondary: "미래의 학교.",
                title_main: "지금 일어나고 있습니다.",
                genesis: {
                    title: "프로토콜의 기원",
                    p1: "오늘날 우리의 관심은 오직 이익만을 추구하는 대기업들에 의해 도둑맞고 있습니다. 그들의 알고리즘은 인간의 지성을 파괴하고 있습니다.",
                    p2: "Zaeon은 이를 바꾸기 위해 탄생했습니다. 우리는 배움의 즐거움을 되찾아주려 합니다. 강력한 AI 에이전트를 통해 당신의 진정한 잠재력을 깨우세요. ",
                    p2_highlight: "블록체인 안에서 더 나은 세상을 만들 것입니다."
                },
                mission: {
                    title: "우리의 미션",
                    p1: "지식과 교육을 추구하는 이들의 일상을 위한 고영향력 도구를 제공하여 다음 세대의 학생, 연구자, 교사들에게 힘을 실어줍니다.",
                    p2: "우리는 Movement 기술을 사용하여 당신의 성장을 누구도 지우거나 수정할 수 없는 방식으로 기록합니다. 당신의 연구는 영원하고 안전한 디지털 기록이 됩니다.",
                    quote: "지식은 단순히 습득되는 것이 아니라, 보존되고 보호되어야 합니다."
                },
                architecture: {
                    title: "Zaeon 아키텍처",
                    subtitle: "전 세계 수백만 명의 학생들에게 영향을 미칠 혁신적인 기술.",
                    card1_t: "지능형 에이전트",
                    card1_d: "국가, 기관, 분야별로 최적화된 지식을 가진 전문가 멘토를 제공합니다. 모든 것이 당신에게 맞춰져 있습니다.",
                    card2_t: "신뢰할 수 있는 블록체인",
                    card2_d: "Movement는 고성능 데이터베이스 역할을 하여 생성된 모든 문서가 당신의 지적 재산임을 보장합니다.",
                    card3_t: "하이브리드 학습",
                    card3_d: "에이전트는 지역 스터디 그룹을 장려하는 동시에, 언어 장벽 없는 글로벌 실시간 협업 환경을 제어합니다."
                },
                cta: {
                    wait: "미래가 당신의 연결을 기다립니다",
                    join: "Zaeon에 참여하세요",
                    button: "프로토콜 시작"
                }
            }
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
                    quantum_name: "Campo Quântico", quantum_topic: "Matemáticas",
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
            agents: { zenita: { role: "Tecnología" }, ballena: { role: "Salud" }, ethernaut: { role: "Matemáticas" } },
            about: {
                back: "Volver",
                scroll_down: "desliza para saber todo",
                title_secondary: "La escuela del futuro.",
                title_main: "SUCEDIENDO AHORA.",
                genesis: {
                    title: "La Génesis del Protocolo",
                    p1: "Hoy, nuestra atención es robada por grandes empresas que buscan solo el lucro, destruyendo la inteligencia humana con sus algoritmos.",
                    p2: "Zaeon surge para cambiar esto: venimos a rescatar el placer de aprender. A través de potentes Agentes de IA, desbloqueamos tu verdadero potencial. ",
                    p2_highlight: "dentro de la Blockchain."
                },
                mission: {
                    title: "Nuestra Misión",
                    p1: "Empoderar a la próxima generación ofreciendo herramientas de alto impacto para quienes buscan conocimiento y educación.",
                    p2: "Usamos la tecnología Movement para grabar tu evolución de forma inalterable. Tu investigación es un registro digital eterno y seguro.",
                    quote: "El conocimiento no solo debe adquirirse, debe preservarse y asegurarse."
                },
                architecture: {
                    title: "La Arquitectura Zaeon",
                    subtitle: "Tecnología innovadora que impactará a millones de estudiantes en todo el mundo.",
                    card1_t: "Agentes Inteligentes",
                    card1_d: "Mentores expertos con conocimiento refinado según cada país e institución. Todo personalizable para ti.",
                    card2_t: "Blockchain Confiable",
                    card2_d: "Movement actúa como base de datos de alto rendimiento, asegurando tu propiedad intelectual.",
                    card3_t: "Estudio Híbrido",
                    card3_d: "Los agentes fomentan grupos de estudio regionales y colaboración global en tiempo real sin barreras de idioma."
                },
                cta: {
                    wait: "El futuro aguarda tu conexión",
                    join: "Únete a Zaeon",
                    button: "Iniciar Protocolo"
                }
            }
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
                logs: { switched: "Changé pour {{name}}", gen_protocol: "Protocole initié via {{name}}", content_gen: "Contenu généré.", ipfs_success: "IPFS Succès: {{hash}}", blockchain_init: "Sécurisation sur Movement...", success: "Succès!", error: "Erreur." }
            },
            agents: { zenita: { role: "Technologie" }, ballena: { role: "Santé" }, ethernaut: { role: "Mathématiques" } },
            about: {
                back: "Retour",
                scroll_down: "faites défiler pour tout savoir",
                title_secondary: "L'école du futur.",
                title_main: "ÇA SE PASSE MAINTENANT.",
                genesis: {
                    title: "La Genèse du Protocole",
                    p1: "Aujourd'hui, notre attention est volée par de grandes entreprises qui ne cherchent que le profit, détruisant l'intelligence humaine avec leurs algorithmes.",
                    p2: "Zaeon surgit pour changer cela : nous venons sauver le plaisir d'apprendre. Grâce à de puissants agents IA, nous débloquons votre véritable potentiel. ",
                    p2_highlight: "au sein de la Blockchain."
                },
                mission: {
                    title: "Notre Mission",
                    p1: "Autonomiser la prochaine génération en offrant des outils à fort impact pour ceux qui recherchent la connaissance et l'éducation.",
                    p2: "Nous utilisons la technologie Movement pour enregistrer votre évolution de manière inaltérable. Votre recherche est un enregistrement numérique éternel.",
                    quote: "La connaissance ne doit pas seulement être acquise, elle doit être préservée et sécurisée."
                },
                architecture: {
                    title: "L'Architecture Zaeon",
                    subtitle: "Une technologie innovante qui impactera des millions d'étudiants dans le monde.",
                    card1_t: "Agents Intelligents",
                    card1_d: "Nous offrons des mentors experts avec des connaissances affinées selon chaque pays et institution. Tout est personnalisable pour vous.",
                    card2_t: "Blockchain de Confiance",
                    card2_d: "Movement agit comme une base de données haute performance, garantissant votre propriété intellectuelle.",
                    card3_t: "Étude Hybride",
                    card3_d: "Les agents encouragent les groupes d'étude régionaux et la collaboration mondiale en temps réel sans barrières linguistiques."
                },
                cta: {
                    wait: "Le futur attend votre connexion",
                    join: "Rejoindre Zaeon",
                    button: "Démarrer le Protocole"
                }
            }
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