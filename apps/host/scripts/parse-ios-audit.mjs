// --- Turns the structured lines an XCUITest accessibility audit prints into a markdown report.
// The Swift test (ios/HostUITests/AccessibilityAuditUITests.swift) runs Apple's
// performAccessibilityAudit on each federated screen and prints one `A11Y_FINDING|screen|type|element|detail`
// line per issue (plus `A11Y_AUDITED|screen|clean` and `A11Y_ERROR|...`). This script reads the
// xcodebuild log and writes accessibility-audit-ios.md: the native-layer counterpart to the Jest
// report. Run: node scripts/parse-ios-audit.mjs <xcodebuild.log> [out.md]
import {readFileSync, writeFileSync} from 'node:fs';

const logPath = process.argv[2] ?? '/tmp/ios-audit.log';
const outPath = process.argv[3] ?? new URL('../accessibility-audit-ios.md', import.meta.url).pathname;

// Apple's audit types map onto the WCAG criteria the Jest layer defers to "rendered / native".
const TYPE_WCAG = {
  contrast: '1.4.3 Contrast (Minimum) / 1.4.11 Non-text Contrast - as actually drawn',
  hitRegion: '2.5.8 Target Size (Minimum) - hit region as laid out',
  sufficientElementDescription: '1.1.1 Non-text Content / 4.1.2 Name, Role, Value',
  elementDetection: '4.1.2 Name, Role, Value - element not detectable',
  textClipped: '1.4.4 Resize Text / 1.4.10 Reflow - text truncated at size',
  dynamicType: '1.4.4 Resize Text - does not honour Dynamic Type',
  trait: '4.1.2 Name, Role, Value - conflicting/incorrect traits',
};

const lines = readFileSync(logPath, 'utf8').split('\n');
const findings = [];
const audited = new Set();
const errors = [];
const seen = new Set();

for (const raw of lines) {
  let m = raw.match(/A11Y_FINDING\|([^|]*)\|([^|]*)\|([^|]*)\|(.*)$/);
  if (m) {
    const key = `${m[1]}|${m[2]}|${m[3]}|${m[4]}`;
    if (!seen.has(key)) {
      seen.add(key);
      findings.push({screen: m[1], type: m[2].trim(), element: m[3].trim(), detail: m[4].trim()});
    }
    continue;
  }
  m = raw.match(/A11Y_AUDITED\|([^|]*)\|/);
  if (m) {
    audited.add(m[1]);
    continue;
  }
  m = raw.match(/A11Y_ERROR\|([^|]*)\|(.*)$/);
  if (m) errors.push({screen: m[1], detail: m[2].trim()});
}

const screens = [...new Set([...audited, ...findings.map(f => f.screen)])];
const byScreen = screens.map(s => ({
  screen: s,
  findings: findings.filter(f => f.screen === s),
}));

const out = [];
out.push('# Native Accessibility Audit (iOS) - EAA / WCAG 2.1');
out.push('');
out.push('> Generated from `xcodebuild test -scheme HostUITests` on an iOS 17+ simulator. This is the');
out.push('> native layer of the composite: Apple\'s `performAccessibilityAudit` checks the REAL rendered');
out.push('> accessibility tree (contrast as drawn, hit region, clipped text, element descriptions,');
out.push('> traits), the criteria the Jest layer deliberately defers here. An audit reports findings; it');
out.push('> is not a pass/fail gate.');
out.push('');
out.push('## Summary');
out.push('');
out.push(`- **Screens audited:** ${screens.length} (${screens.join(', ') || 'none'})`);
out.push(`- **Findings:** ${findings.length}`);
if (errors.length) out.push(`- **Navigation gaps (screens not reached):** ${errors.length}`);
out.push('');

if (findings.length === 0 && errors.length === 0) {
  out.push('## Reading a clean result');
  out.push('');
  out.push('Clean is necessary, not sufficient. `performAccessibilityAudit` samples the rendered layer');
  out.push('tree, and on React Native (Fabric) it under-reports on text it cannot sample: the Jest token');
  out.push('matrix measures the midGrey id / subtitle labels at ~2.74:1 (below the 4.5:1 AA floor) yet the');
  out.push('native contrast check does not flag them here. So a clean native pass does not certify');
  out.push('conformance; it is one layer. The token layer (Jest) and a manual VoiceOver pass remain');
  out.push('required, and the two known token findings (midGrey text, stat-bar fill) still stand.');
  out.push('');
}

const byType = {};
for (const f of findings) (byType[f.type] ??= []).push(f);
if (Object.keys(byType).length) {
  out.push('## Findings by audit type');
  out.push('');
  out.push('| Audit type | WCAG | Count |');
  out.push('|---|---|---|');
  for (const [type, fs] of Object.entries(byType)) {
    out.push(`| ${type} | ${TYPE_WCAG[type] ?? '(unmapped)'} | ${fs.length} |`);
  }
  out.push('');
}

out.push('## By screen');
out.push('');
for (const {screen, findings: fs} of byScreen) {
  out.push(`### ${screen}`);
  out.push('');
  if (!fs.length) {
    out.push('No native audit findings on this screen.');
    out.push('');
    continue;
  }
  for (const f of fs) {
    out.push(`- **${f.type}** - ${f.element || '(no element)'}`);
    out.push(`  - ${f.detail}`);
    out.push(`  - WCAG: ${TYPE_WCAG[f.type] ?? '(unmapped)'}`);
  }
  out.push('');
}

if (errors.length) {
  out.push('## Navigation gaps');
  out.push('');
  out.push('Screens the audit could not reach (so they are NOT covered by this run):');
  out.push('');
  for (const e of errors) out.push(`- **${e.screen}** - ${e.detail}`);
  out.push('');
}

writeFileSync(outPath, out.join('\n'));
console.log(`Wrote ${outPath}: ${screens.length} screens, ${findings.length} findings, ${errors.length} nav gaps`);
