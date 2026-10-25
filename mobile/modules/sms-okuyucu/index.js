import { requireOptionalNativeModule } from "expo";

// Yalnızca Android geliştirme/derleme sürümünde vardır; iOS ve Expo Go'da null döner.
const SmsOkuyucu = requireOptionalNativeModule("SmsOkuyucu");

export const smsOkunabilir = SmsOkuyucu != null;

// Son `gunSayisi` gündeki gelen kutusu SMS'lerini döndürür: [{ gonderen, metin, tarih }]
export async function gelenKutusu(gunSayisi = 180, enFazla = 3000) {
  if (!SmsOkuyucu) return [];
  return SmsOkuyucu.gelenKutusu(gunSayisi, enFazla);
}
