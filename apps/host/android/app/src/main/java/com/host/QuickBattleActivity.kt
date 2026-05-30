package com.host

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject

// --- The native half of the strategy proof on Android: a fully native screen (Jetpack Compose),
// reachable from a React Native micro-app through the shell's routing table, that takes input from RN,
// returns a result to RN, and reads RN store state mirrored over the bridge. No React renders here;
// this is real Compose presented by a TurboModule. The SwiftUI counterpart is ios/Host/QuickBattle.swift.
//
// Launched with startActivityForResult by ShellNavigationModule; every exit path (Done, "View in
// Pokédex", system back) calls deliverResult so the openNative promise always resolves exactly once. ---
class QuickBattleActivity : ComponentActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val contestants = decodeParty(intent.getStringExtra(EXTRA_PARAMS_JSON) ?: "{}")
    val observedPartySize = intent.getIntExtra(EXTRA_OBSERVED_PARTY_SIZE, 0)
    setContent {
      QuickBattleScreen(
        contestants = contestants,
        observedPartySize = observedPartySize,
        onFinish = ::deliverResult,
      )
    }
  }

  // Resolve the openNative promise with the battle result and close the flow. Setting RESULT_OK with
  // the JSON extra is what ShellNavigationModule's ActivityEventListener reads.
  private fun deliverResult(resultJson: String) {
    setResult(Activity.RESULT_OK, Intent().putExtra(EXTRA_RESULT_JSON, resultJson))
    finish()
  }

  companion object {
    const val EXTRA_PARAMS_JSON = "paramsJson"
    const val EXTRA_OBSERVED_PARTY_SIZE = "observedPartySize"
    const val EXTRA_RESULT_JSON = "resultJson"
  }
}

// --- Model + battle logic (mirrors the Swift Contestant / pickWinner) ---

private data class Contestant(val id: Int, val name: String, val power: Int)

private fun decodeParty(paramsJson: String): List<Contestant> {
  val party =
    try {
      JSONObject(paramsJson).optJSONArray("party")
    } catch (e: Exception) {
      null
    } ?: return emptyList()
  return (0 until party.length()).mapNotNull { i ->
    val entry = party.optJSONObject(i) ?: return@mapNotNull null
    if (!entry.has("id")) return@mapNotNull null
    val id = entry.optInt("id")
    Contestant(id = id, name = entry.optString("name", "#$id"), power = entry.optInt("power", 0))
  }
}

// Weighted random by power: a stronger Pokémon is likelier to win, but upsets stay possible so
// "Battle again" is worth tapping. A missing/zero power gets a floor of 1 so it can still win.
private fun pickWinner(contestants: List<Contestant>): Contestant? {
  if (contestants.isEmpty()) return null
  val weights = contestants.map { maxOf(it.power, 1) }
  var roll = (0 until weights.sum()).random()
  for ((index, c) in contestants.withIndex()) {
    if (roll < weights[index]) return c
    roll -= weights[index]
  }
  return contestants.last()
}

private fun resultJson(winnerId: Int, leftId: Int, rightId: Int, ko: Boolean): String =
  JSONObject()
    .apply {
      put("winnerId", winnerId)
      put("leftId", leftId)
      put("rightId", rightId)
      put("ko", ko)
    }
    .toString()

// --- Design tokens (native mirror of packages/ui/src/tokens/colours.ts, as the SwiftUI Theme does) ---

private object Theme {
  val navy = Color(0xFF0F172A)
  val blue = Color(0xFF3A86FF)
  val purple = Color(0xFF8338EC)
  val midGrey = Color(0xFF9A9AB0)
  val black = Color(0xFF2E3138)
  val pokemonGreen = Color(0xFF9BE89B)
  val white = Color(0xFFFFFFFF)
}

// --- Composables ---

