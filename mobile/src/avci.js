// Ayrıştırma ve analiz: web prototipi (../index.html) ile aynı mantık.
// ---------- Bilinen hizmetler ----------
const KNOWN = [
  { key: "netflix", name: "Netflix", cat: "Dijital yayın", type: "abonelik", re: /netflix/i },
  { key: "spotify", name: "Spotify", cat: "Müzik", type: "abonelik", re: /spotify/i },
  { key: "youtube", name: "YouTube Premium", cat: "Dijital yayın", type: "abonelik", re: /youtube|google\s*\*?\s*youtube/i },
  { key: "disney", name: "Disney+", cat: "Dijital yayın", type: "abonelik", re: /disney/i },
  { key: "prime", name: "Amazon Prime", cat: "Dijital yayın", type: "abonelik", re: /amazon\s*prime|prime\s*video|amzn\s*prime/i },
  { key: "exxen", name: "Exxen", cat: "Dijital yayın", type: "abonelik", re: /exxen/i },
  { key: "blutv", name: "BluTV / Max", cat: "Dijital yayın", type: "abonelik", re: /blutv|hbo\s*max|\bmax\.com/i },
  { key: "gain", name: "Gain", cat: "Dijital yayın", type: "abonelik", re: /\bgain\b/i },
  { key: "tod", name: "TOD", cat: "Dijital yayın", type: "abonelik", re: /\btod\b|digiturk/i },
  { key: "icloud", name: "Apple (iCloud / App Store)", cat: "Bulut / uygulama", type: "abonelik", re: /apple\.com|icloud|itunes/i },
  { key: "googleone", name: "Google One", cat: "Bulut", type: "abonelik", re: /google\s*\*?\s*(one|storage)/i },
  { key: "chatgpt", name: "ChatGPT", cat: "Yazılım", type: "abonelik", re: /openai|chatgpt/i },
  { key: "claude", name: "Claude", cat: "Yazılım", type: "abonelik", re: /anthropic|claude\.ai/i },
  { key: "adobe", name: "Adobe", cat: "Yazılım", type: "abonelik", re: /adobe/i },
  { key: "m365", name: "Microsoft 365", cat: "Yazılım", type: "abonelik", re: /microsoft|msft/i },
  { key: "storytel", name: "Storytel", cat: "Sesli kitap", type: "abonelik", re: /storytel/i },
  { key: "macfit", name: "MacFit", cat: "Spor salonu", type: "abonelik", re: /macfit/i },
  { key: "gym", name: "Spor salonu", cat: "Spor salonu", type: "abonelik", re: /spor\s*salonu|fitness|gym\b/i },
  { key: "ygclub", name: "Yemeksepeti / Getir üyelik", cat: "Üyelik", type: "abonelik", re: /yemeksepeti\s*club|getir\s*(club|plus)|trendyol\s*plus|hepsiburada\s*premium/i },
  { key: "turkcell", name: "Turkcell", cat: "Telefon / internet", type: "fatura", re: /turkcell|superonline/i },
  { key: "vodafone", name: "Vodafone", cat: "Telefon / internet", type: "fatura", re: /vodafone/i },
  { key: "ttelekom", name: "Türk Telekom", cat: "Telefon / internet", type: "fatura", re: /t[üu]rk\s*telekom|ttnet/i },
  { key: "elektrik", name: "Elektrik", cat: "Enerji", type: "fatura", re: /enerjisa|ck\s*enerji|elektrik|bedaş|ayedaş|başkent\s*edaş/i },
  { key: "dogalgaz", name: "Doğalgaz", cat: "Enerji", type: "fatura", re: /igdaş|igdas|başkentgaz|baskentgaz|izmirgaz|doğalgaz|dogalgaz/i },
  { key: "su", name: "Su", cat: "Su", type: "fatura", re: /iski|aski|izsu|\bsu\s*fatura/i },
  { key: "aidat", name: "Site aidatı", cat: "Konut", type: "fatura", re: /aidat/i },
];
const NOISE_WORDS = new Set(["ISTANBUL","ANKARA","IZMIR","İSTANBUL","İZMİR","TR","TUR","TURKEY","STOCKHOLM","DUBLIN","LUXEMBOURG","AMSTERDAM","LONDON","SAN","FRANCISCO","WWW","COM","TL","TRY","SATIŞ","SATIS","HARCAMA"]);
const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const DAY = 86400000;

