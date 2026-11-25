// Achados UFG — interface (SPA em JavaScript puro, sem etapa de build).
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const main = $("#conteudo");

// ------------------------------------------------------------------ utilidades
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const armazenamento = {
  ler(chave, padrao = null) { try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch { return padrao; } },
  gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* modo privado */ } },
  sessao(chave, valor) {
    try {
      if (valor === undefined) { const v = sessionStorage.getItem(chave); return v ? JSON.parse(v) : null; }
      if (valor === null) sessionStorage.removeItem(chave); else sessionStorage.setItem(chave, JSON.stringify(valor));
    } catch { return null; }
  }
};

let usuario = armazenamento.ler("achados.usuario");
let config = null;
let apiEstatica = null; // preenchida quando não há servidor (GitHub Pages)

async function api(caminho, opcoes = {}) {
  if (apiEstatica) return apiEstatica(caminho, opcoes, usuario);
  caminho = caminho.replace(/^\//, ""); // caminho relativo: funciona em subpastas
  const headers = { ...(opcoes.headers || {}) };
  if (usuario) headers["X-Usuario"] = encodeURIComponent(JSON.stringify(usuario));
  if (opcoes.json !== undefined) { headers["Content-Type"] = "application/json"; opcoes.body = JSON.stringify(opcoes.json); }
  const r = await fetch(caminho, { ...opcoes, headers });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(dados.erro || "Algo deu errado. Tente novamente."); e.status = r.status; e.dados = dados; throw e; }
  return dados;
}

