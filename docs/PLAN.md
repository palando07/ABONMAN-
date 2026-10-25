# Abonelik Avcısı: Plan

Demo: https://claude.ai/artifact/QqXtF2LRW6wbeDRSaEj5zU (prototip kodu: `../index.html`)

## Ne yapar
1. **Veri girişi:** Banka SMS'leri, kart ekstresi satırları (yapıştırma), ileride PDF/CSV ekstre ve e-posta (Gmail okuma izni) ile.
2. **Ayrıştırma:** Tarih (12.09.2026), Türk tutar biçimi (1.234,56 TL), işyeri adı. İadeler ve gelen paralar atlanır.
3. **Tanıma:** Bilinen hizmet sözlüğü (Netflix, Spotify, Exxen, MacFit, iCloud, Turkcell, İGDAŞ, Enerjisa…) + bilinmeyen işyerleri için kural: farklı aylarda, ~30 veya ~365 gün aralıkla, ±%25 benzer tutarla tekrar ediyorsa abonelik.
4. **Uyarılar:** Zam (son tutar önceki farklı tutardan yüksek), fatura sıçraması (önceki ortalamanın %20 üstü), tanınmayan düzenli çekim, "hiç kullanmıyorum" işaretli abonelik.
5. **Aylık rapor:** Toplam aylık/yıllık abonelik gideri, kullanılmayana giden yıllık para, zamların yıllık etkisi, yüksek faturalar. Kopyalanabilir metin.
6. **Sonraki çekim tahmini:** Son çekim + ortanca aralık.

## Teknoloji
- **MVP (şu an):** Tek HTML sayfası, saf JavaScript, sunucu yok. Veri tarayıcıda (localStorage) kalır.
- **Mobil sürüm (önerilen):** React Native / Expo. Android'de SMS okuma izniyle otomatik tarama (iOS SMS okumaya izin vermez; orada paylaş menüsü veya e-posta ile). Yerel SQLite, şifreli.
- **Gelişmiş ayrıştırma:** Kural tabanlı ayrıştırıcı önce; tanınmayan satırlar için isteğe bağlı LLM (kullanıcı onayıyla, yalnızca o satır gönderilir).
- **Bildirimler:** Çekimden 2 gün önce hatırlatma, zam tespitinde anlık bildirim.

## Gizlilik
- Varsayılan olarak her şey cihazda işlenir; ham SMS saklanmaz, yalnızca ayrıştırılmış işlem (tarih, tutar, işyeri) tutulur.
- Kart numarası, bakiye ve kişisel bilgiler ayrıştırmada atılır.
- Bulut senkronu ve LLM kullanımı açık onayla, kapatılabilir.
- KVKK: açık rıza metni, veri silme butonu, dışa aktarma.

## MVP kapsamı (bitti)
- [x] Metin yapıştır → ayrıştır → abonelik ve fatura tabloları
- [x] Zam, yüksek fatura, tanınmayan çekim ve boşa ödeme uyarıları
- [x] Kullanım işaretleme ve aylık rapor
- [x] Türkçe arayüz, açık/koyu tema, mobil uyumlu

## Sonraki adımlar
1. PDF/CSV ekstre yükleme (banka bazında şablonlar)
2. Gmail'den fatura e-postalarını okuma
3. Expo ile Android uygulaması ve SMS izni
4. İptal rehberi: her hizmet için iptal adımları bağlantısı
