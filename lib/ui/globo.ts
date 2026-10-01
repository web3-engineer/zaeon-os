/** Matemática do globo — PURA (sem three.js), testável. lat/lon em graus → [x,y,z] na esfera. */
export function latLonParaXYZ(lat: number, lon: number, raio: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [-(raio * Math.sin(phi) * Math.cos(theta)), raio * Math.cos(phi), raio * Math.sin(phi) * Math.sin(theta)];
}

/** Marcadores sem texto (o globo é fundo, não mapa navegável). */
export const MARCADORES: ReadonlyArray<[number, number]> = [
  [-14.2, -51.9], [39.8, -98.6], [35.8, 104.1], [48.8, 2.3], [-33.9, 151.2], [9.1, 7.4],
];

/** WebGL de verdade disponível? (sem isso o R3F lança no primeiro frame). */
export function temWebGL(doc: Document | undefined = typeof document !== "undefined" ? document : undefined): boolean {
  try {
    const c = doc?.createElement("canvas");
    return !!(c && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}