@Composable
private fun QuickBattleScreen(
  contestants: List<Contestant>,
  observedPartySize: Int,
  onFinish: (String) -> Unit,
) {
  var winnerId by remember { mutableStateOf<Int?>(null) }
  var ko by remember { mutableStateOf(false) }
  var showResult by remember { mutableStateOf(false) }

  // Result payload resolved when the flow finishes (battle outcome, or "{}" before any battle).
  fun finishPayload(): String {
    val id = winnerId ?: return "{}"
    val left = contestants.firstOrNull() ?: return "{}"
    val right = contestants.lastOrNull() ?: return "{}"
    return resultJson(id, left.id, right.id, ko)
  }

  if (showResult && winnerId != null) {
    // Native -> Native: a second fully-native screen, the system back returns to the battle.
    BackHandler { showResult = false }
    val winner = contestants.first { it.id == winnerId }
    BattleResultScreen(
      winnerName = winner.name,
      leftName = contestants.first().name,
      rightName = contestants.last().name,
      ko = ko,
      onDone = { onFinish(finishPayload()) },
    )
    return
  }

  // System back from the battle screen still resolves the promise.
  BackHandler { onFinish(finishPayload()) }

  Box(Modifier.fillMaxSize().background(Theme.navy)) {
    Column(
      // safeDrawing keeps the content clear of the status bar and the display cutout (camera).
      Modifier.fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .verticalScroll(rememberScrollState())
        .padding(24.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
      NativeBadge()

      Text(
        "Store observer sees $observedPartySize in your party",
        color = Theme.midGrey,
        fontSize = 13.sp,
        textAlign = TextAlign.Center,
      )

      if (contestants.isEmpty()) {
        Text(
          "Your party is empty.\nAdd some Pokémon, then battle.",
          color = Theme.midGrey,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(top = 48.dp),
        )
      } else {
        Column(
          Modifier.fillMaxWidth(),
          verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
          for (c in contestants) {
            ContestantRow(contestant = c, isWinner = winnerId == c.id)
          }
        }

        winnerId?.let { id ->
          val w = contestants.first { it.id == id }
          Text(
            "${w.name} wins${if (ko) " by KO!" else "!"}",
            color = Theme.white,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
          )
        }

        PrimaryButton(if (winnerId == null) "Battle!" else "Battle again") {
          val winner = pickWinner(contestants)
          winnerId = winner?.id
          val maxPower = contestants.maxOfOrNull { it.power } ?: 0
          ko = winner != null && winner.power >= maxPower && maxPower > 0
        }

        winnerId?.let { id ->
          val w = contestants.first { it.id == id }
          SecondaryButton("See full result") { showResult = true }
          // Native -> RN: ask the shell router to open the RN detail for the winner, then finish so
          // the RN screen it pushed underneath is revealed.
          SecondaryButton("View ${w.name} in Pokédex") {
            ShellEventBridge.requestNavigate("PokemonDetail", JSONObject().put("id", id).toString())
            onFinish(finishPayload())
          }
        }
      }

      Spacer(Modifier.height(8.dp))
      PrimaryButton("Done") { onFinish(finishPayload()) }
    }
  }
}

@Composable
private fun BattleResultScreen(
  winnerName: String,
  leftName: String,
  rightName: String,
  ko: Boolean,
  onDone: () -> Unit,
) {
  Box(Modifier.fillMaxSize().background(Theme.navy)) {
    Column(
      Modifier.fillMaxSize()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .padding(24.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
      NativeBadge()
      Text("$leftName  vs  $rightName", color = Theme.midGrey, fontWeight = FontWeight.SemiBold)
      Spacer(Modifier.height(40.dp))
      Text("🏆", fontSize = 72.sp)
      Text(winnerName, color = Theme.white, fontSize = 34.sp, fontWeight = FontWeight.Bold)
      Text(if (ko) "Winner by KO!" else "Winner!", color = Theme.pokemonGreen, fontSize = 18.sp)
      Spacer(Modifier.weight(1f))
      PrimaryButton("Done", onClick = onDone)
    }
  }
}

@Composable
private fun ContestantRow(contestant: Contestant, isWinner: Boolean) {
  Row(
    Modifier.fillMaxWidth()
      .clip(RoundedCornerShape(16.dp))
      .background(if (isWinner) Theme.pokemonGreen else Theme.white)
      .padding(horizontal = 16.dp, vertical = 14.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Column(Modifier.weight(1f)) {
      Text(contestant.name, color = Theme.black, fontSize = 17.sp, fontWeight = FontWeight.Bold)
      if (contestant.power > 0) {
        Text("Power ${contestant.power}", color = Theme.midGrey, fontSize = 12.sp)
      }
    }
    if (isWinner) Text("🏆", fontSize = 20.sp)
  }
}

// A deliberately distinctive marker so it's obvious the screen is native Compose, not React Native.
@Composable
private fun NativeBadge() {
  Text(
    "⟡ NATIVE ANDROID",
    color = Theme.white,
    fontSize = 11.sp,
    fontWeight = FontWeight.Bold,
    modifier =
      Modifier.clip(RoundedCornerShape(50))
        .background(Theme.purple)
        .padding(horizontal = 12.dp, vertical = 6.dp),
  )
}

@Composable
private fun PrimaryButton(title: String, onClick: () -> Unit) {
  Text(
    title,
    color = Theme.white,
    fontSize = 17.sp,
    fontWeight = FontWeight.Bold,
    textAlign = TextAlign.Center,
    modifier =
      Modifier.fillMaxWidth()
        .clip(RoundedCornerShape(14.dp))
        .background(Theme.blue)
        .clickable(onClick = onClick)
        .padding(vertical = 14.dp),
  )
}

@Composable
private fun SecondaryButton(title: String, onClick: () -> Unit) {
  Text(
    title,
    color = Theme.blue,
    fontSize = 15.sp,
    fontWeight = FontWeight.SemiBold,
    textAlign = TextAlign.Center,
    modifier =
      Modifier.fillMaxWidth()
        .clip(RoundedCornerShape(14.dp))
        .border(1.dp, Theme.blue.copy(alpha = 0.6f), RoundedCornerShape(14.dp))
        .clickable(onClick = onClick)
        .padding(vertical = 12.dp),
  )
}
