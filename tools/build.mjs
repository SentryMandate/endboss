// Bundles src/ into one self-contained page, dist/index.html. Node builtins only.
//   node tools/build.mjs
// src/page.html is the shell. Its one `<!-- bundle: <entry>.mjs -->` line becomes an inline <script>
// holding the entry and every module it imports, each in its own scope, in dependency order.
// A module may use only `import {a, b as c} from './x.mjs';`, `export {a, b as c};` and
// `export function f`. Anything else fails the build rather than shipping a page that differs from src/.
// The output depends only on the bytes in src/ (line endings normalised to LF), so it is deterministic.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = '__modules';
const MARKER = /^<!-- bundle: ([\w-]+\.mjs) -->$/gm;
const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*(['"])\.\/([\w-]+\.mjs)\2;?[ \t]*$/gm;
const EXPORT_LIST = /^export\s*\{([^}]*)\};?[ \t]*$/gm;
const EXPORT_FUNCTION = /^export (function\s+([A-Za-z_$][\w$]*))/gm;
const IDENT = /^[A-Za-z_$][\w$]*$/;

const read = (dir, file) => readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');

/** `a, b as c` -> [{from: 'a', to: 'a'}, {from: 'b', to: 'c'}]. */
function names(list, where) {
  return list.split(',').map(s => s.trim()).filter(Boolean).map(spec => {
    const m = spec.match(/^(\S+)(?:\s+as\s+(\S+))?$/);
    if (!m || !IDENT.test(m[1]) || (m[2] && !IDENT.test(m[2]))) throw new Error(`${where}: cannot bundle '${spec}'`);
    return {from: m[1], to: m[2] ?? m[1]};
  });
}

/** One module's code as a function body, plus what it imports and exports. */
function parse(file, source) {
  if (/<\/script/i.test(source)) throw new Error(`${file}: contains '</script', which would end the inline script`);
  if (new RegExp(`\\b${REGISTRY}\\b`).test(source)) throw new Error(`${file}: uses the reserved name ${REGISTRY}`);
  const imports = [], exports = [];
  let body = source.replace(IMPORT, (_, list, _q, dep) => {
    const bound = names(list, file);
    imports.push({dep, bound});
    return `const {${bound.map(b => (b.from === b.to ? b.to : `${b.from}: ${b.to}`)).join(', ')}} = ${REGISTRY}['${dep}'];`;
  });
  body = body.replace(EXPORT_LIST, (_, list) => {
    for (const b of names(list, file)) exports.push({local: b.from, as: b.to});
    return '';
  });
  body = body.replace(EXPORT_FUNCTION, (_, decl, name) => {
    exports.push({local: name, as: name});
    return decl;
  });
  const left = body.match(/^[ \t]*(import|export)\b.*$/m);
  if (left) throw new Error(`${file}: cannot bundle '${left[0].trim()}'`);
  const seen = new Set();
  for (const e of exports) if (seen.has(e.as)) throw new Error(`${file}: exports '${e.as}' twice`); else seen.add(e.as);
  return {file, body: body.endsWith('\n') ? body : body + '\n', imports, exports};
}

/** The entry and everything it imports, dependencies first; a cycle or a missing name fails. */
function collect(srcDir, entry) {
  const done = new Map(), order = [];
  const visit = (file, stack) => {
    if (done.has(file)) return done.get(file);
    if (stack.includes(file)) throw new Error(`import cycle: ${[...stack, file].join(' -> ')}`);
    const mod = parse(file, read(srcDir, file));
    for (const {dep, bound} of mod.imports) {
      const target = visit(dep, [...stack, file]);
      for (const b of bound) {
        if (!target.exports.some(e => e.as === b.from)) throw new Error(`${file}: ${dep} does not export '${b.from}'`);
      }
    }
    done.set(file, mod);
    order.push(mod);
    return mod;
  };
  visit(entry, []);
  return order;
}

/** The page: src/page.html with its bundle marker replaced by the inline script. */
export function build(srcDir = join(ROOT, 'src')) {
  const page = read(srcDir, 'page.html');
  const markers = [...page.matchAll(MARKER)];
  if (markers.length !== 1) throw new Error(`page.html: expected one '<!-- bundle: <entry>.mjs -->' line, found ${markers.length}`);
  const modules = collect(srcDir, markers[0][1]);
  const script = [
    '<script>',
    '(() => {',
    "'use strict';",
    `const ${REGISTRY} = {};`,
    ...modules.map(m => [
      `// src/${m.file}`,
      `${REGISTRY}['${m.file}'] = (() => {`,
      m.body + `return {${m.exports.map(e => (e.local === e.as ? e.as : `${e.as}: ${e.local}`)).join(', ')}};`,
      '})();',
    ].join('\n')),
    '})();',
    '</script>',
  ].join('\n');
  return page.replace(MARKER, () => script);
}

if (import.meta.main) {
  try {
    const html = build();
    mkdirSync(join(ROOT, 'dist'), {recursive: true});
    writeFileSync(join(ROOT, 'dist', 'index.html'), html);
    console.log(`wrote dist/index.html (${Buffer.byteLength(html)} bytes)`);
  } catch (err) {
    console.error(`build failed: ${err.message}`);
    process.exitCode = 1;
  }
}
