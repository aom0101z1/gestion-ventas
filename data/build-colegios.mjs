// 🏫 Builds data/colegios-co.json — the national school directory used by the
// Colegio picker (colegio-picker.js) in the student form and Clases de prueba.
//
// Source: Ministerio de Educación Nacional, datos.gov.co dataset cfw5-qzt5
// "MEN_ESTABLECIMIENTOS_EDUCATIVOS_PREESCOLAR_BÁSICA_Y_MEDIA" (one row per
// establecimiento per year, keyed by código DANE). Uses the latest year.
//
// Refresh once a year (the MEN publishes the new year around mid-year):
//   node data/build-colegios.mjs
// then commit data/colegios-co.json and bump COLEGIOS_VERSION in colegio-picker.js.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://www.datos.gov.co/resource/cfw5-qzt5.json';

async function query(params) {
    const url = API + '?' + new URLSearchParams(params).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
}

// The 2023 cut is per sede (~400k rows); a normal year is ~18k establecimientos.
const years = await query({ $select: 'a_o,count(*)', $group: 'a_o', $order: 'a_o DESC' });
const year = years.find(y => Number(y.count) < 50000)?.a_o;
if (!year) throw new Error('No usable year in ' + JSON.stringify(years));

const rows = await query({
    $select: 'codigo_dane,nombre_establecimiento,municipio,departamento,sector',
    $where: `a_o='${year}'`,
    $limit: '100000'
});

const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();
const seen = new Map();
for (const r of rows) {
    const codigo = tidy(r.codigo_dane);
    const nombre = tidy(r.nombre_establecimiento);
    if (!codigo || !nombre || seen.has(codigo)) continue;
    // [código DANE, nombre, municipio, departamento, 'O' oficial | 'P' privado]
    seen.set(codigo, [codigo, nombre, tidy(r.municipio), tidy(r.departamento),
        r.sector === 'OFICIAL' ? 'O' : 'P']);
}

const list = [...seen.values()].sort((a, b) =>
    a[3].localeCompare(b[3], 'es') || a[2].localeCompare(b[2], 'es') || a[1].localeCompare(b[1], 'es'));

const out = fileURLToPath(new URL('./colegios-co.json', import.meta.url));
writeFileSync(out, JSON.stringify({
    year,
    source: 'MEN · datos.gov.co cfw5-qzt5',
    builtAt: new Date().toISOString().slice(0, 10),
    rows: list
}));
console.log(`✅ ${list.length} colegios (${year}) → ${out}`);
