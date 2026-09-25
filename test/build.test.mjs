// END-2, the build: docs/CONTRACT.md C2.1-C2.5. The built page is what ships, so C2.3 runs
// dist/index.html through the same harness that captured v1's goldens.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {frameAt, inlineScript} from './page-harness.mjs';
import {build} from '../tools/build.mjs';
import {render} from '../src/render.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist', 'index.html');
const TIMES = [0, 0.5, 1.7, 3.2];
const golden = t => {
  const {html, shake} = JSON.parse(readFileSync(join(ROOT, 'test', 'golden', `v1-t${t}.json`), 'utf8'));
  return {html, shake};
};

/** Run `node tools/build.mjs` in a checkout at root; returns the process result. */
const runCli = (root, cwd = root) => spawnSync(process.execPath, [join(root, 'tools', 'build.mjs')], {cwd, encoding: 'utf8'});

/** Build this repo the way CI does and return the bytes written. */
function buildPage() {
  const r = runCli(ROOT);
  assert.equal(r.status, 0, `build failed: ${r.stderr}`);
  return readFileSync(DIST);
}

/** A throwaway checkout: tools/build.mjs plus the given src files. Removed when the test ends. */
function checkout(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'endboss-build-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(join(root, 'tools'));
  mkdirSync(join(root, 'src'));
  copyFileSync(join(ROOT, 'tools', 'build.mjs'), join(root, 'tools', 'build.mjs'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, 'src', name), text);
  return root;
}
const srcFiles = () => Object.fromEntries(readdirSync(join(ROOT, 'src')).map(f => [f, readFileSync(join(ROOT, 'src', f), 'utf8')]));
const PAGE = '<pre id="screen"></pre>\n<!-- bundle: main.mjs -->\n';

