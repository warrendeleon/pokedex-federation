// --- Per-app accessibility-report overrides, read by @pokedex/a11y-testing/reporter. The generic
// WCAG catalogue marks these criteria `automated` because most apps can test them; this app has no
// text inputs and no links, so their honest disposition is "not applicable" rather than an unclosable
// "not yet tested" gap. The criteria stay testable in the package for apps that do have forms. ---
module.exports = {
  projectName: '@pokedex/ui',
  overrides: {
    '1.3.5': { layer: 'n/a', note: 'no text inputs in this app' },
    '3.3.1': { layer: 'n/a', note: 'no text inputs in this app' },
    '3.3.2': { layer: 'n/a', note: 'no text inputs in this app' },
    '2.4.4': { layer: 'n/a', note: 'no links; navigation is native buttons' },
  },
};
