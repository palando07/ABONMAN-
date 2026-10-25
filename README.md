# ABONMAN · Abonelik Avcısı

Banka SMS'lerinden ve kart ekstrelerinden unutulan abonelikleri, zamları ve normalden yüksek gelen faturaları bulan uygulama.

## Ne yapar
- SMS veya ekstre metnini yapıştırırsın; tarih, tutar (1.234,56 TL) ve işyeri ayrıştırılır.
- Abonelikleri ve faturaları ayırır, aylık ve yıllık toplamı gösterir.
- Zamları, ortalamanın %20 üstünde gelen faturaları ve tanınmayan düzenli çekimleri uyarır.
- Her aboneliği "hiç kullanmıyorum" diye işaretleyebilirsin; aylık rapor boşa giden parayı hesaplar.

Metin tarayıcının dışına çıkmaz, sunucu yoktur.

## Çalıştırma
- **Mobil uygulama (Android/iOS):** [`mobile/`](mobile/README.md). Android'de banka SMS'lerini otomatik okur.
- **Web prototipi:** `index.html` dosyasını tarayıcıda açman yeterli.
 Testler için: `npm test` (Node 18+).

Plan ve sonraki adımlar: [docs/PLAN.md](docs/PLAN.md)
