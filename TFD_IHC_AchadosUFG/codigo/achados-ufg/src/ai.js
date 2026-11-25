// Camada de Inteligência Artificial do Achados UFG (servidor Node).
//
// Três tarefas:
//   1. analisarFoto       – gera título, descrição, categoria, cor e tags a partir da foto,
//                           detecta dados pessoais visíveis e sugere uma pergunta de verificação.
//   2. buscar             – interpreta uma busca em linguagem natural e ordena os itens.
//   3. verificarResposta  – compara a resposta de quem reivindica com a resposta esperada.
//
// Com ANTHROPIC_API_KEY definida, usa o Claude (API da Anthropic). Sem a chave, ou se a
// chamada falhar, cai para o MODO DEMONSTRAÇÃO (public/compartilhado/regras.js). A interface
// sempre informa qual modo produziu o resultado.

import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIAS, CORES, LOCAIS, TIPOS_DETALHE, normalizar } from "../public/compartilhado/catalogo.js";
import { analiseManual, buscarLocal, compararLocal } from "../public/compartilhado/regras.js";

const MODELO = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const cliente = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export const modoIA = () => (cliente ? "claude" : "demonstracao");

// ---------------------------------------------------------------------------
// Chamada genérica ao Claude com saída JSON estruturada
// ---------------------------------------------------------------------------
async function chamarClaude({ system, content, schema, maxTokens = 2000 }) {
  const resposta = await cliente.beta.messages.create({
    model: MODELO,
    max_tokens: maxTokens,
    // Se o classificador de segurança recusar, a API refaz a chamada em outro modelo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }]
  });
  if (resposta.stop_reason === "refusal") throw new Error("A IA recusou a solicitação.");
  if (resposta.stop_reason === "max_tokens") throw new Error("Resposta da IA truncada.");
  const texto = resposta.content.find((b) => b.type === "text")?.text;
  if (!texto) throw new Error("Resposta da IA sem conteúdo de texto.");
  return JSON.parse(texto);
}

function registrarFalha(tarefa, erro) {
  if (erro instanceof Anthropic.AuthenticationError) {
    console.warn(`[IA] ${tarefa}: chave da API inválida — usando modo demonstração.`);
  } else if (erro instanceof Anthropic.RateLimitError) {
    console.warn(`[IA] ${tarefa}: limite de requisições atingido — usando modo demonstração.`);
  } else if (erro instanceof Anthropic.APIError) {
    console.warn(`[IA] ${tarefa}: erro ${erro.status} da API — usando modo demonstração.`, erro.message);
  } else {
    console.warn(`[IA] ${tarefa}: ${erro.message} — usando modo demonstração.`);
  }
}

// ---------------------------------------------------------------------------
// 1. Análise da foto
// ---------------------------------------------------------------------------
const SCHEMA_ANALISE = {
  type: "object",
  properties: {
    titulo: { type: "string", description: "Nome curto do objeto, até 6 palavras" },
    descricao: { type: "string", description: "Descrição objetiva em 1 ou 2 frases, com marcas distintivas" },
    categoria: { type: "string", enum: CATEGORIAS.map((c) => c.id) },
    cor: { type: "string", enum: CORES.map((c) => c.id) },
    tags: { type: "array", items: { type: "string" }, description: "3 a 6 palavras-chave" },
    dadosSensiveis: { type: "boolean", description: "true se a foto mostra nome, número de documento, rosto ou outro dado pessoal legível" },
    avisoPrivacidade: { type: "string", description: "Explique o dado pessoal visto, ou string vazia" },
    tipoDetalhe: { type: "string", enum: TIPOS_DETALHE.map((t) => t.id), description: "Tipo de detalhe que só o dono saberia e que não aparece na foto" },
    confianca: { type: "number", description: "0 a 1" }
  },
  required: ["titulo", "descricao", "categoria", "cor", "tags", "dadosSensiveis", "avisoPrivacidade", "tipoDetalhe", "confianca"],
  additionalProperties: false
};

const SYSTEM_ANALISE = `Você ajuda a comunidade da Universidade Federal de Goiás (UFG) a cadastrar objetos encontrados nos campi.
Analise a foto e descreva SOMENTE o objeto perdido, em português do Brasil, de forma objetiva, para que o dono o reconheça.
- Destaque marcas distintivas (adesivos, estampas, arranhões, marca do fabricante, chaveiros).
- Não invente detalhes que não aparecem na foto; se algo estiver incerto, diga "aparentemente".
- Se a foto mostrar dados pessoais legíveis (nome, matrícula, CPF, RG, rosto, telefone), marque dadosSensiveis=true,
  explique em avisoPrivacidade e NUNCA transcreva esses dados na descrição.
- Em tipoDetalhe, indique o tipo de detalhe que só o dono saberia e que NÃO esteja evidente na foto:
  escrito (nome, anotação), dentro (conteúdo), marca (adesivo, desenho), quantidade, defeito ou outro.`;

