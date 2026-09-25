// The dragon's art and where it sits on the fixed W x H grid.
const W = 100, H = 24, CYCLE = 6;
const HUD = 'CRITICAL HIT! +10,000 XP';
const R = String.raw;
const WINGS = [
  R`        /\                                                          /\        `,
  R`       /  \   __                                                __   /  \       `,
  R`      /    \ /  \__                                          __/  \ /    \      `,
  R`     / /\   \    \__                                      __/    /   /\ \     `,
  R`    / /  \   \_     \___                              ___/     _/   /  \ \    `,
  R`   / /    \_   \__      \__                        __/      __/   _/    \ \   `,
  R`  /_/       \_    \__      \_                    _/      __/    _/       \_\  `,
  R`              \_     \_      \_                _/      _/     _/              `,
];
const HEAD = [
  R`                            \_/                _/                     `,
  R`                              \      _____    /                       `,
  R`                       ________\____/     \__/________                `,
  R`                     _/                               \__             `,
  R`                    /     __        _____        __      \_           `,
  R`                   |     /  \      /     \      /  \       \          `,
  R`                   |    /    \    /       \    /    \       \_        `,
  R`                   |   /      \__/         \__/      \        \______ `,
  R`                    \_/                                \______       >`,
];
const JAW = [
  R`                     \  V   V   V   V   V   V   V   V   V   V   V  /  `,
  R`                      \___________________________________________/   `,
  R`                          \____     _____     _____     ____/        `,
];
const WING_LEFT = 10, HEAD_TOP = 8, HEAD_LEFT = 10, JAW_TOP = 17;
const MOUTH = {x: HEAD_LEFT + 70, y: HEAD_TOP + 8};
const EYES = [[HEAD_LEFT + 30, HEAD_TOP + 6], [HEAD_LEFT + 44, HEAD_TOP + 6]];

export {W, H, CYCLE, HUD, WINGS, HEAD, JAW, WING_LEFT, HEAD_TOP, HEAD_LEFT, JAW_TOP, MOUTH, EYES};
