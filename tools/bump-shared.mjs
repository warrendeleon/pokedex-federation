// --- One command for the shared-singleton bump dance. When a first-party shared package
// (@pokedex/ui or @pokedex/contracts) changes, every app must move in lockstep: the host is the
// eager provider of the singleton, and each remote bakes a `requiredVersion` from its own
// package.json at BUILD time. Under 0.x caret rules `^0.6.0` excludes `0.7.0`, so bumping the
// package and rebuilding only the host (or only the one remote you touched) makes the MF runtime
// log "Version X does not satisfy the requirement of <remote>". The fix is always the same four
// steps, in order, across ALL apps, which is exactly what's easy to do by hand and easy to get
// half-right:
//
//   1. bump + build + publish the package to the local registry (Verdaccio)
//   2. reinstall that exact version in every app (updates each package.json range)
//   3. restart every dev server with --reset-cache so each remote rebuilds its requiredVersion
//   4. reload the app
//
// Usage:  node tools/bump-shared.mjs <ui|contracts> [patch|minor|major]
//   defaults to a patch bump. Override the registry with REGISTRY=... and skip the server
//   restart (steps 3-4) with NO_RESTART=1 (e.g. when the servers aren't running). ---

import { execFileSync, spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = process.env.REGISTRY ?? 'http://localhost:4873';

// --- The dev topology: every app, its fixed Metro/Re.Pack port, and whether it's a remote.
// The host loads its own react-native.config.js (which wires Re.Pack's commands) so it starts
// with a bare `react-native start`; remotes pass the rspack config + their port explicitly. This
// is the single source of truth for "which servers exist and on what port". ---
const APPS = [
  { name: 'host', port: 8081, remote: false },
  { name: 'list', port: 8082, remote: true },
  { name: 'party', port: 8083, remote: true },
  { name: 'regions', port: 8084, remote: true },
  { name: 'detail', port: 8085, remote: true },
];

const [pkgArg, bumpArg = 'patch'] = process.argv.slice(2);

if (!['ui', 'contracts'].includes(pkgArg)) {
  console.error('Usage: node tools/bump-shared.mjs <ui|contracts> [patch|minor|major]');
  process.exit(1);
}
if (!['patch', 'minor', 'major'].includes(bumpArg)) {
  console.error(`Unknown bump type "${bumpArg}" (expected patch | minor | major).`);
  process.exit(1);
}

const pkgName = `@pokedex/${pkgArg}`;
const pkgDir = path.join(ROOT, 'packages', pkgArg);

/** Run a command, inheriting stdio so output streams live, and fail loudly. */
function run(cmd, args, cwd) {
  console.log(`\n$ ${cmd} ${args.join(' ')}  (in ${path.relative(ROOT, cwd) || '.'})`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

// --- 1. Bump + build + publish ---------------------------------------------------------------
run('npm', ['version', bumpArg, '--no-git-tag-version'], pkgDir);
const version = JSON.parse(
  execFileSync('npm', ['pkg', 'get', 'version'], { cwd: pkgDir }).toString()
);
console.log(`\n${pkgName} -> ${version}`);

run('npm', ['run', 'build', '--if-present'], pkgDir);
run('npm', ['publish', '--registry', REGISTRY], pkgDir);

// --- 2. Reinstall the exact version in every app --------------------------------------------
for (const app of APPS) {
  run(
    'npm',
    ['install', `${pkgName}@${version}`, '--save', '--registry', REGISTRY],
    path.join(ROOT, 'apps', app.name)
  );
}

if (process.env.NO_RESTART) {
  console.log('\nNO_RESTART set: skipping the dev-server restart. Restart all apps manually.');
  process.exit(0);
}

// --- 3. Restart every dev server with a cache reset -----------------------------------------
// Kill whatever holds each port, then relaunch detached so the servers outlive this script.
// --reset-cache forces each bundler to re-read node_modules and pick up the new package.
function killPort(port) {
  try {
    const pids = execFileSync('lsof', ['-ti', `tcp:${port}`])
      .toString()
      .trim()
      .split('\n');
    for (const pid of pids.filter(Boolean)) {
      try {
        process.kill(Number(pid));
      } catch {}
    }
  } catch {
    // lsof exits non-zero when nothing is listening; that's fine.
  }
}

function startApp(app) {
  const log = openSync(`/tmp/${app.name}-dev.log`, 'a');
  const args = ['react-native', 'start', '--reset-cache'];
  if (app.remote) args.push('--config', 'rspack.config.mjs', '--port', String(app.port));
  const child = spawn('npx', args, {
    cwd: path.join(ROOT, 'apps', app.name),
    detached: true,
    stdio: ['ignore', log, log],
  });
  child.unref();
}

console.log('\nRestarting all dev servers (logs in /tmp/<app>-dev.log)…');
for (const app of APPS) {
  killPort(app.port);
}
for (const app of APPS) {
  startApp(app);
  console.log(`  ${app.name} -> :${app.port}`);
}

console.log(
  `\nDone. ${pkgName}@${version} is live across host + ${APPS.length - 1} remotes.` +
    '\nGive the servers a few seconds to compile, then reload the app:' +
    `\n  curl -s http://localhost:8081/reload`
);
