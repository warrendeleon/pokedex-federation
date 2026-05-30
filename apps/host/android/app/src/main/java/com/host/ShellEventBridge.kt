package com.host

// --- Native -> RN navigation bridge + deep-link buffer. The singleton meeting point for the native
// screens and the ShellNavigationModule TurboModule, which are created independently. A native screen
// asks the shell router to open ANY destination (RN or native) through requestNavigate, the same way
// a micro-app does; deep links arriving natively are pushed to JS or buffered for the cold-start
// drain. Mirrors the iOS ShellEventBridge. ---
object ShellEventBridge {
  // Set by ShellNavigationModule: (destination, paramsJson) -> emits onShellNavigate to JS.
  @Volatile var requestHandler: ((String, String) -> Unit)? = null

  // Set by ShellNavigationModule: url -> emits onDeepLink to JS (the warm path).
  @Volatile var deepLinkHandler: ((String) -> Unit)? = null

  private val lock = Any()
  private var pendingDeepLink: String? = null

  // Called by native screens to ask the shell router to open any destination, RN or native.
  fun requestNavigate(destination: String, paramsJson: String) {
    requestHandler?.invoke(destination, paramsJson)
  }

  // Called by MainActivity for every inbound URL. Push to JS if it's listening, otherwise buffer it
  // for the cold-start drain (the link launched the app before JS attached its handler).
  fun handleDeepLink(url: String) {
    val handler = deepLinkHandler
    if (handler != null) {
      handler(url)
    } else {
      synchronized(lock) { pendingDeepLink = url }
    }
  }

  // Drained once by JS on startup: returns the buffered launch URL (empty if none) and clears it, so
  // a cold-start link routes exactly once.
  fun consumeInitialDeepLink(): String =
    synchronized(lock) {
      val url = pendingDeepLink ?: ""
      pendingDeepLink = null
      url
    }
}
