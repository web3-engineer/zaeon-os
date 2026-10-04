# Cyberespaço (ex-Lounge Cósmico) — estado e arquitetura

Entrada da Zaeon em produção, **sem flag**. Espec visual original: handoff "Lounge Cósmico + Base de Estudo" (protótipo em `docs/prototypes/cosmic-map.html`, que segue como referência; `public/cosmic-map.html` é cópia de dev).

## Rotas e telas
- `/lounge-cosmico` — tela cheia imersiva (Navbar some: `lib/ui/loungeHub.ehRotaImersiva`). Só logado; pede o **nome de usuário** 1x (`POST /api/user/nome` → `User.name` + `onboardingComplete`, sem mudança de schema). Depois monta `<CosmicLounge modo="tela"/>`.
- Landing do logado (`hero-content.tsx`) — `<LoungeJanela/>`: `<CosmicLounge modo="janela"/>` (começa no menu do monitor, sem rede). **Maximizar** só habilita depois de iniciar a sessão (opção do monitor ou segurar ESPAÇO). Na janela o canvas não rouba a roda do mouse nem o ESPAÇO da página.
- Login Google → `/lounge-cosmico`. Tour/onboarding antigo desligado: `TOUR_ATIVO=false` em `lib/onboarding/tour.ts` (sidebar/`MenuNavigation` seguem disponíveis).

## Código
| Peça | Onde |
|---|---|
| Regras puras (testadas) | `lib/cyber/{bases,colisao,clique}.ts` |
| Cenário (nebulosa do dono, buraco negro, estrelas, chão) | `components/cyber/CenaCosmica.ts` |
| Base de estudo (plataforma, monitor, cadeira, cristais, neurônios) | `components/cyber/BaseEstudo.ts` |
| "Ser de luz" (contrato isolado p/ trocar por GLB/RPM) | `components/cyber/AvatarLuz.ts` |
| Engine imperativa (loop, entrada, câmera, colisão, rede→atores) | `components/cyber/engine.ts` |
| React: HUD, chat, convite, touch | `components/cyber/{CenaCyber,CosmicLounge,Joystick}.tsx` |
| Qual sala abrir (convite `?sala=`) | `components/lounge/useResolverSala.ts` |

## Regras (handoff §2 e §5.4)
- **Base por pessoa, privada, fixa**: posição = f(índice em `members[]`) num anel de raio 9 em volta da praça (`posicaoDaBase`). A ordem só cresce, então é igual pra todos; **sair da sala remove o personagem, não a base**. Só o dono clica no próprio monitor; o de outra pessoa mostra "Base de X · privada".
- **Colisão**: colisor circular por base (`BASE_COLLIDER_R`); projeta na borda (desliza). Vale pra jogador, colegas e destino do clique.
- **Monitor**: hover → brilho/pulso + cursor pointer + rótulo; clique perto → Sala de Estudos (`/research-lab`); longe → anda até a base. Prioridade: monitor → colega → chão.
- **Multiplayer**: reaproveita a sala `lounge_canvas` (CollabDoc) — `useSala3D` (Pusher presença `presence-lounge3d-<id>`, teto 5 no auth, posição por `client-pos` 12 Hz, chat). Convite = botão **Convidar** (só o dono tem o token) → `/lounge-cosmico?sala=<token>` → `POST /api/collab/join`. As rotas `/api/lounge3d/*` agora respondem sem flag (acesso: sessão + `members[]`, IDOR → 404). `lounge3dOn()` só controla a aba Lounge 3D da Sala de Pesquisa.
- **Sala cheia / erro / sem Pusher**: dá pra "Entrar sozinho"; sem tempo real aparece aviso.
- **Mobile**: joystick, CORRER, PULAR, pinça; LOD (DPR ≤ 1.5, sem antialias, menos partículas).

## Não verificado / pendências
- Multiplayer **entre duas contas reais** com Pusher de verdade (testado com presenças simuladas).
- Requer `NEXT_PUBLIC_PUSHER_KEY/CLUSTER` + `client events` ligado no app Pusher; sem isso cai no POST `/pos` a 4 Hz ou "sem tempo real".
- Avatar é o humanoide procedural holográfico (sem GLB). Trocar = reimplementar `criarAvatarLuz` mantendo o contrato.
- Dispositivo móvel real (gestos, FPS), navegador logado de ponta a ponta.
