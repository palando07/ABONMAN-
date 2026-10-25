# Abonelik Avcısı · mobil uygulama

React Native (Expo SDK 58) uygulaması. Ayrıştırma mantığı `src/avci.js` dosyasında, web prototipiyle aynı.

- **Android:** Banka SMS'lerini izinle okur (son 6 ay). SMS okuma `modules/sms-okuyucu` içindeki yerel modülle yapılır; bu yüzden Expo Go'da değil, derlenmiş uygulamada (APK) çalışır.
- **iOS:** Apple SMS okumaya izin vermez; SMS veya ekstre metni yapıştırılır.
- Veriler yalnızca telefonda (AsyncStorage) tutulur.

## Denemek (Expo Go, SMS okuma hariç)
```bash
cd mobile
npm install
npx expo start
```
Telefonda Expo Go uygulamasıyla ekrandaki QR kodu okut.

## Android APK üretmek
Ücretsiz bir Expo hesabı gerekir (https://expo.dev/signup).
```bash
cd mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
Derleme bitince verilen bağlantıdan APK'yı telefona indirip kur.

Not: Google Play, SMS okuma iznini yalnızca varsayılan SMS uygulamalarına ve onaylı istisnalara veriyor. Mağazaya çıkarken SMS okumayı kaldırmak veya bildirim okuma gibi başka bir yola geçmek gerekebilir; APK ile doğrudan kurulumda sorun yok.
