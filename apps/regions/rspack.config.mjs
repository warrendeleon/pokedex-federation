import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import {NativeWindPlugin} from '@callstack/repack-plugin-nativewind';
import {getMFShared} from '../../mf-shared.mjs';
import pkg from './package.json' with {type: 'json'};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Version baked into the bundle (and the cdn/<platform>/<remote>/<version>/ output path)
// from MF_REMOTE_VERSION. Defaults to 0.0.1; the operational layer drives multi-version builds.
const REMOTE_VERSION = process.env.MF_REMOTE_VERSION || '0.0.1';

// --- regionsApp: federated remote micro-app. A JS-only remote with no native project; it loads
// into the host's runtime. Exposes ./RegionsStack (browse the regions; tapping a region's
// featured Pokémon routes to detailApp). Shared deps are lazy (eager:false) so the remote
// consumes the host's singleton instances rather than bundling its own. ---
export default Repack.defineRspackConfig(env => {
  const {mode, platform} = env;

  return {
    mode,
    context: __dirname,
    entry: './src/index.js',
    resolve: {
      ...Repack.getResolveOptions({enablePackageExports: true}),
    },
    output: {
      // Output structure mirrors the CDN URL layout cdn/<platform>/<remote>/<version>/.
      path: `[context]/cdn/[platform]/regionsApp/${REMOTE_VERSION}`,
      uniqueName: 'PokedexRegionsApp',
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
        ...Repack.getAssetTransformRules({inline: true}),
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `cdn/${platform}/regionsApp/${REMOTE_VERSION}`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'regionsApp',
        filename: 'regionsApp.container.js.bundle',
        exposes: {
          './RegionsStack': './src/RegionsStack.tsx',
        },
        dts: false,
        shared: getMFShared('remote', pkg),
      }),
      new NativeWindPlugin(),
      new rspack.IgnorePlugin({resourceRegExp: /^@react-native-masked-view/}),
      new rspack.DefinePlugin({
        __REMOTE_VERSION__: JSON.stringify(REMOTE_VERSION),
      }),
    ],
  };
});