function quando(dataISO) {
  const d = new Date(dataISO.length === 10 ? dataISO + "T12:00:00" : dataISO);
  const dias = Math.round((new Date().setHours(12, 0, 0, 0) - new Date(d).setHours(12, 0, 0, 0)) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const primeiroNome = (n = "") => n.split(" ")[0];

const ICONES = {
  local: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/></svg>',
  relogio: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  ia: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" fill="currentColor"/></svg>',
  escudo: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  info: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  olho: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2"/></svg>',
  check: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  camera: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v12H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  lupa: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  sino: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 1 1 12 0v6l2 2H4zM10 21h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  caixa: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  seta: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const ROTULO_STATUS = { encontrado: "Encontrado", em_devolucao: "Em devolução", devolvido: "Devolvido" };
const statusHTML = (s) => `<span class="status status-${s}">${ROTULO_STATUS[s] ?? s}</span>`;
const nomeCategoria = (id) => config?.categorias.find((c) => c.id === id)?.nome ?? id;
const nomeLocal = (id) => config?.locais.find((l) => l.id === id)?.nome ?? id;

function fotoHTML(item, { tarja = true } = {}) {
  const borrar = item.fotoSensivel && !item.souQuemEncontrou && !item.souQuemReivindicou;
  const alt = borrar ? `Foto desfocada de ${item.titulo} para proteger dados pessoais` : `Foto de ${item.titulo}`;
  return `<div class="item-foto ${borrar ? "borrada" : ""}">
    ${item.foto ? `<img src="${esc(item.foto)}" alt="${esc(alt)}" loading="lazy">` : ""}
    ${borrar && tarja ? '<span class="tarja">Desfocada: contém dados pessoais</span>' : ""}
  </div>`;
}

function cardItem(item) {
  return `<a class="card item-card" href="#/item/${item.id}">
    ${fotoHTML(item)}
    <div class="item-corpo">
      ${statusHTML(item.status)}
      <h3>${esc(item.titulo)}</h3>
      <span class="meta">${ICONES.local}${esc(item.localNome)}</span>
      <span class="meta">${ICONES.relogio}Encontrado ${quando(item.data)}</span>
    </div>
  </a>`;
}

// ------------------------------------------------------------------ toasts e modal
function toast(msg, acao) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span>${esc(msg)}</span>`;
  if (acao) {
    const b = document.createElement("button");
    b.textContent = acao.rotulo;
    b.onclick = () => { acao.fn(); el.remove(); };
    el.append(b);
  }
  $("#toasts").append(el);
  setTimeout(() => el.remove(), acao ? 7000 : 4000);
}

let focoAnterior = null;
function abrirModal(html, { aoFechar, fechavel = true } = {}) {
  focoAnterior = document.activeElement;
  const raiz = $("#modal-raiz");
  raiz.innerHTML = `<div class="modal-fundo"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">${html}</div></div>`;
  const fundo = $(".modal-fundo", raiz);
  const fechar = () => { raiz.innerHTML = ""; document.removeEventListener("keydown", tecla); aoFechar?.(); focoAnterior?.focus?.(); };
  const tecla = (e) => {
    if (e.key === "Escape" && fechavel) fechar();
    if (e.key === "Tab") { // mantém o foco dentro do diálogo
      const f = $$("button, a, input, select, textarea", fundo).filter((x) => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener("keydown", tecla);
  if (fechavel) fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  $$("[data-fechar]", fundo).forEach((b) => (b.onclick = fechar));
  setTimeout(() => ($("[autofocus]", fundo) || $("input, button", fundo))?.focus(), 30);
  return { el: fundo, fechar };
}

// ------------------------------------------------------------------ usuário (login simulado)
function pedirUsuario(obrigatorio = !usuario) {
  const m = abrirModal(`
    <h2 id="modal-titulo">Boas-vindas ao Achados UFG</h2>
    <p class="texto-suave">Como devemos te chamar? Seu nome aparece só para quem participa da devolução do objeto.</p>
    <form id="form-usuario" novalidate>
      <div class="campo"><label for="u-nome">Seu nome</label>
        <input type="text" id="u-nome" autocomplete="name" required autofocus value="${esc(usuario?.nome || "")}" aria-describedby="u-erro">
        <div class="erro-campo" id="u-erro" hidden>Informe seu nome.</div></div>
      <div class="campo"><label for="u-vinculo">Vínculo com a UFG</label>
        <select id="u-vinculo">${["Estudante", "Professor(a)", "Servidor(a)", "Terceirizado(a)", "Setor / portaria"].map((v) => `<option ${usuario?.vinculo === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="aviso aviso-info">${ICONES.info}<span>Protótipo acadêmico: em produção esta etapa seria o login com a conta institucional da UFG.</span></div>
      <button class="btn btn-primario btn-bloco" type="submit">Continuar</button>
    </form>`, { fechavel: !obrigatorio });
  $("#form-usuario", m.el).onsubmit = (e) => {
    e.preventDefault();
    const nome = $("#u-nome", m.el).value.trim();
    if (!nome) { $("#u-nome", m.el).setAttribute("aria-invalid", "true"); $("#u-erro", m.el).hidden = false; $("#u-nome", m.el).focus(); return; }
    usuario = { nome, vinculo: $("#u-vinculo", m.el).value };
    armazenamento.gravar("achados.usuario", usuario);
    m.fechar();
    atualizarCabecalho();
    rotear();
  };
}

function atualizarCabecalho() {
  $("#btn-usuario span").textContent = usuario ? usuario.nome[0].toUpperCase() : "?";
  $("#btn-usuario").title = usuario ? `${usuario.nome} (${usuario.vinculo}) — trocar usuário` : "Entrar";
  atualizarSino();
}

async function atualizarSino() {
  if (!usuario) return;
  try {
    const ns = await api("/api/notificacoes");
    const novas = ns.filter((n) => !n.lida).length;
    const selo = $("#selo-notificacoes");
    selo.hidden = novas === 0;
    selo.textContent = novas;
    $("#sr-notificacoes").textContent = novas ? `Notificações: ${novas} novas` : "Notificações";
  } catch { /* silencioso */ }
}

// ------------------------------------------------------------------ acessibilidade
function aplicarPreferencias() {
  const p = armazenamento.ler("achados.preferencias", { escala: 1, contraste: false });
  document.documentElement.style.setProperty("--escala", p.escala);
  document.documentElement.dataset.contraste = p.contraste ? "alto" : "";
  $("#alto-contraste").checked = p.contraste;
  return p;
}
$("#btn-acessibilidade").onclick = () => {
  const menu = $("#menu-acessibilidade");
  menu.hidden = !menu.hidden;
  $("#btn-acessibilidade").setAttribute("aria-expanded", String(!menu.hidden));
};
$$("[data-fonte]").forEach((b) => (b.onclick = () => {
  const p = armazenamento.ler("achados.preferencias", { escala: 1, contraste: false });
  const d = Number(b.dataset.fonte);
  p.escala = d === 0 ? 1 : Math.min(1.5, Math.max(0.875, +(p.escala + d * 0.125).toFixed(3)));
  armazenamento.gravar("achados.preferencias", p);
  aplicarPreferencias();
}));
$("#alto-contraste").onchange = (e) => {
  const p = armazenamento.ler("achados.preferencias", { escala: 1, contraste: false });
  p.contraste = e.target.checked;
  armazenamento.gravar("achados.preferencias", p);
  aplicarPreferencias();
};
$("#btn-usuario").onclick = () => pedirUsuario(false);

// ------------------------------------------------------------------ roteador
function rotaAtual() {
  const [caminho, qs] = (location.hash.slice(1) || "/").split("?");
  return { partes: caminho.split("/").filter(Boolean), params: new URLSearchParams(qs || "") };
}

async function rotear() {
  const { partes, params } = rotaAtual();
  const nome = partes[0] || "inicio";
  $$("[data-rota]").forEach((a) => {
    if (a.dataset.rota === nome) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const telas = { inicio: telaInicio, buscar: telaBuscar, encontrei: telaEncontrei, item: telaItem, painel: telaPainel };
  const tela = telas[nome] || telaInicio;
  window.scrollTo(0, 0);
  await tela(partes, params);
  const h1 = $("h1", main);
  if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  document.title = (h1 ? h1.textContent + " · " : "") + "Achados UFG";
}

// ------------------------------------------------------------------ tela: início
async function telaInicio() {
  main.innerHTML = `
    <section class="hero">
      <h1>Perdeu ou encontrou algo na UFG?</h1>
      <p>Cadastre um objeto em poucos toques com ajuda da IA, ou descreva o que você perdeu do seu jeito.</p>
      <div class="escolhas">
        <a class="escolha perdi" href="#/buscar"><span class="ico">${ICONES.lupa}</span><span><strong>Perdi algo</strong><span>Descreva e veja itens parecidos</span></span></a>
        <a class="escolha achei" href="#/encontrei"><span class="ico">${ICONES.camera}</span><span><strong>Encontrei algo</strong><span>Tire uma foto e a IA descreve</span></span></a>
      </div>
    </section>
    <div class="secao-titulo"><h2>Achados recentes</h2><a href="#/buscar">Ver todos</a></div>
    <div class="grade-itens" id="recentes" aria-busy="true">${'<div class="card esqueleto" style="height:230px"></div>'.repeat(4)}</div>
    <div class="secao-titulo"><h2>Como funciona</h2></div>
    <div class="passos">
      <div class="card passo"><span class="num">1</span><div><h3>Quem encontra fotografa</h3><p>A IA sugere título, descrição e categoria. Você só confirma ou corrige.</p></div></div>
      <div class="card passo"><span class="num">2</span><div><h3>Quem perdeu descreve</h3><p>Escreva como falaria: “garrafa azul com capa de silicone perto do RU ontem”.</p></div></div>
      <div class="card passo"><span class="num">3</span><div><h3>Devolução segura</h3><p>Uma pergunta de verificação confirma que o objeto é seu antes da entrega.</p></div></div>
    </div>`;
  const itens = await api("/api/itens");
  const el = $("#recentes");
  el.removeAttribute("aria-busy");
  el.innerHTML = itens.slice(0, 8).map(cardItem).join("") || `<p class="texto-suave">Nenhum item cadastrado ainda.</p>`;
}

// ------------------------------------------------------------------ tela: buscar
const EXEMPLOS = ["perdi uma garrafa azul com capa de silicone perto do RU ontem", "caderno preto na sala do CAB", "guarda-chuva preto no INF"];
let ultimaBusca = null;

async function telaBuscar(_p, params) {
  const q = params.get("q") || "";
  main.innerHTML = `
    <h1>O que você perdeu?</h1>
    <p class="texto-suave">Descreva com suas palavras: o objeto, cor, detalhes, onde e quando. Não precisa acertar palavras-chave.</p>
    <form class="busca-caixa" id="form-busca" role="search">
      <label for="q" class="sr">Descrição do objeto perdido</label>
      <textarea id="q" rows="2" placeholder="Ex.: perdi uma garrafa azul perto do RU ontem">${esc(q)}</textarea>
      <button class="btn btn-primario" type="submit">${ICONES.lupa}<span>Buscar</span></button>
    </form>
    <div class="exemplos"><span class="rotulo">Experimente:</span>
      <div class="chips mt" style="margin-top:6px">${EXEMPLOS.map((e) => `<button class="chip" type="button" data-exemplo="${esc(e)}">${esc(e)}</button>`).join("")}</div></div>
    <div id="area-resultados" aria-live="polite"></div>`;
  const form = $("#form-busca"), campo = $("#q");
  campo.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  form.onsubmit = (e) => { e.preventDefault(); const v = campo.value.trim(); if (!v) { campo.focus(); return; } history.replaceState(null, "", `#/buscar?q=${encodeURIComponent(v)}`); executarBusca(v); };
  $$("[data-exemplo]").forEach((b) => (b.onclick = () => { campo.value = b.dataset.exemplo; form.requestSubmit(); }));
  if (q) executarBusca(q);
  else mostrarTodos();
}

async function mostrarTodos() {
  const itens = await api("/api/itens");
  $("#area-resultados").innerHTML = `<div class="secao-titulo"><h2>Todos os itens aguardando o dono (${itens.length})</h2></div><div class="grade-itens">${itens.map(cardItem).join("")}</div>`;
}

async function executarBusca(consulta) {
  const area = $("#area-resultados");
  area.innerHTML = `<div class="carregando"><span class="spinner" aria-hidden="true"></span>Procurando itens parecidos com a sua descrição…</div>`;
  try {
    const r = await api("/api/buscar", { method: "POST", json: { consulta } });
    ultimaBusca = { consulta, ...r };
    renderResultados();
    // No celular, leva os resultados para a área visível.
    if (window.innerWidth < 860) area.scrollIntoView({ block: "start" });
  } catch (e) {
    area.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>${esc(e.message)}</span></div>`;
  }
}

function chipsInterpretacao(f) {
  const chips = [];
  if (f.categoria) chips.push(["categoria", `Categoria: ${nomeCategoria(f.categoria)}`]);
  if (f.cor) chips.push(["cor", `Cor: ${f.cor}`]);
  if (f.local) chips.push(["local", `Local: ${nomeLocal(f.local).split(" – ")[0]}`]);
  if (f.periodoDias) chips.push(["periodoDias", f.periodoDias <= 1 ? "Quando: hoje" : `Quando: últimos ${f.periodoDias} dias`]);
  (f.palavras || []).forEach((p, i) => chips.push([`palavra:${i}`, `“${p}”`]));
  return chips;
}

function renderResultados() {
  const { interpretacao: f, resultados, fonte, consulta } = ultimaBusca;
  const chips = chipsInterpretacao(f);
  const fonteTxt = fonte === "claude" ? "Interpretado pela IA" : fonte === "refinamento" ? "Filtros ajustados por você" : "Interpretado pelo modo demonstração";
  $("#area-resultados").innerHTML = `
    <section class="interpretacao" aria-label="Como entendemos sua busca">
      <div class="titulo">${ICONES.ia}${fonteTxt} — toque em um filtro para removê-lo</div>
      <div class="chips">${chips.map(([k, t]) => `<button class="chip" data-remover="${k}" aria-label="Remover filtro ${esc(t)}">${esc(t)} <span class="x" aria-hidden="true">×</span></button>`).join("") || '<span class="texto-suave">Nenhum filtro reconhecido.</span>'}</div>
    </section>
    <div class="secao-titulo"><h2>${resultados.length ? `${resultados.length} ${resultados.length === 1 ? "item parecido" : "itens parecidos"}` : "Nenhum item parecido ainda"}</h2>
      <button class="btn btn-secundario" id="criar-alerta">${ICONES.sino}Avise-me</button></div>
    ${resultados.length ? resultados.map(({ item, score, motivo }) => `
      <a class="card resultado" href="#/item/${item.id}">
        ${fotoHTML(item, { tarja: false })}
        <div><h3>${esc(item.titulo)}</h3>
          <div class="meta">${ICONES.local}${esc(item.localNome)}${item.localDetalhe ? " · " + esc(item.localDetalhe) : ""}</div>
          <div class="meta">${ICONES.relogio}Encontrado ${quando(item.data)}</div>
          <p class="motivo mt" style="margin-top:6px">${esc(motivo)}</p></div>
        <div class="compat" aria-label="Compatibilidade ${score}%"><strong>${score}% compatível</strong><span class="compat-barra"><span style="width:${score}%"></span></span>${statusHTML(item.status)}</div>
      </a>`).join("") : `
      <div class="card vazio">${ICONES.caixa}<h3>Ainda não encontramos nada parecido</h3>
        <p class="texto-suave">Objetos costumam ser cadastrados ao longo do dia. Ative um alerta e avisaremos quando algo compatível com “${esc(consulta)}” aparecer.</p></div>`}`;
  $$("[data-remover]").forEach((b) => (b.onclick = () => refinar(b.dataset.remover)));
  $("#criar-alerta").onclick = criarAlerta;
}

async function refinar(chave) {
  const f = { ...ultimaBusca.interpretacao, palavras: [...(ultimaBusca.interpretacao.palavras || [])] };
  if (chave.startsWith("palavra:")) f.palavras.splice(Number(chave.split(":")[1]), 1); else f[chave] = null;
  const r = await api("/api/buscar/refinar", { method: "POST", json: { filtros: f } });
  ultimaBusca = { ...ultimaBusca, ...r };
  renderResultados();
  toast("Filtro removido. Resultados atualizados.");
  $(".interpretacao .chip")?.focus();
}

async function criarAlerta() {
  if (!usuario) return pedirUsuario();
  await api("/api/alertas", { method: "POST", json: { consulta: ultimaBusca.consulta, filtros: ultimaBusca.interpretacao } });
  toast("Alerta criado! Você será avisado no sino quando algo compatível for cadastrado.");
  const b = $("#criar-alerta"); b.disabled = true; b.innerHTML = `${ICONES.check}Alerta ativo`;
}

// ------------------------------------------------------------------ tela: encontrei (assistente em 3 passos)
let rascunho = null;
const PASSOS = ["Foto", "Descrição", "Local e entrega"];

function progressoHTML(atual) {
  return `<ol class="progresso" aria-label="Etapas do cadastro">${PASSOS.map((p, i) => `<li class="${i < atual ? "feito" : i === atual ? "atual" : ""}" ${i === atual ? 'aria-current="step"' : ""}>${p}</li>`).join("")}</ol>`;
}

async function telaEncontrei() {
  if (!usuario) { main.innerHTML = `<h1>Encontrei algo</h1><p>Para cadastrar, diga como podemos te chamar.</p>`; return pedirUsuario(); }
  rascunho = rascunho || armazenamento.sessao("achados.rascunho") || { passo: 0 };
  [passoFoto, passoDescricao, passoLocal, passoConcluido][rascunho.passo]();
}
const salvarRascunho = () => armazenamento.sessao("achados.rascunho", rascunho);
function irPara(passo) { rascunho.passo = passo; salvarRascunho(); telaEncontrei().then(() => $("h1", main)?.focus()); }

function passoFoto() {
  main.innerHTML = `
    <h1>Encontrei algo</h1>
    ${progressoHTML(0)}
    <label class="area-foto" id="area-foto" for="foto">
      ${ICONES.camera}
      <strong>Tire uma foto ou escolha da galeria</strong>
      <p class="texto-suave" style="margin:4px 0 0">A IA vai sugerir a descrição para você. JPG ou PNG, até 5 MB.</p>
      <input type="file" id="foto" accept="image/*" capture="environment">
    </label>
    <div class="aviso aviso-privacidade">${ICONES.escudo}<span><strong>Dica de privacidade:</strong> fotografe só o objeto. Se aparecer nome ou número de documento, a IA avisa e a foto fica desfocada para o público.</span></div>
    <div id="estado-foto" aria-live="polite"></div>
    <div class="rodape-acoes"><button class="btn btn-fantasma" id="sem-foto">Continuar sem foto</button></div>`;
  const input = $("#foto"), area = $("#area-foto");
  input.onchange = () => input.files[0] && enviarFoto(input.files[0]);
  ["dragenter", "dragover"].forEach((ev) => area.addEventListener(ev, (e) => { e.preventDefault(); area.classList.add("arrastando"); }));
  ["dragleave", "drop"].forEach((ev) => area.addEventListener(ev, (e) => { e.preventDefault(); area.classList.remove("arrastando"); }));
  area.addEventListener("drop", (e) => e.dataTransfer.files[0] && enviarFoto(e.dataTransfer.files[0]));
  $("#sem-foto").onclick = () => { rascunho = { passo: 1, foto: null, ia: null, campos: { titulo: "", descricao: "", categoria: "outro", cor: "colorido", tags: [], tipoDetalhe: "marca" } }; irPara(1); };
}

function estadoCarregando(titulo, texto, progresso = null) {
  return `<div class="card carregando"><span class="spinner" aria-hidden="true"></span><span style="flex:1"><strong>${titulo}</strong><br><span class="texto-suave">${texto}</span>
    ${progresso === null ? "" : `<span class="compat-barra" style="display:block;margin-top:8px" role="progressbar" aria-valuenow="${progresso}" aria-valuemin="0" aria-valuemax="100" aria-label="Download do modelo"><span style="width:${progresso}%;background:var(--azul)"></span></span>`}</span></div>`;
}

async function enviarFoto(arquivo) {
  const estado = $("#estado-foto");
  if (!arquivo.type.startsWith("image/")) { estado.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>Esse arquivo não é uma imagem. Escolha uma foto JPG ou PNG.</span></div>`; return; }
  estado.innerHTML = estadoCarregando("Analisando a foto…", "A IA está identificando o objeto. Isso leva alguns segundos.");
  const fd = new FormData(); fd.append("foto", arquivo);
  try {
    const r = await api("/api/analisar", { method: "POST", body: fd });
    let a = r.analise;
    if (a.fonte === "manual") {
      // Sem Claude: roda o modelo aberto CLIP no próprio navegador.
      const urlLocal = URL.createObjectURL(arquivo);
      try {
        const { analisarNoNavegador } = await import("./ia-navegador.js");
        a = await analisarNoNavegador(urlLocal, (p) => {
          estado.innerHTML = estadoCarregando("Preparando a IA no seu navegador…", `Baixando o modelo aberto CLIP (cerca de 90 MB, só na primeira vez): ${p}%`, p);
        });
      } catch (erro) {
        console.warn("IA no navegador indisponível:", erro);
        a = { ...a, mensagem: "Não foi possível carregar a IA no navegador (sem internet ou navegador sem suporte). Preencha os campos manualmente." };
      } finally { URL.revokeObjectURL(urlLocal); }
    }
    rascunho = { passo: 1, foto: r.foto, ia: a, campos: { titulo: a.titulo, descricao: a.descricao, categoria: a.categoria, cor: a.cor, tags: a.tags, tipoDetalhe: a.tipoDetalhe || "marca" } };
    irPara(1);
  } catch (e) {
    estado.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>${esc(e.message)}</span></div>`;
  }
}

function passoDescricao() {
  const { ia, campos, foto } = rascunho;
  const veioDaIA = ia && ia.fonte !== "manual";
  main.innerHTML = `
    <h1>Confira a descrição</h1>
    ${progressoHTML(1)}
    <div class="previa">
      <div>${foto ? `<div class="item-foto ${ia?.dadosSensiveis ? "" : ""}"><img src="${esc(foto)}" alt="Foto enviada do objeto"></div>` : '<div class="card vazio">Sem foto</div>'}
        ${foto ? '<button class="btn btn-fantasma btn-bloco" id="trocar-foto">Trocar foto</button>' : ""}</div>
      <form id="form-desc" novalidate>
        ${veioDaIA ? `<div class="aviso aviso-ia">${ICONES.ia}<span><strong>${ia.fonte === "navegador" ? "Sugestão da IA do seu navegador (modelo aberto CLIP)." : "Sugestão da IA (Claude)."}</strong>
          ${ia.fonte === "navegador" ? "Ela reconhece o tipo de objeto e a cor; acrescente marcas e detalhes." : "Revise e corrija o que for preciso."} Você tem a palavra final.${ia.confianca ? ` Confiança: ${Math.round(ia.confianca * 100)}%.` : ""}
          ${ia.alternativas?.length ? `<br>Também pode ser: ${ia.alternativas.map(esc).join(", ")}.` : ""}</span></div>` : ""}
        ${ia?.mensagem ? `<div class="aviso aviso-info">${ICONES.info}<span>${esc(ia.mensagem)}</span></div>` : ""}
        ${ia?.dadosSensiveis ? `<div class="aviso aviso-privacidade" role="alert">${ICONES.escudo}<span><strong>Possíveis dados pessoais.</strong> ${esc(ia.avisoPrivacidade)}</span></div>` : ""}
        <div class="campo"><label for="titulo">Título <span aria-hidden="true">*</span></label>
          <input type="text" id="titulo" required maxlength="80" value="${esc(campos.titulo)}" aria-describedby="titulo-erro">
          <div class="erro-campo" id="titulo-erro" hidden>Dê um nome curto ao objeto, ex.: “Garrafa azul”.</div></div>
        <div class="campo"><label for="descricao">Descrição</label>
          <textarea id="descricao" maxlength="500" aria-describedby="descricao-dica">${esc(campos.descricao)}</textarea>
          <div class="dica" id="descricao-dica">Cite marcas, adesivos ou defeitos. Não escreva nomes ou números de documentos.</div></div>
        <div class="grade-2">
          <div class="campo"><label for="categoria">Categoria</label>
            <select id="categoria">${config.categorias.map((c) => `<option value="${c.id}" ${c.id === campos.categoria ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></div>
          <div class="campo"><label for="cor">Cor predominante</label>
            <select id="cor">${config.cores.map((c) => `<option ${c === campos.cor ? "selected" : ""}>${c}</option>`).join("")}</select></div>
        </div>
        <div class="rodape-acoes">
          <button type="button" class="btn btn-secundario" id="voltar">${ICONES.seta}Voltar</button>
          <button type="submit" class="btn btn-primario">Continuar</button>
        </div>
      </form>
    </div>`;
  $("#voltar").onclick = () => irPara(0);
  $("#trocar-foto") && ($("#trocar-foto").onclick = () => irPara(0));
  $("#form-desc").onsubmit = (e) => {
    e.preventDefault();
    const titulo = $("#titulo").value.trim();
    if (!titulo) { $("#titulo").setAttribute("aria-invalid", "true"); $("#titulo-erro").hidden = false; $("#titulo").focus(); return; }
    Object.assign(rascunho.campos, { titulo, descricao: $("#descricao").value.trim(), categoria: $("#categoria").value, cor: $("#cor").value });
    irPara(2);
  };
}

function passoLocal() {
  const c = rascunho.campos;
  main.innerHTML = `
    <h1>Onde estava e onde vai ficar?</h1>
    ${progressoHTML(2)}
    <form id="form-local" novalidate>
      <div class="grade-2">
        <div class="campo"><label for="local">Onde você encontrou? <span aria-hidden="true">*</span></label>
          <select id="local" required aria-describedby="local-erro"><option value="">Escolha o prédio ou área</option>${config.locais.map((l) => `<option value="${l.id}" ${l.id === c.local ? "selected" : ""}>${esc(l.nome)}</option>`).join("")}</select>
          <div class="erro-campo" id="local-erro" hidden>Escolha onde o objeto foi encontrado.</div></div>
        <div class="campo"><label for="localDetalhe">Detalhe do local</label>
          <input type="text" id="localDetalhe" placeholder="Ex.: sala 204, mesa perto da janela" value="${esc(c.localDetalhe || "")}"></div>
      </div>
      <div class="campo" style="max-width:280px"><label for="data">Quando?</label>
        <input type="date" id="data" max="${hojeISO()}" value="${esc(c.data || hojeISO())}"></div>
      <fieldset class="campo" style="border:0;padding:0;margin:0 0 16px"><legend class="rotulo">Onde o dono poderá retirar? <span aria-hidden="true">*</span></legend>
        <div class="opcoes">${config.pontos.map((p, i) => `<label class="opcao"><input type="radio" name="entrega" value="${p.id}" ${p.id === (c.pontoEntrega || "portaria-inf") ? "checked" : ""}><span><strong>${esc(p.nome)}</strong><small>${esc(p.horario)}</small></span></label>`).join("")}</div></fieldset>
      <div class="painel-bloco">
        <h2 style="display:flex;gap:8px;align-items:center">${ICONES.escudo.replace('viewBox', 'width="22" height="22" viewBox')} Um detalhe que só o dono sabe</h2>
        <p class="texto-suave">Escolha algo que <strong>não aparece na foto</strong>. Quem disser que o objeto é seu vai precisar contar esse detalhe para ver onde retirar. Ninguém vê o que você escrever aqui.</p>
        <fieldset style="border:0;padding:0;margin:0 0 12px" ${c.semDetalhe ? "disabled" : ""} id="grupo-detalhe">
          <legend class="rotulo">Que tipo de detalhe?${rascunho.ia && rascunho.ia.fonte !== "manual" ? ' <span class="chip chip-ia" style="font-size:.72rem">sugerido pela IA</span>' : ""}</legend>
          <div class="chips" role="radiogroup">${config.tiposDetalhe.map((t) => `<label class="chip chip-opcao"><input type="radio" name="tipo-detalhe" value="${t.id}" ${t.id === (c.tipoDetalhe || "marca") ? "checked" : ""}> ${esc(t.rotulo)}</label>`).join("")}</div>
          <div class="campo mt" id="campo-pergunta-livre" hidden><label for="pergunta">Qual pergunta o dono deve responder?</label>
            <input type="text" id="pergunta" value="${esc(c.pergunta || "")}" placeholder="Ex.: Qual o nome do aplicativo na tela de bloqueio?"></div>
          <div class="campo mt"><label for="resposta" id="rotulo-resposta">Qual é o detalhe?</label>
            <input type="text" id="resposta" value="${esc(c.resposta || "")}" aria-describedby="resposta-erro">
            <div class="erro-campo" id="resposta-erro" hidden>Escreva o detalhe ou marque que não encontrou nenhum.</div></div>
        </fieldset>
        <label class="opcao"><input type="checkbox" id="sem-detalhe" ${c.semDetalhe ? "checked" : ""}><span><strong>Não encontrei nenhum detalhe assim</strong><small>Quem disser que é dono vai descrever o objeto e você aprova ou recusa o pedido.</small></span></label>
      </div>
      <div class="rodape-acoes">
        <button type="button" class="btn btn-secundario" id="voltar">${ICONES.seta}Voltar</button>
        <button type="submit" class="btn btn-destaque">${ICONES.check}Publicar achado</button>
      </div>
      <div id="erro-envio" aria-live="assertive"></div>
    </form>`;
  // O rótulo e o exemplo do campo mudam conforme o tipo de detalhe escolhido.
  const atualizarDetalhe = () => {
    const tipo = config.tiposDetalhe.find((t) => t.id === $("input[name=tipo-detalhe]:checked")?.value) || config.tiposDetalhe[0];
    $("#rotulo-resposta").textContent = tipo.campo;
    $("#resposta").placeholder = tipo.exemplo || "O que o dono deve responder";
    $("#campo-pergunta-livre").hidden = tipo.id !== "outro";
  };
  $$("input[name=tipo-detalhe]").forEach((r) => (r.onchange = atualizarDetalhe));
  atualizarDetalhe();
  $("#sem-detalhe").onchange = (e) => { $("#grupo-detalhe").disabled = e.target.checked; };
  const ler = () => Object.assign(c, {
    local: $("#local").value, localDetalhe: $("#localDetalhe").value.trim(), data: $("#data").value || hojeISO(),
    pontoEntrega: $("input[name=entrega]:checked")?.value, semDetalhe: $("#sem-detalhe").checked,
    tipoDetalhe: $("input[name=tipo-detalhe]:checked")?.value, pergunta: $("#pergunta").value.trim(), resposta: $("#resposta").value.trim()
  });
  $("#voltar").onclick = () => { ler(); irPara(1); };
  $("#form-local").onsubmit = async (e) => {
    e.preventDefault(); ler(); salvarRascunho();
    let primeiroErro = null;
    const marcar = (id, erroId, invalido) => { $(id).setAttribute("aria-invalid", String(invalido)); $(erroId).hidden = !invalido; if (invalido && !primeiroErro) primeiroErro = $(id); };
    marcar("#local", "#local-erro", !c.local);
    marcar("#resposta", "#resposta-erro", !c.semDetalhe && (!c.resposta || (c.tipoDetalhe === "outro" && !c.pergunta)));
    if (primeiroErro) return primeiroErro.focus();
    const ia = rascunho.ia;
    const editado = ia && ia.fonte !== "manual" && (ia.titulo !== c.titulo || ia.descricao !== c.descricao || ia.categoria !== c.categoria || ia.cor !== c.cor);
    const btn = $("button[type=submit]", e.target); btn.disabled = true; btn.textContent = "Publicando…";
    try {
      const r = await api("/api/itens", { method: "POST", json: {
        ...c, resposta: c.semDetalhe ? "" : c.resposta, foto: rascunho.foto, fotoSensivel: Boolean(ia?.dadosSensiveis), avisoPrivacidade: ia?.avisoPrivacidade || "",
        geradoPorIA: Boolean(ia && ia.fonte !== "manual"), editadoPeloUsuario: Boolean(editado) } });
      rascunho = { passo: 3, criado: r.item, avisados: r.avisados };
      irPara(3);
    } catch (err) {
      btn.disabled = false; btn.innerHTML = `${ICONES.check}Publicar achado`;
      $("#erro-envio").innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>${esc(err.message)}</span></div>`;
    }
  };
}

function passoConcluido() {
  const { criado, avisados } = rascunho;
  main.innerHTML = `
    <div class="card sucesso-grande">
      <div class="selo-ok">${ICONES.check}</div>
      <h1>Obrigado! Seu achado foi publicado</h1>
      <p class="texto-suave">${avisados ? `<strong>${avisados} ${avisados === 1 ? "pessoa que procurava" : "pessoas que procuravam"} algo parecido ${avisados === 1 ? "foi avisada" : "foram avisadas"} agora.</strong> ` : ""}${criado.temDetalhe ? "Você receberá uma notificação quando o dono acertar o detalhe." : "Você receberá uma notificação quando alguém pedir a devolução, para aprovar ou recusar."}</p>
      ${linhaTempoHTML(criado)}
      <div class="rodape-acoes" style="justify-content:center">
        <a class="btn btn-secundario" href="#/item/${criado.id}">Ver publicação</a>
        <button class="btn btn-primario" id="outro">Cadastrar outro objeto</button>
      </div>
    </div>`;
  $("#outro").onclick = () => { rascunho = { passo: 0 }; irPara(0); };
  rascunho = null; armazenamento.sessao("achados.rascunho", null);
}

// ------------------------------------------------------------------ tela: detalhe do item
function linhaTempoHTML(item) {
  const ordem = ["encontrado", "em_devolucao", "devolvido"];
  const atual = ordem.indexOf(item.status);
  const rot = ["Encontrado", "Dono confirmado", "Devolvido"];
  return `<ol class="linha-tempo" aria-label="Situação do item: ${ROTULO_STATUS[item.status]}">${ordem.map((s, i) => {
    const h = item.historico?.find((x) => x.status === s);
    const cls = i < atual || (i === atual && s === "devolvido") ? "ok" : i === atual ? "atual ok" : "";
    return `<li class="${cls}" ${i === atual ? 'aria-current="step"' : ""}><span class="bola">${i <= atual ? ICONES.check : ""}</span>${rot[i]}<small>${h ? quando(h.em) : "—"}</small></li>`;
  }).join("")}</ol>`;
}

async function telaItem(partes) {
  let item;
  try { item = await api(`/api/itens/${partes[1]}`); }
  catch { main.innerHTML = `<div class="card vazio"><h1>Item não encontrado</h1><p>Ele pode ter sido removido.</p><a class="btn btn-primario" href="#/buscar">Voltar à busca</a></div>`; return; }
  const entrega = item.entrega;
  const podeVerEntrega = item.souQuemEncontrou || item.souQuemReivindicou;
  main.innerHTML = `
    <a href="javascript:history.back()" class="btn btn-fantasma" style="padding-left:0">${ICONES.seta}Voltar</a>
    <div class="detalhe">
      <div>${fotoHTML(item)}</div>
      <div>
        ${statusHTML(item.status)}
        <h1 style="margin-top:8px">${esc(item.titulo)}</h1>
        <p>${esc(item.descricao)}</p>
        ${item.geradoPorIA ? `<div class="chips"><span class="chip chip-ia">${ICONES.ia.replace("viewBox", 'width="14" height="14" viewBox')} Descrição gerada por IA${item.editadoPeloUsuario ? " e corrigida por quem encontrou" : " e confirmada por quem encontrou"}</span></div>` : ""}
        <dl class="lista-info">
          <dt>Encontrado em</dt><dd>${esc(item.localNome)}${item.localDetalhe ? ` · ${esc(item.localDetalhe)}` : ""}</dd>
          <dt>Quando</dt><dd>${quando(item.data)} (${new Date(item.data + "T12:00").toLocaleDateString("pt-BR")})</dd>
          <dt>Categoria</dt><dd>${esc(nomeCategoria(item.categoria))}</dd>
          <dt>Retirada</dt><dd>${podeVerEntrega ? `${esc(entrega.nome)} <small class="texto-suave">(${esc(entrega.horario)})</small>` : "Aparece quando o dono for confirmado"}</dd>
          <dt>Cadastrado por</dt><dd>${esc(primeiroNome(item.criadoPor?.nome))} · ${esc(item.criadoPor?.vinculo || "")}</dd>
        </dl>
        <div class="painel-bloco"><h2>Situação</h2>${linhaTempoHTML(item)}</div>
        <div id="acoes-item"></div>
      </div>
    </div>`;
  const acoes = $("#acoes-item");
  if (item.status === "encontrado" && !item.souQuemEncontrou && item.meuPedido?.situacao === "pendente") {
    acoes.innerHTML = `<div class="aviso aviso-info">${ICONES.relogio}<span><strong>Seu pedido foi enviado.</strong> ${esc(primeiroNome(item.criadoPor?.nome))} vai conferir sua descrição; você será avisado no sino.</span></div>`;
  } else if (item.status === "encontrado" && !item.souQuemEncontrou && item.meuPedido?.situacao === "recusado") {
    acoes.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>Quem encontrou achou que sua descrição não corresponde ao objeto. Se for mesmo seu, procure o ponto de entrega com um documento.</span></div>`;
  } else if (item.status === "encontrado" && !item.souQuemEncontrou) {
    const esgotou = item.temDetalhe && item.tentativasRestantes <= 0;
    acoes.innerHTML = `<button class="btn btn-destaque btn-bloco" id="reivindicar">${ICONES.escudo}É meu! Quero recuperar</button>
      <p class="texto-suave mt" style="font-size:.88rem">${item.temDetalhe && !esgotou
        ? `Você vai contar um detalhe do objeto que não aparece na foto. ${item.tentativasRestantes} ${item.tentativasRestantes === 1 ? "tentativa restante" : "tentativas restantes"}.`
        : "Você vai descrever o objeto e quem encontrou confere o pedido."}</p>`;
    $("#reivindicar").onclick = () => (!usuario ? pedirUsuario() : item.temDetalhe && !esgotou ? modalVerificacao(item) : modalPedido(item));
  } else if (item.status === "encontrado" && item.souQuemEncontrou) {
    const pedidos = item.pedidos || [];
    acoes.innerHTML = pedidos.length
      ? `<div class="painel-bloco"><h2>Pedidos de devolução (${pedidos.length})</h2>
          <p class="texto-suave">Compare a descrição com o objeto. Aprove só se tiver certeza.</p>
          ${pedidos.map((p) => `<div class="linha-lista" style="flex-direction:column;align-items:stretch"><span class="info"><strong>${esc(p.usuario.nome)}</strong> <small class="texto-suave">· ${quando(p.em)}</small><br>“${esc(p.texto)}”</span>
            <span style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-perigo" data-pedido="${p.id}" data-acao="recusar">Recusar</button><button class="btn btn-primario" data-pedido="${p.id}" data-acao="aprovar">Aprovar</button></span></div>`).join("")}</div>`
      : `<div class="aviso aviso-info">${ICONES.info}<span>Você cadastrou este item. ${item.temDetalhe
        ? `Avisaremos quando alguém acertar o detalhe que você informou (pergunta mostrada: <em>“${esc(item.pergunta)}”</em>).`
        : "Avisaremos quando alguém pedir a devolução, para você aprovar ou recusar."}</span></div>`;
    $$("[data-pedido]").forEach((b) => (b.onclick = async () => {
      await api(`/api/itens/${item.id}/pedidos/${b.dataset.pedido}/${b.dataset.acao}`, { method: "POST" });
      toast(b.dataset.acao === "aprovar" ? "Pedido aprovado. A pessoa foi avisada de onde retirar." : "Pedido recusado.");
      telaItem(partes);
    }));
  } else if (item.status === "em_devolucao" && (item.souQuemEncontrou || item.souQuemReivindicou)) {
    acoes.innerHTML = `<div class="aviso aviso-sucesso">${ICONES.check}<span>${item.souQuemReivindicou
      ? `Posse confirmada! Retire em <strong>${esc(entrega.nome)}</strong> (${esc(entrega.horario)}). ${entrega.id === "comigo" ? `Combine com ${esc(primeiroNome(item.criadoPor.nome))} pelas notificações.` : "Leve um documento com foto."}`
      : `${esc(item.contato?.reivindicadoPor)} confirmou a posse. Quando entregar, confirme abaixo.`}</span></div>
      <button class="btn btn-primario btn-bloco" id="devolver">${ICONES.check}${item.souQuemReivindicou ? "Já recebi meu objeto" : "Confirmar que devolvi"}</button>`;
    $("#devolver").onclick = async () => { await api(`/api/itens/${item.id}/devolver`, { method: "POST" }); toast("Devolução concluída. Obrigado!"); telaItem(partes); };
  } else if (item.status === "em_devolucao") {
    acoes.innerHTML = `<div class="aviso aviso-info">${ICONES.info}<span>Outra pessoa já confirmou a posse deste objeto e a devolução está em andamento.</span></div>`;
  } else {
    acoes.innerHTML = `<div class="aviso aviso-sucesso">${ICONES.check}<span>Este objeto já voltou para o dono. 🎉</span></div>`;
  }
}

function modalVerificacao(item) {
  const m = abrirModal(`
    <h2 id="modal-titulo">Conte um detalhe do seu objeto</h2>
    <p class="texto-suave">Quem encontrou guardou um detalhe que não aparece na foto. Responda com suas palavras — não precisa ser igual.</p>
    <form id="form-verif" novalidate>
      <div class="campo"><label for="resp">${esc(item.pergunta)}</label>
        <input type="text" id="resp" autocomplete="off" autofocus aria-describedby="verif-estado"></div>
      <div id="verif-estado" aria-live="assertive"></div>
      <div class="rodape-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
        <button type="submit" class="btn btn-primario">Enviar resposta</button></div>
    </form>`);
  $("#form-verif", m.el).onsubmit = async (e) => {
    e.preventDefault();
    const resposta = $("#resp", m.el).value.trim(), estado = $("#verif-estado", m.el), btn = $("button[type=submit]", m.el);
    if (!resposta) { estado.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>Escreva sua resposta.</span></div>`; return; }
    btn.disabled = true; btn.textContent = "Conferindo…";
    try {
      const r = await api(`/api/itens/${item.id}/reivindicar`, { method: "POST", json: { resposta } });
      if (r.ok) {
        m.el.querySelector(".modal").innerHTML = `<div class="sucesso-grande"><div class="selo-ok">${ICONES.check}</div>
          <h2 id="modal-titulo">Resposta confirmada!</h2>
          <p>Retire seu objeto em <strong>${esc(r.item.entrega.nome)}</strong><br><span class="texto-suave">${esc(r.item.entrega.horario)}</span></p>
          <p class="texto-suave">Quem encontrou foi avisado. Leve um documento com foto.</p>
          <button class="btn btn-primario btn-bloco" data-fechar>Entendi</button></div>`;
        $("[data-fechar]", m.el).onclick = () => { m.fechar(); rotear(); };
        $("[data-fechar]", m.el).focus();
      } else {
        btn.disabled = false; btn.textContent = "Enviar resposta";
        if (r.tentativasRestantes > 0) {
          estado.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>Não bateu com o detalhe guardado. Você ainda tem ${r.tentativasRestantes} ${r.tentativasRestantes === 1 ? "tentativa" : "tentativas"}.</span></div>`;
          $("#resp", m.el).select();
        } else {
          // Sem tentativas: em vez de bloquear, oferece enviar a descrição para quem encontrou avaliar.
          m.fechar();
          modalPedido(item, "Suas tentativas acabaram. Se o objeto for mesmo seu, descreva-o para quem encontrou avaliar.");
        }
      }
    } catch (err) {
      btn.disabled = false; btn.textContent = "Enviar resposta";
      estado.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>${esc(err.message)}</span></div>`;
    }
  };
}

// Pedido avaliado por quem encontrou (item sem detalhe secreto ou tentativas esgotadas).
function modalPedido(item, aviso) {
  const m = abrirModal(`
    <h2 id="modal-titulo">Descreva seu objeto</h2>
    ${aviso ? `<div class="aviso aviso-erro">${ICONES.info}<span>${esc(aviso)}</span></div>` : ""}
    <p class="texto-suave">${esc(primeiroNome(item.criadoPor?.nome))} vai ler sua descrição e aprovar ou recusar. Conte detalhes que <strong>não aparecem na foto</strong>: o que tem dentro, marcas, defeitos, onde você perdeu.</p>
    <form id="form-pedido" novalidate>
      <div class="campo"><label for="texto-pedido">Sua descrição</label>
        <textarea id="texto-pedido" maxlength="500" autofocus aria-describedby="pedido-estado" placeholder="Ex.: tem meu nome bordado na etiqueta e um rasgo no bolso direito"></textarea></div>
      <div id="pedido-estado" aria-live="assertive"></div>
      <div class="rodape-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
        <button type="submit" class="btn btn-primario">Enviar pedido</button></div>
    </form>`);
  $("#form-pedido", m.el).onsubmit = async (e) => {
    e.preventDefault();
    const texto = $("#texto-pedido", m.el).value.trim(), estado = $("#pedido-estado", m.el);
    try {
      await api(`/api/itens/${item.id}/pedidos`, { method: "POST", json: { texto } });
      m.fechar();
      toast("Pedido enviado! Você será avisado quando for avaliado.");
      rotear();
    } catch (err) {
      estado.innerHTML = `<div class="aviso aviso-erro">${ICONES.info}<span>${esc(err.message)}</span></div>`;
      $("#texto-pedido", m.el).focus();
    }
  };
}

// ------------------------------------------------------------------ tela: painel
async function telaPainel(_p, params) {
  if (!usuario) { main.innerHTML = `<h1>Meu painel</h1>`; return pedirUsuario(); }
  const aba = params.get("aba") || "notificacoes";
  const abas = [["notificacoes", "Notificações"], ["registros", "Meus registros"], ["alertas", "Alertas"]];
  main.innerHTML = `
    <h1>Olá, ${esc(primeiroNome(usuario.nome))}</h1>
    <div class="abas" role="tablist">${abas.map(([id, t]) => `<button role="tab" id="aba-${id}" aria-controls="painel-aba" aria-selected="${id === aba}" data-aba="${id}">${t}</button>`).join("")}</div>
    <section id="painel-aba" role="tabpanel" aria-labelledby="aba-${aba}"><div class="carregando"><span class="spinner"></span>Carregando…</div></section>`;
  $$("[data-aba]").forEach((b) => (b.onclick = () => { location.hash = `#/painel?aba=${b.dataset.aba}`; }));
  $(".abas").addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const i = abas.findIndex(([id]) => id === aba) + (e.key === "ArrowRight" ? 1 : -1);
    location.hash = `#/painel?aba=${abas[(i + abas.length) % abas.length][0]}`;
  });
  const alvo = $("#painel-aba");
  if (aba === "notificacoes") {
    const ns = await api("/api/notificacoes");
    alvo.innerHTML = ns.length ? ns.map((n) => `<a class="notificacao ${n.lida ? "" : "nova"}" href="#/item/${n.itemId}"><span class="ponto" aria-hidden="true"></span><span>${n.lida ? "" : '<span class="sr">Nova: </span>'}${esc(n.texto)}<br><small class="texto-suave">${quando(n.em)}</small></span></a>`).join("")
      : `<div class="card vazio">${ICONES.sino}<h3>Nada por aqui ainda</h3><p class="texto-suave">Quando um item compatível com seus alertas aparecer ou alguém reivindicar um objeto que você achou, avisaremos aqui.</p></div>`;
    if (ns.some((n) => !n.lida)) { await api("/api/notificacoes/lidas", { method: "POST" }); atualizarSino(); }
  } else if (aba === "registros") {
    const { encontrados, reivindicados } = await api("/api/meus");
    const linha = (i) => `<a class="linha-lista" href="#/item/${i.id}" style="text-decoration:none;color:inherit"><span class="mini">${i.foto ? `<img src="${esc(i.foto)}" alt="">` : ""}</span><span class="info"><strong>${esc(i.titulo)}</strong><br><small class="texto-suave">${esc(i.localNome)} · ${quando(i.data)}</small></span>${statusHTML(i.status)}</a>`;
    alvo.innerHTML = `
      <div class="painel-bloco"><h2>Objetos que encontrei (${encontrados.length})</h2>${encontrados.map(linha).join("") || '<p class="texto-suave">Você ainda não cadastrou objetos. <a href="#/encontrei">Cadastrar agora</a></p>'}</div>
      <div class="painel-bloco"><h2>Objetos que recuperei (${reivindicados.length})</h2>${reivindicados.map(linha).join("") || '<p class="texto-suave">Nenhum por enquanto.</p>'}</div>`;
  } else {
    const desenhar = async () => {
      const als = await api("/api/alertas");
      alvo.innerHTML = `<div class="painel-bloco"><h2>Alertas ativos (${als.length})</h2>
        <p class="texto-suave">Avisamos no sino quando um objeto compatível for cadastrado.</p>
        ${als.map((a) => `<div class="linha-lista"><span class="info"><strong>“${esc(a.consulta)}”</strong><br><span class="chips" style="margin-top:6px">${chipsInterpretacao(a.filtros).map(([, t]) => `<span class="chip">${esc(t)}</span>`).join("")}</span></span><button class="btn btn-perigo" data-excluir="${a.id}" aria-label="Excluir alerta ${esc(a.consulta)}">Excluir</button></div>`).join("") || '<p>Nenhum alerta ativo. Crie um a partir de uma <a href="#/buscar">busca</a>.</p>'}</div>`;
      $$("[data-excluir]").forEach((b) => (b.onclick = async () => {
        const id = b.dataset.excluir;
        await api(`/api/alertas/${id}`, { method: "DELETE" });
        await desenhar();
        toast("Alerta excluído.", { rotulo: "Desfazer", fn: async () => { await api(`/api/alertas/${id}/restaurar`, { method: "POST" }); desenhar(); } });
      }));
    };
    await desenhar();
  }
}

// ------------------------------------------------------------------ inicialização
(async function iniciar() {
  aplicarPreferencias();
  try {
    config = await api("/api/config");
  } catch {
    // Sem servidor Node (ex.: GitHub Pages): usa o mesmo núcleo da API dentro do navegador.
    const { criarApiEstatica } = await import("./modo-estatico.js");
    apiEstatica = await criarApiEstatica();
    config = await api("/api/config");
  }
  const faixa = $("#faixa-modo");
  if (config.modoIA === "estatico") {
    faixa.hidden = false;
    faixa.innerHTML = `Demonstração online: a análise de fotos usa um modelo aberto que roda no seu navegador e <strong>os dados ficam só neste navegador</strong> — outras pessoas não veem o que você cadastra. Troque de usuário no avatar para simular os dois lados. <button type="button" class="link-faixa" id="restaurar">Restaurar exemplos</button>`;
    $("#restaurar").onclick = async () => { await api("/api/reset", { method: "POST" }); armazenamento.sessao("achados.rascunho", null); location.hash = "#/"; location.reload(); };
  } else if (config.modoIA !== "claude") {
    faixa.hidden = false;
    faixa.textContent = "Modo sem chave de API: fotos analisadas por um modelo aberto no navegador e busca por regras locais. Configure ANTHROPIC_API_KEY para usar o Claude.";
  }
  atualizarCabecalho();
  window.addEventListener("hashchange", rotear);
  await rotear();
  if (!usuario) pedirUsuario();
  setInterval(atualizarSino, 20000);
})();
