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

function WingCircuit() {
  return (
    <svg className={styles["energy-circuit"]} viewBox="0 0 100 100" aria-hidden="true">
    <path pathLength="1" d="M51 46 L44 38 L38.6 38.4 L35 41.4 L31 41.5" style={sparkStyle({ "--start": "0.99s" })}/>
    <circle cx="51" cy="46" r="1" style={sparkStyle({ "--start": "0.990s" })}/>
    <circle cx="38.6" cy="38.4" r="1" style={sparkStyle({ "--start": "1.220s" })}/>
    <circle cx="31" cy="41.5" r="1" style={sparkStyle({ "--start": "1.450s" })}/>
    <path pathLength="1" d="M50 41 L44.5 35.8 L38 35.6 L35 32 L24 32 L21.4 34" style={sparkStyle({ "--start": "1.07s" })}/>
    <circle cx="50" cy="41" r="1" style={sparkStyle({ "--start": "1.070s" })}/>
    <circle cx="35" cy="32" r="1" style={sparkStyle({ "--start": "1.346s" })}/>
    <circle cx="21.4" cy="34" r="1" style={sparkStyle({ "--start": "1.530s" })}/>
    <path pathLength="1" d="M46 33 L39 28 L33 24 L24 24 L20.5 20.7" style={sparkStyle({ "--start": "1.15s" })}/>
    <circle cx="46" cy="33" r="1" style={sparkStyle({ "--start": "1.150s" })}/>
    <circle cx="33" cy="24" r="1" style={sparkStyle({ "--start": "1.380s" })}/>
    <circle cx="20.5" cy="20.7" r="1" style={sparkStyle({ "--start": "1.610s" })}/>
    </svg>
  );
}

function BodyCircuit() {
  return (
    <svg className={styles["energy-circuit"]} viewBox="0 0 100 100" aria-hidden="true">
    <path pathLength="1" d="M51 46 L44 38 L38.6 38.4 L35 41.4 L31 41.5" style={sparkStyle({ "--start": "0.99s" })}/>
    <circle cx="51" cy="46" r="1" style={sparkStyle({ "--start": "0.990s" })}/>
    <circle cx="38.6" cy="38.4" r="1" style={sparkStyle({ "--start": "1.220s" })}/>
    <circle cx="31" cy="41.5" r="1" style={sparkStyle({ "--start": "1.450s" })}/>
    <path pathLength="1" d="M50 41 L44.5 35.8 L38 35.6 L35 32 L24 32 L21.4 34" style={sparkStyle({ "--start": "1.07s" })}/>
    <circle cx="50" cy="41" r="1" style={sparkStyle({ "--start": "1.070s" })}/>
    <circle cx="35" cy="32" r="1" style={sparkStyle({ "--start": "1.346s" })}/>
    <circle cx="21.4" cy="34" r="1" style={sparkStyle({ "--start": "1.530s" })}/>
    <path pathLength="1" d="M46 33 L39 28 L33 24 L24 24 L20.5 20.7" style={sparkStyle({ "--start": "1.15s" })}/>
    <circle cx="46" cy="33" r="1" style={sparkStyle({ "--start": "1.150s" })}/>
    <circle cx="33" cy="24" r="1" style={sparkStyle({ "--start": "1.380s" })}/>
    <circle cx="20.5" cy="20.7" r="1" style={sparkStyle({ "--start": "1.610s" })}/>
    </svg>
  );
}

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
        <div className={styles.levitation}>
        <div className={styles.bird}>
          <div className={`${styles.wing} ${styles["far-wing"]}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BEIJA_FLOR} alt="" draggable={false} />
            <WingCircuit />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.body} src={LOGO_BEIJA_FLOR} alt="" draggable={false} />
          <div className={styles.wing}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BEIJA_FLOR} alt="" draggable={false} />
            <WingCircuit />
          </div>
          <BodyCircuit />
          <span className={styles.eye} />
        </div>
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
          <path className={styles.trunk} style={sparkStyle({ "--delay": "0ms" })} d="M35 229 L45 212 L55 210 L62 193 L74 189 L81 174 L96 165 L101 151 L113 146 L120 130 L133 120 L138 108"/>
          <path className={styles.branch} style={sparkStyle({ "--delay": "18ms" })} d="M62 193 L54 183 L57 174 L46 161 L47 152 L38 143"/>
          <path className={styles.branch} style={sparkStyle({ "--delay": "26ms" })} d="M81 174 L94 181 L107 174 L118 180 L132 175"/>
          <path className={styles.branch} style={sparkStyle({ "--delay": "34ms" })} d="M101 151 L91 143 L94 134 L84 126"/>
          <path className={styles.branch} style={sparkStyle({ "--delay": "42ms" })} d="M120 130 L132 135 L142 128 L153 132"/>
          <path className={styles.branch} style={sparkStyle({ "--delay": "20ms" })} d="M62 193 L68 205 L64 218 L75 229 L71 241 L83 250 L79 269"/>
          </g>
        </svg>
      </div>
      <div className={`${styles.track} mt-6 h-[3px] w-[200px] overflow-hidden rounded-full bg-white/15`}>
        <div className={`${styles.bar} h-full rounded-full bg-white transition-[width] duration-150 motion-reduce:transition-none`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
