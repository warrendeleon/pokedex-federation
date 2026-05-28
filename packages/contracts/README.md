# `@pokedex/contracts`

> The stable cross-boundary contract bundled into both the host and every federated remote. Holds the route registry, cross-module action strings, native-bridge keys + envelope shape, and the MF singleton name list.

## What lives here

| File | Owns |
|---|---|
| `modules.ts` | Module ID constants (`list`, `party`, `regions`, `detail`) |
| `actions.ts` | Cross-module Redux action type strings (`CROSS_MODULE_ACTIONS`) |
| `bridgeKeys.ts` | Stable native-bridge data keys (`BRIDGE_KEYS`) |
| `bridgeEnvelope.ts` | `BridgeEnvelope` shape + `BRIDGE_QUERY_BINDINGS` (RTK Query endpoint → bridge key) |
| `shellNavigation.ts` | `ROUTE_REGISTRY` + `shellNavigate` function + `registerShellNavigateHandler` |
| `mfShared.ts` | List of MF singleton package names (TS source of truth; `apps/host/mf-shared.mjs` is the JS counterpart consumed by rspack) |

## Why globalThis (and not React Context) for the shell-navigate bridge

This package is bundled into both the host and every federated remote. Anything defined here that has object identity (Context refs, class instances, mutable singletons) will compile into distinct instances in each bundle. A React Context created in this file would have a different ref in the host's copy than in any remote's copy — `useContext` would return undefined or wrong values.

`globalThis` is a single shared runtime slot. The host registers its `shellNavigate` handler under `globalThis.__POKEDEX_SHELL_NAVIGATE__` at boot; remotes call `shellNavigate(...)` which reads from that slot. One bridge, no identity mismatches.

## Publish workflow

```bash
# from this directory:
npm version patch   # 0.1.0 -> 0.1.1
npm publish         # uploads to local Verdaccio at :4873
```

Consumers (apps/host + every apps/<remote>) install with `npm install @pokedex/contracts@<version>` and the root `.npmrc` routes the install through the local registry.
