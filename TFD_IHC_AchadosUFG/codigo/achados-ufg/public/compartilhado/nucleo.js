// Núcleo da API do Achados UFG — independente de ambiente.
// O servidor Node (server.js) e a versão estática do GitHub Pages (public/modo-estatico.js)
// usam exatamente estas regras; só mudam o armazenamento e a IA injetados.
import { CATEGORIAS, CORES, LOCAIS, PONTOS_ENTREGA, normalizar, nomeLocal, pontoEntrega } from "./catalogo.js";
import { ordenarLocal, pontuarLocal } from "./regras.js";

export const MAX_TENTATIVAS = 3;

export function normalizarUsuario(u) {
  if (!u?.nome) return null;
  return { id: normalizar(u.nome).replace(/[^a-z0-9]+/g, "-"), nome: String(u.nome).slice(0, 60), vinculo: u.vinculo || "" };
}

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Converte a semente (datas relativas em "diasAtras") em um banco pronto para uso.
export function materializarSemente(semente) {
  const itens = semente.itens.map((it) => {
    const { diasAtras: dias = 0, ...resto } = it;
    const em = (d) => `${diasAtras(d)}T12:00:00.000Z`;
    const historico = [{ status: "encontrado", em: em(dias), nota: `Cadastrado por ${resto.criadoPor.nome}` }];
    if (resto.status !== "encontrado") historico.push({ status: "em_devolucao", em: em(Math.max(dias - 1, 0)), nota: `Posse confirmada por ${resto.reivindicadoPor.nome}` });
    if (resto.status === "devolvido") historico.push({ status: "devolvido", em: em(Math.max(dias - 2, 0)), nota: "Devolução concluída" });
    return { ...resto, data: diasAtras(dias), criadoEm: em(dias), historico, tentativas: {} };
  });
  return { itens, alertas: semente.alertas ?? [], notificacoes: semente.notificacoes ?? [] };
}

class ErroApi extends Error {
  constructor(status, mensagem, extra = {}) { super(mensagem); this.status = status; this.extra = extra; }
}

/**
 * @param banco { carregar(): db, salvar(), resetar(), novoId(prefixo) }
 * @param ia    { modo(): string, buscar(consulta, itens), verificar({pergunta, esperada, dada}) }
 */
