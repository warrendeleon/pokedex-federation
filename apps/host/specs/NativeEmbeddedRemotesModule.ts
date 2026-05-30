import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// --- Android offline embed. The federated remotes' prod bundles are baked into the APK assets by a
// gradle task. APK assets are not real filesystem paths, and the ScriptManager's absolute file://
// loader needs one, so this module extracts assets/cdn into the app's files dir (preserving the
// <remote>/<version>/ layout) and returns that dir. The host then builds absolute file:// URLs into
// it, exactly as iOS does against the .app bundle. Extraction is idempotent per app version.
//
// Android only: iOS reads the embedded bundles straight from its .app directory, so it never needs
// this. Resolved with TurboModuleRegistry.get (not getEnforcing) so iOS, where no impl is
// registered, gets null and simply never calls it. ---
export interface Spec extends TurboModule {
  /** Extract the embedded remotes for `appVersion` (idempotent) and return the cdn root dir. */
  prepare(appVersion: string): Promise<string>;
}

export default TurboModuleRegistry.get<Spec>('EmbeddedRemotesModule');
