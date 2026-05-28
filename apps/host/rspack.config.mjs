import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import {NativeWindPlugin} from '@callstack/repack-plugin-nativewind';
import {getMFShared} from '../../mf-shared.mjs';
import pkg from './package.json' with {type: 'json'};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DEV uses per-remote dev servers on 8082/8083/8084/8085. PROD points at the CDN manifest
// URLs. Both shapes are name@url so Re.Pack's MF V2 plugin can consume them; the runtime
// version-resolution probe (scriptManager.ts) re-registers them with versioned paths at boot. ---
const DEV_REMOTES = {
  listApp:    'http://localhost:8082',
  partyApp:   'http://localhost:8083',
  regionsApp: 'http://localhost:8084',
  detailApp:  'http://localhost:8085',
};

// --- Production CDN base, injected via DefinePlugin so scriptManager.ts and the manifest URLs
// share one source of truth. Override at build time:
//   MF_CDN_BASE=http://localhost:8000 npm run bundle:ios:prod        (local demo)
//   MF_CDN_BASE=https://cdn.example.com/mf npm run bundle:ios:prod   (real CDN) ---
const PROD_CDN_BASE = process.env.MF_CDN_BASE || 'https://cdn.example.com/mf';

// --- Function-style config so env.platform and env.mode are available. Mirrors
// @callstack/repack's tester-federation-v2 host-app pattern. ---
export default Repack.defineRspackConfig(env => {
  const {mode, platform} = env;
  const isProd = mode === 'production';

  const remoteUrl = name =>
    isProd
      ? `${name}@${PROD_CDN_BASE}/${platform}/${name}/mf-manifest.json`
      : `${name}@${DEV_REMOTES[name]}/${platform}/mf-manifest.json`;

  return {
    mode,
    context: __dirname,
    entry: './index.js',
    resolve: {
      ...Repack.getResolveOptions({enablePackageExports: true}),
    },
    output: {
      path: '[context]/build/host/[platform]',
      uniqueName: 'PokedexHost',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          type: 'javascript/auto',
          use: {
            loader: '@callstack/repack/babel-swc-loader',
            parallel: true,
            options: {},
          },
        },
        ...Repack.getAssetTransformRules({inline: true, maxInlineSize: 90 * 1024}),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/host/${platform}/output-remote`,
          },
        ],
      }),
      // --- V2 ModuleFederation. Remote URLs above point at dev servers or CDN; the
      // version-resolution probe at runtime re-registers them with versioned paths once the
      // version-map is fetched. ---
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'host',
        filename: 'host.container.js.bundle',
        dts: false,
        remotes: {
          listApp:    remoteUrl('listApp'),
          partyApp:   remoteUrl('partyApp'),
          regionsApp: remoteUrl('regionsApp'),
          detailApp:  remoteUrl('detailApp'),
        },
        shared: getMFShared('host', pkg),
      }),
      // --- Inject the build-time CDN base into the JS bundle so scriptManager.ts's resolver
      // uses the same URL the MF V2 manifest URLs reference. ---
      new rspack.DefinePlugin({
        __MF_CDN_BASE__: JSON.stringify(PROD_CDN_BASE),
      }),
      // --- NativeWind: configures PostCSS + Tailwind processing of global.css and the
      // SWC transforms for nativewind's JSX runtime. Official Re.Pack integration; no
      // hand-rolled postcss-loader wiring. ---
      new NativeWindPlugin(),
      // --- @react-navigation/elements optionally requires masked-view (only for masked
      // headers, which we don't use). Ignore it to keep the build warning-free. ---
      new rspack.IgnorePlugin({resourceRegExp: /^@react-native-masked-view/}),
    ],
  };
});