export function criarNucleo({ banco, ia }) {
  const exigir = (u) => { if (!u) throw new ErroApi(401, "Informe seu nome para continuar."); return u; };
  const achar = (db, id) => { const i = db.itens.find((x) => x.id === id); if (!i) throw new ErroApi(404, "Item não encontrado."); return i; };

  // Remove do item tudo o que não pode chegar ao navegador de terceiros.
  function publico(item, u) {
    const { resposta, tentativas, ...resto } = item;
    const ehDono = Boolean(u && item.criadoPor?.id === u.id);
    const reivindicou = Boolean(u && item.reivindicadoPor?.id === u.id);
    return {
      ...resto,
      localNome: nomeLocal(item.local),
      entrega: pontoEntrega(item.pontoEntrega),
      souQuemEncontrou: ehDono,
      souQuemReivindicou: reivindicou,
      tentativasRestantes: u ? MAX_TENTATIVAS - (tentativas?.[u.id] ?? 0) : MAX_TENTATIVAS,
      contato: ehDono || reivindicou ? { encontradoPor: item.criadoPor?.nome, reivindicadoPor: item.reivindicadoPor?.nome } : undefined
    };
  }

  function notificar(db, usuarioId, texto, itemId, tipo = "info") {
    db.notificacoes.unshift({ id: banco.novoId("ntf"), usuario: usuarioId, texto, itemId, tipo, lida: false, em: new Date().toISOString() });
  }

  const rotas = [
    ["GET", /^\/api\/config$/, () => ({
      modoIA: ia.modo(), categorias: CATEGORIAS.map(({ id, nome }) => ({ id, nome })), cores: CORES.map((c) => c.id), locais: LOCAIS, pontos: PONTOS_ENTREGA
    })],

    ["GET", /^\/api\/itens$/, ({ u, consulta }) => banco.carregar().itens
      .filter((i) => (consulta.status ? i.status === consulta.status : i.status !== "devolvido"))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .map((i) => publico(i, u))],

    ["GET", /^\/api\/itens\/([\w-]+)$/, ({ u, m }) => publico(achar(banco.carregar(), m[1]), u)],

    ["POST", /^\/api\/itens$/, ({ u, corpo: b }) => {
      exigir(u);
      const faltando = ["titulo", "categoria", "local", "data", "pontoEntrega", "pergunta", "resposta"].filter((k) => !String(b[k] ?? "").trim());
      if (faltando.length) throw new ErroApi(400, "Preencha os campos obrigatórios.", { campos: faltando });
      const db = banco.carregar();
      const agora = new Date().toISOString();
      const item = {
        id: banco.novoId("itm"),
        titulo: b.titulo.trim().slice(0, 80), descricao: String(b.descricao || "").trim().slice(0, 500),
        categoria: b.categoria, cor: b.cor || "colorido", tags: Array.isArray(b.tags) ? b.tags.slice(0, 8) : [],
        local: b.local, localDetalhe: String(b.localDetalhe || "").slice(0, 80), data: b.data, foto: b.foto || null,
        fotoSensivel: Boolean(b.fotoSensivel), avisoPrivacidade: b.avisoPrivacidade || "", pontoEntrega: b.pontoEntrega,
        pergunta: b.pergunta.trim(), resposta: b.resposta.trim(),
        geradoPorIA: Boolean(b.geradoPorIA), editadoPeloUsuario: Boolean(b.editadoPeloUsuario),
        status: "encontrado", criadoPor: { id: u.id, nome: u.nome, vinculo: u.vinculo }, criadoEm: agora,
        historico: [{ status: "encontrado", em: agora, nota: `Cadastrado por ${u.nome}` }], tentativas: {}
      };
      db.itens.push(item);
      // Alertas: avisa quem procura algo compatível.
      let avisados = 0;
      for (const a of db.alertas.filter((x) => x.ativo && x.usuario !== u.id)) {
        if (pontuarLocal(item, a.filtros).score >= 60) {
          notificar(db, a.usuario, `Um item compatível com seu alerta "${a.consulta}" foi cadastrado: ${item.titulo}.`, item.id, "alerta");
          avisados++;
        }
      }
      banco.salvar();
      return { status: 201, dados: { item: publico(item, u), avisados } };
    }],

    ["POST", /^\/api\/itens\/([\w-]+)\/reivindicar$/, async ({ u, m, corpo }) => {
      exigir(u);
      const db = banco.carregar();
      const item = achar(db, m[1]);
      if (item.status !== "encontrado") throw new ErroApi(409, "Este item já está em processo de devolução.");
      if (item.criadoPor?.id === u.id) throw new ErroApi(400, "Você cadastrou este item.");
      const usadas = item.tentativas[u.id] ?? 0;
      if (usadas >= MAX_TENTATIVAS) throw new ErroApi(429, "Você atingiu o limite de tentativas. Procure o ponto de entrega com um documento.");
      const dada = String(corpo?.resposta || "").trim();
      if (!dada) throw new ErroApi(400, "Escreva sua resposta.");
      const { ok, fonte } = await ia.verificar({ pergunta: item.pergunta, esperada: item.resposta, dada });
      if (!ok) {
        item.tentativas[u.id] = usadas + 1;
        banco.salvar();
        return { ok: false, fonte, tentativasRestantes: MAX_TENTATIVAS - usadas - 1 };
      }
      item.status = "em_devolucao";
      item.reivindicadoPor = { id: u.id, nome: u.nome };
      item.historico.push({ status: "em_devolucao", em: new Date().toISOString(), nota: `Posse confirmada por ${u.nome}` });
      notificar(db, item.criadoPor.id, `${u.nome} respondeu corretamente a pergunta de verificação de "${item.titulo}". Combine a entrega ou aguarde a retirada.`, item.id, "reivindicacao");
      banco.salvar();
      return { ok: true, fonte, item: publico(item, u) };
    }],

    ["POST", /^\/api\/itens\/([\w-]+)\/devolver$/, ({ u, m }) => {
      exigir(u);
      const db = banco.carregar();
      const item = achar(db, m[1]);
      const autorizado = item.criadoPor?.id === u.id || item.reivindicadoPor?.id === u.id;
      if (!autorizado || item.status !== "em_devolucao") throw new ErroApi(403, "Só quem encontrou ou quem confirmou a posse pode concluir a devolução.");
      item.status = "devolvido";
      item.historico.push({ status: "devolvido", em: new Date().toISOString(), nota: `Devolução confirmada por ${u.nome}` });
      const outro = item.criadoPor.id === u.id ? item.reivindicadoPor.id : item.criadoPor.id;
      notificar(db, outro, `A devolução de "${item.titulo}" foi concluída. Obrigado por usar o Achados UFG!`, item.id, "devolvido");
      banco.salvar();
      return { item: publico(item, u) };
    }],

    ["POST", /^\/api\/buscar$/, async ({ u, corpo }) => {
      const db = banco.carregar();
      const r = await ia.buscar(String(corpo?.consulta || "").slice(0, 300), db.itens.filter((i) => i.status !== "devolvido"));
      const porId = new Map(db.itens.map((i) => [i.id, i]));
      return { ...r, resultados: r.resultados.map((x) => ({ ...x, item: publico(porId.get(x.id), u) })) };
    }],

    // Quando o usuário remove um filtro interpretado, reordenamos localmente.
    ["POST", /^\/api\/buscar\/refinar$/, ({ u, corpo }) => {
      const db = banco.carregar();
      const f = corpo?.filtros || {};
      const porId = new Map(db.itens.map((i) => [i.id, i]));
      return { interpretacao: f, resultados: ordenarLocal(db.itens, f).map((x) => ({ ...x, item: publico(porId.get(x.id), u) })), fonte: "refinamento" };
    }],

    ["GET", /^\/api\/alertas$/, ({ u }) => banco.carregar().alertas.filter((a) => a.usuario === exigir(u).id && a.ativo)],

    ["POST", /^\/api\/alertas$/, ({ u, corpo }) => {
      exigir(u);
      const alerta = { id: banco.novoId("alr"), usuario: u.id, consulta: String(corpo?.consulta || "").slice(0, 200), filtros: corpo?.filtros || {}, ativo: true, criadoEm: new Date().toISOString() };
      banco.carregar().alertas.push(alerta);
      banco.salvar();
      return { status: 201, dados: alerta };
    }],

    ["DELETE", /^\/api\/alertas\/([\w-]+)$/, ({ u, m }) => alternarAlerta(exigir(u), m[1], false)],
    ["POST", /^\/api\/alertas\/([\w-]+)\/restaurar$/, ({ u, m }) => alternarAlerta(exigir(u), m[1], true)],

    ["GET", /^\/api\/notificacoes$/, ({ u }) => banco.carregar().notificacoes.filter((n) => n.usuario === exigir(u).id).slice(0, 50)],

    ["POST", /^\/api\/notificacoes\/lidas$/, ({ u }) => {
      exigir(u);
      banco.carregar().notificacoes.filter((n) => n.usuario === u.id).forEach((n) => { n.lida = true; });
      banco.salvar();
      return { ok: true };
    }],

    ["GET", /^\/api\/meus$/, ({ u }) => {
      exigir(u);
      const db = banco.carregar();
      return {
        encontrados: db.itens.filter((i) => i.criadoPor?.id === u.id).map((i) => publico(i, u)),
        reivindicados: db.itens.filter((i) => i.reivindicadoPor?.id === u.id).map((i) => publico(i, u))
      };
    }],

    ["POST", /^\/api\/reset$/, () => { banco.resetar(); return { ok: true }; }]
  ];

  function alternarAlerta(u, id, ativo) {
    const a = banco.carregar().alertas.find((x) => x.id === id && x.usuario === u.id);
    if (!a) throw new ErroApi(404, "Alerta não encontrado.");
    a.ativo = ativo;
    banco.salvar();
    return a;
  }

  // Trata uma requisição e devolve { status, dados }.
  async function tratar(metodo, caminho, { corpo = {}, consulta = {}, usuario = null } = {}) {
    const u = normalizarUsuario(usuario);
    for (const [met, re, fn] of rotas) {
      const m = caminho.match(re);
      if (met !== metodo || !m) continue;
      try {
        const r = await fn({ u, m, corpo, consulta });
        return r && r.status && "dados" in r ? r : { status: 200, dados: r };
      } catch (e) {
        if (e instanceof ErroApi) return { status: e.status, dados: { erro: e.message, ...e.extra } };
        throw e;
      }
    }
    return { status: 404, dados: { erro: "Rota não encontrada." } };
  }

  return { tratar, publico };
}
