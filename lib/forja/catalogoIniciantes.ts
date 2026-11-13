/**
 * lib/forja/catalogoIniciantes.ts — os 10 projetos OSS para INICIANTES da Forja (Fase C do loop RALPH).
 *
 * Um conceito cada, pequeno, licença permissiva, que um iniciante entende e consegue publicar o PRIMEIRO
 * projeto no GitHub (via Octa). Cada repo foi ACHADO e CONFERIDO por busca no GitHub ao vivo (full_name,
 * licença e tamanho reais — nada inventado), não decorado. O aluno estuda o repo-referência pela Forja
 * (board + lições + temperatura) e entrega o seu pela Octa. A licença de cada um é preservada e exibida.
 *
 * Todos MIT (conferido no índice do GitHub em 2026-11). O grafo/árvore reais entram quando o engine rodar
 * na Contabo; até lá, cada curso abre com o board, a temperatura e as lições — e a trilha de publicar.
 */
import type { EsqueletoRepo } from "./tipos";

const mit = (repo: string, titular: string): EsqueletoRepo["licenca"] => ({
  spdx: "MIT", titular, url: `https://github.com/${repo}/blob/HEAD/LICENSE`,
});

export const INICIANTES: EsqueletoRepo[] = [
  {
    id: "lista-de-tarefas", conceito: "lista de tarefas", modo: "curso",
    repo: "WebDevSimplified/react-todo-list",
    titulo: "Lista de tarefas", resumo: "Seu primeiro app com estado: adicionar, marcar e remover tarefas. O 'olá mundo' das interfaces.",
    licenca: mit("WebDevSimplified/react-todo-list", "Kyle Cook (Web Dev Simplified)"),
  },
  {
    id: "app-de-clima", conceito: "app de clima", modo: "curso",
    repo: "andrewgleave/react-weather",
    titulo: "App de clima", resumo: "Buscar uma cidade e mostrar o tempo: como consumir uma API e desenhar o que ela devolve.",
    licenca: mit("andrewgleave/react-weather", "Andrew Gleave"),
  },
  {
    id: "calculadora", conceito: "calculadora", modo: "curso",
    repo: "AlexFlorides/javascript-calculator",
    titulo: "Calculadora", resumo: "A lógica por trás dos botões: eventos, estado e a ordem das operações, em JavaScript puro.",
    licenca: mit("AlexFlorides/javascript-calculator", "Alex Florides"),
  },
  {
    id: "quiz", conceito: "quiz", modo: "curso",
    repo: "jamesqquick/Build-A-Quiz-App-With-HTML-CSS-and-JavaScript",
    titulo: "Quiz", resumo: "Perguntas, pontuação e telas: HTML, CSS e JavaScript juntos num app completo e pequeno.",
    licenca: mit("jamesqquick/Build-A-Quiz-App-With-HTML-CSS-and-JavaScript", "James Q Quick"),
  },
  {
    id: "pomodoro", conceito: "cronômetro pomodoro", modo: "curso",
    repo: "luckyshot/twentyfive",
    titulo: "Pomodoro", resumo: "Um timer de foco: trabalhar com o tempo, intervalos e notificações no navegador.",
    licenca: mit("luckyshot/twentyfive", "Xavi Esteve"),
  },
  {
    id: "jogo-da-velha", conceito: "jogo simples (jogo da velha)", modo: "curso",
    repo: "arasgungore/Tic-Tac-Toe",
    titulo: "Jogo da velha", resumo: "Seu primeiro jogo: tabuleiro, turnos e a regra de quem venceu — lógica pura e divertida.",
    licenca: mit("arasgungore/Tic-Tac-Toe", "Aras Güngöre"),
  },
  {
    id: "markdown-para-html", conceito: "conversor Markdown→HTML", modo: "curso",
    repo: "cwjohan/markdown-to-html",
    titulo: "Conversor Markdown → HTML", resumo: "Transformar texto em página: ler um formato e gerar outro, o coração de muitas ferramentas.",
    licenca: mit("cwjohan/markdown-to-html", "cwjohan"),
  },
  {
    id: "encurtador-de-url", conceito: "encurtador de URL", modo: "curso",
    repo: "zero-archive/node-url-shortener",
    titulo: "Encurtador de URL", resumo: "Um backend de verdade: guardar um link, gerar um código curto e redirecionar. Node na prática.",
    licenca: mit("zero-archive/node-url-shortener", "zero-archive"),
  },
  {
    id: "api-rest-crud", conceito: "API REST mínima (CRUD)", modo: "curso",
    repo: "adnanrahic/building-a-serverless-rest-api-with-nodejs",
    titulo: "API REST (CRUD)", resumo: "Criar, ler, atualizar e apagar: os quatro verbos de toda API, num exemplo mínimo em Node.",
    licenca: mit("adnanrahic/building-a-serverless-rest-api-with-nodejs", "Adnan Rahić"),
  },
  {
    id: "portfolio", conceito: "página de portfólio", modo: "curso",
    repo: "CommunityPro/portfolio-html",
    titulo: "Página de portfólio", resumo: "Seu cartão de visitas na web: HTML e CSS para publicar quem você é — e o primeiro repo no GitHub.",
    licenca: mit("CommunityPro/portfolio-html", "CommunityPro"),
  },
];
