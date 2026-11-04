/** #686: o e-mail digitado no login, limpo e conferido. Sem nada de servidor: a tela de entrar também usa. */
export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const limparEmail = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "");
