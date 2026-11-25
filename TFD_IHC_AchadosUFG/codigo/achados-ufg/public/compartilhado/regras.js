// Regras do MODO DEMONSTRAÇÃO (sem IA real). Módulo puro: roda no Node e no navegador.
// Usado quando não há ANTHROPIC_API_KEY, quando a chamada ao Claude falha e na versão
// estática publicada no GitHub Pages.
import { CATEGORIAS, CORES, LOCAIS, normalizar } from "./catalogo.js";

// ---------------------------------------------------------------- análise de foto
// Análises pré-definidas para as fotos de exemplo da pasta demo-fotos/ (reconhecidas pelo NOME do arquivo).
export const ANALISES_DEMO = {
  "fone-branco": {
    titulo: "Estojo de fone sem fio branco",
    descricao: "Estojo de carregamento branco de fones sem fio, aberto, com os dois fones encaixados. Tampa sem capinha.",
    categoria: "eletronico", cor: "branco", tags: ["fone", "sem fio", "estojo", "branco", "bluetooth"],
    dadosSensiveis: false, avisoPrivacidade: "",
    perguntaSugerida: "O que está gravado na parte de trás do estojo?", confianca: 0.9
  },
  "chaves": {
    titulo: "Molho de chaves com chaveiro azul",
    descricao: "Três chaves prateadas em uma argola, com chaveiro retangular azul e etiqueta clara escrita \"Safe Driving\".",
    categoria: "chave", cor: "azul", tags: ["chaves", "chaveiro", "argola", "azul"],
    dadosSensiveis: false, avisoPrivacidade: "",
    perguntaSugerida: "Quantas chaves há no molho e que cor tem a cabeça de cada uma?", confianca: 0.88
  },
  "carteirinha": {
    titulo: "Carteirinha estudantil da UFG",
    descricao: "Cartão de identificação estudantil da UFG em porta-cartão transparente com cordão verde.",
    categoria: "documento", cor: "verde", tags: ["carteirinha", "cartão", "ufg", "cordão", "documento"],
    dadosSensiveis: true,
    avisoPrivacidade: "A foto mostra nome, foto do rosto e número de matrícula. A imagem ficará desfocada para o público e esses dados não aparecem na descrição.",
    perguntaSugerida: "Qual é o curso impresso na carteirinha?", confianca: 0.88
  },
  "garrafa-azul": {
    titulo: "Garrafa com capa de silicone azul",
    descricao: "Garrafa de vidro com capa de silicone azul-royal com uma janela vertical e tampa preta com alça.",
    categoria: "garrafa", cor: "azul", tags: ["garrafa", "vidro", "silicone", "azul", "tampa preta"],
    dadosSensiveis: false, avisoPrivacidade: "",
    perguntaSugerida: "O que está escrito ou desenhado no fundo da garrafa?", confianca: 0.86
  }
};

export function analiseDemonstracao(nomeArquivo = "") {
  const n = normalizar(nomeArquivo);
  const chave = Object.keys(ANALISES_DEMO).find((k) => n.includes(k));
  if (chave) return { ...ANALISES_DEMO[chave], fonte: "demonstracao" };
  return {
    titulo: "", descricao: "", categoria: "outro", cor: "colorido", tags: [],
    dadosSensiveis: false, avisoPrivacidade: "", perguntaSugerida: "", confianca: 0,
    fonte: "manual",
    mensagem: "No modo demonstração a IA só reconhece as fotos de exemplo (pasta demo-fotos). Preencha os campos manualmente."
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
export function compararLocal(esperada, dada) {
  const tok = (s) => new Set(normalizar(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOPWORDS.has(w)));
  const a = tok(esperada), b = tok(dada);
  if (!a.size || !b.size) return false;
  const inter = [...a].filter((w) => b.has(w)).length;
  return inter / a.size >= 0.6;
}
