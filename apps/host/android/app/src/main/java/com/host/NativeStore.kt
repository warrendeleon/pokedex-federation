package com.host

import org.json.JSONObject

// --- Native store mirror. Written by StoreObserverModule on every RN dispatch, read by the native
// battle screen, so native sees live cross-cutting state (party size, last battle winner) with no
// React render. Observation only; native never mutates the RN store. Mirrors the iOS NativeStore. ---
object NativeStore {
  // apply() runs on the JS thread (updateState is a synchronous TurboModule method); the getters are
  // read from the main thread (Compose). Synchronise so the cross-thread access is race-free.
  private val lock = Any()
  private var partySizeBacking = 0
  private var lastBattleWinnerIdBacking = -1

  val partySize: Int
    get() = synchronized(lock) { partySizeBacking }

  val lastBattleWinnerId: Int
    get() = synchronized(lock) { lastBattleWinnerIdBacking }

  // Bridge envelope: { ..., payload: X }. dataKey selects which field the payload updates.
  fun apply(dataKey: String, payloadJson: String) {
    val payload =
      try {
        JSONObject(payloadJson).opt("payload")
      } catch (e: Exception) {
        return
      }
    when (dataKey) {
      "party.size" -> synchronized(lock) { partySizeBacking = (payload as? Number)?.toInt() ?: 0 }
      "party.lastBattleWinnerId" ->
        synchronized(lock) { lastBattleWinnerIdBacking = (payload as? Number)?.toInt() ?: -1 }
    }
  }
}
