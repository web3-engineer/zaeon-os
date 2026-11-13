import { describe, it, expect } from "vitest";
import { extrairUrl, hostPrivado, urlPublicaSegura, comandoParaArtefato, detectarAlvoReal } from "./alvoReal";

describe("rea · alvoReal (decisão de alvo real)", () => {
  it("extrairUrl acha a URL e tira pontuação colada", () => {
    expect(extrairUrl("faz a engenharia reversa de https://exemplo.com/app, por favor")).toBe("https://exemplo.com/app");
    expect(extrairUrl("sem url aqui")).toBeNull();
    expect(extrairUrl("veja (https://a.b/c).")).toBe("https://a.b/c");
  });

  it("hostPrivado barra localhost, faixas privadas, link-local e metadata", () => {
    for (const h of ["localhost", "127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.1", "172.31.255.1", "169.254.169.254", "0.0.0.0", "algo.local", "api.internal", "::1"]) {
      expect(hostPrivado(h), h).toBe(true);
    }
    for (const h of ["exemplo.com", "1.1.1.1", "8.8.8.8", "172.15.0.1", "172.32.0.1", "cdn.site.org"]) {
      expect(hostPrivado(h), h).toBe(false);
    }
  });

  it("urlPublicaSegura: só http/https público, sem credencial, porta sã", () => {
    expect(urlPublicaSegura("https://exemplo.com")).toBe(true);
    expect(urlPublicaSegura("http://exemplo.com:8080/x")).toBe(true);
    expect(urlPublicaSegura("https://user:pass@exemplo.com")).toBe(false); // credencial embutida
    expect(urlPublicaSegura("http://127.0.0.1:3000")).toBe(false);          // privado
    expect(urlPublicaSegura("ftp://exemplo.com")).toBe(false);              // protocolo
    expect(urlPublicaSegura("https://exemplo.com:22")).toBe(false);         // porta incomum
    expect(urlPublicaSegura("http://169.254.169.254/latest/meta-data")).toBe(false); // SSRF metadata
  });

  it("comandoParaArtefato mapeia APK → inspect-android-package e outros formatos", () => {
    expect(comandoParaArtefato("app.apk")).toBe("inspect-android-package");
    expect(comandoParaArtefato("jogo.aab")).toBe("inspect-android-package");
    expect(comandoParaArtefato("mod.wasm")).toBe("inspect-wasm-artifact");
    expect(comandoParaArtefato("captura.pcap")).toBe("inspect-packet-capture");
    expect(comandoParaArtefato("bundle.js")).toBe("analyze-javascript-application");
    expect(comandoParaArtefato("arquivo.bin")).toBe("analyze");
  });

  it("detectarAlvoReal: APK anexado ganha prioridade sobre URL", () => {
    const alvo = detectarAlvoReal("engenharia reversa deste https://exemplo.com", [{ nome: "alvo.apk", bytes: 123 }]);
    expect(alvo).toEqual({ tipo: "artefato", nome: "alvo.apk", comando: "inspect-android-package" });
  });

  it("detectarAlvoReal: site vira alvo url; sem alvo analisável → null (fica no modo leve)", () => {
    expect(detectarAlvoReal("faz engenharia reversa de https://exemplo.com/app")).toEqual({ tipo: "url", url: "https://exemplo.com/app", comando: "analyze-web-bundle" });
    expect(detectarAlvoReal("como o Shazam reconhece música?")).toBeNull();
    expect(detectarAlvoReal("analisa http://127.0.0.1:3000")).toBeNull(); // alvo privado não vira alvo real
  });
});
