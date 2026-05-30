// --- Custom Jest reporter: aggregates the a11y test results (grouped by WCAG success criterion in
// their describe titles, e.g. "WCAG 1.4.3 - Contrast") against the criteria catalogue and writes
// accessibility-report.md. The output reads like a vendor a11y dashboard (Evinced et al.) but is
// generated from our own tests, no licence. It is deliberately honest: criteria the unit tests
// can't prove are listed under the native-audit / manual layer rather than faked as passing. ---

const fs = require('fs');
const path = require('path');
const BASE_CRITERIA = require('./wcag-criteria');

// --- Per-app overrides. A criterion's true disposition is app-specific: an app with no text
// inputs genuinely can't satisfy 1.3.5 / 3.3.1 / 3.3.2, so it marks them n/a-with-reason here
// rather than leaving them as "not yet tested" (a gap that can never close) or faking a form to
// tick them. The generic catalogue stays untouched so an app that does have forms keeps them
// automated. Drop an `a11y-report.config.js` in the project root: { projectName, overrides }. ---
function loadConfig() {
  const p = path.resolve(process.cwd(), 'a11y-report.config.js');
  if (!fs.existsSync(p)) return {projectName: 'this app', overrides: {}};
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const cfg = require(p);
  return {projectName: cfg.projectName || 'this app', overrides: cfg.overrides || {}};
}

function mergeCriteria(overrides) {
  const merged = {};
  for (const [sc, m] of Object.entries(BASE_CRITERIA)) {
    merged[sc] = overrides[sc] ? {...m, ...overrides[sc]} : m;
  }
  return merged;
}

const SC_RE = /WCAG\s+(\d+\.\d+\.\d+)/;
const LAYER_LABEL = {
  automated: 'Automated (Jest)',
  native: 'Native audit',
  manual: 'Manual',
  'n/a': 'N/A',
};

function extractSc(ancestorTitles, title) {
  for (const t of [...ancestorTitles, title]) {
    const m = SC_RE.exec(t);
    if (m) return m[1];
  }
  return null;
}

function cleanMessage(failureMessages) {
  if (!failureMessages || !failureMessages.length) return '';
  // Strip ANSI + stack noise, keep the first few informative lines.
  return failureMessages
    .join('\n')
    // eslint-disable-next-line no-control-regex
    .replace(/\[[0-9;]*m/g, '')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('at '))
    .slice(0, 6)
    .map(l => l.trim())
    .join(' / ');
}

function statusFor(meta, bucket) {
  if (meta && meta.layer !== 'automated') return null; // owned by another layer
  if (!bucket) return {icon: '◻️', label: 'not yet tested'};
  if (bucket.fail > 0) return {icon: '❌', label: `${bucket.fail} violation(s)`};
  if (bucket.known > 0) return {icon: '⚠️', label: `${bucket.known} known finding(s)`};
  return {icon: '✅', label: `pass (${bucket.pass})`};
}

