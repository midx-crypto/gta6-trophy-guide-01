// Leonida Nights: hand the GTA 6 trophy guide in.
//
// This program is the entrypoint of the repository. It runs on Node 22 with
// the standard library only and no network. It takes the guide as built in
// this directory, app/ (the static guide: index.html, style.css, app.js and
// data/trophies.json) and screenshots/ (four JPEG renders of the guide in a
// browser), copies both folders into the output directory, and writes
// dossier.json there with buildDossier from the vendored make.fun library.
// The dossier is what the judge reads: the screenshots, the first load's
// files and bytes, and the guide's source.
//
// Where the output goes: the grader runs this in a container with a writable
// /output, so that is the default. Anywhere else, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The caps passed to buildDossier mirror the competition's gate: at most
// 160 KiB of dossier text, at most 4 screenshots of at most 256 KiB each,
// at most 993 files and directories in app/ totalling at most 48 MiB. A
// build that breaks a cap fails here instead of at the gate, with the
// library's own error.

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyGuideInto(outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
  }
}

function writeDossier(outputDir: string): void {
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

copyGuideInto(outputDir);
writeDossier(outputDir);
console.log(`wrote ${join(outputDir, 'dossier.json')} (${statSync(join(outputDir, 'dossier.json')).size} bytes)`);
