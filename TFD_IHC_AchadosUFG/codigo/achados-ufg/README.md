# Achados UFG — achados e perdidos com IA

Trabalho Final da Disciplina **Interação Humano-Computador (IHC)** — Instituto de Informática, Universidade Federal de Goiás.
Professor: Dirson S. Campos · 2026

**Integrantes:** Beatriz Almeida Felicio · Beatriz Silva Andrade · Kamilla Jordana Regosino de Moura

**Demonstração online:** https://beatrizalmeidaf.github.io/trabalho_final_ihc/

---

## 1. O que é

Aplicação **web responsiva** (funciona no navegador do computador e do celular) que centraliza os achados e perdidos dos campi da UFG:

- **Quem encontrou** tira uma foto; a IA sugere título, descrição, categoria e cor. A pessoa revisa, informa onde achou, onde o objeto vai ficar e cria uma **pergunta de verificação**.
- **Quem perdeu** descreve o objeto em **linguagem natural** ("perdi uma garrafa azul com capa de silicone perto do RU ontem"). A IA interpreta a frase, mostra os filtros que entendeu (que podem ser removidos) e ordena os itens por compatibilidade.
- Se nada aparecer, a pessoa cria um **alerta** e é avisada no sino quando um item compatível for cadastrado.
- Para recuperar o objeto, a pessoa responde a pergunta de verificação (até 3 tentativas). Se acertar, vê onde retirar. O status segue **Encontrado → Em devolução → Devolvido**.
- Se a foto mostrar dados pessoais (nome, matrícula, rosto), a IA avisa e a foto fica **desfocada** para o público.

## 2. Duas formas de usar

| | Versão online (GitHub Pages) | Versão local (Node.js) |
|---|---|---|
| Onde | https://beatrizalmeidaf.github.io/trabalho_final_ihc/ | `http://localhost:3000` |
| Instalação | nenhuma | Node.js 18+ e `npm install` |
| IA | simulada (modo demonstração) | **Claude** com `ANTHROPIC_API_KEY`, ou simulada sem a chave |
| Dados | ficam só no seu navegador (`localStorage`) | arquivo `data/db.json` no servidor, compartilhado entre navegadores |
| Fotos enviadas | reduzidas e guardadas no navegador | salvas em `uploads/` |

As duas versões usam **o mesmo código de regras** (`public/compartilhado/nucleo.js`). O front-end tenta falar com o servidor; se não houver servidor (caso do GitHub Pages), ele carrega `public/modo-estatico.js` e executa a mesma API dentro do navegador.

## 3. Como rodar localmente

### 3.1 Pré-requisitos

- **Node.js 18 ou superior** (testado com Node 24). Verifique com `node --version`.
- Git (opcional, para clonar).

### 3.2 Passo a passo

```bash
git clone https://github.com/beatrizalmeidaf/trabalho_final_ihc.git
cd trabalho_final_ihc/TFD_IHC_AchadosUFG/codigo/achados-ufg
npm install
npm start
```

Abra **http://localhost:3000**. No primeiro acesso, informe um nome (login simulado).

Para usar outra porta: `PORT=4000 npm start` (Linux/macOS) ou `$env:PORT=4000; npm start` (PowerShell).

### 3.3 Ativar a IA real (Claude)

Sem configuração, a aplicação roda em **modo demonstração** (faixa amarela no topo). Para usar o Claude:

