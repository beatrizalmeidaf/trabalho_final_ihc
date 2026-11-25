// Apaga o banco local (data/db.json) e as fotos enviadas; a semente é recarregada no próximo início.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
fs.rmSync(path.join(raiz, "data", "db.json"), { force: true });
fs.rmSync(path.join(raiz, "uploads"), { recursive: true, force: true });
console.log("Banco de dados reiniciado com os dados de exemplo.");
