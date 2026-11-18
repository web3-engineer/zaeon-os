import StarBackground from "@/components/main/star-background";
import BuracoNegroLanding from "./BuracoNegroLanding";
import NaturezaAquario from "./NaturezaAquario";
import styles from "./hero-aquario.module.css";

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
        <svg className={styles.atomoLeve} viewBox="-120 -120 240 240" fill="none">
          <circle r="12" />
          <ellipse rx="100" ry="35" />
          <ellipse rx="100" ry="35" transform="rotate(60)" />
          <ellipse rx="100" ry="35" transform="rotate(120)" />
        </svg>
      </div>
    </div>
  );
}
