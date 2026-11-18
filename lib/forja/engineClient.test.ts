import { describe, it, expect, afterEach } from "vitest";
import { engineDisponivel, grafoDoRepo, chamarPonte } from "./engineClient";

const ENV0 = { url: process.env.FORJA_BRIDGE_URL, token: process.env.FORJA_BRIDGE_TOKEN };
afterEach(() => {
  process.env.FORJA_BRIDGE_URL = ENV0.url;
  process.env.FORJA_BRIDGE_TOKEN = ENV0.token;
});
function comPonte() { process.env.FORJA_BRIDGE_URL = "http://127.0.0.1:8800"; process.env.FORJA_BRIDGE_TOKEN = "t0k3n"; }
function semPonte() { delete process.env.FORJA_BRIDGE_URL; delete process.env.FORJA_BRIDGE_TOKEN; }

// resposta no SHAPE REAL do graphify 0.9.108 (conferido na box: nós com source_location string "Lnn")
const respostaReal = {
  ok: true, engine: "graphify",
  grafo: {
    directed: false,
    graph: { schema_version: 1, graphify_version: "0.9.108" },
    nodes: [
      { id: "src_app_app", label: "App()", source_file: "src/App.jsx", source_location: "L6", _callable: true, community: 6 },
      { id: "src_app_addtodo", label: "addTodo()", source_file: "src/App.jsx", source_location: "L18" },
      { id: "src_todolist", label: "TodoList()", source_file: "src/TodoList.jsx", source_location: "L3" },
    ],
    links: [
      { source: "src_app_app", target: "src_app_addtodo", relation: "calls" },
      { source: "src_app_app", target: "src_todolist", relation: "imports" },
    ],
  },
};
const fetchOk: typeof fetch = async () => new Response(JSON.stringify(respostaReal), { status: 200 });

describe("engineClient — cliente app→ponte da Forja", () => {
  it("engineDisponivel segue a config da ponte", () => {
    semPonte(); expect(engineDisponivel()).toBe(false);
    comPonte(); expect(engineDisponivel()).toBe(true);
  });

  it("sem ponte, grafoDoRepo degrada pra null (board fica no esqueleto)", async () => {
    semPonte();
    expect(await grafoDoRepo("owner/repo", fetchOk)).toBeNull();
  });

  it("com ponte, normaliza a saída real do graphify no GrafoConhecimento", async () => {
    comPonte();
    const g = await grafoDoRepo("WebDevSimplified/react-todo-list", fetchOk);
    expect(g).not.toBeNull();
    expect(g!.nos).toHaveLength(3);
    const app = g!.nos.find((n) => n.id === "src_app_app")!;
    expect(app.nome).toBe("App()");
    expect(app.caminho).toBe("src/App.jsx");
    expect(app.tipo).toBe("funcao");          // tem source_location
    expect(app.fonte).toBe("graphify");
    expect(g!.arestas).toHaveLength(2);
    expect(g!.arestas.find((a) => a.tipo === "chama")).toBeTruthy();   // calls
    expect(g!.arestas.find((a) => a.tipo === "importa")).toBeTruthy(); // imports
    expect(g!.raiz).toBe("src_app_app");       // o mais central
  });

  it("repo inválido ou erro de rede → null (nunca quebra a rota)", async () => {
    comPonte();
    expect(await grafoDoRepo("sem-barra", fetchOk)).toBeNull();
    const fetch500: typeof fetch = async () => new Response("nope", { status: 502 });
    expect(await grafoDoRepo("owner/repo", fetch500)).toBeNull();
    const fetchThrow: typeof fetch = async () => { throw new Error("rede"); };
    expect(await chamarPonte("owner/repo", "graphify", fetchThrow)).toBeNull();
  });
});
