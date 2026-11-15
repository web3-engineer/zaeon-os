import styles from "./hero-aquario.module.css";

const copas = [
  [128, 161, 49], [167, 132, 53], [213, 112, 57], [261, 105, 51],
  [310, 127, 56], [351, 156, 46], [182, 175, 49], [246, 158, 56], [300, 174, 46],
];

const folhas = copas.flatMap(([cx, cy, raio], grupo) =>
  Array.from({ length: 36 }, (_, i) => {
    const a = i * 2.399963 + grupo;
    const r = Math.sqrt((i + .5) / 36) * raio;
    return {
      x: Math.round(cx + Math.cos(a) * r),
      y: Math.round(cy + Math.sin(a) * r * .71),
      tamanho: 5 + (i * 7 + grupo) % 10,
      cor: ["#355743", "#446b49", "#5d8156", "#77996a", "#9caf76"][(i * 3 + grupo) % 5],
    };
  })
);

function Borboleta() {
  return (
    <svg className={styles.borboleta} viewBox="0 0 72 52">
      {[false, true].map((espelhar) => (
        <g key={String(espelhar)} transform={espelhar ? "translate(72 0) scale(-1 1)" : undefined}>
          <g className={styles.asaBorboleta}>
            <path d="M35 27C27 15 9 3 4 8S5 28 15 31C5 34 12 49 22 47S33 38 35 27Z" fill="currentColor" stroke="#302018" strokeWidth="2.4" />
            <path d="M35 27Q20 22 6 11M35 27Q19 29 10 24M35 27Q23 36 17 43M35 27Q31 35 26 43M15 31Q26 29 35 27" fill="none" stroke="#482b20" strokeWidth="1.1" />
            <path d="M8 13l1 3m2 3 1 2m2 16 1 2m5 4 2 0" stroke="#fff3d1" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </g>
      ))}
      <path d="M36 34V20m0 1-5-6m5 6 5-6" stroke="#2e221c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function NaturezaAquario() {
  return (
    <div className={styles.natureza} aria-hidden="true">
      <div className={styles.bosque} />
      {[0, 1, 2, 3].map((i) => <Borboleta key={i} />)}
      <svg className={styles.arvoreNatureza} viewBox="0 0 480 400">
        <ellipse className={styles.semente} cx="240" cy="369" rx="7" ry="4" fill="#ad854f" transform="rotate(-21 240 369)" />
        <g className={styles.broto}>
          <path d="M240 372Q226 339 242 309" stroke="#7db87c" strokeWidth="5" fill="none" />
          <path d="M234 339Q210 305 199 324Q202 345 234 339M240 321Q251 295 270 305Q265 329 240 321" fill="#83c684" />
        </g>
        <g className={styles.arvoreAdulta}>
          <path d="M215 372Q235 351 231 273Q228 219 229 161L248 156Q244 240 251 284Q254 345 269 372Z" fill="#725e4b" />
          <path d="M239 270Q225 231 193 191L157 157M239 243Q272 204 311 179L328 144M238 214Q251 161 256 112M228 244Q202 218 171 214L127 190"
            fill="none" stroke="#725e4b" strokeWidth="10" strokeLinecap="round" />
          <path d="M239 350Q238 312 242 278M224 369Q208 365 193 376M254 363Q275 365 288 374" stroke="#b8996e" strokeOpacity=".55" strokeWidth="3" fill="none" />
          <path d="M208 344Q214 273 182 231L151 205M247 302Q275 249 312 235L345 204M235 222Q212 194 210 151M269 217Q281 182 310 158M189 228L125 210M251 355L287 376M225 358L176 374"
            fill="none" stroke="#6a5039" strokeWidth="4" strokeLinecap="round" />
          <path d="M236 350Q226 309 235 261M247 344Q243 310 245 288M236 249L233 192"
            fill="none" stroke="#c3a578" strokeOpacity=".48" strokeWidth="2" />
          <g>
            {folhas.map(({ x, y, tamanho, cor }, i) => (
              <path key={i} d={`M${-tamanho} 1q${tamanho / 2} -9 ${tamanho} -5q${tamanho / 2} -4 ${tamanho} 4q${-tamanho / 2} 7 ${-tamanho} 3q${-tamanho / 2} 3 ${-tamanho} -2Z`}
                fill={cor} transform={`translate(${x} ${y}) rotate(${(i * 37) % 140 - 70})`} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
