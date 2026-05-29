import Foundation
import UIKit
import SwiftUI

// --- The native half of the strategy proof: a fully native screen (SwiftUI), reachable from a
// React Native micro-app through the shell's routing table, that takes input from RN, returns a
// result to RN, and reads RN store state mirrored over the bridge. No React renders here; this
// is real UIKit/SwiftUI presented by a TurboModule. ---

// MARK: - Native store mirror

/// Written by StoreObserverModule on every RN dispatch, read by the native battle UI. Proves the
/// unidirectional RN -> Native state mirror: native sees live cross-cutting state (party size,
/// last battle winner) with no React render. Native observes; it never mutates the RN store.
@objc public class NativeStore: NSObject {
  @objc public static let shared = NativeStore()

  // apply() runs on the JS thread (updateState is a synchronous TurboModule method); the getters
  // are read from the main thread (SwiftUI). A lock keeps the cross-thread access race-free, which
  // a plain stored property would not (and which Swift strict concurrency would reject).
  private let lock = NSLock()
  private var _partySize = 0
  private var _lastBattleWinnerId = -1

  @objc public var partySize: Int { lock.withLock { _partySize } }
  @objc public var lastBattleWinnerId: Int { lock.withLock { _lastBattleWinnerId } }

  /// Called from StoreObserverModule with a bridge envelope (dataKey + JSON payload string).
  @objc public func apply(dataKey: String, payloadJson: String) {
    guard let data = payloadJson.data(using: .utf8),
          let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return }
    let payload = envelope["payload"]
    switch dataKey {
    case "party.size":
      lock.withLock { _partySize = (payload as? Int) ?? 0 }
    case "party.lastBattleWinnerId":
      lock.withLock { _lastBattleWinnerId = (payload as? Int) ?? -1 }
    default:
      break
    }
  }
}

// MARK: - Native -> RN navigation bridge

/// The inverse of openNative. ShellNavigationModule sets `requestHandler` to its generated
/// emitOnShellNavigate event; a native screen calls `requestNavigate` to ask the SHELL ROUTER to
/// open any destination, an RN screen or another native flow, without knowing or caring which. So
/// native drives React Navigation the same way a micro-app does, through the one routing table.
/// Singleton for the same reason as NativeStore: the SwiftUI screen and the ObjC++ module are
/// created independently and meet here.
@objc public class ShellEventBridge: NSObject {
  @objc public static let shared = ShellEventBridge()

  /// Set by ShellNavigationModule. Receives (destination, paramsJson) and emits the event to JS.
  @objc public var requestHandler: ((String, String) -> Void)?

  /// Called by native screens. Asks the shell to navigate; paramsJson carries the route params,
  /// the same JSON-string boundary openNative uses in the other direction.
  @objc public func requestNavigate(destination: String, paramsJson: String) {
    requestHandler?(destination, paramsJson)
  }

  // MARK: Deep / universal links

  /// Set by ShellNavigationModule. Emits a deep-link URL to JS (the warm path).
  @objc public var deepLinkHandler: ((String) -> Void)?

  /// The URL that launched the app, held until JS drains it via consumeInitialDeepLink. Only used
  /// on cold start, when AppDelegate receives the link before the JS handler is attached. Written
  /// from the main thread (AppDelegate) and drained from a background TurboModule queue, so it's
  /// guarded by a lock.
  private let lock = NSLock()
  private var pendingDeepLink: String?

  /// Called by AppDelegate for every inbound URL (custom scheme or universal link). If JS is
  /// already listening, push it straight through; otherwise buffer it for the cold-start drain.
  @objc public func handleDeepLink(url: String) {
    if let handler = deepLinkHandler {
      handler(url)
    } else {
      lock.withLock { pendingDeepLink = url }
    }
  }

  /// Drained once by JS on startup. Returns the buffered launch URL (empty string if none) and
  /// clears it, so a cold-start link routes exactly once.
  @objc public func consumeInitialDeepLink() -> String {
    lock.withLock {
      let url = pendingDeepLink ?? ""
      pendingDeepLink = nil
      return url
    }
  }
}

// MARK: - Presenter (ObjC++ TurboModule -> SwiftUI bridge)

private struct Contestant: Identifiable {
  let id: Int
  let name: String
}

/// Entry point the ShellNavigationModule TurboModule calls. Decodes the party out of the params
/// the shell handed over (RN -> Native input), presents the SwiftUI battle, and calls completion
/// with a JSON result string (native -> RN output) that the shell parses back into the store.
@objc public class QuickBattlePresenter: NSObject {
  // Re-entrancy guard. UIKit's present() silently no-ops if the host is already presenting or
  // mid-transition; if that happened, completion would never fire and the openNative promise on
  // the JS side would hang forever. Refuse a second presentation while one is up, settling the
  // promise immediately instead. Main-thread only, so no lock needed.
  private static var isPresenting = false