function render(bySc, when, CRITERIA, projectName) {
  const entries = Object.entries(CRITERIA);
  const automated = entries.filter(([, m]) => m.layer === 'automated');
  const tested = automated.filter(([sc]) => bySc[sc]);
  const violations = Object.entries(bySc).flatMap(([sc, b]) =>
    b.findings.filter(f => f.type === 'violation').map(f => ({sc, ...f})),
  );
  const known = Object.entries(bySc).flatMap(([sc, b]) =>
    b.findings.filter(f => f.type === 'known').map(f => ({sc, ...f})),
  );
  const counts = {automated: 0, native: 0, manual: 0, 'n/a': 0};
  for (const [, m] of entries) counts[m.layer]++;

  const lines = [];
  lines.push('# Accessibility Report - EAA / WCAG 2.1 (A & AA)');
  lines.push('');
  lines.push(`> Generated ${when} from the ${projectName} accessibility test suite. The European`);
  lines.push('> Accessibility Act (Directive 2019/882) has mandated WCAG 2.1 AA for EU-distributed');
  lines.push('> apps since 28 June 2025.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Criteria in scope:** ${entries.length} (Level A + AA, per EN 301 549)`);
  lines.push(
    `- **Automated coverage:** ${tested.length} / ${automated.length} applicable unit-testable criteria tested`,
  );
  lines.push(`- **Violations (must fix):** ${violations.length}`);
  lines.push(`- **Known / accepted findings (tracked):** ${known.length}`);
  lines.push(
    `- **Other layers:** ${counts.native} native-audit · ${counts.manual} manual · ${counts['n/a']} N/A`,
  );
  lines.push('');

  if (violations.length) {
    lines.push('## ❌ Violations');
    lines.push('');
    for (const v of violations) {
      const m = CRITERIA[v.sc] || {};
      lines.push(`- **${v.sc} ${m.title || ''}** - ${v.title}`);
      if (v.detail) lines.push(`  - ${v.detail}`);
    }
    lines.push('');
  }

  if (known.length) {
    lines.push('## ⚠️ Known / accepted findings');
    lines.push('');
    for (const k of known) {
      const m = CRITERIA[k.sc] || {};
      lines.push(`- **${k.sc} ${m.title || ''}** - ${k.title}`);
    }
    lines.push('');
  }

  lines.push('## Coverage by success criterion');
  lines.push('');
  lines.push('| SC | Criterion | Level | Owned by | Status |');
  lines.push('|---|---|---|---|---|');
  for (const [sc, m] of entries) {
    const auto = statusFor(m, bySc[sc]);
    let status;
    if (m.layer === 'automated') {
      status = auto ? `${auto.icon} ${auto.label}` : '◻️ not yet tested';
    } else if (m.layer === 'native') {
      status = '🔵 native audit';
    } else if (m.layer === 'manual') {
      status = '👁 manual';
    } else {
      status = '- n/a';
    }
    const note = m.note ? ` <br/><sub>${m.note}</sub>` : '';
    lines.push(`| ${sc} | ${m.title}${note} | ${m.level} | ${LAYER_LABEL[m.layer]} | ${status} |`);
  }
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push('Four layers, no single tool covers all of WCAG:');
  lines.push('');
  lines.push('- **Automated (Jest):** this suite. React tree, props and resolved styles, runs in PR.');
  lines.push('- **Native audit:** Apple `performAccessibilityAudit` + Google ATF, the rendered native a11y tree (contrast as drawn, hit region, dynamic type).');
  lines.push('- **Manual:** VoiceOver / TalkBack release ritual, focus order and label quality.');
  lines.push('- **N/A:** criteria for content this app does not have (audio, video).');
  lines.push('');
  return lines.join('\n');
}

class AccessibilityReporter {
  onRunComplete(_contexts, results) {
    const bySc = {};
    for (const file of results.testResults) {
      for (const t of file.testResults) {
        const sc = extractSc(t.ancestorTitles || [], t.title);
        if (!sc) continue;
        const bucket = (bySc[sc] = bySc[sc] || {pass: 0, fail: 0, known: 0, findings: []});
        const isKnown = /\(known/i.test(t.title);
        if (t.status === 'failed') {
          bucket.fail++;
          bucket.findings.push({type: 'violation', title: t.title, detail: cleanMessage(t.failureMessages)});
        } else if (t.status === 'passed' && isKnown) {
          bucket.known++;
          bucket.findings.push({type: 'known', title: t.title});
        } else if (t.status === 'passed') {
          bucket.pass++;
        }
      }
    }
    const {projectName, overrides} = loadConfig();
    const CRITERIA = mergeCriteria(overrides);
    const when = new Date().toISOString().slice(0, 10);
    const md = render(bySc, when, CRITERIA, projectName);
    const out = path.resolve(process.cwd(), 'accessibility-report.md');
    fs.writeFileSync(out, md);
    // eslint-disable-next-line no-console
    console.log(`\n📋 Accessibility report written to ${path.relative(process.cwd(), out)}`);
  }
}

module.exports = AccessibilityReporter;
