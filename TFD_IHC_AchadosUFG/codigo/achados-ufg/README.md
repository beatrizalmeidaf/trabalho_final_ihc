# Achados UFG — achados e perdidos com IA

Trabalho Final da Disciplina **Interação Humano-Computador (IHC)** — Instituto de Informática, Universidade Federal de Goiás.
Professor: Dirson S. Campos · 2026

**Integrantes:** Beatriz Almeida Felicio · Beatriz Silva Andrade · Kamilla Jordana Regosino de Moura

**Demonstração online:** https://beatrizalmeidaf.github.io/trabalho_final_ihc/

---

## 1. O que é

Aplicação **web responsiva** (funciona no navegador do computador e do celular) que centraliza os achados e perdidos dos campi da UFG:

- **Quem encontrou** tira uma foto; a IA sugere título, descrição, categoria e cor. A pessoa revisa, informa onde achou e onde o objeto vai ficar, e guarda **um detalhe que só o dono sabe** (algo que não aparece na foto).
- **Quem perdeu** descreve o objeto em **linguagem natural** ("perdi uma garrafa azul com capa de silicone perto do RU ontem"). O app mostra os filtros que entendeu (que podem ser removidos) e ordena os itens por compatibilidade.
- Se nada aparecer, a pessoa cria um **alerta** e é avisada no sino quando um item compatível for cadastrado.
- Para recuperar o objeto, a pessoa conta o detalhe guardado (até 3 tentativas). Se o objeto não tiver detalhe — ou as tentativas acabarem — ela **descreve o objeto e quem encontrou aprova ou recusa o pedido**. Só então o app mostra onde retirar. O status segue **Encontrado → Em devolução → Devolvido**.
- Se a foto parecer um documento ou crachá, o app avisa e a foto fica **desfocada** para o público.

## 2. Duas formas de usar

| | Versão online (GitHub Pages) | Versão local (Node.js) |
|---|---|---|
| Onde | https://beatrizalmeidaf.github.io/trabalho_final_ihc/ | `http://localhost:3000` |
| Instalação | nenhuma | Node.js 18+ e `npm install` |
| IA das fotos | modelo aberto **CLIP** rodando no navegador | **Claude** com `ANTHROPIC_API_KEY`; sem a chave, o mesmo CLIP no navegador |
| Busca e verificação | regras locais | Claude com a chave; regras locais sem ela |
| Dados | **só no seu navegador** (`localStorage`) | arquivo `data/db.json`, compartilhado por quem acessa o mesmo servidor |

> **Na versão online, outras pessoas não veem o que você cadastra.** Cada navegador tem a sua própria cópia dos dados (o GitHub Pages só hospeda arquivos, não tem banco de dados). Para simular os dois lados no mesmo navegador, troque de usuário no avatar (canto superior direito). Para dados compartilhados de verdade, rode a versão local em um computador da rede e acesse pelo endereço dele, ou ligue o app a um banco na nuvem (ver Limitações).

As duas versões usam **o mesmo código de regras** (`public/compartilhado/nucleo.js`). O front-end tenta falar com o servidor; se não houver servidor (caso do GitHub Pages), carrega `public/modo-estatico.js` e executa a mesma API dentro do navegador.

### IA aberta no navegador

Sem chave de API, a análise da foto usa o **CLIP** (modelo aberto, licença MIT, versão quantizada `Xenova/clip-vit-base-patch32`) pela biblioteca **Transformers.js**. Ele roda no próprio navegador, sem servidor: na primeira análise o navegador baixa cerca de **90 MB** (fica em cache depois) e cada foto leva 2 a 3 segundos. O CLIP faz classificação *zero-shot*: compara a foto com frases como "a photo of a water bottle" e escolhe a mais parecida entre 31 tipos de objeto e 11 cores. Ele **não escreve descrições livres** como o Claude — o título e a descrição são montados a partir do tipo e da cor, e a pessoa completa os detalhes.

## 3. Como rodar localmente

### 3.1 Pré-requisitos

- **Node.js 18 ou superior** (testado com Node 24). Verifique com `node --version`.
- Internet na primeira análise de foto sem chave de API (para baixar o modelo CLIP).

### 3.2 Passo a passo

