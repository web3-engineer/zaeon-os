/**
 * /dev/matematica — vitrine do render de matemática do chat (só fora de produção): LaTeX inline e em
 * destaque, gráfico de função e figura de geometria, exatamente como o ChatMarkdown mostra na bolha.
 * Em produção: 404.
 */
import { notFound } from "next/navigation";
import ChatMarkdown from "@/components/study/ChatMarkdown";

export const dynamic = "force-dynamic";

const EXEMPLO = [
  "## Função do 2º grau",
  "Seja $f(x) = x^2 - 4$. As raízes saem de $x^2 - 4 = 0$, ou seja, $x = \\pm 2$.",
  "Pela fórmula de Bhaskara:",
  "$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
  "Com $a = 1$, $b = 0$ e $c = -4$:",
  "$$\\Delta = 0^2 - 4 \\cdot 1 \\cdot (-4) = 16$$",
  "```grafico",
  '{"funcoes":["x^2-4",{"expr":"2x+1","rotulo":"reta"}],"x":[-4,4],"pontos":[{"x":-2,"y":0,"rotulo":"raiz"},{"x":2,"y":0,"rotulo":"raiz"}]}',
  "```",
  "## Trigonometria e assíntotas",
  "```grafico",
  '{"funcoes":["sin(x)","tan(x)"],"x":[-6.3,6.3],"y":[-3,3]}',
  "```",
  "## Geometria",
  "No triângulo retângulo de catetos $3$ e $4$, a hipotenusa é $\\sqrt{3^2 + 4^2} = 5$.",
  "```grafico",
  '{"formas":[{"tipo":"poligono","pontos":[[0,0],[4,0],[0,3]],"rotulo":"triângulo"},{"tipo":"circulo","centro":[0,0],"raio":1},{"tipo":"vetor","de":[0,0],"ate":[2,1.5],"rotulo":"v"}]}',
  "```",
  "## Geometria dinâmica (JSXGraph)",
  "A circunferência circunscrita: o centro é o encontro das mediatrizes. Arraste os vértices.",
  "```geometria",
  '[{"nome":"A","tipo":"point","pais":[-3,-2],"papel":"vértice livre"},{"nome":"B","tipo":"point","pais":[4,-1],"papel":"vértice livre"},{"nome":"C","tipo":"point","pais":[0,4],"papel":"vértice livre"},{"nome":"t","tipo":"polygon","pais":["A","B","C"],"papel":"triângulo ABC"},{"nome":"ab","tipo":"segment","pais":["A","B"],"papel":"lado AB"},{"nome":"bc","tipo":"segment","pais":["B","C"],"papel":"lado BC"},{"nome":"M","tipo":"midpoint","pais":["A","B"],"papel":"ponto médio de AB"},{"nome":"N","tipo":"midpoint","pais":["B","C"],"papel":"ponto médio de BC"},{"nome":"m1","tipo":"perpendicular","pais":["ab","M"],"papel":"mediatriz de AB"},{"nome":"m2","tipo":"perpendicular","pais":["bc","N"],"papel":"mediatriz de BC"},{"nome":"O","tipo":"intersection","pais":["m1","m2",0],"papel":"circuncentro"},{"nome":"c","tipo":"circle","pais":["O","A"],"papel":"circunferência circunscrita"}]',
  "```",
  "Dinheiro continua texto: custa R$ 10,00 e o link é [o PDF](https://www.gutenberg.org/).",
].join("\n");

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen bg-white dark:bg-[#0b1020] px-4 py-10">
      <div className="mx-auto max-w-[720px] rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] p-5 text-[15px] text-slate-800 dark:text-white/90">
        <ChatMarkdown text={EXEMPLO} />
      </div>
    </main>
  );
}