// ---------- Ayrıştırma ----------
function parseAmount(s) {
  const re = /(?:(TL|TRY|₺)\s*)?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?:\s*(TL|TRY|₺))?/g;
  let m, best = null;
  while ((m = re.exec(s))) {
    const val = parseFloat(m[2].replace(/\./g, "") + "." + m[3]);
    const marked = !!(m[1] || m[4]);
    if (!best || (marked && !best.marked)) best = { val, marked, index: m.index, len: m[0].length };
  }
  return best;
}
function parseDate(s) {
  const m = s.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})\b/);
  if (!m) return null;
  let y = +m[3]; if (y < 100) y += 2000;
  const d = new Date(y, +m[2] - 1, +m[1]);
  return isNaN(d) ? null : { date: d, index: m.index, len: m[0].length };
}
function guessMerchant(line, date, amt) {
  let s = line;
  const isy = s.match(/(?:tarihinde|tarihli)?\s*([^,;:]+?)\s+(?:üye\s+)?i[sş]yerinden/i);
  if (isy) s = isy[1];
  else if (date && amt && amt.index > date.index) s = line.slice(date.index + date.len, amt.index);
  s = s.replace(/\d{1,2}[./]\d{1,2}[./]\d{2,4}/g, " ").replace(/tarihinde|tarihli/gi, " ");
  const toks = s.toLocaleUpperCase("tr-TR").replace(/[*#/\\|_]/g, " ").replace(/[^\p{L}\p{N}.&+\- ]/gu, " ")
    .split(/\s+/).map(t => t.replace(/^\.+|\.+$/g, "").replace(/\.(COM|NET|ORG|TR)$/i, ""))
    .filter(t => t.length > 1 && !/\d/.test(t) && !NOISE_WORDS.has(t));
  return toks.slice(0, 2).join(" ");
}
function parseText(text) {
  const out = [], skipped = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/\biade\b|iptal edil|gelen (havale|eft)|hesab[ıi]n[ıa]za .* yat/i.test(line)) { skipped.push(line); continue; }
    const amt = parseAmount(line);
    if (!amt) { skipped.push(line); continue; }
    const date = parseDate(line);
    const known = KNOWN.find(k => k.re.test(line));
    const merchant = known ? known.name : guessMerchant(line, date, amt);
    if (!merchant) { skipped.push(line); continue; }
    out.push({
      key: known ? known.key : "x:" + merchant,
      name: known ? known.name : titleCase(merchant),
      cat: known ? known.cat : "Diğer",
      type: known ? known.type : null,
      known: !!known,
      amount: amt.val,
      date: date ? date.date : null,
      raw: line,
    });
  }
  return { tx: out, skipped };
}
function titleCase(s) { return s.toLocaleLowerCase("tr-TR").replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase("tr-TR")); }
const monthKey = d => d.getFullYear() * 12 + d.getMonth();
function median(a) { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; }

// ---------- Analiz ----------
function analyze(tx) {
  const groups = new Map();
  for (const t of tx) { if (!groups.has(t.key)) groups.set(t.key, []); groups.get(t.key).push(t); }
  const subs = [], bills = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => (a.date || 0) - (b.date || 0));
    const dated = list.filter(t => t.date);
    const months = new Set(dated.map(t => monthKey(t.date)));
    const amounts = list.map(t => t.amount);
    const intervals = dated.slice(1).map((t, i) => (t.date - dated[i].date) / DAY);
    const medInt = median(intervals);
    const first = list[0];
    let type = first.type;
    if (!type) {
      // Bilinmeyen işyeri: farklı aylarda, düzenli aralıkla, benzer tutarla tekrar ediyorsa abonelik say.
      const steady = Math.max(...amounts) <= Math.min(...amounts) * 1.25;
      const regular = intervals.length > 0 && intervals.every(d => (d >= 25 && d <= 35) || (d >= 350 && d <= 380));
      if (months.size >= 2 && steady && regular) type = "abonelik"; else continue;
    }
    const last = list[list.length - 1];
    const yearly = medInt >= 300;
    const g = {
      key, name: first.name, cat: first.cat, known: first.known, count: list.length,
      last: last.amount, lastDate: last.date,
      monthly: yearly ? last.amount / 12 : last.amount,
      period: yearly ? "yıllık" : "aylık",
      next: last.date ? new Date(last.date.getTime() + (medInt || (yearly ? 365 : 30)) * DAY) : null,
      history: list,
    };
    // Fiyat değişimi: son tutar, ondan önceki farklı tutarla kıyaslanır.
    const prevDiff = [...list].reverse().find(t => Math.abs(t.amount - last.amount) > 0.009);
    if (prevDiff) {
      const since = list.find(t => t.date && t.date > prevDiff.date && Math.abs(t.amount - last.amount) < 0.01);
      g.prev = prevDiff.amount; g.change = (last.amount - prevDiff.amount) / prevDiff.amount; g.changeSince = since ? since.date : last.date;
    }
    if (type === "fatura") {
      const before = list.slice(0, -1).map(t => t.amount);
      g.avgBefore = before.length ? before.reduce((a, b) => a + b, 0) / before.length : null;
      g.vsAvg = g.avgBefore ? (last.amount - g.avgBefore) / g.avgBefore : null;
      bills.push(g);
    } else subs.push(g);
  }
  subs.sort((a, b) => b.monthly - a.monthly);
  bills.sort((a, b) => b.last - a.last);
  return { subs, bills };
}