```bash
git clone https://github.com/beatrizalmeidaf/trabalho_final_ihc.git
cd trabalho_final_ihc/TFD_IHC_AchadosUFG/codigo/achados-ufg
npm install
npm start
```

Abra **http://localhost:3000**. No primeiro acesso, informe um nome (login simulado).

Outra porta: `PORT=4000 npm start` (Linux/macOS) ou `$env:PORT=4000; npm start` (PowerShell).

### 3.3 Ativar o Claude (opcional)

1. Copie `.env.example` para `.env`.
2. Preencha `ANTHROPIC_API_KEY=` com uma chave da API da Anthropic (https://console.anthropic.com).
3. Reinicie com `npm start`. O terminal mostra `IA: Claude (claude-opus-5-5)`.

Com a chave, a foto ganha uma descrição livre (marcas, adesivos, defeitos), a busca entende sinônimos e a verificação aceita respostas escritas de outro jeito.

### 3.4 Rodar a versão estática sem Node

Qualquer servidor de arquivos estáticos serve a pasta `public/`:

```bash
cd TFD_IHC_AchadosUFG/codigo/achados-ufg/public
python -m http.server 8080
```

e abra http://localhost:8080. (Abrir o `index.html` direto pelo explorador de arquivos não funciona: os navegadores bloqueiam módulos JavaScript em `file://`.)

### 3.5 Comandos úteis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor |
| `npm run reset` | Apaga `data/db.json` e `uploads/` e volta aos dados de exemplo (reinicie o servidor depois) |

Na versão online, o botão **Restaurar exemplos** na faixa amarela faz o mesmo.

## 4. Roteiro de demonstração

1. Entre como **Ana Clara** e busque `perdi uma garrafa azul com capa de silicone perto do RU ontem`. Remova um filtro tocando no "×".
2. Troque de usuário (avatar) para **Pedro** → **Encontrei algo** → envie `public/demo-fotos/fone-branco.jpg` (ou qualquer foto sua). A IA sugere "Estojo de fone sem fio branco".
3. Na etapa 3, o tipo de detalhe "Marca, adesivo ou desenho" já vem sugerido; escreva `uma estrela gravada atrás` e publique.
4. Volte para **Ana Clara**: o sino mostra uma notificação (há um alerta de exemplo para "fone sem fio branco"). Abra o item → **É meu!** → responda `estrela`.
5. Como **Pedro**, cadastre `chaves.jpg` marcando **"Não encontrei nenhum detalhe assim"**. Como **Ana**, peça o objeto descrevendo-o; como **Pedro**, abra o item e toque **Aprovar**.
6. Envie `carteirinha.png` (ilustração fictícia) para ver o aviso de possíveis dados pessoais e a foto desfocada.

Na versão local, use duas janelas (uma anônima) para ter os dois usuários ao mesmo tempo.

## 5. Por que um "detalhe que só o dono sabe"

A primeira versão pedia a quem encontrou uma **pergunta e uma resposta**. Na avaliação, isso se mostrou confuso (duas coisas para escrever, e muitas pessoas não sabem formular uma boa pergunta) e não tinha saída para objetos sem nenhum detalhe escondido. A versão atual:

- pede **só o detalhe**, com o **tipo** escolhido em botões ("Algo escrito", "O que tem dentro", "Marca, adesivo ou desenho", "Quantidade", "Defeito ou marca de uso", "Outro"); o app monta a pergunta mostrada ao dono e a IA sugere o tipo;
- explica **por que** o detalhe é pedido, em uma frase;
- oferece o caminho **"Não encontrei nenhum detalhe assim"**: o dono descreve o objeto e quem encontrou aprova ou recusa — o mesmo que acontece num balcão de achados;
- quando as 3 tentativas acabam, em vez de bloquear, abre esse mesmo pedido para avaliação humana.

## 6. Estrutura

```
achados-ufg/
├── server.js                 Servidor Express (upload de fotos + encaminha /api para o núcleo)
├── src/
│   ├── ai.js                 Integração com o Claude (análise de foto, busca, verificação)
│   └── db.js                 Persistência em arquivo JSON
├── public/                   Tudo o que vai para o navegador (e para o GitHub Pages)
│   ├── index.html · styles.css · app.js     Interface (HTML, CSS e JS puros, sem build)
│   ├── ia-navegador.js       Modelo aberto CLIP rodando no navegador (Transformers.js)
│   ├── modo-estatico.js      API dentro do navegador, usada quando não há servidor
│   ├── compartilhado/
│   │   ├── nucleo.js         Regras da API (usadas pelo servidor E pela versão estática)
│   │   ├── regras.js         Busca e verificação por regras (sem Claude)
│   │   └── catalogo.js       Categorias, cores, locais da UFG, pontos de entrega e tipos de detalhe
│   ├── dados/seed.json       Itens de exemplo (datas relativas ao dia de execução)
│   └── demo-fotos/           Fotos de exemplo + CREDITOS.md
├── scripts/reset-db.js       Restaura os dados de exemplo
└── .env.example              Modelo de configuração
```

### API

| Método | Rota | Função |
|---|---|---|
| GET | `/api/config` | Catálogo e modo de IA ativo |
| GET | `/api/itens` · `/api/itens/:id` | Lista / detalhe (sem o detalhe secreto) |
| POST | `/api/analisar` | Envia a foto e recebe a sugestão da IA (ou `fonte: "manual"` para o navegador analisar) |
| POST | `/api/itens` | Publica um item encontrado e dispara alertas |
| POST | `/api/buscar` · `/api/buscar/refinar` | Busca em linguagem natural / reordena após remover filtros |
| POST | `/api/itens/:id/reivindicar` | Confere o detalhe informado pelo dono |
| POST | `/api/itens/:id/pedidos` | Envia um pedido de devolução para quem encontrou avaliar |
| POST | `/api/itens/:id/pedidos/:pid/aprovar` · `/recusar` | Quem encontrou avalia o pedido |
| POST | `/api/itens/:id/devolver` | Conclui a devolução |
| GET/POST/DELETE | `/api/alertas` (+ `/:id/restaurar`) | Alertas do usuário ("Desfazer" restaura) |
| GET/POST | `/api/notificacoes` (+ `/lidas`) | Notificações do sino |

## 7. Publicação no GitHub Pages

O workflow `.github/workflows/pages.yml` (na raiz do repositório) publica a pasta `TFD_IHC_AchadosUFG/codigo/achados-ufg/public` a cada `push` na branch `main`. Para ativar em um fork: **Settings → Pages → Source: GitHub Actions**.

## 8. Tecnologias

- **Back-end:** Node.js, Express, Multer (upload), dotenv.
- **IA (servidor):** SDK oficial da Anthropic (`@anthropic-ai/sdk`), modelo `claude-opus-5-5`, com **saída estruturada em JSON Schema** e *fallback* de servidor caso o modelo recuse a solicitação.
- **IA (navegador):** Transformers.js 3.8.1 + CLIP ViT-B/32 quantizado (modelo aberto).
- **Front-end:** HTML, CSS e JavaScript puros (SPA com rotas por `#hash`, módulos ES), sem frameworks.
- **Protótipo:** Figma Make (ver documento de prompts) e capturas geradas com Playwright.

## 9. Recursos de IHC implementados (resumo)

- Duas ações principais na tela inicial (Perdi / Encontrei) e navegação inferior no celular (alvos ≥ 44 px).
- Assistente de cadastro em 3 etapas com indicador de progresso e rascunho salvo na sessão.
- Sugestão da IA sempre **editável**, identificada com selo, nível de confiança e alternativas ("também pode ser…").
- Barra de progresso ao baixar o modelo da IA (feedback de operações longas).
- Filtros interpretados exibidos como *chips* removíveis; percentual de compatibilidade e motivo de cada resultado.
- Detalhe secreto escolhido por tipo, com rótulo e exemplo que mudam conforme a escolha; alternativa de aprovação humana.
- Fotos exibidas inteiras (sem corte), para que o dono reconheça o objeto.
- Estados de carregamento, vazio e erro com mensagens em linguagem simples; "Desfazer" ao excluir alerta.
- Acessibilidade: HTML semântico, link "pular para o conteúdo", foco visível, foco levado ao título a cada troca de tela, `aria-live` para resultados e erros, diálogo com foco preso e tecla Esc, ajuste de tamanho de texto, modo de alto contraste, respeito a `prefers-reduced-motion`, contraste mínimo 4,5:1 (WCAG AA).

## 10. Limitações da IA e da aplicação (importante)

**IA aberta no navegador (CLIP)**

- Reconhece apenas **31 tipos de objeto e 11 cores** pré-definidos; objetos fora da lista recebem o tipo mais parecido. A descrição é um modelo de frase, não uma descrição livre.
- **Erra a cor quando há logotipos grandes ou fundo colorido**: nos testes com as 14 fotos de exemplo, acertou o tipo em todas, mas a cor em 12 (o caderno preto com logo verde saiu "verde" e a mochila preta com logo amarelo saiu "amarela"). Por isso a cor é sempre editável.
- A detecção de documento é feita pela classe "documento/crachá"; **não lê** nomes ou números. Um documento fotografado de forma incomum pode não ser detectado.
- Exige baixar ~90 MB na primeira vez e um navegador com WebAssembly; em celulares antigos ou sem internet, o app pede preenchimento manual.

**Busca e verificação sem Claude (regras locais)**

- A busca usa um dicionário de termos (categorias, cores, locais) e não entende sinônimos fora dele, nem negações ("garrafa **sem adesivos**" conta como citação de "adesivo").
- A verificação compara palavras: aceita se pelo menos metade das palavras importantes do detalhe aparecer na resposta, e exige que números batam exatamente. **Não tolera erros de digitação** ("fazoleti" ≠ "Fazzoletti").

**Claude**

- As descrições podem conter erros; por isso a revisão humana é obrigatória.
- A integração foi escrita seguindo a documentação da SDK, mas **não foi testada com uma chave real** durante o desenvolvimento. O código volta para o modo sem chave se a chamada falhar.

**Protótipo**

- **Na versão online, os dados não são compartilhados entre pessoas** (cada navegador tem os seus). Para um serviço real seria preciso um banco de dados na nuvem (por exemplo, Supabase ou Firebase) ou hospedar o servidor Node.
- Login **simulado** (só um nome). Em produção seria a conta institucional da UFG.
- A foto com dados pessoais é desfocada **no navegador** (CSS); o arquivo original continua acessível pela URL.
- Notificações só dentro do app (sem e-mail ou push).
- As fotos de exemplo são do **Wikimedia Commons** sob licenças abertas (créditos em `public/demo-fotos/CREDITOS.md`); a **carteirinha é uma ilustração fictícia**. As descrições e os detalhes secretos dos itens de exemplo foram escritos pelo grupo.

## 11. Uso de IA no desenvolvimento e ajustes manuais

O código, os wireframes e as capturas foram gerados com apoio de um assistente de IA (Claude, via Claude Code), a partir dos prompts listados no documento **Prompts_IA_AchadosUFG** (pasta `docs/`). O grupo revisou o resultado e pediu correções iterativas, registradas na seção "Iterações humano–IA" daquele documento. Principais ajustes após testar a interface:

- correção do menu de acessibilidade e do contador do sino, que apareciam mesmo quando deveriam estar ocultos;
- rolagem automática até os resultados da busca no celular e redução da foto na etapa de revisão;
- aumento do limiar de compatibilidade (30 % → 40 %) e verde dos selos escurecido para contraste AA;
- troca das ilustrações por fotos reais de banco aberto e exibição da foto inteira;
- servidor deixou de cair quando a pasta `uploads/` é apagada com o app rodando;
- núcleo da API compartilhado para permitir a versão estática no GitHub Pages;
- **IA aberta (CLIP) no navegador** no lugar das respostas pré-definidas por nome de arquivo;
- **redesenho da verificação de posse** (detalhe por tipo + pedido aprovado por quem encontrou) e comparação de respostas mais tolerante a frases.

> Espaço para o grupo: registre aqui qualquer ajuste feito manualmente após a entrega da IA (arquivo, o que mudou e por quê).

## 12. Licença

Código: MIT — uso acadêmico. Fotos de exemplo: licenças individuais em `public/demo-fotos/CREDITOS.md`. Modelo CLIP: licença MIT (OpenAI), distribuído pela Hugging Face (Xenova).
