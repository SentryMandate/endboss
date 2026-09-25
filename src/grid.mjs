// Grid helpers: a deterministic hash (no Math.random) and stamping art rows onto the grid.
import {W, H} from './art.mjs';

const hash = (x, y, k) => { const n = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return n - Math.floor(n); };
const lay = (grid, cls, rows, top, left) => rows.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    const gy = top + y, gx = left + x;
    if (row[x] !== ' ' && gy >= 0 && gy < H && gx >= 0 && gx < W) { grid[gy][gx] = row[x]; cls[gy][gx] = 'b'; }
  }
});

export {hash, lay};
