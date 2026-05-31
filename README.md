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

Prerequisites: Node 18+, Xcode with an iOS simulator, Ruby + Bundler, CocoaPods. Verdaccio is installed for you by the install script.

### 1. Install

```sh
./scripts/install-all.sh
```

Starts a repo-local Verdaccio registry, publishes the `@pokedex/*` packages into it, installs every app, and runs `pod install` for the host. Re-runnable. Pass `SKIP_PODS=1` to skip the iOS pods if you only need the JS side.

### 2. Run in dev mode

Start the host packager and each remote's dev server (background them, or use one terminal each):

```sh
cd apps/host    && npm start              # host packager, :8081
cd apps/list    && npm run start:remote   # :8082
cd apps/party   && npm run start:remote   # :8083
cd apps/regions && npm run start:remote   # :8084
cd apps/detail  && npm run start:remote   # :8085
```

Then build and launch the host on a simulator:

```sh
cd apps/host && npm run ios
```

Each tab is a separate app, loaded at runtime from its dev server. The on-screen banner reads `MF: dev`.

### 3. Production demo (CDN load, code signing, offline fallback)

The production path code-signs each remote and serves them from a CDN, with an embedded offline copy as fallback. The signing private keys are gitignored, so generate your own first; the script embeds the public halves for you:

```sh
node tools/gen-signing-keys.mjs                                # generate + embed the keypairs
MF_CDN_BASE=http://localhost:8000 ./scripts/build-prod-ios.sh  # prod bundles + signed CDN
npm run serve:cdn &                                            # serve the CDN on :8000
cd apps/host && npm run ios
```

Tap the simulator: the banner shows `MF: CDN (live)` in green. Kill the CDN server and relaunch, and it flips amber to `MF: BUNDLED (offline fallback)`.

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
