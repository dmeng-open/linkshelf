import { parseArgs } from "node:util";

const WARMUP = 5;

const { values } = parseArgs({
  options: {
    a: { type: "string" },
    b: { type: "string" },
    path: { type: "string" },
    n: { type: "string" },
    cookie: { type: "string" },
  },
});

const n = Number(values.n);
if (!values.a || !values.path || !Number.isInteger(n) || n < 1) {
  throw new Error("usage: perf-probe.mjs --a <baseUrl> [--b <baseUrl>] --path <path> --n <count> [--cookie <value>]");
}

const sides = { a: values.a, ...(values.b && { b: values.b }) };
const samples = Object.fromEntries(Object.keys(sides).map((side) => [side, []]));

async function ttfb(base) {
  const url = new URL(values.path, base);
  const start = performance.now();
  const res = await fetch(url, {
    redirect: "manual",
    headers: values.cookie ? { cookie: values.cookie } : {},
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const reader = res.body.getReader();
  await reader.read();
  const elapsed = performance.now() - start;
  while (!(await reader.read()).done);
  return elapsed;
}

for (let i = 0; i < WARMUP + n; i++) {
  const order = i % 2 ? Object.entries(sides).reverse() : Object.entries(sides);
  for (const [side, base] of order) {
    const elapsed = await ttfb(base);
    if (i >= WARMUP) samples[side].push(elapsed);
  }
}

const percentile = (sorted, p) => sorted[Math.ceil(p * sorted.length) - 1];
const round = (ms) => Math.round(ms * 100) / 100;

const result = Object.fromEntries(
  Object.entries(samples).map(([side, list]) => {
    const sorted = list.sort((x, y) => x - y);
    return [side, { p50: round(percentile(sorted, 0.5)), p95: round(percentile(sorted, 0.95)) }];
  }),
);

console.log(JSON.stringify(result));
