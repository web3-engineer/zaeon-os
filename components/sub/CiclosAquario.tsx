import StarBackground from "@/components/main/star-background";
import BuracoNegroLanding from "./BuracoNegroLanding";
import NaturezaAquario from "./NaturezaAquario";
import styles from "./hero-aquario.module.css";

const centros = [{ x: 0, y: 0 }, ...[1, 2].flatMap((anel) =>
  Array.from({ length: 6 }, (_, i) => {
    const angulo = i * Math.PI / 3;
    return [{ x: anel * 52 * Math.cos(angulo), y: anel * 52 * Math.sin(angulo) },
      ...(anel === 1 ? [{ x: 52 * (Math.cos(angulo) + Math.cos(angulo + Math.PI / 3)),
        y: 52 * (Math.sin(angulo) + Math.sin(angulo + Math.PI / 3)) }] : [])];
  }).flat()
)];

export default function CiclosAquario() {
  return (
    <div className={styles.ciclos} aria-hidden="true">
      <div className={styles.dnaOriginal}>
        <div className={styles.cosmos}>
          <div className={styles.buracoNegro}><BuracoNegroLanding /></div>
        </div>
        <StarBackground central />
      </div>
      <NaturezaAquario />
      <div className={styles.anatomia}>
        <div className={styles.corpoAnatomico}>
          <i className={styles.anatomiaFrente} />
          <i className={styles.anatomiaTresQuartos} />
          <i className={styles.anatomiaPerfil} />
        </div>
        <div className={styles.coracaoAnatomico} />
        <div className={styles.cerebroAnatomico} />
      </div>
      <div className={styles.camadaAtomica}>
        <div className={styles.mapaAtomico}>
          {Array.from({ length: 121 }, (_, i) => <i key={i} />)}
        </div>
      </div>
      <div className={`${styles.cena} ${styles.flor}`}>
        <svg viewBox="-220 -185 440 370">
          <g fill="none" stroke="currentColor">
            {centros.map(({ x, y }, i) => <circle key={i} cx={x} cy={y} r="52" />)}
            <circle r="157" />
            <circle r="165" opacity=".4" />
          </g>
        </svg>
      </div>
    </div>
  );
}
