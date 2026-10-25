package expo.modules.smsokuyucu

import android.Manifest
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsOkuyucuModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsOkuyucu")

    AsyncFunction("gelenKutusu") { gunSayisi: Int, enFazla: Int ->
      val ctx = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
        return@AsyncFunction emptyList<Map<String, Any>>()
      }
      val since = System.currentTimeMillis() - gunSayisi.toLong() * 86_400_000L
      val sonuc = mutableListOf<Map<String, Any>>()
      ctx.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
        "${Telephony.Sms.DATE} >= ?",
        arrayOf(since.toString()),
        "${Telephony.Sms.DATE} DESC"
      )?.use { c ->
        val iGonderen = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val iMetin = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val iTarih = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
        while (c.moveToNext() && sonuc.size < enFazla) {
          sonuc.add(mapOf(
            "gonderen" to (c.getString(iGonderen) ?: ""),
            "metin" to (c.getString(iMetin) ?: ""),
            "tarih" to c.getLong(iTarih).toDouble()
          ))
        }
      }
      sonuc
    }
  }
}