export async function analisarFoto({ buffer, mime, nomeArquivo }) {
  if (cliente) {
    try {
      const r = await chamarClaude({
        system: SYSTEM_ANALISE,
        schema: SCHEMA_ANALISE,
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: buffer.toString("base64") } },
          { type: "text", text: "Descreva o objeto desta foto para o cadastro de achados e perdidos." }
        ]
      });
      return { ...r, fonte: "claude" };
    } catch (e) {
      registrarFalha("analisarFoto", e);
    }
  }
  return analiseManual(); // a interface roda o modelo aberto no navegador
}

// ---------------------------------------------------------------------------
// 2. Busca em linguagem natural
// ---------------------------------------------------------------------------
const SCHEMA_BUSCA = {
  type: "object",
  properties: {
    interpretacao: {
      type: "object",
      properties: {
        // "" e 0 significam "não citado" (evita tipos nulos no schema).
        categoria: { type: "string", enum: ["", ...CATEGORIAS.map((c) => c.id)] },
        cor: { type: "string", enum: ["", ...CORES.map((c) => c.id)] },
        local: { type: "string", enum: ["", ...LOCAIS.map((l) => l.id)] },
        periodoDias: { type: "integer" },
        palavras: { type: "array", items: { type: "string" } }
      },
      required: ["categoria", "cor", "local", "periodoDias", "palavras"],
      additionalProperties: false
    },
    resultados: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "integer", description: "0 a 100" },
          motivo: { type: "string", description: "Uma frase curta explicando a semelhança" }
        },
        required: ["id", "score", "motivo"],
        additionalProperties: false
      }
    }
  },
  required: ["interpretacao", "resultados"],
  additionalProperties: false
};

const SYSTEM_BUSCA = `Você é o motor de busca do Achados UFG, um serviço de achados e perdidos da Universidade Federal de Goiás.
Recebe a descrição em linguagem natural de quem perdeu algo e uma lista de itens encontrados (JSON).
1. Extraia a interpretação: categoria, cor e local (apenas ids permitidos, ou "" se não citado), periodoDias
   (hoje=1, ontem=2, anteontem=3, "semana passada"=7, 0 se não citado) e palavras-chave relevantes.
2. Devolva os itens que podem ser o objeto procurado, do mais para o menos provável, com score de 0 a 100
   e um motivo curto em português ("mesma cor e adesivo parecido, encontrado no RU").
   Considere sinônimos (squeeze = garrafa, fone = headphone) e descrições imprecisas. Omita itens claramente diferentes.
Locais permitidos: ${LOCAIS.map((l) => `${l.id} (${l.nome})`).join("; ")}.`;

export async function buscar(consulta, candidatos) {
  if (cliente && consulta.trim()) {
    try {
      const lista = candidatos.slice(0, 120).map((i) => ({
        id: i.id, titulo: i.titulo, descricao: i.descricao, categoria: i.categoria, cor: i.cor,
        tags: i.tags, local: i.local, localDetalhe: i.localDetalhe, data: i.data
      }));
      const r = await chamarClaude({
        system: SYSTEM_BUSCA,
        schema: SCHEMA_BUSCA,
        maxTokens: 4000,
        content: `Hoje é ${new Date().toISOString().slice(0, 10)}.\nBusca: "${consulta}"\nItens encontrados:\n${JSON.stringify(lista)}`
      });
      const ids = new Set(candidatos.map((i) => i.id));
      const i = r.interpretacao;
      return {
        interpretacao: {
          categoria: i.categoria || null, cor: i.cor || null, local: i.local || null,
          periodoDias: i.periodoDias || null, palavras: i.palavras.map(normalizar)
        },
        resultados: r.resultados.filter((x) => ids.has(x.id)),
        fonte: "claude"
      };
    } catch (e) {
      registrarFalha("buscar", e);
    }
  }
  return buscarLocal(consulta, candidatos);
}

// ---------------------------------------------------------------------------
// 3. Apoio à conferência de posse
// A IA NÃO decide quem é o dono: só indica a quem encontrou se a descrição de quem diz ser dono
// cita o detalhe que ele anotou no cadastro. A decisão é sempre humana.
// ---------------------------------------------------------------------------
const SCHEMA_VERIFICACAO = {
  type: "object",
  properties: { confere: { type: "boolean" }, justificativa: { type: "string" } },
  required: ["confere", "justificativa"],
  additionalProperties: false
};

export async function verificarResposta({ esperada, dada }) {
  if (cliente) {
    try {
      const r = await chamarClaude({
        system: "Quem encontrou um objeto anotou um detalhe que não aparece na foto. Outra pessoa diz ser a dona e descreveu o objeto. Indique se a descrição menciona o detalhe anotado (aceite sinônimos, erros de digitação e outra forma de dizer; números e palavras distintivas precisam bater). Sua resposta é só uma dica para quem encontrou decidir. Responda em português.",
        schema: SCHEMA_VERIFICACAO,
        maxTokens: 500,
        content: `Detalhe anotado por quem encontrou: ${esperada}\nDescrição de quem diz ser dono: ${dada}`
      });
      return { ok: r.confere, fonte: "claude" };
    } catch (e) {
      registrarFalha("verificarResposta", e);
    }
  }
  return { ok: compararLocal(esperada, dada), fonte: "demonstracao" };
}
