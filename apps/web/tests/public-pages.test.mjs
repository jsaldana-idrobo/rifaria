import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const distRoot = resolve(process.cwd(), "dist");

async function readDistFile(relativePath) {
  return readFile(resolve(distRoot, relativePath), "utf8");
}

test("home exposes the new conversion-first sections", async () => {
  const html = await readDistFile("index.html");

  assert.match(html, /Rifas grandes\. Flujo claro\. Pago local\./);
  assert.match(html, /Elige tu estrategia/);
  assert.match(html, /Ganadores que si dan confianza/);
  assert.match(html, /Premios para todos los perfiles/);
});

test("thanks page keeps the same visual language", async () => {
  const html = await readDistFile("gracias/index.html");

  assert.match(html, /Sigue el estado de tu orden/);
  assert.match(html, /Que pasa ahora/);
});

test("terms page uses the refreshed legal framing", async () => {
  const html = await readDistFile("terminos/index.html");

  assert.match(html, /Marco legal para rifas publicadas en Rifaria/);
  assert.match(html, /Resumen ejecutivo/);
});

test("privacy page uses the refreshed legal framing", async () => {
  const html = await readDistFile("politica-datos/index.html");

  assert.match(html, /Privacidad y tratamiento de datos/);
  assert.match(html, /Controles y tiempos clave/);
});

test("admin page adopts the shared redesign language", async () => {
  const html = await readDistFile("admin/index.html");

  assert.match(html, /Control operativo de Rifaria/);
  assert.match(html, /Acceso seguro para el equipo/);
});
