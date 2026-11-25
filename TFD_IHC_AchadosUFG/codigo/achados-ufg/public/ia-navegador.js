// IA que roda DENTRO do navegador (sem servidor e sem chave de API).
// Usa o modelo aberto CLIP (OpenAI, licença MIT; versão quantizada "Xenova/clip-vit-base-patch32")
// pela biblioteca Transformers.js. É uma classificação "zero-shot": o modelo compara a foto com
// frases como "a photo of a water bottle" e diz qual combina mais. Com isso sugerimos o tipo de
// objeto, a categoria, a cor e detectamos documentos com foto/nome.
// Ele NÃO escreve descrições livres como o Claude: o texto é montado a partir dessas escolhas.

const URL_LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const MODELO = "Xenova/clip-vit-base-patch32";

// [rótulo em inglês para o modelo, nome em português, gênero, categoria do catálogo, tipo de detalhe sugerido]
const OBJETOS = [
  ["water bottle", "Garrafa", "f", "garrafa", "marca"],
  ["plastic sports squeeze bottle", "Squeeze", "m", "garrafa", "marca"],
  ["thermos flask", "Garrafa térmica", "f", "garrafa", "marca"],
  ["coffee mug", "Caneca", "f", "garrafa", "marca"],
  ["smartphone", "Celular", "m", "eletronico", "marca"],
  ["wireless earbuds charging case", "Estojo de fone sem fio", "m", "eletronico", "marca"],
  ["headphones", "Fone de ouvido", "m", "eletronico", "marca"],
  ["phone charger with cable", "Carregador", "m", "eletronico", "escrito"],
  ["power bank", "Carregador portátil", "m", "eletronico", "escrito"],
  ["laptop computer", "Notebook", "m", "eletronico", "marca"],
  ["scientific calculator", "Calculadora", "f", "eletronico", "escrito"],
  ["computer mouse", "Mouse", "m", "eletronico", "marca"],
  ["usb flash drive", "Pen drive", "m", "eletronico", "dentro"],
  ["wristwatch", "Relógio", "m", "eletronico", "marca"],
  ["identification card with a photo of a person", "Documento com foto", "m", "documento", "escrito"],
  ["student id badge on a lanyard", "Crachá", "m", "documento", "escrito"],
  ["bank card", "Cartão", "m", "documento", "escrito"],
  ["wallet", "Carteira", "f", "carteira", "dentro"],
  ["pencil case", "Estojo", "m", "carteira", "dentro"],
  ["handbag", "Bolsa", "f", "carteira", "dentro"],
  ["keys on a keyring", "Molho de chaves", "m", "chave", "quantidade"],
  ["spiral notebook", "Caderno", "m", "material", "escrito"],
  ["book", "Livro", "m", "material", "escrito"],
  ["lab coat", "Jaleco", "m", "material", "escrito"],
  ["eyeglasses", "Óculos", "m", "vestuario", "defeito"],
  ["sunglasses", "Óculos de sol", "m", "vestuario", "defeito"],
  ["hoodie sweatshirt", "Moletom", "m", "vestuario", "escrito"],
  ["jacket", "Casaco", "m", "vestuario", "dentro"],
  ["cap hat", "Boné", "m", "vestuario", "escrito"],
  ["umbrella", "Guarda-chuva", "m", "guarda-chuva", "marca"],
  ["backpack", "Mochila", "f", "mochila", "dentro"]
];
// [rótulo, masculino, feminino, id do catálogo]
const CORES = [
  ["blue", "azul", "azul", "azul"], ["black", "preto", "preta", "preto"], ["white", "branco", "branca", "branco"],
  ["red", "vermelho", "vermelha", "vermelho"], ["green", "verde", "verde", "verde"], ["yellow", "amarelo", "amarela", "amarelo"],
  ["pink", "rosa", "rosa", "rosa"], ["purple", "roxo", "roxa", "roxo"], ["gray or silver", "cinza", "cinza", "cinza"],
  ["brown", "marrom", "marrom", "marrom"], ["orange", "laranja", "laranja", "laranja"]
];

let classificador = null;

// Carrega o modelo uma única vez. onProgresso recebe de 0 a 100 (download só na primeira vez; depois fica no cache).
export async function carregarModelo(onProgresso) {
  if (classificador) return classificador;
  const { pipeline, env } = await import(URL_LIB);
  env.allowLocalModels = false;
  const arquivos = new Map();
  classificador = await pipeline("zero-shot-image-classification", MODELO, {
    dtype: "q8",
    progress_callback: (p) => {
      if (p.status === "progress" && p.total) {
        arquivos.set(p.file, [p.loaded, p.total]);
        let feito = 0, total = 0;
        for (const [l, t] of arquivos.values()) { feito += l; total += t; }
        onProgresso?.(Math.round((100 * feito) / total));
      }
    }
  });
  return classificador;
}

// Analisa a imagem (URL de objeto, data URL ou endereço http) e devolve o mesmo formato da análise do servidor.
export async function analisarNoNavegador(urlImagem, onProgresso) {
  const clf = await carregarModelo(onProgresso);
  const objs = await clf(urlImagem, OBJETOS.map((o) => o[0]), { hypothesis_template: "a photo of a {}" });
  const melhor = OBJETOS.find((o) => o[0] === objs[0].label);
  // Cor: combinamos duas perguntas ao modelo — a cor "do objeto" e a cor já com o objeto detectado
  // ("a photo of a red water bottle") — e somamos as probabilidades. Sozinha, cada uma erra em casos
  // diferentes (logotipos, fundo da foto); juntas ficam mais estáveis.
  const [geral, condicionada] = await Promise.all([
    clf(urlImagem, CORES.map((c) => c[0]), { hypothesis_template: "a photo of a {} object" }),
    clf(urlImagem, CORES.map((c) => `${c[0]} ${melhor[0]}`), { hypothesis_template: "a photo of a {}" })
  ]);
  const pontos = new Map(CORES.map((c) => [c[0], 0]));
  for (const r of geral) pontos.set(r.label, pontos.get(r.label) + r.score);
  for (const r of condicionada) { const c = CORES.find((x) => `${x[0]} ${melhor[0]}` === r.label); pontos.set(c[0], pontos.get(c[0]) + r.score); }
  const cor = CORES.find((c) => c[0] === [...pontos.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  const [, nome, genero, categoria, tipoDetalhe] = melhor;
  const adjetivo = genero === "f" ? cor[2] : cor[1];
  const documento = categoria === "documento";
  const alternativas = objs.slice(1, 3).map((o) => OBJETOS.find((x) => x[0] === o.label)[1].toLowerCase());
  return {
    titulo: `${nome} ${adjetivo}`,
    // Só fatos reconhecidos pela IA; a orientação "acrescente marcas…" fica na interface, não no conteúdo publicado.
    descricao: `${nome} ${adjetivo}.`,
    categoria, cor: cor[3],
    tags: [nome.toLowerCase(), cor[1]],
    dadosSensiveis: documento,
    avisoPrivacidade: documento ? "Parece um documento ou crachá. Se houver nome, foto ou número, a imagem ficará desfocada para o público. Não escreva esses dados na descrição." : "",
    tipoDetalhe,
    confianca: Number(objs[0].score.toFixed(2)),
    alternativas,
    fonte: "navegador"
  };
}