// Every way a page can reach the network. The bundle must be one self-contained file.
const NETWORK = [
  ['an attribute that loads a URL', /\b(?:src|href|srcset|action|poster)\s*=\s*(?!["']?\s*(?:data:|#))/i],
  ['a CSS url() that is not data:', /url\(\s*(?!["']?\s*data:)/i],
  ['an http(s) URL', /\bhttps?:\/\//i],
  ['<link>', /<link\b/i],
  ['@import', /@import\b/i],
  ['fetch', /\bfetch\s*\(/],
  ['import()', /\bimport\s*\(/],
  ['a static import', /^\s*import\s*[{*'"\w]/m],
  ['XHR, sockets, beacons or workers', /\b(?:XMLHttpRequest|WebSocket|EventSource|sendBeacon|Worker|SharedWorker|WebTransport)\b/],
];
const networkUses = html => NETWORK.filter(([, re]) => re.test(html)).map(([what]) => what);

test('C2.1 node tools/build.mjs writes dist/index.html, byte-identical on a second run', () => {
  rmSync(DIST, {force: true});
  const first = buildPage();
  assert.ok(first.length > 0, 'dist/index.html is empty');
  const second = buildPage();
  assert.ok(first.equals(second), 'two builds of the same src/ differ');
  const elsewhere = runCli(ROOT, tmpdir());
  assert.equal(elsewhere.status, 0, elsewhere.stderr);
  assert.ok(first.equals(readFileSync(DIST)), 'the output depends on the working directory');
});

test('C2.1 the output depends only on src/: CRLF and LF checkouts build the same bytes', t => {
  const lf = srcFiles(), crlf = Object.fromEntries(Object.entries(lf).map(([f, s]) => [f, s.replace(/\r?\n/g, '\r\n')]));
  const a = build(join(checkout(t, lf), 'src')), b = build(join(checkout(t, crlf), 'src'));
  assert.equal(a, b);
  assert.ok(!a.includes('\r'), 'the page has CR line endings');
});

test('C2.2 dist/index.html makes no network requests and is one self-contained file', () => {
  const page = buildPage().toString('utf8');
  assert.deepEqual(networkUses(page), []);
  assert.doesNotThrow(() => inlineScript(page), 'the page must have exactly one script, inline');
});

test('C2.2 the network check catches each kind of request', () => {
  const bad = [
    '<script src="https://cdn.example/x.js"></script>',
    '<img src="//cdn.example/x.png">',
    '<script src="app.js"></script>',
    '<a href="http://example.com">x</a>',
    '<link rel="stylesheet" href="style.css">',
    'body { background: url(https://example.com/a.png); }',
    '@import "x.css";',
    "fetch('/api/score');",
    "import('https://example.com/m.js');",
    'await import(url);',
    "import {x} from './x.mjs';",
    "new WebSocket('wss://example.com');",
    "navigator.sendBeacon('/log', data);",
  ];
  for (const snippet of bad) assert.notDeepEqual(networkUses(snippet), [], `not caught: ${snippet}`);
  assert.deepEqual(networkUses('<img src="data:image/png;base64,AAAA"><a href="#top">top</a>'), []);
});

test('C2.3 goldens: v1 at t = 0, 0.5, 1.7 and 3.2 s, all different, with and without shake', () => {
  assert.deepEqual(readdirSync(join(ROOT, 'test', 'golden')).sort(), TIMES.map(t => `v1-t${t}.json`).sort());
  const frames = TIMES.map(golden);
  for (const f of frames) assert.equal(f.html.split('\n').length, 24 + 2, 'a golden is not a 24-row frame plus HUD');
  assert.equal(new Set(frames.map(f => f.html)).size, TIMES.length, 'two goldens are the same frame');
  assert.deepEqual(new Set(frames.map(f => f.shake)), new Set([true, false]));
});

test('C2.3 the built page renders v1\'s frame text at every golden t', () => {
  const page = buildPage().toString('utf8');
  for (const t of TIMES) assert.deepEqual(frameAt(page, t), golden(t), `t = ${t}`);
});

test('C2.3 a changed page fails the golden comparison, and one without v1\'s screen is refused', () => {
  const page = buildPage().toString('utf8');
  assert.notDeepEqual(frameAt(page.replace('BOSS', 'B0SS'), 0), golden(0));
  assert.throws(() => frameAt(page.replace(/<pre\b[^>]*><\/pre>/, ''), 0), /no <pre id="screen">/);
});

test('C2.3 the modules and the built page\'s module.exports hook give v1\'s frames too', () => {
  for (const t of TIMES) assert.deepEqual(render(t), golden(t), `src/render.mjs at t = ${t}`);
  const page = buildPage().toString('utf8');
  const context = vm.createContext({
    module: {exports: null},
    document: {getElementById: () => ({style: {}}), addEventListener() {}},
    performance: {now: () => 0},
    requestAnimationFrame: () => 1,
  });
  vm.runInContext(inlineScript(page), context);
  const {exports} = context.module;
  assert.equal(exports.W, 100);
  assert.equal(exports.H, 24);
  for (const t of TIMES) assert.deepEqual({...exports.render(t)}, golden(t), `module.exports.render at t = ${t}`);
});

test('C2.4 CI builds before node --test, and a failed build exits non-zero', t => {
  const steps = readFileSync(join(ROOT, '.github', 'workflows', 'checks.yml'), 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*- run:\s*(.+?)\s*$/)?.[1]).filter(Boolean);
  assert.ok(steps.includes('node tools/build.mjs'), `no build step in ${steps}`);
  assert.ok(steps.indexOf('node tools/build.mjs') < steps.indexOf('node --test'), `build is not before node --test: ${steps}`);
  const root = checkout(t, {'page.html': PAGE, 'main.mjs': "import {nope} from './main.mjs';\n"});
  const r = runCli(root);
  assert.notEqual(r.status, 0, 'a broken build exited 0');
  assert.match(r.stderr, /build failed/);
  assert.ok(!existsSync(join(root, 'dist', 'index.html')), 'a broken build still wrote a page');
});

test('C2.4 the build refuses what it cannot bundle faithfully', t => {
  const fails = (files, reason) => assert.throws(() => build(join(checkout(t, files), 'src')), reason);
  fails({'page.html': '<p>no marker</p>\n', 'main.mjs': ''}, /expected one/);
  fails({'page.html': PAGE + PAGE, 'main.mjs': ''}, /found 2/);
  fails({'page.html': PAGE, 'main.mjs': "import {a} from './a.mjs';\n", 'a.mjs': 'const b = 1;\nexport {b};\n'}, /does not export 'a'/);
  fails({'page.html': PAGE, 'main.mjs': "import {a} from './a.mjs';\nexport {a};\n", 'a.mjs': "import {a} from './main.mjs';\nexport {a};\n"}, /import cycle/);
  fails({'page.html': PAGE, 'main.mjs': "import fs from 'node:fs';\n"}, /cannot bundle/);
  fails({'page.html': PAGE, 'main.mjs': 'export default 1;\n'}, /cannot bundle/);
  fails({'page.html': PAGE, 'main.mjs': "const s = '</script>';\n"}, /<\/script/);
});

test('C2.5 dist/ is ignored by git and nothing under it is committed', () => {
  const lines = readFileSync(join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).map(l => l.trim());
  assert.ok(lines.includes('dist/'), '.gitignore has no dist/ line');
  const ignored = spawnSync('git', ['check-ignore', '-q', 'dist/index.html'], {cwd: ROOT});
  assert.equal(ignored.status, 0, 'git does not ignore dist/index.html');
  const tracked = spawnSync('git', ['ls-files', '--', 'dist'], {cwd: ROOT, encoding: 'utf8'});
  assert.equal(tracked.status, 0, tracked.stderr);
  assert.equal(tracked.stdout, '', `committed under dist/: ${tracked.stdout}`);
});
