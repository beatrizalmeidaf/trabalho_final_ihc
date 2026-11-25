// Núcleo da API do Achados UFG — independente de ambiente.
// O servidor Node (server.js) e a versão estática do GitHub Pages (public/modo-estatico.js)
// usam exatamente estas regras; só mudam o armazenamento e a IA injetados.
//
// Devolução (como num balcão de achados de verdade):
//  - Objeto deixado num PONTO DE ENTREGA (portaria, secretaria, BC): o local é público. O dono avisa
//    que vai buscar e recebe um código de retirada; no balcão, mostra documento e descreve o objeto.
//    Quem encontrou (ou o setor) marca como entregue — ou reabre, se não era o dono.
//  - Objeto que FICA COM QUEM ENCONTROU: o dono descreve o objeto; quem encontrou compara com a
//    anotação particular que fez no cadastro (a IA só indica se a descrição cita a anotação),
//    decide e combina a entrega por uma mensagem.
import { CATEGORIAS, CORES, LOCAIS, PONTOS_ENTREGA, TIPOS_DETALHE, normalizar, nomeLocal, pontoEntrega } from "./catalogo.js";
import { ordenarLocal, pontuarLocal } from "./regras.js";

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
    if (resto.status !== "encontrado") historico.push({ status: "em_devolucao", em: em(Math.max(dias - 1, 0)), nota: `Retirada combinada com ${resto.reivindicadoPor.nome}` });
    if (resto.status === "devolvido") historico.push({ status: "devolvido", em: em(Math.max(dias - 2, 0)), nota: "Devolução concluída" });
    return { pedidos: [], ...resto, data: diasAtras(dias), criadoEm: em(dias), historico };
  });
  return { itens, alertas: semente.alertas ?? [], notificacoes: semente.notificacoes ?? [] };
}

class ErroApi extends Error {
  constructor(status, mensagem, extra = {}) { super(mensagem); this.status = status; this.extra = extra; }
}

const codigoRetirada = () => `AUFG-${String(Math.floor(1000 + Math.random() * 9000))}`;

/**
 * @param banco { carregar(): db, salvar(), resetar(), novoId(prefixo) }
 * @param ia    { modo(): string, buscar(consulta, itens), verificar({esperada, dada}) → {ok} }
 */
