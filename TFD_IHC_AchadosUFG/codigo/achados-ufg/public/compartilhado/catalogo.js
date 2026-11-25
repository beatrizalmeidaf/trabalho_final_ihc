// Vocabulário controlado da aplicação: categorias, cores, locais e pontos de entrega.
// Usado tanto pela IA (para restringir as respostas) quanto pelo modo demonstração.

export const CATEGORIAS = [
  { id: "garrafa", nome: "Garrafa / copo", termos: ["garrafa", "squeeze", "copo", "térmica", "termica", "caneca", "stanley", "cantil"] },
  { id: "eletronico", nome: "Eletrônico", termos: ["fone", "celular", "carregador", "cabo", "notebook", "tablet", "mouse", "pendrive", "calculadora", "airpods", "fones", "power bank", "smartwatch", "relógio", "relogio"] },
  { id: "documento", nome: "Documento / cartão", termos: ["documento", "rg", "cpf", "cnh", "carteirinha", "crachá", "cracha", "cartão", "cartao", "identidade", "passaporte"] },
  { id: "carteira", nome: "Carteira / bolsa", termos: ["carteira", "bolsa", "necessaire", "estojo", "porta-moedas", "pochete"] },
  { id: "chave", nome: "Chave", termos: ["chave", "chaves", "chaveiro", "molho"] },
  { id: "material", nome: "Material de estudo", termos: ["caderno", "livro", "apostila", "fichário", "fichario", "agenda", "caneta", "estojo", "jaleco"] },
  { id: "vestuario", nome: "Roupa / acessório", termos: ["blusa", "casaco", "moletom", "jaqueta", "boné", "bone", "óculos", "oculos", "cachecol", "camiseta", "pulseira", "anel", "brinco"] },
  { id: "guarda-chuva", nome: "Guarda-chuva", termos: ["guarda-chuva", "guarda chuva", "sombrinha"] },
  { id: "mochila", nome: "Mochila", termos: ["mochila", "sacola", "pasta"] },
  { id: "outro", nome: "Outro", termos: [] }
];

export const CORES = [
  { id: "azul", termos: ["azul", "azulada", "azulado", "marinho"] },
  { id: "preto", termos: ["preto", "preta", "pretos", "pretas", "escuro", "escura"] },
  { id: "branco", termos: ["branco", "branca", "brancos", "brancas"] },
  { id: "vermelho", termos: ["vermelho", "vermelha", "vinho", "bordô", "bordo"] },
  { id: "verde", termos: ["verde", "verdes"] },
  { id: "amarelo", termos: ["amarelo", "amarela", "dourado", "dourada"] },
  { id: "rosa", termos: ["rosa", "rosado", "rosada", "pink"] },
  { id: "roxo", termos: ["roxo", "roxa", "lilás", "lilas"] },
  { id: "cinza", termos: ["cinza", "prata", "prateado", "prateada", "grafite"] },
  { id: "marrom", termos: ["marrom", "bege", "caramelo", "couro"] },
  { id: "laranja", termos: ["laranja"] },
  { id: "colorido", termos: ["colorido", "colorida", "estampado", "estampada"] }
];

export const LOCAIS = [
  { id: "caa", nome: "CAA – Centro de Aulas A", campus: "Samambaia", termos: ["caa", "centro de aulas a"] },
  { id: "cab", nome: "CAB – Centro de Aulas B", campus: "Samambaia", termos: ["cab", "centro de aulas b"] },
  { id: "cac", nome: "CAC – Centro de Aulas C", campus: "Samambaia", termos: ["cac", "centro de aulas c"] },
  { id: "ru", nome: "RU – Restaurante Universitário", campus: "Samambaia", termos: ["ru", "restaurante", "bandejão", "bandejao"] },
  { id: "bc", nome: "BC – Biblioteca Central", campus: "Samambaia", termos: ["bc", "biblioteca"] },
  { id: "inf", nome: "INF – Instituto de Informática", campus: "Samambaia", termos: ["inf", "informática", "informatica"] },
  { id: "ime", nome: "IME – Instituto de Matemática e Estatística", campus: "Samambaia", termos: ["ime", "matemática", "matematica"] },
  { id: "reitoria", nome: "Reitoria / Centro de Cultura e Eventos", campus: "Samambaia", termos: ["reitoria", "centro de cultura", "eventos"] },
  { id: "praca", nome: "Praça Universitária (FE, FD, FANUT)", campus: "Colemar Natal e Silva", termos: ["praça", "praca", "fe", "fd", "fanut", "colemar"] },
  { id: "onibus", nome: "Ponto de ônibus / estacionamento", campus: "Samambaia", termos: ["ônibus", "onibus", "ponto", "estacionamento"] }
];

export const PONTOS_ENTREGA = [
  { id: "portaria-inf", nome: "Portaria do INF", horario: "seg–sex, 7h às 22h" },
  { id: "secretaria-caa", nome: "Secretaria do CAA", horario: "seg–sex, 8h às 18h" },
  { id: "bc-achados", nome: "Balcão de atendimento da BC", horario: "seg–sex, 7h30 às 22h; sáb, 8h às 12h" },
  { id: "portaria-reitoria", nome: "Portaria da Reitoria", horario: "todos os dias, 24h" },
  { id: "comigo", nome: "Fica comigo — combinar entrega pelo app", horario: "a combinar" }
];

const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const normalizar = sem;

export function nomeCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id)?.nome ?? "Outro";
}
export function nomeLocal(id) {
  return LOCAIS.find((l) => l.id === id)?.nome ?? id;
}
export function pontoEntrega(id) {
  return PONTOS_ENTREGA.find((p) => p.id === id) ?? PONTOS_ENTREGA[PONTOS_ENTREGA.length - 1];
}

// Tipos de "detalhe que só o dono sabe". Quem encontrou escolhe o tipo e escreve o detalhe;
// o app monta a pergunta mostrada a quem diz ser dono.
export const TIPOS_DETALHE = [
  { id: "escrito", rotulo: "Algo escrito", pergunta: "O que está escrito no objeto (nome, etiqueta, anotação)?", campo: "O que está escrito?", exemplo: "Ex.: “Cálculo 2 – turma B” na primeira página" },
  { id: "dentro", rotulo: "O que tem dentro", pergunta: "O que tem dentro do objeto?", campo: "O que tem dentro?", exemplo: "Ex.: um cartão do banco e um RG" },
  { id: "marca", rotulo: "Marca, adesivo ou desenho", pergunta: "Que marca, adesivo ou desenho o objeto tem que não aparece na foto?", campo: "Qual marca, adesivo ou desenho?", exemplo: "Ex.: uma estrela gravada atrás" },
  { id: "quantidade", rotulo: "Quantidade", pergunta: "Quantas peças ou itens há (por exemplo, quantas chaves)?", campo: "Quantos são?", exemplo: "Ex.: 3 chaves, uma delas tetra" },
  { id: "defeito", rotulo: "Defeito ou marca de uso", pergunta: "O objeto tem algum defeito ou marca de uso? Qual e onde?", campo: "Qual defeito e onde?", exemplo: "Ex.: haste esquerda torta" },
  { id: "outro", rotulo: "Outro", pergunta: "", campo: "Resposta esperada", exemplo: "" }
];

export function perguntaDoDetalhe(tipo, perguntaLivre = "") {
  if (tipo === "outro") return String(perguntaLivre).trim();
  return TIPOS_DETALHE.find((t) => t.id === tipo)?.pergunta ?? "";
}
