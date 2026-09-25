// Runs a page's inline script in Node and returns its frame text at t: what the frame loop writes
// into <pre id="screen"> (html) and whether it shakes the screen (shake). Import-clean: node --test
// runs every .mjs under test/, so this file only exports functions.
import vm from 'node:vm';

/** The page's one inline script. Throws if there is none, more than one, or it loads a src. */
export function inlineScript(page) {
  const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if (scripts.length !== 1) throw new Error(`expected one <script>, found ${scripts.length}`);
  const [, attrs, code] = scripts[0];
  if (/\bsrc\s*=/i.test(attrs)) throw new Error('the script loads a src; expected it inline');
  return code;
}

/** Frame text at t seconds: load the page at now = 0, then deliver one animation frame at t * 1000 ms. */
export function frameAt(page, t) {
  if (!/<pre\b[^>]*\bid="screen"/i.test(page)) throw new Error('the page has no <pre id="screen">');
  const screen = {innerHTML: '', style: {transform: ''}};
  let pending = null;
  const context = vm.createContext({
    document: {
      hidden: false,
      getElementById: id => (id === 'screen' ? screen : null),
      addEventListener() {},
    },
    performance: {now: () => 0},
    requestAnimationFrame: cb => { pending = cb; return 1; },
    cancelAnimationFrame: () => { pending = null; },
  });
  vm.runInContext(inlineScript(page), context);
  if (!pending) throw new Error('the page never requested an animation frame');
  const frame = pending;
  pending = null;
  frame(t * 1000);
  return {html: screen.innerHTML, shake: screen.style.transform !== ''};
}
