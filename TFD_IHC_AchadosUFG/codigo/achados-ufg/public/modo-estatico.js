// Versão estática do Achados UFG (GitHub Pages ou qualquer hospedagem sem Node).
// Usa o MESMO núcleo da API do servidor (compartilhado/nucleo.js), mas guarda os dados no
// localStorage deste navegador e usa as regras do modo demonstração no lugar do Claude.
import { criarNucleo, materializarSemente } from "./compartilhado/nucleo.js";
import { analiseManual, buscarLocal, compararLocal } from "./compartilhado/regras.js";

const CHAVE = "achados.db.v4"; // mude a versão quando a semente mudar

export async function criarApiEstatica() {
  const semente = await (await fetch("dados/seed.json")).json();
  let estado = null;

  const banco = {
    carregar() {
      if (estado) return estado;
      try { estado = JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch { estado = null; }
      if (!estado) { estado = materializarSemente(semente); banco.salvar(); }
      return estado;
    },
    salvar() {
      try { localStorage.setItem(CHAVE, JSON.stringify(estado)); }
      catch { /* armazenamento cheio ou bloqueado: os dados valem só nesta aba */ }
    },
    resetar() { try { localStorage.removeItem(CHAVE); } catch { /* ignora */ } estado = null; return banco.carregar(); },
    novoId: (p) => `${p}_${Math.random().toString(16).slice(2, 12)}`
  };

  const nucleo = criarNucleo({
    banco,
    ia: {
      modo: () => "estatico",
      buscar: async (consulta, itens) => buscarLocal(consulta, itens),
      verificar: async ({ esperada, dada }) => ({ ok: compararLocal(esperada, dada), fonte: "demonstracao" })
    }
  });

  // Reduz a foto e a guarda como data URL (não há servidor para receber o arquivo).
  function reduzir(arquivo, max = 900) {
    return new Promise((ok, falha) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => falha(new Error("Não foi possível ler essa imagem."));
      img.src = URL.createObjectURL(arquivo);
    });
  }

  const apiEstatica = async function (caminho, opcoes = {}, usuario = null) {
    const metodo = (opcoes.method || "GET").toUpperCase();
    const [rota, qs] = caminho.split("?");
    if (rota === "/api/analisar") {
      const arquivo = opcoes.body?.get?.("foto");
      if (!arquivo || !arquivo.type?.startsWith("image/")) throw new Error("Envie uma foto em JPG, PNG, WEBP ou GIF.");
      if (arquivo.size > 5 * 1024 * 1024) throw new Error("A foto deve ter até 5 MB.");
      // Sem servidor: a interface analisa a foto com o modelo aberto que roda no navegador.
      return { foto: await reduzir(arquivo), analise: analiseManual() };
    }
    const corpo = opcoes.json ?? {};
    const consulta = Object.fromEntries(new URLSearchParams(qs || ""));
    const { status, dados } = await nucleo.tratar(metodo, rota, { corpo, consulta, usuario });
    if (status >= 400) { const e = new Error(dados.erro || "Algo deu errado."); e.status = status; e.dados = dados; throw e; }
    return dados;
  };
  // Para várias abas: quando outra aba grava os dados, esta descarta a cópia em memória.
  apiEstatica.chave = CHAVE;
  apiEstatica.invalidar = () => { estado = null; };
  return apiEstatica;
}
