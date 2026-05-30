import XCTest

/// Native accessibility audit for the federated Pokédex.
///
/// `XCUIApplication.performAccessibilityAudit()` (iOS 17+) runs Apple's own checks against the
/// REAL rendered accessibility tree: contrast as actually drawn, hit-region size, clipped or
/// truncated text, missing element descriptions, trait conflicts. These are the WCAG criteria the
/// Jest layer deliberately defers to a native audit (1.4.3 as drawn, 1.4.11, 1.4.10 Reflow,
/// 2.5.x hit region), so this is the second layer of the composite, not a duplicate of the unit tests.
///
/// An audit EMITS FINDINGS; it is not a pass/fail gate. The issue handler returns `true` to suppress
/// the default per-issue test failure, so the run always completes and records every finding instead
/// of stopping at the first. Each finding is printed as a structured `A11Y_FINDING|...` line that the
/// host-side report generator (scripts/parse-ios-audit.mjs) turns into accessibility-report markdown,
/// the same honest report the Jest layer feeds. Real violations are expected on a first run; they are
/// tracked, not hidden.
final class AccessibilityAuditUITests: XCTestCase {
  private var app: XCUIApplication!

  override func setUpWithError() throws {
    // Keep auditing every screen even if one assertion fails; we want the full picture per run.
    continueAfterFailure = true
    app = XCUIApplication()
    app.launch()
  }

  /// Tap the first element whose accessible label matches, across every element type. RN exposes
  /// pressables and tabs inconsistently (sometimes `button`, sometimes `other`), so match on label
  /// not type, and fall back to a coordinate tap when the element isn't flagged hittable.
  @discardableResult
  private func tapByLabel(_ label: String, contains: Bool = false, timeout: TimeInterval = 40) -> Bool {
    let fmt = contains ? "label CONTAINS[c] %@" : "label == %@"
    let element = app.descendants(matching: .any).matching(NSPredicate(format: fmt, label)).firstMatch
    guard element.waitForExistence(timeout: timeout) else { return false }
    if element.isHittable {
      element.tap()
    } else {
      element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
    return true
  }

  @available(iOS 17.0, *)
  private func audit(_ screen: String) {
    do {
      try app.performAccessibilityAudit { issue in
        let type = String(describing: issue.auditType)
        let element = issue.element?.label ?? "(no element)"
        // compactDescription is a single line; strip any pipe so our delimiter stays clean.
        let detail = issue.compactDescription.replacingOccurrences(of: "|", with: "/")
        print("A11Y_FINDING|\(screen)|\(type)|\(element)|\(detail)")
        return true // handled: record it, do not fail the test here
      }
      print("A11Y_AUDITED|\(screen)|clean")
    } catch {
      print("A11Y_ERROR|\(screen)|\(error.localizedDescription)")
    }
  }

  func testAccessibilityAuditAcrossScreens() throws {
    guard #available(iOS 17.0, *) else {
      throw XCTSkip("performAccessibilityAudit requires iOS 17 or later")
    }

    // --- Pokédex list (listApp remote). Generous timeout: the remote bundle loads over the wire. ---
    XCTAssertTrue(
      app.staticTexts["Pokédex"].waitForExistence(timeout: 60),
      "Pokédex list did not render; the listApp remote may not have loaded"
    )
    audit("Pokedex list")

    // --- Pokémon detail (detailApp remote): tap the first card by its accessible name. ---
    if tapByLabel("Bulbasaur", contains: true) {
      _ = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "stat")).firstMatch
        .waitForExistence(timeout: 40)
      audit("Pokemon detail")
      // Back: nav-bar button if present, otherwise the iOS edge-swipe gesture.
      if app.navigationBars.buttons.firstMatch.exists {
        app.navigationBars.buttons.firstMatch.tap()
      } else {
        app.swipeRight()
      }
    } else {
      print("A11Y_ERROR|Pokemon detail|first card not found, skipped")
    }

    // --- Party tab (partyApp remote). The tab's accessible label is "Party, tab, 2 of 3"; match the
    // "Party, tab" prefix so it can't collide with the "My Party 6/6" header link. ---
    if tapByLabel("Party, tab", contains: true) {
      _ = app.staticTexts.firstMatch.waitForExistence(timeout: 40)
      audit("Party")
    } else {
      print("A11Y_ERROR|Party|tab not found, skipped")
    }

    // --- Regions tab (regionsApp remote). ---
    if tapByLabel("Regions, tab", contains: true) {
      _ = app.staticTexts.firstMatch.waitForExistence(timeout: 40)
      audit("Regions")
    } else {
      print("A11Y_ERROR|Regions|tab not found, skipped")
    }
  }

  /// Interaction-dependent checks the audit doesn't make: that the live, rendered tree exposes its
  /// controls as named buttons (4.1.2 Name, Role, Value) and that pushing a screen gives it a title
  /// (2.4.2 Page Titled). These ASSERT (fail the build on regression), unlike the audit which only
  /// reports. Keyboard traversal and focus-order-in-practice (2.1.1/2.1.2/2.4.3) are NOT here: React
  /// Native on the iOS simulator does not support full-keyboard-access traversal reliably, so those
  /// stay in the manual VoiceOver/TalkBack pass rather than being faked with a flaky automation.
  func testKeyControlsAreReachableAndLabelled() throws {
    XCTAssertTrue(
      app.staticTexts["Pokédex"].waitForExistence(timeout: 60),
      "Pokédex list did not render"
    )

    // 4.1.2: the grid's cards are buttons with non-empty accessible names.
    let firstCard = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "Bulbasaur")).firstMatch
    XCTAssertTrue(firstCard.waitForExistence(timeout: 20), "no card button found")
    XCTAssertFalse(firstCard.label.isEmpty, "card button has no accessible name")

    // 4.1.2: the bottom tabs are reachable, named buttons.
    for tab in ["Pokédex, tab", "Party, tab", "Regions, tab"] {
      let button = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", tab)).firstMatch
      XCTAssertTrue(button.waitForExistence(timeout: 10), "tab not reachable: \(tab)")
    }

    // 2.4.2: pushing the detail screen exposes a navigation title.
    firstCard.tap()
    XCTAssertTrue(
      app.navigationBars.firstMatch.waitForExistence(timeout: 40),
      "detail screen has no navigation bar / title"
    )
  }
}
