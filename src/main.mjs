// The page's entry: the frame loop that writes render(t) into the #screen element. Browser only.
import {W, H} from './art.mjs';
import {hash} from './grid.mjs';
import {render} from './render.mjs';

const screen = document.getElementById('screen');
const start = performance.now();
let raf = 0;
const frame = now => {
  const t = (now - start) / 1000;
  const {html, shake} = render(t);
  screen.innerHTML = html;
  screen.style.transform = shake ? `translate(${(hash(1, 1, t * 60) - 0.5) * 6}px, ${(hash(2, 2, t * 60) - 0.5) * 6}px)` : '';
  raf = requestAnimationFrame(frame);
};
raf = requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame);
});
if (typeof module !== 'undefined') module.exports = {render, W, H};
