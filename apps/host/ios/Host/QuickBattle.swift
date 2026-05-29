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
  @objc public private(set) var partySize: Int = 0
  @objc public private(set) var lastBattleWinnerId: Int = -1

  /// Called from StoreObserverModule with a bridge envelope (dataKey + JSON payload string).
  @objc public func apply(dataKey: String, payloadJson: String) {
    guard let data = payloadJson.data(using: .utf8),
          let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return }
    let payload = envelope["payload"]
    switch dataKey {
    case "party.size":
      partySize = (payload as? Int) ?? 0
    case "party.lastBattleWinnerId":
      lastBattleWinnerId = (payload as? Int) ?? -1
    default:
      break
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
  @objc public static func present(
    nativeId: String,
    paramsJson: String,
    completion: @escaping (String) -> Void
  ) {
    let contestants = Self.decodeParty(paramsJson)

    // openNative is invoked on the TurboModule's background thread; all UIKit/SwiftUI work
    // (presenting, dismissing) must hop to the main thread or UIKit raises.
    DispatchQueue.main.async {
      guard let host = Self.topViewController() else {
        completion("{}")
        return
      }

      let view = QuickBattleView(
        contestants: contestants,
        observedPartySize: NativeStore.shared.partySize
      ) { resultJson in
        host.dismiss(animated: true) { completion(resultJson) }
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
    VStack(spacing: 20) {
      Text("Quick Battle").font(.largeTitle).bold()
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
      }

      Button("Done", action: finish).padding(.top, 8)
    }
    .padding(32)
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
