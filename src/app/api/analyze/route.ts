import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// --- Rate Limiting (In-Memory) ---
// Her IP için dakikada maksimum 5 istek
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 dakika
const MAX_REQUESTS_PER_WINDOW = 5;

const requestLog = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(ip);

  if (!entry || now > entry.resetTime) {
    requestLog.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  entry.count++;
  return false;
}

// Eski kayıtları periyodik olarak temizle (bellek sızıntısını önle)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestLog.entries()) {
    if (now > entry.resetTime) {
      requestLog.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Her 5 dakikada bir

// --- API Route ---
export async function POST(req: NextRequest) {
  try {
    // Rate limit kontrolü
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Çok fazla istek gönderildi. Lütfen 1 dakika bekleyip tekrar deneyin." },
        { status: 429 }
      );
    }

    const { mode, results, nextDnsEdge, dataPoints } = await req.json();

    // Input validation
    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "Geçersiz test verileri." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "BURAYA_GEMINI_API_KEY_YAZIN") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY bulunamadı veya değiştirilmedi. Lütfen .env.local dosyasına kendi keyinizi ekleyin." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Assuming results are already sorted best to worst by the frontend
    const sortedByScore = results;
    const bestPrimary = sortedByScore[0];
    const bestSecondary = sortedByScore[1];
    const worstNode = sortedByScore[sortedByScore.length - 1];

    let prompt = "";

    const basePersona = `Şu andan itibaren yardımsever, anlaşılır ve teknik konuları son kullanıcıya basitçe anlatan bir 'İnternet ve Ağ Uzmanı' gibi davran. Kullanıcıyı teknik jargona boğmadan (Örn: pingin oyunlardaki gecikme, jitterin dalgalanma olduğunu basitçe anlatarak) internetinin durumu ve DNS ayarları hakkında tavsiyelerde bulunacaksın.
Senden Markdown formatında ve şu 4 ana başlığı (Eminolarla birlikte) içeren bir rehber oluşturmanı istiyorum:
1. 🔍 **Mevcut İnternet Durumunuz:** Gelen verilerdeki Ping, Jitter ve Stabilite durumlarını yorumla.
2. 🏆 **Sizin İçin En İdeal DNS Adresleri:** Listenin en başındaki 1. ve 2. IP adreslerini belirt. Neden bu ikisinin seçildiğini (yedeklilik veya hız açısından) çok basit bir dille anlat. 
3. ⚠️ **Uzak Durmanız Gereken Sunucu:** Listenin en sonundaki sunucuyu belirtip neden kullanılmaması gerektiğini (Kopma riski vb.) kısaca açıkla.
4. 🛠️ **Adım Adım DNS Değiştirme Rehberi:** Seçtiğin en iyi 1. (Birincil) ve 2. (İkincil) IP adreslerini, bir Windows bilgisayarda, Telefonda (iOS/Android) veya Wi-Fi Modem arayüzünde nasıl değiştirebileceklerine dair adım adım ve çok net bir kullanım kılavuzu ver.`;

    if (mode === "monitoring") {
        prompt = `${basePersona}

Aşağıda kullanıcının ağı üzerinden tam 5 dakika boyunca gerçek zamanlı izleme yapılarak elde edilen DNS performans testi sonuçları var:

TEST EDİLEN DNS SUNUCULARI (En iyiden en kötüye sıralı):
${results.map((r: any, i: number) => `${i+1}. ${r.name} - IP: [${r.ip}] | Ortalama Ping: ${r.ping.toFixed(1)}ms | Dalgalanma (Jitter): ${r.jitter.toFixed(1)}ms | Anlık Kopma: ${r.maxSpike.toFixed(1)}ms | Stabilite: %${r.stability.toFixed(1)}\n`).join("")}

${nextDnsEdge ? `Ek Bilgi (Lokal Sunucu Bağlantısı): Kullanıcı şu anda ${nextDnsEdge.hostname} merkezine (${nextDnsEdge.ip}) bağlı.` : ""}

Lütfen yukarıdaki 4 başlık kuralına tam olarak uyarak kullanıcıya dostane ve yönlendirici bir rapor hazırla. 
Sizin için seçilen 1. IP: ${bestPrimary.ip}
Sizin için seçilen 2. IP: ${bestSecondary.ip}
En Kötü IP: ${worstNode.ip}`;

    } else {
        prompt = `${basePersona}

Aşağıda kullanıcının ağı üzerinden hızlı bir stres testi yapılarak (10 saniyelik anlık anket) elde edilen DNS performans testi sonuçları var:

TEST EDİLEN DNS SUNUCULARI (En iyiden en kötüye sıralı):
${results.map((r: any, i: number) => `${i+1}. ${r.name} - IP: [${r.ip}] | Ortalama Ping: ${r.ping.toFixed(1)}ms | Burst Kapasitesi: ${r.speedtest}ms | Anlık Kopma: ${r.maxSpike.toFixed(1)}ms | Stabilite: %${r.stability.toFixed(1)}\n`).join("")}

${nextDnsEdge ? `Ek Bilgi (Lokal Sunucu Bağlantısı): Kullanıcı şu anda ${nextDnsEdge.hostname} merkezine (${nextDnsEdge.ip}) bağlı.` : ""}

Lütfen yukarıdaki 4 başlık kuralına tam olarak uyarak kullanıcıya dostane ve yönlendirici bir rapor hazırla. 
Sizin için seçilen 1. IP: ${bestPrimary.ip}
Sizin için seçilen 2. IP: ${bestSecondary.ip}
En Kötü IP: ${worstNode.ip}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    const recommendation = response.text || "Yapay zeka analiz sonucu üretemedi.";

    return NextResponse.json({ recommendation });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    return NextResponse.json(
      { error: "Analiz sırasında bir hata oluştu: " + err.message },
      { status: 500 }
    );
  }
}
