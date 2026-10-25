const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// index.html içindeki betiği DOM olmadan çalıştırıp ayrıştırıcıyı alır.
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const sample = script.match(/const SAMPLE = `([\s\S]*?)`;/)[1];
const mod = { exports: {} };
vm.runInNewContext(script, { module: mod, Intl, Date, Math, Map, Set, JSON });
const { parseText, analyze } = mod.exports;

test("Türk tutar ve tarih biçimlerini okur", () => {
  const { tx } = parseText("Kartınızdan 03.09.2026 tarihinde NETFLIX.COM işyerinden 1.279,99 TL harcama yapıldı.");
  assert.strictEqual(tx.length, 1);
  assert.strictEqual(tx[0].amount, 1279.99);
  assert.strictEqual(tx[0].key, "netflix");
  assert.strictEqual(tx[0].date.getMonth(), 8);
});

test("iadeleri ve tutarsız satırları atlar", () => {
  const { tx, skipped } = parseText("16.10.2026 TRENDYOL IADE 349,90 TL\nmerhaba");
  assert.strictEqual(tx.length, 0);
  assert.strictEqual(skipped.length, 2);
});

test("örnek veride abonelik, zam ve fatura sıçramasını bulur", () => {
  const { subs, bills } = analyze(parseText(sample).tx);
  const byKey = Object.fromEntries([...subs, ...bills].map(s => [s.key, s]));
  assert.deepStrictEqual([...subs.map(s => s.key)].sort().map(String),
    ["exxen", "icloud", "macfit", "netflix", "spotify", "x:KELIME OYUNU", "youtube"]);
  assert.ok(Math.abs(byKey.netflix.change - 0.2174) < 0.001);
  assert.ok(byKey.dogalgaz.vsAvg > 1);
  assert.ok(!subs.some(s => /MIGROS|SHELL|TRENDYOL/.test(s.key)), "tek seferlik harcamalar abonelik sayılmaz");
});

test("mobil uygulamanın ayrıştırıcısı web prototipiyle aynı sonucu verir", () => {
  const mobil = require("../mobile/src/avci.js");
  const web = analyze(parseText(sample).tx);
  const mob = mobil.analyze(mobil.parseText(mobil.SAMPLE).tx);
  assert.deepStrictEqual(mob.subs.map(s => [s.key, s.last]), [...web.subs].map(s => [s.key, s.last]));
  assert.deepStrictEqual(mob.bills.map(s => [s.key, s.last]), [...web.bills].map(s => [s.key, s.last]));
});
