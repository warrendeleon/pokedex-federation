package com.host

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.host.specs.NativeEmbeddedRemotesModuleSpec
import java.io.File

// --- Android offline embed. A gradle task bakes the federated remotes' prod bundles into the APK
// at assets/cdn/android/<remote>/<version>/. APK assets are not real filesystem paths, and the
// ScriptManager's absolute file:// loader needs one, so this extracts assets/cdn into the app's
// files dir (preserving the layout) and returns that dir. The host then builds file:// URLs into it,
// the same way iOS reads from its .app bundle. Extraction is idempotent per app version. ---
class EmbeddedRemotesModule(reactContext: ReactApplicationContext) :
  NativeEmbeddedRemotesModuleSpec(reactContext) {

  // Extract the embedded remotes (once per app version) and resolve with the files dir the host
  // builds absolute file:// URLs against.
  override fun prepare(appVersion: String, promise: Promise) {
    try {
      val filesDir = reactApplicationContext.filesDir
      val cdnDir = File(filesDir, "cdn")
      val marker = File(cdnDir, ".version")
      if (!(marker.exists() && marker.readText() == appVersion)) {
        cdnDir.deleteRecursively()
        copyAsset("cdn", filesDir)
        marker.parentFile?.mkdirs()
        marker.writeText(appVersion)
      }
      promise.resolve(filesDir.absolutePath)
    } catch (e: Exception) {
      promise.reject("EMBED_EXTRACT_FAILED", e.message, e)
    }
  }

  // Recursively copy an asset path (relative to the assets root, e.g. "cdn") into destParent,
  // preserving names so the result lands at destParent/<assetPath>. Files are copied BYTE-FOR-BYTE:
  // the bundles are code-signed (SHA-256 over the bytes), so any rewrite would fail verification.
  // AssetManager.list returns child entries for a directory and an empty array for a file.
  private fun copyAsset(assetPath: String, destParent: File) {
    val assets = reactApplicationContext.assets
    val children = assets.list(assetPath) ?: emptyArray()
    val dest = File(destParent, assetPath)
    if (children.isEmpty()) {
      dest.parentFile?.mkdirs()
      assets.open(assetPath).use { input ->
        dest.outputStream().use { output -> input.copyTo(output) }
      }
    } else {
      dest.mkdirs()
      for (child in children) copyAsset("$assetPath/$child", destParent)
    }
  }
}
