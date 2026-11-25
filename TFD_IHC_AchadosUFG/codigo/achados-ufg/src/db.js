// Persistência simples em arquivo JSON (suficiente para um protótipo acadêmico).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { materializarSemente } from "../public/compartilhado/nucleo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const SEED_FILE = path.join(here, "..", "public", "dados", "seed.json");

let estado = null;

export function carregar() {
  if (estado) return estado;
  if (!fs.existsSync(DB_FILE)) {
    estado = materializarSemente(JSON.parse(fs.readFileSync(SEED_FILE, "utf8")));
    salvar();
  } else {
    estado = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  }
  return estado;
}

export function salvar() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(estado, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function resetar() {
  if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  estado = null;
  return carregar();
}

export const novoId = (prefixo) => `${prefixo}_${crypto.randomBytes(5).toString("hex")}`;
