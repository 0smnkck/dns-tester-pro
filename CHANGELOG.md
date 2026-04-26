# DNS Tester Pro — Sürüm Geçmişi

Bu dosya projedeki tüm önemli değişiklikleri [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardında belgeler.
Bu proje [Semantic Versioning](https://semver.org/lang/tr/) kullanmaktadır.

---

## [1.1.0] — 2026-04-26

### ✨ İyileştirmeler ve Yenilikler
- 🤖 **Gemini 3.1 Flash Lite:** Analiz motoru en yeni ve hızlı Gemini 3.1 modeline güncellendi.
- 📁 **Dosya Yapısı Optimizasyonu:** Firebase App Hosting uyumluluğu için tüm proje dosyaları ana dizine taşındı.
- 🚀 **Dağıtım Kararlılığı:** Derleme hataları giderildi ve canlı ortam performansı artırıldı.

---

## [1.0.0] — 2026-04-26

### 🎉 İlk Sürüm (Initial Release)

#### Eklenenler
- ⚡ **Hızlı IP Testi (10s):** 10 farklı DNS node'unu ~10 saniyede test eder; ortalama ping, jitter, max spike ve stabilite skoru hesaplar.
- 📡 **Gerçek Zamanlı İzleme (5dk):** Tüm DNS node'larını 5 dakika boyunca eş zamanlı izler ve anlık çizgi grafik üzerinde gösterir.
- 🤖 **Gemini AI Analizi:** Test sonuçlarını Google Gemini Flash'a göndererek kullanıcıya özel, anlaşılır Türkçe DNS analizi ve adım adım DNS değiştirme rehberi üretir.
- 🌍 **Anycast Edge Teşhisi:** `router.nextdns.io` aracılığıyla kullanıcının bağlandığı küresel veri merkezini (BGP hop) tespit eder.
- ➕ **Özel DNS Ekleme:** Kullanıcılar kendi DNS sunucularını (örn. yerel Pi-Hole) arayüzden ekleyip test edebilir.
- 🚀 **İnternet Hız Testi:** OpenSpeedtest iframe entegrasyonu ile download/upload/ping/jitter ölçümü; dark tema CSS filtresiyle uygulamanın tasarımına uyarlanmış.
- 📊 **Karşılaştırma Tablosu:** Tüm node'lar için ping, jitter, max spike, burst kapasitesi ve stabilite skorunu gösteren detaylı tablo.
- 📱 **Tam Responsive Tasarım:** Mobil, tablet ve masaüstünde kusursuz görüntüleme; flex-col/grid breakpoint yapısı.
- 🔒 **API Rate Limiting:** `/api/analyze` endpoint'i dakikada 5 istek/IP sınırı ile korunmaktadır.
- 🎨 **Glassmorphism Tasarım:** Karanlık tema, neon renk paleti, backdrop-blur efektleri ve Framer Motion animasyonları.
- 📦 **PWA Desteği:** Web manifest ile ana ekrana eklenebilir uygulama desteği.

#### Desteklenen DNS Sağlayıcıları (Varsayılan)
- Google DNS (`8.8.8.8`, `8.8.4.4`)
- Cloudflare (`1.1.1.1`, `1.0.0.1`)
- Quad9 (`9.9.9.9`, `149.112.112.112`)
- AdGuard DNS (`94.140.14.14`, `94.140.15.15`)
- NextDNS (`45.90.28.0`, `45.90.30.0`)

#### Teknik Altyapı
- Next.js 16.2.1 (App Router, Turbopack)
- TypeScript 5.x
- Tailwind CSS v4
- Chart.js 4.x + react-chartjs-2
- Framer Motion 12.x
- Google Gemini API (`@google/genai`)
- Lucide React ikonlar
- React Markdown

---

*Gelecek sürümler için [Issues](../../issues) bölümünden önerinizi paylaşabilirsiniz.*
