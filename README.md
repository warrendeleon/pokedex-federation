# Pokédex Federation

> A federated micro-app Pokédex built to demonstrate three coupled architectural patterns end-to-end on React Native: **Module Federation V2** (Re.Pack 5), an **RN-owned shell + navigation**, and a **Redux Toolkit single-foundation store**. Plus the operational layer the strategy demands: per-launch version resolution, embedded offline fallback, health-driven auto-rollback, a `shell.navigateTo` routing surface mediating between federated remotes and native flows, and bidirectional native handoff with promise return.

## What this proves

```
┌──────────────────────────────────────────────────────────────┐
│ App Store Binary (host)                                      │
│  • React Native runtime + native bridges                     │
│  • Tab bar + NavigationContainer (the shell)                 │
│  • ScriptManager (resolver + fallback plugin)                │
│  • Embedded fallback copies of every remote                  │
└─────────────┬────────────────────────────────────────────────┘
              │ at boot, fetch:
              ▼
        /version-map.json
              │ per remote:
              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ listApp  │ │ partyApp │ │regionsApp│ │detailApp │
│ (Pokédex │ │ (six     │ │ (Kanto,  │ │ (cross-  │
│  grid)   │ │  slots)  │ │  Johto…) │ │  cutting)│
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Plus native flows reached via shell.navigateTo:
  • QuickBattle (native UIViewController, returns winnerId)
  • ShareTeam (native image composition + system share sheet)
```

Eight capabilities, all verified end-to-end:

| Capability | What proves it |
|---|---|
| Module Federation V2 on RN | Three federated tabs + one cross-cutting screen load from CDN at runtime |
| RN-owned shell + navigation | Single `AppRegistry` entry; host's `Tab.Navigator` orchestrates federated tabs |
| RTK + RTK Query single store | Federated remotes share one store; cross-module dispatch via contracts strings |
| Per-launch version resolution | `cdn/version-map.json` fetched at boot; flip live users between releases |
| Live two-version flip | Edit map from v1 → v2, relaunch, see the change |
| Offline-ready bundled fallback | Embedded copy loads when CDN unreachable; banner reflects mode |
| Health monitoring + auto-rollback | Two consecutive failures of a version → next launch rolls back silently |
| `shell.navigateTo` (RN ↔ native) | Routing table mediates between federated screens and native VCs; bidirectional with promise return |

## Layout

```
pokedex-federation/
├── apps/
│   ├── host/             RN binary (App Store-shipped shell)
│   ├── list/             listApp federated remote (Pokédex grid)
│   ├── party/            partyApp federated remote (party manager)
│   ├── regions/          regionsApp federated remote (region browser)
│   └── detail/           detailApp federated remote (cross-cutting)
├── packages/
│   ├── contracts/        @pokedex/contracts — routeRegistry, MF shared decl, action strings
│   └── ui/               @pokedex/ui — Gluestack-wrapped design system
├── cdn/                  built remote bundles + version-map.json (gitignored except version-map)
├── scripts/              build pipeline (build-prod-ios.sh, embed-remotes-ios.sh, etc.)
└── docs/                 capability + getting-started + release docs (with Mermaid diagrams)
```

## Quick start

```sh
# Prerequisites: Node 18+, Xcode, CocoaPods, Bundler, Verdaccio (npm i -g verdaccio)

# 1. start the local npm registry (for @pokedex/* packages)
verdaccio &

# 2. install host + every workspace, build the local packages
./scripts/install-all.sh

# 3. dev mode (host + per-remote dev servers)
cd apps/host && npm start                # :8081
cd apps/list && npm run start:remote     # :8082
cd apps/party && npm run start:remote    # :8083
cd apps/regions && npm run start:remote  # :8084
cd apps/detail && npm run start:remote   # :8085
cd apps/host && npm run ios              # build + launch on iOS sim

# 4. prod demo (CDN load + bundled fallback + live version flip)
MF_CDN_BASE=http://localhost:8000 ./scripts/build-prod-ios.sh
npm run serve:cdn &
cd apps/host && npm run ios
# tap the simulator; banner shows "MF: CDN (live)" green
# kill the CDN, simctl terminate + launch, banner flips amber "MF: BUNDLED (offline fallback)"
```

## Stack

| Layer | Choice | Why |
|---|---|---|
| Native | React Native 0.85.3 | Latest stable; Re.Pack 5 declares peer-dep `>= 0.74` |
| Bundler | Re.Pack 5.2.5 + Rspack 2.0.5 | Module Federation V2 support; ~5× faster than Metro |
| Federation | `@module-federation/enhanced` + `runtime` 2.5.0 | V2 plugin; runtime composition |
| Navigation | React Navigation v7 | Latest; integrates cleanly with `react-native-screens` |
| State | Redux Toolkit 2.12 + RTK Query | Single foundation; `injectEndpoints` + `combineSlices.inject` are federation-shaped |
| Persistence | redux-persist + AsyncStorage | Whitelisted slices survive kill + restart |
| Design system | Gluestack-UI v2 + NativeWind + Tailwind | Modern; wrapped in `@pokedex/ui` workspace package |
| Local registry | Verdaccio 6.7.2 | Real `npm publish` + version pinning without a public registry; supports SemVer skew testing |

## Documentation

- `docs/overview.md` — strategy ↔ code mapping
- `docs/architecture.md` — three-box model (host / contracts / remotes)
- `docs/module-federation.md` — federation mechanics, version resolution, fallback, health, routing
- `docs/release-guide.md` — operational flow, rollback layers, CI examples

## Status

Pre-alpha. Building in the open.
