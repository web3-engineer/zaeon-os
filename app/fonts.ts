import { Inter } from "next/font/google";

// carrega Inter (principal)
export const inter = Inter({ subsets: ["latin"] });

// carrega Noto Sans SC para o efeito Matrix
export const notoSansSC = {
    css: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600&display=swap",
    family: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
};