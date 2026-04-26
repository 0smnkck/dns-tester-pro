<div align="center">

# 🌐 DNS Tester Pro

**DNS LABS Ops** — Gerçek zamanlı DNS performans analizi, Anycast edge teşhisi ve Yapay Zeka destekli ağ optimizasyon aracı.

**[🚀 CANLI UYGULAMA](https://dns-tester-pro--dns-tester-pro-61746.europe-west4.hosted.app/)**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini--3.1-AI-8B5CF6?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Özellikler

| Özellik | Açıklama |
|---|---|
| ⚡ **Hızlı IP Testi** | 10 farklı DNS sunucusunu ~10 saniyede test eder, ping/jitter/stabilite ölçer |
| 📡 **Gerçek Zamanlı İzleme** | 5 dakika boyunca tüm node'ları eş zamanlı olarak izler, anlık grafikler sunar |
| 🤖 **Gemini 3.1 AI Analizi** | En yeni Gemini 3.1 Flash Lite modeli ile derinlemesine Türkçe ağ analizi ve rehberlik |
| 🌍 **Anycast Teşhisi** | NextDNS yönlendirme verisi ile size en yakın global veri merkezini tespit eder |
| ➕ **Özel DNS Ekleme** | Kendi DNS sunucularınızı (ör. Pi-Hole) listeye ekleyip test edebilirsiniz |
| 🚀 **İnternet Hız Testi** | Entegre Speedtest widgeti ile download/upload/ping ölçümü |
| 📱 **Tam Responsive** | Mobil, tablet ve masaüstünde kusursuz çalışır |
| 🔒 **Rate Limiting** | Herkese açık deployment için API koruması (dakikada 5 istek/IP) |

---

## 🖥️ Ekran Görüntüleri

> Uygulama karanlık tema, glassmorphism efektleri ve neon renk paleti ile tasarlanmıştır.

---

## 🧰 Teknoloji Yığını

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Dil:** TypeScript
- **Stil:** Tailwind CSS v4 + Vanilla CSS (Glassmorphism)
- **Grafikler:** [Chart.js](https://www.chartjs.org/) + [react-chartjs-2](https://react-chartjs-2.js.org/)
- **Animasyonlar:** [Framer Motion](https://www.framer.motion.com/)
- **AI:** [Google Gemini API](https://ai.google.dev/) (`gemini-3.1-flash-lite-preview`)
- **İkonlar:** [Lucide React](https://lucide.dev/)

---

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+
- npm / yarn / pnpm
- Google Gemini API anahtarı ([buradan ücretsiz alın](https://aistudio.google.com/apikey))

### Adımlar

```bash
# 1. Repoyu klonlayın
git clone https://github.com/0smnkck/dns-tester-pro.git
cd dns-tester-pro

# 2. Bağımlılıkları yükleyin
npm install

# 3. Ortam değişkenlerini ayarlayın
cp .env.example .env.local
# .env.local dosyasını açıp GEMINI_API_KEY alanını doldurun

# 4. Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

---

## 🔑 Ortam Değişkenleri

Projeyi çalıştırmak için `.env.local` dosyası oluşturup aşağıdaki değişkeni ekleyin:

```env
# Gemini API Key - https://aistudio.google.com/apikey
GEMINI_API_KEY="BURAYA_GEMINI_API_KEY_YAZIN"
```

> ⚠️ `.env.local` dosyasını **asla GitHub'a yüklemeyin.** Bu repo zaten `.gitignore` ile koruma altındadır.

---

## 🌐 Test Edilen DNS Sağlayıcıları

Uygulama varsayılan olarak aşağıdaki 10 DNS node'unu test eder:

| Sağlayıcı | Birincil IP | İkincil IP |
|---|---|---|
| Google | `8.8.8.8` | `8.8.4.4` |
| Cloudflare | `1.1.1.1` | `1.0.0.1` |
| Quad9 | `9.9.9.9` | `149.112.112.112` |
| AdGuard DNS | `94.140.14.14` | `94.140.15.15` |
| NextDNS | `45.90.28.0` | `45.90.30.0` |

---

## 📐 Proje Yapısı

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts     # Gemini AI 3.1 endpoint (rate-limited)
│   │   ├── globals.css          # Glassmorphism tema
│   │   ├── layout.tsx           # PWA meta & font ayarları
│   │   └── page.tsx             # Ana sayfa
│   └── components/
│       └── DNSTester.tsx        # Ana bileşen (~730 satır)
├── public/
│   ├── manifest.json            # PWA manifest
│   └── favicon.ico
├── apphosting.yaml              # Firebase App Hosting config
├── firebase.json                # Firebase config
├── .env.example                 # Örnek ortam değişkenleri
└── .gitignore
```

---

## 🔒 Güvenlik

- API anahtarı sadece sunucu tarafında (`/api/analyze`) kullanılır, istemciye asla açılmaz.
- `/api/analyze` endpoint'i rate-limited: Her IP adresi **dakikada 5 istek** ile sınırlıdır.
- Proje dosyaları Firebase Secrets Manager ile korunmaktadır.

---

## 🤝 Katkı

Pull request ve önerilerinize açığız!

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<div align="center">

Yapay Zeka destekli ağ optimizasyon aracı ile internetinizi en verimli şekilde kullanın.

**[🌐 Canlı Demo](https://dns-tester-pro--dns-tester-pro-61746.europe-west4.hosted.app/)** · **[🐛 Bug Bildir](../../issues)** · **[💡 Özellik İste](../../issues)**

</div>
