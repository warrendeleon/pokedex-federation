// --- Public surface: the WCAG assertion helpers + the NativeWind-aware render. The Jest preset,
// reporter, and WCAG catalogue are separate subpath exports (./jest-preset, ./reporter,
// ./wcag-criteria) because they're consumed by config/tooling, not imported into test bodies. ---
export * from './accessibility';
export * from './render';
