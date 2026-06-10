#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function usage() {
  return `Usage: node tools/architecture-view-html/render-view.mjs <architecture-view.json> [output.html]

Renders an architecture-view JSON to HTML. If output.html is omitted, writes next to the JSON file.
`;
}

function defaultOutput(inputFile) {
  return inputFile.replace(/\.json$/i, '.html');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return 0;
  }

  if (args.length < 1 || args.length > 2) {
    console.error(usage());
    return 2;
  }

  const inputFile = args[0];
  const outputFile = args[1] || defaultOutput(inputFile);
  if (outputFile === inputFile) {
    console.error('Input file must have .json extension or output.html must be provided.');
    return 2;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const renderer = path.join(scriptDir, 'render-architecture-html.mjs');
  const result = spawnSync(process.execPath, [renderer, inputFile, outputFile], {
    stdio: 'inherit',
    shell: false,
  });

  return result.status ?? 1;
}

process.exitCode = main();
