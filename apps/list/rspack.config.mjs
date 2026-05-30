import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { getMFShared } from '../../mf-shared.mjs';
import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Version baked into the bundle (and the cdn/<platform>/<remote>/<version>/ output path)
// from MF_REMOTE_VERSION. Defaults to 0.0.1; the operational layer drives multi-version builds.
const REMOTE_VERSION = process.env.MF_REMOTE_VERSION || '0.0.1';

// --- listApp: the Pokédex grid micro-app. A JS-only federated remote — no native project; it
// loads into the host's runtime. Exposes ./ListStack (a navigation stack with the grid +
// federation-boundary-safe screens). Shared deps are lazy (eager:false) so the remote consumes
// the host's singleton instances rather than bundling its own. ---
export default Repack.defineRspackConfig(env => {
  const { mode, platform } = env;

  return {
    mode,
    context: __dirname,
    entry: './src/index.js',
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      // Output structure mirrors the CDN URL layout cdn/<platform>/<remote>/<version>/.
      path: `[context]/cdn/[platform]/listApp/${REMOTE_VERSION}`,
      uniqueName: 'PokedexListApp',
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
        ...Repack.getAssetTransformRules({ inline: true }),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `cdn/${platform}/listApp/${REMOTE_VERSION}`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'listApp',
        filename: 'listApp.container.js.bundle',
        exposes: {
          './ListStack': './src/ListStack.tsx',
        },
        dts: false,
        shared: getMFShared('remote', pkg),
      }),
      new NativeWindPlugin(),
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
      new rspack.DefinePlugin({
        __REMOTE_VERSION__: JSON.stringify(REMOTE_VERSION),
      }),
    ],
  };
});