const SAMPLE = `ÖRNEK VERİ - kendi SMS'lerin veya ekstrenle değiştir
Örnek Bank: 4321 ile biten kartınızdan 03.07.2026 tarihinde NETFLIX.COM işyerinden 229,99 TL harcama yapıldı.
Örnek Bank: 4321 ile biten kartınızdan 03.08.2026 tarihinde NETFLIX.COM işyerinden 229,99 TL harcama yapıldı.
Örnek Bank: 4321 ile biten kartınızdan 03.09.2026 tarihinde NETFLIX.COM işyerinden 279,99 TL harcama yapıldı.
Örnek Bank: 4321 ile biten kartınızdan 03.10.2026 tarihinde NETFLIX.COM işyerinden 279,99 TL harcama yapıldı.
07.07.2026 SPOTIFY P2A91C STOCKHOLM 99,00 TL
07.08.2026 SPOTIFY P2B3F0 STOCKHOLM 99,00 TL
07.09.2026 SPOTIFY P2C7D1 STOCKHOLM 99,00 TL
07.10.2026 SPOTIFY P2D2E8 STOCKHOLM 99,00 TL
01.07.2026 MACFIT KADIKOY ISTANBUL 1.450,00 TL
01.08.2026 MACFIT KADIKOY ISTANBUL 1.450,00 TL
01.09.2026 MACFIT KADIKOY ISTANBUL 1.450,00 TL
01.10.2026 MACFIT KADIKOY ISTANBUL 1.650,00 TL
15.07.2026 GOOGLE *YOUTUBEPREMIUM 79,99 TL
15.08.2026 GOOGLE *YOUTUBEPREMIUM 79,99 TL
15.09.2026 GOOGLE *YOUTUBEPREMIUM 79,99 TL
15.10.2026 GOOGLE *YOUTUBEPREMIUM 79,99 TL
Örnek Bank: 4321 ile biten kartınızdan 20.08.2026 tarihinde EXXEN DIJITAL işyerinden 249,90 TL harcama yapıldı.
Örnek Bank: 4321 ile biten kartınızdan 20.09.2026 tarihinde EXXEN DIJITAL işyerinden 249,90 TL harcama yapıldı.
Örnek Bank: 4321 ile biten kartınızdan 20.10.2026 tarihinde EXXEN DIJITAL işyerinden 249,90 TL harcama yapıldı.
11.08.2026 APPLE.COM/BILL 39,99 TL
11.09.2026 APPLE.COM/BILL 39,99 TL
11.10.2026 APPLE.COM/BILL 64,99 TL
22.07.2026 KELIME OYUNU PRO 7612 ISTANBUL 59,90 TL
22.08.2026 KELIME OYUNU PRO 7612 ISTANBUL 59,90 TL
22.09.2026 KELIME OYUNU PRO 7612 ISTANBUL 59,90 TL
22.10.2026 KELIME OYUNU PRO 7612 ISTANBUL 59,90 TL
Otomatik ödeme: 12.07.2026 tarihinde IGDAS doğalgaz faturanız 612,40 TL tahsil edildi.
Otomatik ödeme: 12.08.2026 tarihinde IGDAS doğalgaz faturanız 488,15 TL tahsil edildi.
Otomatik ödeme: 12.09.2026 tarihinde IGDAS doğalgaz faturanız 530,70 TL tahsil edildi.
Otomatik ödeme: 12.10.2026 tarihinde IGDAS doğalgaz faturanız 1.245,30 TL tahsil edildi.
Otomatik ödeme: 18.08.2026 tarihinde ENERJISA elektrik faturanız 742,10 TL tahsil edildi.
Otomatik ödeme: 18.09.2026 tarihinde ENERJISA elektrik faturanız 815,60 TL tahsil edildi.
Otomatik ödeme: 18.10.2026 tarihinde ENERJISA elektrik faturanız 768,90 TL tahsil edildi.
25.08.2026 TURKCELL FATURA 450,00 TL
25.09.2026 TURKCELL FATURA 450,00 TL
25.10.2026 TURKCELL FATURA 525,00 TL
05.09.2026 MIGROS ATASEHIR 845,20 TL
14.09.2026 SHELL KOZYATAGI 1.200,00 TL
02.10.2026 TRENDYOL 349,90 TL
09.10.2026 MIGROS ATASEHIR 1.112,45 TL
16.10.2026 TRENDYOL IADE 349,90 TL`;

module.exports = { parseText, analyze, SAMPLE, MONTHS };
