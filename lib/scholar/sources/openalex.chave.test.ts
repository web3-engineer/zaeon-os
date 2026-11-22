import { describe, it, expect } from "vitest";
import { paramsOpenAlex } from "./openalex";
import { fetchWithRetry } from "../http";

describe("OpenAlex: chave e cota (nov/2026)", () => {
  it("manda a chave quando há OPENALEX_API_KEY, e o mailto como identificação", () => {
    expect(paramsOpenAlex({ OPENALEX_API_KEY: "k 1", UNPAYWALL_EMAIL: "a@b.c" })).toBe("&api_key=k%201&mailto=a%40b.c");
    expect(paramsOpenAlex({})).toBe("");
  });
  it("429 com repetir429:false volta na hora (cota diária não melhora esperando) — a fonte pausa", async () => {
    let chamadas = 0;
    const fetchImpl = (async () => { chamadas++; return new Response("{}", { status: 429 }); }) as unknown as typeof fetch;
    const r = await fetchWithRetry("https://x", {}, { retries: 3, repetir429: false, fetchImpl, sleep: async () => {} });
    expect(r.status).toBe(429);
    expect(chamadas).toBe(1);
  });
  it("sem a opção, 429 continua sendo repetido (as outras fontes não mudam)", async () => {
    let chamadas = 0;
    const fetchImpl = (async () => { chamadas++; return new Response("{}", { status: 429 }); }) as unknown as typeof fetch;
    await fetchWithRetry("https://x", {}, { retries: 2, fetchImpl, sleep: async () => {} });
    expect(chamadas).toBe(3);
  });
});

describe("arXiv: entidades XML no título", () => {
  it("&amp; vira & (ia cru pra referência ABNT)", async () => {
    const { parseArxiv } = await import("./arxiv");
    const xml = `<feed><entry><id>http://arxiv.org/abs/physics/0608058v2</id><title>Cinema, Fermi Problems, &amp; General Education</title><published>2006-08-01</published><summary>x</summary><author><name>C. J. Efthimiou</name></author></entry></feed>`;
    expect(parseArxiv(xml)[0]!.title).toBe("Cinema, Fermi Problems, & General Education");
  });
});

describe("Crossref: resumo JATS", () => {
  it("vira texto sem tags e sem o título 'Abstract'", async () => {
    const { parseCrossref } = await import("./crossref");
    const json = { message: { items: [{ DOI: "10.1/x", title: ["T"], abstract: "<jats:title>Abstract</jats:title><jats:p>Greywater from schools was treated by a constructed wetland &amp; reused for irrigation.</jats:p>" }] } };
    expect(parseCrossref(json)[0]!.abstract).toBe("Greywater from schools was treated by a constructed wetland & reused for irrigation.");
  });
});
