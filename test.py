import socket
import time
import struct
import urllib.request
import statistics

# Test edilecek DNS Sunucu Listesi (NextDNS ve en popüler/hızlı alternatifler)
DNS_SERVERS = {
    "NextDNS (Birincil)": "45.90.28.0",
    "NextDNS (İkincil)": "45.90.30.0",
    "Cloudflare (Birincil)": "1.1.1.1",
    "Cloudflare (İkincil)": "1.0.0.1",
    "Google DNS (Birincil)": "8.8.8.8",
    "Google DNS (İkincil)": "8.8.4.4",
    "Quad9 (Güvenlikli)": "9.9.9.9",
    "AdGuard DNS": "94.140.14.14",
    "OpenDNS": "208.67.222.222",
    "Türk Telekom": "195.175.39.39",
    "Turkcell Superonline": "212.252.114.8",
    "TurkNet": "31.31.31.31"
}

def measure_dns_latency(dns_ip, target_domain="google.com", num_tests=5):
    """
    Belirtilen DNS sunucusuna UDP üzerinden gerçek bir DNS sorgusu gönderir 
    ve gecikmeyi (ping) ölçer.
    """
    # Basit bir DNS A kaydı sorgu paketi oluşturuyoruz
    # Header: Transaction ID (0x1234), Flags (0x0100 - Standart Sorgu), QDCOUNT (1), vs.
    packet = struct.pack("!HHHHHH", 0x1234, 0x0100, 1, 0, 0, 0)
    
    # Sorgu gövdesi: domain formatı (örn: 6google3com0)
    for part in target_domain.split("."):
        packet += struct.pack("!B", len(part)) + part.encode('utf-8')
    packet += struct.pack("!B", 0) # Kapanış baytı
    packet += struct.pack("!HH", 1, 1) # QTYPE: A (1), QCLASS: IN (1)
    
    latencies = []
    
    for _ in range(num_tests):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(2.0) # 2 saniye zaman aşımı
        try:
            start_time = time.perf_counter()
            sock.sendto(packet, (dns_ip, 53))
            _ = sock.recvfrom(1024)
            end_time = time.perf_counter()
            latencies.append((end_time - start_time) * 1000) # ms cinsinden
        except socket.timeout:
            pass # Zaman aşımı durumunda listeye eklemiyoruz
        except Exception:
            pass
        finally:
            sock.close()
            
    if not latencies:
        return None, None
        
    avg_latency = statistics.mean(latencies)
    jitter = statistics.stdev(latencies) if len(latencies) > 1 else 0.0
    
    return avg_latency, jitter

def check_nextdns_routing():
    """NextDNS'in kullanıcının konumuna özel Anycast yönlendirme durumunu gösterir."""
    print("\n[🔎] NextDNS Yönlendirme ve Sunucu Durumu (ping.nextdns.io)")
    print("Bu bölüm NextDNS'in size en yakın hangi sunucudan (örn. İstanbul) hizmet verdiğini gösterir:\n")
    try:
        req = urllib.request.Request("https://ping.nextdns.io/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read().decode('utf-8')
            print(content.strip())
            print("-" * 60 + "\n")
    except Exception as e:
        print(f"NextDNS yönlendirme bilgisi alınamadı: {e}\n")

def main():
    print("=" * 77)
    print("🚀 OYUNLAR İÇİN DNS GECİKME (PING) VE JITTER TESTİ 🚀")
    print("=" * 77)
    print("Bu test, Türkiye lokasyonu için popüler DNS sunucularına gerçek sorgular gönderir.")
    print("Oyunlar için önemli olan iki metrik ölçülür:")
    print("1. Ortalama Gecikme (ms): Sunucunun yanıt verme hızı (Ping).")
    print("2. Jitter (ms): Bağlantı dalgalanması. Ne kadar düşükse oyun içi 'anlık donma' o kadar az olur.\n")
    
    check_nextdns_routing()
    
    results = []
    
    print(f"{'Sunucu Adı':<25} | {'IP Adresi':<15} | {'Ortalama (ms)':<15} | {'Jitter (Dalgalanma)':<15}")
    print("-" * 80)
    
    for name, ip in DNS_SERVERS.items():
        avg, jitter = measure_dns_latency(ip)
        
        if avg is not None:
            results.append({
                "name": name,
                "ip": ip,
                "avg": avg,
                "jitter": jitter
            })
            print(f"{name:<25} | {ip:<15} | {avg:>10.2f} ms   | {jitter:>10.2f} ms")
        else:
             print(f"{name:<25} | {ip:<15} | {'ZAMAN AŞIMI/HATA':<15} | {'-':<15}")
             
    print("-" * 80)
    
    if results:
        # En düşük gecikmeye göre sırala
        results.sort(key=lambda x: x["avg"])
        best = results[0]
        print("\n\n🏆 SONUÇ DEĞERLENDİRMESİ 🏆")
        print(f"⚡ Oyunlar ve internet hızı için EN HIZLI DNS Sunucusu: \n   => {best['name']} ({best['ip']}) - {best['avg']:.2f} ms")
        
        # Jitter değerlendirmesi
        results.sort(key=lambda x: x["jitter"])
        best_jitter = results[0]
        print(f"\n🎯 Bağlantı stabilitesi (En Düşük Dalgalanma/Jitter) açısından EN İYİSİ: \n   => {best_jitter['name']} ({best_jitter['ip']}) - {best_jitter['jitter']:.2f} ms")
        
        print("\n💡 TAVSİYE: ")
        print("- Eğer NextDNS ilk 2-3 sunucu arasında yer alıyorsa, sağladığı güvenlik, reklam engelleme")
        print("  ve izleyici engelleme özellikleri nedeniyle NextDNS'te kalmanız şiddetle tavsiye edilir.")
        print("- Eğer NextDNS diğerlerinden çok  yavaşsa (örn. 30-40+ ms fark varsa) ve özellikle")
        print("  rekabetçi oyunlar oynuyorsanız (Valorant, CS:GO vb.), işletim sisteminizin IPv4 DNS")
        print("  ayarlarına 'En Hızlı' çıkan DNS adresini yazabilirsiniz.")

if __name__ == "__main__":
    main()