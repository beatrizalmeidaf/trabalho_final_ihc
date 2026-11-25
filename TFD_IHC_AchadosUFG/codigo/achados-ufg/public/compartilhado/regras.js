// Regras do MODO DEMONSTRAÇÃO (sem IA real). Módulo puro: roda no Node e no navegador.
// Usado quando não há ANTHROPIC_API_KEY, quando a chamada ao Claude falha e na versão
// estática publicada no GitHub Pages.
import { CATEGORIAS, CORES, LOCAIS, normalizar } from "./catalogo.js";

// ---------------------------------------------------------------- análise de foto
// Sem Claude, a análise da foto é feita no navegador pelo modelo aberto CLIP (public/ia-navegador.js).
// Este objeto sinaliza à interface que ela deve rodar esse modelo (ou pedir preenchimento manual).
export function analiseManual() {
  return {
    titulo: "", descricao: "", categoria: "outro", cor: "colorido", tags: [],
    dadosSensiveis: false, avisoPrivacidade: "", tipoDetalhe: "marca", confianca: 0, fonte: "manual"
  };
}

// ---------------------------------------------------------------- busca
export const STOPWORDS = new Set(("a o as os um uma uns umas de da do das dos em no na nos nas perto ao aos à às com sem " +
  "meu minha meus minhas perdi perdido perdida esqueci deixei acho que eu foi era estava ontem hoje anteontem semana " +
  "passada mes mês dia dias por para pra pro e ou se la lá aqui ali tinha tem sala bloco campus ufg algum alguma " +
  "alguem alguém encontrou viu").split(" ").map(normalizar));

function contemTermo(textoNorm, termo) {
  const t = normalizar(termo);
  if (t.length <= 3) return new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(textoNorm);
  return textoNorm.includes(t);
}

export function interpretarLocal(consulta) {
  const q = normalizar(consulta);
  const categoria = CATEGORIAS.find((c) => c.termos.some((t) => contemTermo(q, t)))?.id ?? null;
  const cor = CORES.find((c) => c.termos.some((t) => contemTermo(q, t)))?.id ?? null;
  const local = LOCAIS.find((l) => l.termos.some((t) => contemTermo(q, t)))?.id ?? null;
  let periodoDias = null;
  if (/\bhoje\b/.test(q)) periodoDias = 1;
  else if (/\banteontem\b/.test(q)) periodoDias = 3;
  else if (/\bontem\b/.test(q)) periodoDias = 2;
  else if (/semana/.test(q)) periodoDias = 7;
  else if (/\bmes\b/.test(q)) periodoDias = 30;
  const usados = new Set([
    ...(CATEGORIAS.find((c) => c.id === categoria)?.termos ?? []),
    ...(CORES.find((c) => c.id === cor)?.termos ?? []),
    ...(LOCAIS.find((l) => l.id === local)?.termos ?? [])
  ].map(normalizar));
  const palavras = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w) && !usados.has(w));
  return { categoria, cor, local, periodoDias, palavras };
}

function diasDesde(dataISO) {
  return Math.floor((Date.now() - new Date(dataISO + "T12:00:00").getTime()) / 86400000);
}

export function pontuarLocal(item, f) {
  let pontos = 0, maximo = 0;
  const motivos = [];
  if (f.categoria) {
    maximo += 35;
    if (item.categoria === f.categoria) { pontos += 35; motivos.push("mesma categoria"); }
  }
  if (f.cor) {
    maximo += 25;
    if (item.cor === f.cor) { pontos += 25; motivos.push(`cor ${item.cor}`); }
  }
  if (f.local) {
    maximo += 20;
    if (item.local === f.local) { pontos += 20; motivos.push("encontrado no local citado"); }
  }
  if (f.periodoDias) {
    maximo += 10;
    if (diasDesde(item.data) <= f.periodoDias + 1) { pontos += 10; motivos.push("data compatível"); }
  }
  if (f.palavras?.length) {
    maximo += 30;
    const texto = normalizar(`${item.titulo} ${item.descricao} ${(item.tags || []).join(" ")}`);
    const achadas = f.palavras.filter((w) => texto.includes(w));
    if (achadas.length) {
      pontos += Math.round(30 * achadas.length / f.palavras.length);
      motivos.push(`cita "${achadas.slice(0, 3).join('", "')}"`);
    }
  }
  const score = maximo ? Math.round(100 * pontos / maximo) : 0;
  return { score, motivo: motivos.length ? `Parecido porque: ${motivos.join(", ")}.` : "Pouca semelhança com a descrição." };
}

export function ordenarLocal(itens, filtros) {
  return itens
    .filter((i) => i.status !== "devolvido")
    .map((i) => ({ id: i.id, ...pontuarLocal(i, filtros) }))
    .filter((r) => r.score >= 40)
    .sort((a, b) => b.score - a.score);
}

export function buscarLocal(consulta, itens) {
  const interpretacao = interpretarLocal(consulta);
  return { interpretacao, resultados: ordenarLocal(itens, interpretacao), fonte: "demonstracao" };
}

// ---------------------------------------------------------------- verificação de posse
// Palavras que descrevem ONDE/COMO está o detalhe, e não o detalhe em si ("gravada atrás", "no fundo").
// Elas são ignoradas para que "estrela" confira com "uma estrela gravada atrás".
const PALAVRAS_DE_POSICAO = new Set(("atras frente fundo lado dentro fora cima baixo parte canto meio tampa " +
  "escrito escrita escritos gravado gravada desenhado desenhada colado colada tem tinha esta estao objeto").split(" "));

const NUMEROS = { dois: "2", duas: "2", tres: "3", quatro: "4", cinco: "5", seis: "6", sete: "7", oito: "8", nove: "9", dez: "10" };

export function compararLocal(esperada, dada) {
  const tok = (s) => new Set(normalizar(s).replace(/(\d)([a-z])/g, "$1 $2").replace(/([a-z])(\d)/g, "$1 $2").split(/[^a-z0-9]+/)
    .map((w) => NUMEROS[w] ?? w)
    .filter((w) => /\d/.test(w) || (w.length > 1 && !STOPWORDS.has(w) && !PALAVRAS_DE_POSICAO.has(w)))
    .map((w) => (w.length > 4 ? w.replace(/s$/, "") : w))); // plural simples
  const a = tok(esperada), b = tok(dada);
  if (!a.size || !b.size) return false;
  // Números (quantidades, potências, capacidades) precisam bater exatamente.
  const numerosA = [...a].filter((w) => /\d/.test(w));
  if (numerosA.length && !numerosA.every((n) => b.has(n))) return false;
  const inter = [...a].filter((w) => b.has(w)).length;
  return inter / a.size >= 0.5; // pelo menos metade das palavras importantes do detalhe
}
