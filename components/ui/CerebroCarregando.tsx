"use client";

import type { CSSProperties, ReactNode } from "react";
import styles from "./hummingbird-loading.module.css";

export const LOGO_BEIJA_FLOR = "/assets/zaeon-hummingbird.png";

function sparkStyle(properties: Record<string, string>): CSSProperties {
  return properties as CSSProperties;
}

const sparkColors = ["#44dbff", "#258bff", "#b2eeff"];
const sparks = Array.from({ length: 34 }, (_, i) => {
  const angle = i * 2.399963;
  const radius = 23 + (i % 6) * 3.4;
  const distance = 82 + (i % 9) * 17;
  return sparkStyle({
    "--x": `${50 + Math.cos(angle) * radius}%`,
    "--y": `${50 + Math.sin(angle) * radius}%`,
    "--dx": `${Math.cos(angle) * distance}px`,
    "--dy": `${Math.sin(angle) * distance}px`,
    "--w": `${4 + (i % 5) * 2}px`,
    "--angle": `${angle}rad`,
    "--delay": `${(i % 7) * 12}ms`,
    "--color": sparkColors[i % sparkColors.length],
  });
});

export default function CerebroCarregando({ progresso, saindo = false, fixo = false, children }: {
  progresso: number;
  saindo?: boolean;
  fixo?: boolean;
  children?: ReactNode;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, progresso)) * 100);

  return (
    <div
      role="status"
      aria-label={`Carregando: ${pct}%`}
      className={`${styles.run} ${saindo ? styles.depart : ""} ${fixo ? "fixed" : "absolute"} inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#030511] transition-opacity duration-500 motion-reduce:transition-none ${saindo ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#10204a,transparent_53%)]" />
      {children}
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.flash} />
        <div className={styles.bird}>
          <div className={`${styles.wing} ${styles["far-wing"]}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BEIJA_FLOR} alt="" draggable={false} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.body} src={LOGO_BEIJA_FLOR} alt="" draggable={false} />
          <div className={styles.wing}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BEIJA_FLOR} alt="" draggable={false} />
          </div>
          <span className={styles.eye} />
        </div>
        <div className={styles.sparks}>
          {sparks.map((style, index) => <i key={index} className={styles.spark} style={style} />)}
        </div>
        <svg className={styles.bolts} viewBox="0 0 240 240" aria-hidden="true">
        <g className={styles.arrival}>
          <path className={styles.trunk} style={sparkStyle({ "--delay": "35ms" })} d="M101.0 97.0 L98.7 104.8 L92.9 107.7 L84.1 106.4 L82.6 115.2 L71.9 111.3 L67.4 116.0 L62.9 120.8 L59.6 127.2 L51.9 127.4 L50.8 136.8 L43.1 137.1 L39.5 143.1 L33.5 145.6 L25.0 144.7 L23.0 153.0" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "35ms" })} d="M82.6 115.2 L76.0 113.2 L83.6 104.1 L75.6 102.8 L74.5 98.1 L69.8 95.2 L69.8 89.9" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "35ms" })} d="M59.6 127.2 L54.5 131.2 L58.9 133.4 L58.1 136.5 L61.2 139.0 L66.2 141.1 L62.8 144.7" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "35ms" })} d="M43.1 137.1 L40.0 140.8 L35.0 143.4 L31.6 147.0 L30.4 151.9 L30.7 157.6 L28.5 161.8" />
          <path className={styles.trunk} style={sparkStyle({ "--delay": "65ms" })} d="M108.0 102.0 L109.0 94.8 L106.0 90.0 L98.3 88.3 L96.4 82.8 L88.6 81.1 L90.4 73.3 L86.1 69.4 L86.3 62.7 L78.8 60.8 L81.3 52.6 L73.5 50.9 L68.5 47.4 L72.8 38.1 L69.6 33.4 L63.0 31.0" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "65ms" })} d="M96.4 82.8 L95.2 85.9 L89.8 88.5 L98.9 92.7 L96.8 95.7 L91.2 98.3 L94.3 101.8" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "65ms" })} d="M86.3 62.7 L81.3 62.7 L78.1 65.2 L73.6 65.7 L74.7 74.6 L68.9 73.2 L66.0 76.3" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "65ms" })} d="M73.5 50.9 L68.2 46.9 L79.5 45.6 L79.7 42.5 L71.4 38.1 L80.8 36.5 L76.4 32.7" />
          <path className={styles.trunk} style={sparkStyle({ "--delay": "95ms" })} d="M115.0 107.0 L108.1 105.5 L100.7 112.2 L94.1 104.4 L86.9 108.1 L79.9 106.9 L72.8 109.7 L66.2 100.7 L59.1 102.5 L51.8 107.2 L45.0 102.8 L38.0 104.3 L31.3 97.2 L23.8 106.2 L17.1 100.1 L10.0 102.0" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "95ms" })} d="M86.9 108.1 L86.1 113.6 L94.5 110.5 L97.2 112.9 L95.5 119.3 L95.5 124.2 L101.4 123.4" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "95ms" })} d="M59.1 102.5 L57.9 98.3 L55.7 94.1 L56.8 89.5 L54.6 85.4 L61.7 79.9 L55.5 76.3" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "95ms" })} d="M38.0 104.3 L38.6 100.3 L33.2 97.2 L38.8 92.6 L38.2 88.9 L37.3 85.1 L34.9 81.6" />
        </g>
        <g className={styles.exit}>
          <path className={styles.trunk} style={sparkStyle({ "--delay": "35ms" })} d="M101.0 97.0 L108.7 91.3 L118.8 89.8 L128.2 87.2 L132.6 75.5 L142.2 73.2 L150.1 67.8 L158.3 62.9 L168.0 60.9 L173.8 51.6 L183.1 48.7 L190.2 42.0 L203.2 45.8 L207.1 33.2 L218.0 33.2 L226.0 28.0" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "35ms" })} d="M132.6 75.5 L128.5 72.4 L124.7 69.3 L129.7 61.5 L127.8 57.3 L123.5 54.4 L119.9 51.1" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "35ms" })} d="M168.0 60.9 L168.9 57.4 L165.2 52.9 L168.5 50.0 L169.2 46.5 L173.9 44.0 L173.0 40.1" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "35ms" })} d="M190.2 42.0 L188.3 35.8 L191.5 34.1 L194.2 32.0 L200.9 33.4 L201.9 29.8 L203.7 26.8" />
          <path className={styles.trunk} style={sparkStyle({ "--delay": "65ms" })} d="M108.0 102.0 L115.3 102.4 L122.6 103.9 L129.8 103.0 L136.6 96.5 L143.8 95.9 L151.5 103.7 L158.6 101.5 L165.5 97.0 L173.0 100.2 L180.2 99.7 L186.9 91.9 L194.4 95.7 L201.8 99.2 L209.1 99.4 L216.0 95.0" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "65ms" })} d="M136.6 96.5 L142.4 97.4 L138.4 103.2 L140.9 105.8 L140.2 110.0 L143.4 112.3 L145.6 114.9" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "65ms" })} d="M165.5 97.0 L160.9 96.4 L162.4 91.8 L162.2 88.2 L156.6 88.3 L161.9 81.2 L155.5 81.7" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "65ms" })} d="M186.9 91.9 L186.2 85.7 L179.9 84.1 L180.8 76.7 L172.2 76.9 L170.4 71.6 L167.3 67.4" />
          <path className={styles.trunk} style={sparkStyle({ "--delay": "95ms" })} d="M115.0 107.0 L121.6 102.6 L125.3 96.6 L119.9 86.0 L128.9 82.8 L135.2 78.2 L132.3 68.8 L133.6 61.7 L141.6 57.9 L147.3 53.0 L144.0 43.4 L153.1 40.3 L149.7 30.7 L161.8 29.1 L155.6 18.0 L163.0 14.0" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "95ms" })} d="M128.9 82.8 L124.3 82.0 L125.1 89.1 L121.4 89.6 L117.6 89.9 L115.3 92.6 L112.3 94.2" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "95ms" })} d="M141.6 57.9 L136.3 56.2 L143.4 53.8 L140.6 51.9 L145.1 49.6 L142.0 47.7 L140.9 45.8" />
          <path className={styles.branch} style={sparkStyle({ "--delay": "95ms" })} d="M153.1 40.3 L150.1 43.4 L148.6 47.4 L147.5 51.6 L146.6 55.9 L144.5 59.5 L140.4 61.9" />
        </g>
        </svg>
      </div>
      <div className="relative mt-6 h-[3px] w-[200px] overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-white transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