  @objc public static func present(
    nativeId: String,
    paramsJson: String,
    completion: @escaping (String) -> Void
  ) {
    let contestants = Self.decodeParty(paramsJson)

    // openNative is invoked on the TurboModule's background thread; all UIKit/SwiftUI work
    // (presenting, dismissing) must hop to the main thread or UIKit raises.
    DispatchQueue.main.async {
      guard let host = Self.topViewController(), !isPresenting else {
        // No host, or a presentation is already in flight: settle the promise rather than wedge it.
        completion("{}")
        return
      }
      isPresenting = true

      let view = QuickBattleView(
        contestants: contestants,
        observedPartySize: NativeStore.shared.partySize
      ) { resultJson in
        host.dismiss(animated: true) {
          isPresenting = false
          completion(resultJson)
        }
      }

      let controller = UIHostingController(rootView: view)
      controller.modalPresentationStyle = .pageSheet
      // Force exit through the Done button so the openNative promise always resolves; an
      // interactive swipe-to-dismiss would otherwise leave the JS promise pending forever.
      controller.isModalInPresentation = true
      host.present(controller, animated: true)
    }
  }

  private static func decodeParty(_ paramsJson: String) -> [Contestant] {
    guard let data = paramsJson.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let party = obj["party"] as? [[String: Any]]
    else { return [] }
    return party.compactMap { entry in
      guard let id = entry["id"] as? Int else { return nil }
      return Contestant(id: id, name: (entry["name"] as? String) ?? "#\(id)")
    }
  }

  private static func topViewController() -> UIViewController? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
    var top = windows.first { $0.isKeyWindow }?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}

// MARK: - SwiftUI battle screen

private struct QuickBattleView: View {
  let contestants: [Contestant]
  let observedPartySize: Int
  let onDone: (String) -> Void

  @State private var winnerId: Int?
  @State private var ko = false

  var body: some View {
    // NavigationStack so the battle can push a second NATIVE screen (the result) in native land.
    NavigationStack {
      VStack(spacing: 20) {
        Text("Native screen · store observer sees \(observedPartySize) in your party")
          .font(.footnote)
          .foregroundColor(.secondary)
          .multilineTextAlignment(.center)

        if contestants.isEmpty {
          Spacer()
          Text("Your party is empty.\nAdd some Pokémon, then battle.")
            .multilineTextAlignment(.center)
            .foregroundColor(.secondary)
          Spacer()
        } else {
          VStack(spacing: 10) {
            ForEach(contestants) { c in
              HStack {
                Text(c.name).font(.title3)
                Spacer()
                if winnerId == c.id { Text("🏆") }
              }
            }
          }
          .padding(.vertical, 8)

          if let id = winnerId, let w = contestants.first(where: { $0.id == id }) {
            Text("\(w.name) wins\(ko ? " by KO!" : "!")").font(.title2).bold()
          }

          Button(winnerId == nil ? "Battle!" : "Battle again") {
            let pick = contestants.randomElement()
            winnerId = pick?.id
            ko = (pick?.id ?? 0) % 2 == 0
          }
          .buttonStyle(.borderedProminent)
          .controlSize(.large)

          if let id = winnerId, let w = contestants.first(where: { $0.id == id }) {
            // Native -> Native: push a second fully-native screen via SwiftUI NavigationStack. No
            // React renders here and the shell isn't involved; this is a native flow moving between
            // two native screens, with the system back button to return.
            NavigationLink {
              BattleResultView(
                winnerName: w.name,
                leftName: contestants.first?.name ?? w.name,
                rightName: contestants.last?.name ?? w.name,
                ko: ko,
                onDone: finish
              )
            } label: {
              Text("See full result")
            }
            .controlSize(.large)

            // Native -> RN: ask the shell router to open the RN detail for the winner, then dismiss
            // this flow so the RN screen it pushed underneath is revealed. Native chose an RN
            // destination without touching React Navigation directly.
            Button("View \(w.name) in Pokédex") {
              ShellEventBridge.shared.requestNavigate(
                destination: "PokemonDetail",
                paramsJson: "{\"id\": \(id)}"
              )
              finish()
            }
            .controlSize(.large)
          }
        }

        Button("Done", action: finish).padding(.top, 8)
      }
      .padding(32)
      .navigationTitle("Quick Battle")
      .navigationBarTitleDisplayMode(.inline)
    }
  }

  private func finish() {
    guard let winnerId,
          let left = contestants.first,
          let right = contestants.last
    else {
      onDone("{}")
      return
    }
    let payload: [String: Any] = [
      "winnerId": winnerId,
      "leftId": left.id,
      "rightId": right.id,
      "ko": ko,
    ]
    let json = (try? JSONSerialization.data(withJSONObject: payload))
      .flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
    onDone(json)
  }
}

// MARK: - Second native screen (Native -> Native)

/// The battle result, pushed onto the QuickBattle NavigationStack. A fully native screen reached
/// from another native screen, with the system back button to return; React Navigation and the
/// shell play no part. Its Done finishes the whole native flow (dismiss + resolve openNative).
private struct BattleResultView: View {
  let winnerName: String
  let leftName: String
  let rightName: String
  let ko: Bool
  let onDone: () -> Void

  var body: some View {
    VStack(spacing: 16) {
      Text("\(leftName)  vs  \(rightName)")
        .font(.headline)
        .foregroundColor(.secondary)

      Text("🏆").font(.system(size: 64))
      Text(winnerName).font(.largeTitle).bold()
      Text(ko ? "Winner by KO!" : "Winner!").font(.title3).foregroundColor(.secondary)

      Spacer()

      Button("Done", action: onDone)
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
    }
    .padding(32)
    .navigationTitle("Result")
    .navigationBarTitleDisplayMode(.inline)
  }
}
