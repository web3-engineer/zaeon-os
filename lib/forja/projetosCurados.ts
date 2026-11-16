import projetosRestantes from "./projetosRestantes.json";
import { type CardDeArquivo } from "./tutorialArquivo";
import type { ArquivoProjeto } from "./projetoDoCurso";

type ProjetoCurado = { executar: string; residual: ArquivoProjeto[]; prepararTeste: string; pacotes?: string[] };

const CALCULADORA: ProjetoCurado = {
  executar: "Abra `index.html` no navegador para usar a calculadora.",
  prepararTeste: "document.body.insertAdjacentHTML('beforeend', '<main id=\"app\"></main>');",
  residual: [
    {
      path: "index.html",
      content: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Calculadora</title>
  <style>
    body { font: 1rem system-ui; margin: 2rem auto; max-width: 30rem; padding: 0 1rem; }
    form, label { display: grid; gap: .65rem; }
    input, select, button { font: inherit; padding: .5rem; }
    output { min-height: 1.5em; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Calculadora</h1>
  <main id="app"></main>
  <script src="calculadora.js"></script>
  <script src="interface.js"></script>
</body>
</html>`,
    },
  ],
};

type ProjetoFonte = {
  titulo: string;
  card: CardDeArquivo;
  arquivos: {
    comando?: string;
    pacotes?: string[];
    notebook?: boolean;
    server?: string;
    persistir?: boolean;
    script?: string;
    css?: string;
  } & Record<string, unknown>;
};

const projetos = projetosRestantes as unknown as Record<string, ProjetoFonte>;
const prepararPagina = CALCULADORA.prepararTeste;

export function cardFinalDoCurso(cursoId: string): CardDeArquivo | undefined {
  return projetos[cursoId]?.card;
}

export function projetoCuradoDoCurso(cursoId: string): ProjetoCurado | undefined {
  if (cursoId === "calculadora") return CALCULADORA;
  const fonte = projetos[cursoId];
  if (!fonte) return undefined;
  const { titulo, card, arquivos } = fonte;
  const { comando, pacotes, notebook, server, persistir, script, css, ...dados } = arquivos;
  const residual = Object.entries(dados).map(([path, content]) => ({ path, content: String(content) }));

  if (card.linguagem === "python") {
    residual.push({ path: "executar.py", content: "from projeto import main\n\nif __name__ == '__main__':\n    print(main())\n" });
    if (pacotes?.length) residual.push({ path: "requirements.txt", content: pacotes.join("\n") + "\n" });
    if (notebook) {
      residual.push({ path: "experimento.ipynb", content: JSON.stringify({
        nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { name: "python3", display_name: "Python 3", language: "python" } },
        cells: [
          { id: "introducao", cell_type: "markdown", metadata: {}, source: ["# Experimento reprodutível"] },
          { id: "experimento", cell_type: "code", metadata: {}, execution_count: null, outputs: [],
            source: ["from projeto import experimento\n", "experimento(semente=42, tamanho=100)"] },
        ],
      }, null, 2) });
    }
    const instalar = pacotes?.length ? "Instale as dependências com `python -m pip install -r requirements.txt`. " : "";
    const executar = `${instalar}Rode ` + "`" + `python executar.py${comando ? " " + comando : ""}` + "`." +
      (notebook ? " Abra também `experimento.ipynb` no Jupyter e execute a célula." : "");
    return { executar, residual, prepararTeste: "", pacotes };
  }

  if (server) {
    const inicio = persistir
      ? "const fs = require('node:fs');\nconst arquivo = 'links.json';\nconst dados = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : {};\nconst api = criarApi(dados, (links) => { fs.writeFileSync(arquivo + '.tmp', JSON.stringify(links)); fs.renameSync(arquivo + '.tmp', arquivo); });"
      : "const api = criarApi();";
    residual.push({ path: "servidor.js", content: `const http = require('node:http');
const criarApi = require('./projeto.js');
${inicio}
http.createServer(async (req, res) => {
  try {
    let corpo = '';
    for await (const pedaco of req) {
      corpo += pedaco;
      if (corpo.length > 65536) { res.writeHead(413).end(); return; }
    }
    const [status, valor, headers] = api(req.method, new URL(req.url, 'http://localhost').pathname, corpo ? JSON.parse(corpo) : {});
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(valor === null ? undefined : JSON.stringify(valor));
  } catch (erro) {
    res.writeHead(erro instanceof SyntaxError ? 400 : 500).end();
  }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1');` });
    const exemplo = persistir ? 'POST /links com {"url":"https://example.org"}' : 'GET /tarefas ou POST /tarefas com {"titulo":"Estudar"}';
    return { executar: `Rode ` + "`node servidor.js`" + ` e faça ${exemplo} em http://127.0.0.1:3000.`, residual, prepararTeste: "" };
  }

  residual.push({ path: "index.html", content: `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo}</title>
  ${css ? `<link rel="stylesheet" href="${css}">` : ""}
  <style>body{font:1rem system-ui;margin:2rem auto;max-width:48rem;padding:0 1rem}button,input,textarea,select{font:inherit;margin:.25rem}textarea{width:95%;min-height:8rem}</style>
</head>
<body>
  <h1>${titulo}</h1>
  <main id="app"></main>
  ${script ? `<script src="${script}"></script>` : ""}
  <script src="${card.arquivo}"></script>
</body>
</html>` });
  return { executar: "Abra `index.html` no navegador." + (script ? " Este projeto carrega a biblioteca e seus recursos pela internet." : ""), residual, prepararTeste: prepararPagina };
}