export function criarNucleo({ banco, ia }) {
  const exigir = (u) => { if (!u) throw new ErroApi(401, "Informe seu nome para continuar."); return u; };
  const achar = (db, id) => { const i = db.itens.find((x) => x.id === id); if (!i) throw new ErroApi(404, "Item não encontrado."); return i; };
  const ficaComQuemAchou = (item) => item.pontoEntrega === "comigo";

  // Remove do item tudo o que não pode chegar ao navegador de terceiros.
  function publico(item, u) {
    const { anotacao, pedidos = [], ...resto } = item;
    const ehDono = Boolean(u && item.criadoPor?.id === u.id);
    const reivindicou = Boolean(u && item.reivindicadoPor?.id === u.id);
    const meu = u ? [...pedidos].reverse().find((p) => p.usuario.id === u.id) : null;
    const ativo = pedidos.find((p) => ["aprovado", "retirada"].includes(p.situacao));
    return {
      ...resto,
      // Só quem encontrou vê a própria anotação e os pedidos pendentes.
      anotacao: ehDono ? anotacao || "" : undefined,
      pedidos: ehDono ? pedidos.filter((p) => p.situacao === "pendente") : undefined,
      retiradaAtiva: (ehDono || reivindicou) && ativo ? { codigo: ativo.codigo, mensagem: ativo.mensagem, situacao: ativo.situacao, pedidoId: ativo.id, nome: ativo.usuario.nome } : null,
      meuPedido: meu ? { situacao: meu.situacao, em: meu.em } : null,
      ficaComQuemAchou: ficaComQuemAchou(item),
      localNome: nomeLocal(item.local),
      entrega: pontoEntrega(item.pontoEntrega),
      souQuemEncontrou: ehDono,
      souQuemReivindicou: reivindicou
    };
  }

  function notificar(db, usuarioId, texto, itemId, tipo = "info") {
    db.notificacoes.unshift({ id: banco.novoId("ntf"), usuario: usuarioId, texto, itemId, tipo, lida: false, em: new Date().toISOString() });
  }

  // Alertas: avisa quem procura algo compatível (ao cadastrar e quando uma retirada é desfeita).
  function avisarAlertas(db, item, excetoId, evento) {
    let avisados = 0;
    for (const a of db.alertas.filter((x) => x.ativo && x.usuario !== excetoId)) {
      if (pontuarLocal(item, a.filtros).score >= 60) {
        notificar(db, a.usuario, `Um item compatível com seu alerta "${a.consulta}" ${evento}: ${item.titulo}.`, item.id, "alerta");
        avisados++;
      }
    }
    return avisados;
  }

  const rotas = [
    ["GET", /^\/api\/config$/, () => ({
      modoIA: ia.modo(), categorias: CATEGORIAS.map(({ id, nome }) => ({ id, nome })), cores: CORES.map((c) => c.id), locais: LOCAIS, pontos: PONTOS_ENTREGA, tiposDetalhe: TIPOS_DETALHE
    })],

    ["GET", /^\/api\/itens$/, ({ u, consulta }) => banco.carregar().itens
      .filter((i) => (consulta.status ? i.status === consulta.status : i.status !== "devolvido"))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .map((i) => publico(i, u))],

    ["GET", /^\/api\/itens\/([\w-]+)$/, ({ u, m }) => publico(achar(banco.carregar(), m[1]), u)],

    ["POST", /^\/api\/itens$/, ({ u, corpo: b }) => {
      exigir(u);
      const faltando = ["titulo", "categoria", "local", "data", "pontoEntrega"].filter((k) => !String(b[k] ?? "").trim());
      if (faltando.length) throw new ErroApi(400, "Preencha os campos obrigatórios.", { campos: faltando });
      const db = banco.carregar();
      const agora = new Date().toISOString();
      const item = {
        id: banco.novoId("itm"),
        titulo: b.titulo.trim().slice(0, 80), descricao: String(b.descricao || "").trim().slice(0, 500),
        categoria: b.categoria, cor: b.cor || "colorido", tags: Array.isArray(b.tags) ? b.tags.slice(0, 8) : [],
        local: b.local, localDetalhe: String(b.localDetalhe || "").slice(0, 80), data: b.data, foto: b.foto || null,
        fotoSensivel: Boolean(b.fotoSensivel), avisoPrivacidade: b.avisoPrivacidade || "", pontoEntrega: b.pontoEntrega,
        anotacao: String(b.anotacao || "").trim().slice(0, 300), pedidos: [],
        geradoPorIA: Boolean(b.geradoPorIA), editadoPeloUsuario: Boolean(b.editadoPeloUsuario),
        status: "encontrado", criadoPor: { id: u.id, nome: u.nome, vinculo: u.vinculo }, criadoEm: agora,
        historico: [{ status: "encontrado", em: agora, nota: `Cadastrado por ${u.nome}` }]
      };
      db.itens.push(item);
      const avisados = avisarAlertas(db, item, u.id, "foi cadastrado");
      banco.salvar();
      return { status: 201, dados: { item: publico(item, u), avisados } };
    }],

    // "É meu!": no ponto de entrega gera um código de retirada; com quem encontrou, vira um pedido.
    ["POST", /^\/api\/itens\/([\w-]+)\/pedidos$/, async ({ u, m, corpo }) => {
      exigir(u);
      const db = banco.carregar();
      const item = achar(db, m[1]);
      if (item.status !== "encontrado") throw new ErroApi(409, "Outra pessoa já combinou a retirada deste objeto.");
      if (item.criadoPor?.id === u.id) throw new ErroApi(400, "Você cadastrou este item.");
      const texto = String(corpo?.texto || "").trim().slice(0, 500);
      item.pedidos ??= [];
      if (item.pedidos.some((p) => p.usuario.id === u.id && p.situacao === "pendente")) throw new ErroApi(409, "Você já enviou um pedido para este item.");
      const agora = new Date().toISOString();

      if (!ficaComQuemAchou(item)) {
        const pedido = { id: banco.novoId("ped"), usuario: { id: u.id, nome: u.nome }, texto, situacao: "retirada", codigo: codigoRetirada(), em: agora };
        item.pedidos.push(pedido);
        item.status = "em_devolucao";
        item.reivindicadoPor = { id: u.id, nome: u.nome };
        item.historico.push({ status: "em_devolucao", em: agora, nota: `${u.nome} avisou que vai retirar` });
        const ponto = pontoEntrega(item.pontoEntrega).nome;
        notificar(db, item.criadoPor.id, `${u.nome} avisou que vai retirar "${item.titulo}" em ${ponto} (código ${pedido.codigo}).`, item.id, "retirada");
        banco.salvar();
        return { status: 201, dados: { item: publico(item, u) } };
      }

      if (texto.length < 10) throw new ErroApi(400, "Conte um pouco mais: o que tem dentro, marcas, defeitos, onde você perdeu.");
      // A IA só AJUDA: indica se a descrição cita a anotação de quem encontrou. Quem decide é a pessoa.
      const confere = item.anotacao ? (await ia.verificar({ esperada: item.anotacao, dada: texto })).ok : null;
      item.pedidos.push({ id: banco.novoId("ped"), usuario: { id: u.id, nome: u.nome }, texto, confere, situacao: "pendente", em: agora });
      notificar(db, item.criadoPor.id, `${u.nome} diz que "${item.titulo}" é dele(a). Abra o item para comparar a descrição e combinar a entrega.`, item.id, "pedido");
      banco.salvar();
      return { status: 201, dados: { item: publico(item, u) } };
    }],

    ["POST", /^\/api\/itens\/([\w-]+)\/pedidos\/([\w-]+)\/(aprovar|recusar)$/, ({ u, m, corpo }) => {
      exigir(u);
      const db = banco.carregar();
      const item = achar(db, m[1]);
      if (item.criadoPor?.id !== u.id) throw new ErroApi(403, "Só quem encontrou pode responder aos pedidos.");
      const pedido = (item.pedidos || []).find((p) => p.id === m[2] && p.situacao === "pendente");
      if (!pedido) throw new ErroApi(404, "Pedido não encontrado.");
      if (m[3] === "recusar") {
        pedido.situacao = "recusado";
        notificar(db, pedido.usuario.id, `Quem encontrou "${item.titulo}" achou que a sua descrição não bate com o objeto. Se for mesmo seu, responda com mais detalhes.`, item.id, "recusado");
      } else {
        if (item.status !== "encontrado") throw new ErroApi(409, "Este item já está em processo de devolução.");
        const mensagem = String(corpo?.mensagem || "").trim().slice(0, 300);
        if (!mensagem) throw new ErroApi(400, "Diga onde e quando vocês podem se encontrar.");
        pedido.situacao = "aprovado";
        pedido.mensagem = mensagem;
        item.status = "em_devolucao";
        item.reivindicadoPor = { id: pedido.usuario.id, nome: pedido.usuario.nome };
        item.historico.push({ status: "em_devolucao", em: new Date().toISOString(), nota: `Entrega combinada com ${pedido.usuario.nome}` });
        notificar(db, pedido.usuario.id, `${u.nome} reconheceu seu objeto "${item.titulo}": ${mensagem}`, item.id, "aprovado");
      }
      banco.salvar();
      return { item: publico(item, u) };
    }],

    // Desfaz a retirada combinada (não era o dono, ou a pessoa desistiu): o item volta a aguardar o dono.
    ["POST", /^\/api\/itens\/([\w-]+)\/reabrir$/, ({ u, m }) => {
      exigir(u);
      const db = banco.carregar();
      const item = achar(db, m[1]);
      const autorizado = item.criadoPor?.id === u.id || item.reivindicadoPor?.id === u.id;
      if (!autorizado || item.status !== "em_devolucao") throw new ErroApi(403, "Só quem encontrou ou quem combinou a retirada pode desfazer.");
      const ativo = (item.pedidos || []).find((p) => ["aprovado", "retirada"].includes(p.situacao));
      if (ativo) ativo.situacao = "cancelado";
      const outro = item.criadoPor.id === u.id ? item.reivindicadoPor?.id : item.criadoPor.id;
      if (outro) notificar(db, outro, `A retirada de "${item.titulo}" foi desfeita por ${u.nome}. O objeto voltou a aguardar o dono.`, item.id, "reaberto");
      item.status = "encontrado";
      item.reivindicadoPor = null;
      item.historico.push({ status: "encontrado", em: new Date().toISOString(), nota: `Retirada desfeita por ${u.nome}` });
      avisarAlertas(db, item, item.criadoPor.id, "voltou a aguardar o dono");
      banco.salvar();
      return { item: publico(item, u) };
    }],

    ["POST", /^\/api\/itens\/([\w-]+)\/devolver$/, ({ u, m }) => {
      exigir(u);
      const db = banco.carregar();
      const item = achar(db, m[1]);
      const autorizado = item.criadoPor?.id === u.id || item.reivindicadoPor?.id === u.id;
      if (!autorizado || item.status !== "em_devolucao") throw new ErroApi(403, "Só quem encontrou ou quem combinou a retirada pode concluir a devolução.");
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