1. Copie `.env.example` para `.env`.
2. Preencha `ANTHROPIC_API_KEY=` com uma chave da API da Anthropic (https://console.anthropic.com).
3. Reinicie com `npm start`. O terminal mostra `IA: Claude (claude-opus-5-5)`.

Com a chave, qualquer foto pode ser analisada (não só as de exemplo), a busca entende sinônimos e a verificação de posse aceita respostas escritas de outro jeito.

### 3.4 Rodar a versão estática sem Node

Qualquer servidor de arquivos estáticos serve a pasta `public/`, por exemplo:

```bash
cd codigo/achados-ufg/public
python -m http.server 8080
```

e abra http://localhost:8080. (Abrir o `index.html` direto pelo explorador de arquivos não funciona, porque os navegadores bloqueiam módulos JavaScript em `file://`.)

### 3.5 Comandos úteis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor |
| `npm run reset` | Apaga `data/db.json` e `uploads/` e volta aos dados de exemplo (reinicie o servidor depois) |

Na versão online, o botão **Restaurar exemplos** na faixa amarela faz o mesmo.

## 4. Roteiro de demonstração

1. Entre como **Ana Clara** e busque `perdi uma garrafa azul com capa de silicone perto do RU ontem`. Remova um filtro tocando no "×".
2. Troque de usuário (avatar no canto superior direito) para **Pedro** → **Encontrei algo** → envie `public/demo-fotos/fone-branco.jpg`. Revise a sugestão, escolha o local e use a resposta `uma estrela`. Publique.
3. Volte para **Ana Clara**: o sino mostra uma notificação (existe um alerta de exemplo para "fone sem fio branco").
4. Abra o item → **É meu!** → responda `estrela`.
5. Como **Pedro**, abra o item e toque **Confirmar que devolvi**.
6. Envie `public/demo-fotos/carteirinha.png` para ver o aviso de dados pessoais e a foto desfocada.

Na versão local, use duas janelas (uma anônima) para ter os dois usuários ao mesmo tempo.

## 5. Estrutura

```
achados-ufg/
├── server.js                 Servidor Express (upload de fotos + encaminha /api para o núcleo)
├── src/
│   ├── ai.js                 Integração com o Claude (análise de foto, busca, verificação)
│   └── db.js                 Persistência em arquivo JSON
├── public/                   Tudo o que vai para o navegador (e para o GitHub Pages)
│   ├── index.html · styles.css · app.js     Interface (HTML, CSS e JS puros, sem build)
│   ├── modo-estatico.js      API dentro do navegador, usada quando não há servidor
│   ├── compartilhado/
│   │   ├── nucleo.js         Regras da API (usadas pelo servidor E pela versão estática)
│   │   ├── regras.js         IA simulada do modo demonstração
│   │   └── catalogo.js       Categorias, cores, locais da UFG e pontos de entrega
│   ├── dados/seed.json       Itens de exemplo (datas relativas ao dia de execução)
│   └── demo-fotos/           Fotos de exemplo + CREDITOS.md
├── scripts/reset-db.js       Restaura os dados de exemplo
└── .env.example              Modelo de configuração
```

### API

| Método | Rota | Função |
|---|---|---|
| GET | `/api/config` | Catálogo e modo de IA ativo |
| GET | `/api/itens` · `/api/itens/:id` | Lista / detalhe (sem a resposta de verificação) |
| POST | `/api/analisar` | Envia a foto e recebe a sugestão da IA |
| POST | `/api/itens` | Publica um item encontrado e dispara alertas |
| POST | `/api/buscar` · `/api/buscar/refinar` | Busca em linguagem natural / reordena após remover filtros |
| POST | `/api/itens/:id/reivindicar` | Confere a resposta de verificação |
| POST | `/api/itens/:id/devolver` | Conclui a devolução |
| GET/POST/DELETE | `/api/alertas` (+ `/:id/restaurar`) | Alertas do usuário ("Desfazer" restaura) |
| GET/POST | `/api/notificacoes` (+ `/lidas`) | Notificações do sino |

## 6. Publicação no GitHub Pages

O workflow `.github/workflows/pages.yml` (na raiz do repositório) publica a pasta `TFD_IHC_AchadosUFG/codigo/achados-ufg/public` a cada `push` na branch `main`. Para ativar em um fork: **Settings → Pages → Source: GitHub Actions**.

## 7. Tecnologias

- **Back-end:** Node.js, Express, Multer (upload), dotenv.
- **IA:** SDK oficial da Anthropic (`@anthropic-ai/sdk`), modelo `claude-opus-5-5`, com **saída estruturada em JSON Schema** (as respostas da IA sempre usam os ids de categoria, cor e local do catálogo) e *fallback* de servidor caso o modelo recuse a solicitação.
- **Front-end:** HTML, CSS e JavaScript puros (SPA com rotas por `#hash`, módulos ES), sem frameworks.
- **Protótipo:** Figma Make (ver documento de prompts) e capturas geradas com Playwright.

## 8. Recursos de IHC implementados (resumo)

- Duas ações principais na tela inicial (Perdi / Encontrei) e navegação inferior no celular (alvos ≥ 44 px).
- Assistente de cadastro em 3 etapas com indicador de progresso e rascunho salvo na sessão.
- Sugestão da IA sempre **editável**, identificada com selo e nível de confiança.
- Filtros interpretados exibidos como *chips* removíveis; percentual de compatibilidade e motivo de cada resultado.
- Fotos exibidas inteiras (sem corte), para que o dono reconheça o objeto.
- Estados de carregamento, vazio e erro com mensagens em linguagem simples; "Desfazer" ao excluir alerta.
- Linha do tempo de status; notificações com contador no sino.
- Acessibilidade: HTML semântico, link "pular para o conteúdo", foco visível, foco levado ao título a cada troca de tela, `aria-live` para resultados e erros, diálogo com foco preso e tecla Esc, ajuste de tamanho de texto, modo de alto contraste, respeito a `prefers-reduced-motion`, contraste mínimo 4,5:1 (WCAG AA).

## 9. Limitações da IA e da aplicação (importante)

**Sobre a IA usada no produto**

- **Sem chave de API (e sempre na versão online), a IA é simulada.** No modo demonstração:
  - a análise de foto só "reconhece" 4 imagens de `public/demo-fotos/` (`fone-branco`, `chaves`, `carteirinha`, `garrafa-azul`) pelo **nome do arquivo** — as respostas estão escritas em `public/compartilhado/regras.js`. Qualquer outra foto pede preenchimento manual;
  - a busca usa um dicionário de termos (categorias, cores, locais) e pontuação por regras. Ela não entende sinônimos fora do dicionário e confunde negações ("garrafa **sem adesivos**" conta como citação de "adesivo");
  - a verificação de posse compara palavras (≥ 60 % das palavras da resposta esperada).
  - **Todas as capturas de tela do relatório e dos slides foram feitas no modo demonstração.**
- **Com o Claude**, as descrições podem conter erros (cor ou marca errada, detalhe inventado). Por isso a interface obriga a revisão humana antes de publicar e mostra o nível de confiança. A detecção de dados pessoais também pode falhar; a dica de privacidade orienta a fotografar só o objeto.
- A integração com o Claude foi escrita seguindo a documentação da SDK, mas **não foi testada com uma chave real** durante o desenvolvimento (não havia chave disponível). O código volta automaticamente para o modo demonstração se a chamada falhar.
- A verificação de posse por IA pode aceitar respostas parecidas demais ou recusar respostas corretas escritas de outro jeito; por isso há limite de 3 tentativas e a alternativa de procurar o ponto de entrega com documento.

**Sobre o protótipo**

- Login **simulado** (apenas um nome salvo no navegador). Em produção seria a conta institucional da UFG.
- A foto com dados pessoais é desfocada **no navegador** (CSS); o arquivo original continua acessível pela URL. Em produção, o servidor deveria gerar uma versão desfocada.
- Na versão online, cada navegador tem seus próprios dados: o que você cadastra não aparece para outras pessoas.
- Dados locais guardados em um arquivo JSON (`data/db.json`), sem concorrência nem backup.
- Notificações aparecem só dentro do app (sem e-mail ou push).
- As fotos de exemplo são fotos reais do **Wikimedia Commons** sob licenças abertas (créditos em `public/demo-fotos/CREDITOS.md`); a **carteirinha é uma ilustração fictícia** feita para não expor dados de uma pessoa real. As descrições dos itens de exemplo foram escritas pelo grupo para corresponder às fotos; detalhes como "o que está gravado no fundo" são inventados para a demonstração.

## 10. Uso de IA no desenvolvimento e ajustes manuais

O código, os wireframes e as capturas foram gerados com apoio de um assistente de IA (Claude, via Claude Code), a partir dos prompts listados no documento **Prompts_IA_AchadosUFG** (pasta `documentos/`). O grupo revisou o resultado e pediu correções iterativas, registradas na seção "Iterações humano–IA" daquele documento. Ajustes feitos depois de testar a interface:

- correção do menu de acessibilidade e do contador do sino, que apareciam mesmo quando deveriam estar ocultos;
- remoção do anel de foco que aparecia no título após cada troca de tela;
- rolagem automática até os resultados da busca no celular e redução da foto na etapa de revisão;
- aumento do limiar de compatibilidade (30 % → 40 %) após resultados pouco relevantes;
- verde dos selos escurecido (#1E7F4F → #18693F) para atingir contraste AA;
- troca das ilustrações por fotos reais de banco aberto e exibição da foto inteira (`object-fit: contain`);
- servidor deixou de cair quando a pasta `uploads/` é apagada com o app rodando;
- separação das regras da API em um núcleo compartilhado para permitir a versão estática no GitHub Pages.

> Espaço para o grupo: registre aqui qualquer ajuste feito manualmente após a entrega da IA (arquivo, o que mudou e por quê).

## 11. Licença

Código: MIT — uso acadêmico. Fotos de exemplo: licenças individuais em `public/demo-fotos/CREDITOS.md`.
