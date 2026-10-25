import { useEffect, useMemo, useState } from "react";
import { PermissionsAndroid, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { analyze, parseText, SAMPLE, MONTHS } from "./src/avci";
import { gelenKutusu, smsOkunabilir } from "./modules/sms-okuyucu";

const LIGHT = { bg: "#f3f5f2", surface: "#ffffff", ink: "#17231f", muted: "#5c6b65", line: "#d9e0dc", accent: "#0f6b55", accentSoft: "#e2efe9", warn: "#b5560b", warnSoft: "#fbeadb", bad: "#b3261e", badSoft: "#f9e1df" };
const DARK = { bg: "#0f1513", surface: "#161f1c", ink: "#e5ece8", muted: "#93a39c", line: "#2a3632", accent: "#4fc29f", accentSoft: "#173229", warn: "#f0a050", warnSoft: "#3a2817", bad: "#f2867e", badSoft: "#3b1d1b" };

const tl = n => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
const pct = n => (n > 0 ? "+" : "") + "%" + new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(n * 100);
const fmtDate = d => (d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : "—");
const pad = n => String(n).padStart(2, "0");
const yearly = s => (s.period === "yıllık" ? 1 : 12);

const USAGE = [["evet", "Sık"], ["az", "Nadiren"], ["hic", "Hiç"]];
// Banka bildirimi gibi görünen SMS'ler: içinde tutar ve harcama/ödeme kelimesi olanlar.
const BANKA_SMS = /harcama|kart[ıi]n|ödeme|odeme|tahsil|fatura|çekil|cekil|provizyon/i;
const TUTAR = /\d,\d{2}/;

async function load(key, fallback) {
  try { const v = await AsyncStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
function save(key, value) { AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {}); }

export default function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

function App() {
  const c = useColorScheme() === "dark" ? DARK : LIGHT;
  const s = useMemo(() => makeStyles(c), [c]);
  const [tab, setTab] = useState("ozet");
  const [text, setText] = useState(null);
  const [usage, setUsage] = useState({});
  const [draft, setDraft] = useState("");
  const [info, setInfo] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await load("aa-text", null);
      const u = await load("aa-usage", {});
      if (t == null) { setText(SAMPLE); setUsage({ macfit: "hic", exxen: "az", "x:KELIME OYUNU": "hic", ...u }); }
      else { setText(t); setUsage(u); }
    })();
  }, []);
  useEffect(() => { if (text != null) save("aa-text", text); }, [text]);
  useEffect(() => { save("aa-usage", usage); }, [usage]);

  const tx = useMemo(() => (text ? parseText(text).tx : []), [text]);
  const { subs, bills } = useMemo(() => analyze(tx), [tx]);
  const isSample = text === SAMPLE;

  function addLines(newText) {
    const old = new Set((text === SAMPLE ? "" : text || "").split("\n").map(l => l.trim()));
    const fresh = newText.split("\n").map(l => l.trim()).filter(l => l && !old.has(l));
    const base = text === SAMPLE ? "" : text || "";
    setText((base ? base + "\n" : "") + fresh.join("\n"));
    if (text === SAMPLE) setUsage({});
    return fresh.length;
  }

  async function scanSms() {
    const ok = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
      title: "SMS izni",
      message: "Banka SMS'lerindeki harcamaları bulmak için SMS'lerini okumam gerekiyor. Metinler telefonundan çıkmaz.",
      buttonPositive: "İzin ver",
      buttonNegative: "Vazgeç",
    });
    if (ok !== PermissionsAndroid.RESULTS.GRANTED) { setInfo("SMS izni verilmedi. İstersen metni elle yapıştırabilirsin."); return; }
    const list = await gelenKutusu(180, 3000);
    const lines = list
      .filter(m => BANKA_SMS.test(m.metin) && TUTAR.test(m.metin))
      .map(m => {
        const body = m.metin.replace(/\s+/g, " ").trim();
        if (/\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(body)) return body;
        const d = new Date(m.tarih);
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${body}`;
      });
    const n = addLines(lines.join("\n"));
    setInfo(`${list.length} SMS okundu, ${lines.length} tanesi banka bildirimi gibi görünüyor, ${n} yeni satır eklendi.`);
    setTab("ozet");
  }

  if (text == null) return <View style={s.screen} />;

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <StatusBar style={c === DARK ? "light" : "dark"} />
      <View style={s.header}>
        <Text style={s.h1}>Abonelik <Text style={{ color: c.accent }}>Avcısı</Text></Text>
        {isSample && <Text style={s.sampleTag}>Örnek veri gösteriliyor. Kendi SMS'lerini "Ekle" sekmesinden ekle.</Text>}
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {tab === "ozet" && <Ozet s={s} c={c} subs={subs} bills={bills} usage={usage} tx={tx} />}
        {tab === "abonelik" && (
          <Abonelikler s={s} c={c} subs={subs} bills={bills} usage={usage}
            setUsage={(k, v) => setUsage(u => ({ ...u, [k]: u[k] === v ? "" : v }))} />
        )}
        {tab === "ekle" && (
          <View style={s.gap}>
            {Platform.OS === "android" && smsOkunabilir && (
              <View style={s.card}>
                <Text style={s.h2}>Telefondaki SMS'ler</Text>
                <Text style={s.muted}>Son 6 aydaki banka SMS'lerini tarar. Metinler telefonundan çıkmaz.</Text>
                <Btn s={s} primary onPress={scanSms} label="SMS'leri tara" />
              </View>
            )}
            <View style={s.card}>
              <Text style={s.h2}>Metin yapıştır</Text>
              <Text style={s.muted}>Her SMS'i veya ekstre satırını ayrı satıra koy. Tarih (12.09.2026) ve tutar (123,45 TL) olmalı.</Text>
              <TextInput style={s.input} multiline value={draft} onChangeText={setDraft}
                placeholder="03.10.2026 NETFLIX.COM 279,99 TL" placeholderTextColor={c.muted} />
              <View style={s.row}>
                <Btn s={s} primary label="Ekle" onPress={() => {
                  const n = addLines(draft); setDraft("");
                  setInfo(n ? `${n} yeni satır eklendi.` : "Yeni satır bulunamadı.");
                }} />
                <Btn s={s} label="Örnek veri" onPress={() => { setText(SAMPLE); setUsage({ macfit: "hic", exxen: "az", "x:KELIME OYUNU": "hic" }); setInfo("Örnek veri yüklendi."); }} />
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.h2}>Kayıtlı veriler</Text>
              <Text style={s.muted}>{tx.length} işlem kayıtlı.</Text>
              {confirmClear ? (
                <View style={s.row}>
                  <Btn s={s} danger label="Evet, hepsini sil" onPress={() => { setText(""); setUsage({}); setConfirmClear(false); setInfo("Tüm veriler silindi."); }} />
                  <Btn s={s} label="Vazgeç" onPress={() => setConfirmClear(false)} />
                </View>
              ) : <Btn s={s} label="Tümünü sil" onPress={() => setConfirmClear(true)} />}
            </View>
            {!!info && <Text style={[s.muted, { color: c.accent }]}>{info}</Text>}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={s.tabbar}>
        {[["ozet", "Özet"], ["abonelik", "Abonelikler"], ["ekle", "Ekle"]].map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={[s.tabText, tab === k && { color: c.accent, fontWeight: "700" }]}>{l}</Text>
          </Pressable>
        ))}
      </SafeAreaView>
    </SafeAreaView>
  );
}

function Btn({ s, label, onPress, primary, danger }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, primary && s.btnPrimary, danger && s.btnDanger, pressed && { opacity: 0.8 }]}>
      <Text style={[s.btnText, (primary || danger) && s.btnTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Ozet({ s, c, subs, bills, usage, tx }) {
  const monthly = subs.reduce((a, x) => a + x.monthly, 0);
  const unused = subs.filter(x => usage[x.key] === "hic");
  const unusedM = unused.reduce((a, x) => a + x.monthly, 0);
  const alerts = [];
  for (const x of subs.filter(x => x.change > 0.005)) alerts.push(["warn", "Zam", `${x.name}: ${tl(x.prev)} → ${tl(x.last)} (${pct(x.change)}). Yılda ${tl((x.last - x.prev) * yearly(x))} fazladan.`]);
  for (const b of bills.filter(b => b.vsAvg > 0.2)) alerts.push(["bad", "Yüksek", `${b.name} faturası ${tl(b.last)}, ortalamanın (${tl(b.avgBefore)}) ${pct(b.vsAvg)} üstünde.`]);
  for (const b of bills.filter(b => b.change > 0.005 && b.vsAvg !== null && b.vsAvg <= 0.2 && b.history.slice(0, -1).every(t => Math.abs(t.amount - b.prev) < 0.01))) alerts.push(["warn", "Zam", `${b.name} faturası ${tl(b.prev)} → ${tl(b.last)} (${pct(b.change)}).`]);
  for (const x of unused) alerts.push(["bad", "Boşa", `${x.name} için ${x.period === "yıllık" ? "yılda" : "ayda"} ${tl(x.last)} ödüyorsun ama kullanmıyorsun.`]);
  for (const x of subs.filter(x => !x.known)) alerts.push(["warn", "Tanımadık", `"${x.name}" her ay ${tl(x.last)} çekiyor. Hatırlıyor musun?`]);

  const dates = tx.filter(t => t.date).map(t => t.date);
  const latest = dates.length ? new Date(Math.max(...dates)) : new Date();
  const report = [
    `${MONTHS[latest.getMonth()]} ${latest.getFullYear()} özeti: ${subs.length} aboneliğe ayda ${tl(monthly)}, yılda ${tl(monthly * 12)} ödüyorsun.`,
    unused.length ? `Hiç kullanmadığın ${unused.map(x => x.name).join(", ")} için yılda ${tl(unusedM * 12)} gidiyor.` : null,
    ...alerts.filter(a => a[1] !== "Boşa").map(a => a[2]),
  ].filter(Boolean).join("\n\n");

  return (
    <View style={s.gap}>
      <View style={s.stats}>
        <Stat s={s} label="Aylık abonelik" value={tl(monthly)} sub={`${subs.length} hizmet`} />
        <Stat s={s} label="Yıllık abonelik" value={tl(monthly * 12)} sub="bu hızla bir yılda" />
        <Stat s={s} label="Boşa giden / yıl" value={tl(unusedM * 12)} sub="kullanmadıkların" color={unusedM ? c.bad : undefined} />
        <Stat s={s} label="Uyarı" value={String(alerts.length)} sub="zam, fatura, boşa ödeme" color={alerts.length ? c.warn : undefined} />
      </View>
      {alerts.map(([k, p, t], i) => (
        <View key={i} style={[s.alert, { backgroundColor: k === "bad" ? c.badSoft : c.warnSoft }]}>
          <Text style={[s.pill, { color: k === "bad" ? c.bad : c.warn }]}>{p.toLocaleUpperCase("tr-TR")}</Text>
          <Text style={s.alertText}>{t}</Text>
        </View>
      ))}
      {!subs.length && !bills.length && <Text style={s.muted}>Henüz bir şey bulunamadı. "Ekle" sekmesinden SMS veya ekstre ekle.</Text>}
      {(subs.length > 0 || bills.length > 0) && (
        <Btn s={s} label="Raporu paylaş" onPress={() => Share.share({ message: report }).catch(() => {})} />
      )}
    </View>
  );
}

function Stat({ s, label, value, sub, color }) {
  return (
    <View style={s.stat}>
      <Text style={s.label}>{label.toLocaleUpperCase("tr-TR")}</Text>
      <Text style={[s.statValue, color && { color }]}>{value}</Text>
      <Text style={s.small}>{sub}</Text>
    </View>
  );
}

function Abonelikler({ s, c, subs, bills, usage, setUsage }) {
  return (
    <View style={s.gap}>
      <Text style={s.h2}>Abonelikler</Text>
      {subs.map(x => {
        const u = usage[x.key];
        return (
          <View key={x.key} style={[s.card, u === "hic" && { backgroundColor: c.badSoft }, u === "az" && { backgroundColor: c.warnSoft }]}>
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{x.name}</Text>
                <Text style={s.small}>{x.cat} · {x.period} · sonraki {fmtDate(x.next)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.amount}>{tl(x.last)}</Text>
                {!!x.change && <Text style={[s.small, x.change > 0 && { color: c.bad }]}>{pct(x.change)}</Text>}
              </View>
            </View>
            <View style={s.row}>
              <Text style={[s.small, { alignSelf: "center" }]}>Kullanım:</Text>
              {USAGE.map(([v, l]) => (
                <Pressable key={v} onPress={() => setUsage(x.key, v)}
                  style={[s.chip, u === v && { backgroundColor: c.accent, borderColor: c.accent }]}>
                  <Text style={[s.chipText, u === v && { color: c.surface }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
      {!subs.length && <Text style={s.muted}>Henüz abonelik bulunamadı.</Text>}

      <Text style={[s.h2, { marginTop: 8 }]}>Faturalar</Text>
      {bills.map(b => (
        <View key={b.key} style={s.card}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{b.name}</Text>
              <Text style={s.small}>Önceki ortalama {b.avgBefore ? tl(b.avgBefore) : "—"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.amount}>{tl(b.last)}</Text>
              {b.vsAvg !== null && <Text style={[s.small, b.vsAvg > 0.2 && { color: c.bad }]}>{pct(b.vsAvg)}</Text>}
            </View>
          </View>
        </View>
      ))}
      {!bills.length && <Text style={s.muted}>Henüz fatura bulunamadı.</Text>}
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 4 },
    h1: { fontSize: 28, fontWeight: "800", color: c.ink, letterSpacing: -0.5 },
    sampleTag: { fontSize: 13, color: c.accent, backgroundColor: c.accentSoft, padding: 8, borderRadius: 6 },
    body: { padding: 16, paddingBottom: 32 },
    gap: { gap: 12 },
    h2: { fontSize: 18, fontWeight: "700", color: c.ink },
    muted: { fontSize: 14, color: c.muted, lineHeight: 20 },
    small: { fontSize: 12.5, color: c.muted },
    label: { fontSize: 11, color: c.muted, letterSpacing: 0.6 },
    card: { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 10, padding: 14, gap: 10 },
    stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    stat: { flexBasis: "47%", flexGrow: 1, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 10, padding: 12, gap: 2 },
    statValue: { fontSize: 20, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] },
    alert: { borderRadius: 8, padding: 12, gap: 4 },
    pill: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
    alertText: { fontSize: 14, color: c.ink, lineHeight: 20 },
    name: { fontSize: 16, fontWeight: "600", color: c.ink },
    amount: { fontSize: 16, color: c.ink, fontVariant: ["tabular-nums"] },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    rowBetween: { flexDirection: "row", gap: 12 },
    chip: { borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    chipText: { fontSize: 13, color: c.ink },
    input: { minHeight: 140, textAlignVertical: "top", borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: 10, color: c.ink, backgroundColor: c.bg, fontSize: 13 },
    btn: { borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", backgroundColor: c.surface },
    btnPrimary: { backgroundColor: c.accent, borderColor: c.accent },
    btnDanger: { backgroundColor: c.bad, borderColor: c.bad },
    btnText: { fontSize: 15, fontWeight: "600", color: c.ink },
    btnTextOn: { color: c.surface },
    tabbar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface },
    tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
    tabText: { fontSize: 14, color: c.muted },
  });
}
