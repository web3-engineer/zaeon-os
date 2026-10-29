import { describe, expect, it } from "vitest";
import { avaliarDeteccao, parseAccessLog, type DetectionEvent } from "./deteccao";
import { montarRelatorio, relatorioMarkdown, type TecnicaExecutada } from "./relatorio";

const eventos: DetectionEvent[] = [
  { method: "GET", path: "/", query: "", ua: "Mozilla", status: 200 },
  { method: "GET", path: "/.git/config", ua: "pentest-scanner/1.0 (lab)", status: 404 },
  { method: "GET", path: "/", query: "pentest_probe=zpt-abc123", ua: "node", status: 200 },
];

describe("pentest · detecção (lado defensivo)", () => {
  it("detecta técnica quando um evento casa a regra da família ATT&CK", () => {
    const scan = avaliarDeteccao("T1595.002", eventos);
    expect(scan.detected).toBe(true);
    expect(scan.rules).toContain("scanner-sensitive-paths"); // também pega o UA de scanner (mesma família T1595)
    const refl = avaliarDeteccao("T1190", eventos);
    expect(refl).toMatchObject({ detected: true, rules: ["input-reflection-probe"] });
  });

  it("não detecta técnica sem evento correspondente (passou)", () => {
    expect(avaliarDeteccao("T1046", eventos)).toMatchObject({ detected: false, rules: [] });
  });

  it("parseAccessLog ignora linhas não-JSON", () => {
    expect(parseAccessLog('{"path":"/a"}\nlixo\n{"path":"/b"}')).toHaveLength(2);
  });
});

describe("pentest · relatório purple", () => {
  const executadas: TecnicaExecutada[] = [
    { actionId: "recon.tcp.ports", attackId: "T1046", decision: "allowed", target: "127.0.0.1:3000" },
    { actionId: "emulate.web.suspicious_request", attackId: "T1595.002", decision: "allowed", target: "http://127.0.0.1:3000/" },
    { actionId: "emulate.web.reflected_input", attackId: "T1190", decision: "allowed", target: "http://127.0.0.1:3000/" },
    { actionId: "emulate.web.reflected_input", attackId: "T1190", decision: "denied", target: "http://fora/" },
  ];

  it("cruza executadas × detecção e calcula cobertura (ignora negadas)", () => {
    const rel = montarRelatorio(executadas, eventos);
    expect(rel.cobertura).toMatchObject({ tecnicas: 3, detectadas: 2, passaram: 1 });
    const t1046 = rel.linhas.find((l) => l.attackId === "T1046")!;
    expect(t1046.detectada).toBe(false); // recon de portas não gera evento web → passou
    expect(rel.linhas.find((l) => l.attackId === "T1595.002")!.detectada).toBe(true);
  });

  it("markdown tem as duas colunas e a cobertura", () => {
    const md = relatorioMarkdown(montarRelatorio(executadas, eventos));
    expect(md).toMatch(/detecção \| regra/);
    expect(md).toMatch(/2\/3/);
  });
});
