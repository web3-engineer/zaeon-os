import styles from "./hero-aquario.module.css";

export default function MarCardumes({ continuo = false }: { continuo?: boolean }) {
  return (
    <div className={`${styles.camadaMarinha} ${continuo ? styles.marContinuo : ""}`}>
      <div className={styles.reflexos} />
      {!continuo && <>
      <div className={styles.fundoMarinho}>
        {[0, 1, 2].map((grupo) => (
          <div key={grupo} className={styles.algas}>
            {[0, 1, 2, 3, 4].map((folha) => <i key={folha} />)}
          </div>
        ))}
      </div>
      <div className={styles.bolhas}>
        {[0, 1, 2].map((fluxo) => (
          <div key={fluxo} className={styles.fluxoBolhas}>
            {Array.from({ length: 5 }, (_, i) => <span key={i} />)}
          </div>
        ))}
      </div>
      </>}
      {[3, 2, 3, 2, 3, 2, 3, 2].map((quantidade, escola) => (
        <div className={styles.cardume} key={escola}>
          {Array.from({ length: quantidade }, (_, peixe) => (
            <span className={styles.peixe} key={peixe} />
          ))}
        </div>
      ))}
    </div>
  );
}
