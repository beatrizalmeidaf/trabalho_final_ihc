// Achados UFG — servidor web (Express). As regras da API ficam em public/compartilhado/nucleo.js,
// compartilhadas com a versão estática (GitHub Pages).
import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as banco from "./src/db.js";
import { analisarFoto, buscar, verificarResposta, modoIA } from "./src/ai.js";
import { criarNucleo } from "./public/compartilhado/nucleo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(here, "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

const TIPOS_IMAGEM = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(TIPOS_IMAGEM[file.mimetype]))
});

const nucleo = criarNucleo({ banco, ia: { modo: modoIA, buscar, verificar: verificarResposta } });

const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(here, "public")));
app.use("/uploads", express.static(UPLOADS));

// Identificação simulada: o front-end envia o nome escolhido no primeiro acesso.
function usuarioDoCabecalho(req) {
  try { return JSON.parse(decodeURIComponent(req.get("X-Usuario") || "")); } catch { return null; }
}

// Upload da foto + análise pela IA (específico do servidor).
app.post("/api/analisar", upload.single("foto"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma foto em JPG, PNG, WEBP ou GIF de até 5 MB." });
  try {
    const nome = `${Date.now()}-${banco.novoId("f")}${TIPOS_IMAGEM[req.file.mimetype]}`;
    fs.mkdirSync(UPLOADS, { recursive: true }); // a pasta pode ter sido apagada por "npm run reset"
    fs.writeFileSync(path.join(UPLOADS, nome), req.file.buffer);
    const analise = await analisarFoto({ buffer: req.file.buffer, mime: req.file.mimetype, nomeArquivo: req.file.originalname });
    res.json({ foto: `uploads/${nome}`, analise });
  } catch (e) {
    console.error("[analisar]", e);
    res.status(500).json({ erro: "Não foi possível salvar a foto. Tente novamente." });
  }
});

// Todas as demais rotas /api/* vão para o núcleo compartilhado.
app.all(/^\/api\/.*/, async (req, res, next) => {
  try {
    const { status, dados } = await nucleo.tratar(req.method, req.path, { corpo: req.body, consulta: req.query, usuario: usuarioDoCabecalho(req) });
    res.status(status).json(dados);
  } catch (e) { next(e); }
});

// SPA: qualquer outra rota devolve o index.html
app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(here, "public", "index.html")));

// Erros inesperados viram JSON em vez de derrubar o servidor (deve ficar depois das rotas).
app.use((erro, _req, res, _next) => {
  console.error(erro);
  res.status(500).json({ erro: "Erro interno. Tente novamente." });
});

const PORTA = Number(process.env.PORT) || 3000;
app.listen(PORTA, () => {
  banco.carregar();
  console.log(`Achados UFG rodando em http://localhost:${PORTA}`);
  console.log(modoIA() === "claude"
    ? `IA: Claude (${process.env.CLAUDE_MODEL || "claude-opus-5-5"})`
    : "IA: modo demonstração (defina ANTHROPIC_API_KEY no arquivo .env para usar o Claude)");
});
