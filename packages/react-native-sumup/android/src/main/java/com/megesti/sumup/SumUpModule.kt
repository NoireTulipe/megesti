package com.megesti.sumup

import com.facebook.react.bridge.*
import com.sumup.merchant.api.SumUpAPI
import com.sumup.merchant.api.SumUpLogin
import com.sumup.merchant.api.SumUpPayment
import com.sumup.merchant.api.SumUpState
import com.sumup.merchant.models.TransactionInfo
import java.math.BigDecimal

class SumUpModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SumUp"

  // L'affiliate key est reçue à l'init puis réutilisée pour le login.
  // On ne la demande pas côté JS lors du login : le SDK SumUp ouvre son propre
  // écran de connexion marchand sur l'appareil, aucun identifiant ne transite
  // par les serveurs MeGesti.
  private var affiliateKey: String? = null

  // ── init ──────────────────────────────────────────────────────────

  @ReactMethod
  fun init(affiliateKey: String, promise: Promise) {
    try {
      this.affiliateKey = affiliateKey
      SumUpAPI.init(reactApplicationContext, affiliateKey)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("INIT_ERROR", e.message)
    }
  }

  // ── login ─────────────────────────────────────────────────────────
  //
  // Pas de paramètre token : on construit le SumUpLogin avec l'affiliate key
  // stockée lors de init(). Le SDK affiche son écran de connexion natif.

  @ReactMethod
  fun login(promise: Promise) {
    try {
      val key = affiliateKey
      if (key == null) {
        promise.reject("NOT_INITIALIZED", "init() doit être appelé avant login()")
        return
      }
      val login = SumUpLogin.builder(key).build()
      SumUpAPI.login(login, object : SumUpAPI.LoginCallback {
        override fun onSuccess() {
          promise.resolve(true)
        }
        override fun onError(error: Throwable) {
          promise.reject("LOGIN_ERROR", error.message)
        }
      })
    } catch (e: Exception) {
      promise.reject("LOGIN_ERROR", e.message)
    }
  }

  // ── checkout ──────────────────────────────────────────────────────

  @ReactMethod
  fun checkout(amount: Double, currency: String, title: String, promise: Promise) {
    try {
      val activity = currentActivity
      if (activity == null) {
        val result = Arguments.createMap().apply {
          putBoolean("success", false)
          putString("errorCode", "NO_ACTIVITY")
          putString("message", "Aucune activité en premier plan — réessayez.")
        }
        promise.resolve(result)
        return
      }

      val payment = SumUpPayment.builder()
        .total(BigDecimal.valueOf(amount))
        .currency(com.sumup.merchant.api.core.Currency.valueOf(currency))
        .title(title)
        .skipSuccessScreen()        // retour direct à l'app après paiement
        .build()

      SumUpAPI.checkout(activity, payment, object : SumUpAPI.PaymentCallback {
        override fun onSuccess(transactionInfo: TransactionInfo) {
          val result = Arguments.createMap().apply {
            putBoolean("success", true)
            putString("transactionCode", transactionInfo.transactionCode)
            putDouble("amount", transactionInfo.amount.toDouble())
            putString("currency", transactionInfo.currency.name)
          }
          promise.resolve(result)
        }

        override fun onError(error: Throwable) {
          val result = Arguments.createMap().apply {
            putBoolean("success", false)
            putString("errorCode", "CHECKOUT_ERROR")
            putString("message", error.message ?: "Paiement échoué")
          }
          promise.resolve(result) // ne pas reject — on renvoie un résultat avec success=false
        }
      })
    } catch (e: Exception) {
      val result = Arguments.createMap().apply {
        putBoolean("success", false)
        putString("errorCode", "CHECKOUT_EXCEPTION")
        putString("message", e.message ?: "Erreur interne")
      }
      promise.resolve(result)
    }
  }

  // ── isReady ───────────────────────────────────────────────────────

  @ReactMethod
  fun isReady(promise: Promise) {
    try {
      val state = SumUpAPI.getCurrentState()
      promise.resolve(state == SumUpState.READY)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  // ── logout ────────────────────────────────────────────────────────

  @ReactMethod
  fun logout(promise: Promise) {
    try {
      SumUpAPI.logout(object : SumUpAPI.LogoutCallback {
        override fun onSuccess() { promise.resolve(null) }
        override fun onError(error: Throwable) { promise.reject("LOGOUT_ERROR", error.message) }
      })
    } catch (e: Exception) {
      promise.reject("LOGOUT_ERROR", e.message)
    }
  }
}
