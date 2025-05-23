import { useState } from "react";
import styles from "@/styles/StyleSelector.module.css";

export default function StyleSelector({
  onStyleChange,
  initialStyle = "dark",
}) {
  const [selectedStyle, setSelectedStyle] = useState(initialStyle);

  const handleStyleChange = (style) => {
    setSelectedStyle(style);
    onStyleChange(style);
  };

  return (
    <div className={styles.styleSelector}>
      <h3 className={styles.heading}>Choose Style</h3>
      <div className={styles.styleOptions}>
        <button
          className={`${styles.styleButton} ${styles.darkButton} ${
            selectedStyle === "dark" ? styles.selected : ""
          }`}
          onClick={() => handleStyleChange("dark")}
          aria-label="Dark style"
        >
          <div className={styles.stylePreview}>
            <div className={styles.darkPreview}>
              <span>Dark</span>
            </div>
          </div>
        </button>

        <button
          className={`${styles.styleButton} ${styles.pinkButton} ${
            selectedStyle === "pink" ? styles.selected : ""
          }`}
          onClick={() => handleStyleChange("pink")}
          aria-label="Pink style"
        >
          <div className={styles.stylePreview}>
            <div className={styles.pinkPreview}>
              <span>Pink</span>
            </div>
          </div>
        </button>

        <button
          className={`${styles.styleButton} ${styles.greenButton} ${
            selectedStyle === "green" ? styles.selected : ""
          }`}
          onClick={() => handleStyleChange("green")}
          aria-label="Green nature style"
        >
          <div className={styles.stylePreview}>
            <div className={styles.greenPreview}>
              <span>Nature</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
