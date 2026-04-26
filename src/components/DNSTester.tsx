"use client";

import { useState, useEffect, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement
} from 'chart.js';
import { RefreshCw, Play, ShieldAlert, Cpu, ServerCrash, Network, Server, Timer, StopCircle, HardDrive, Plus, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

const INITIAL_DNS_PROVIDERS = [
    { id: "google-1", name: "Google (Primary)", ip: "8.8.8.8", fetchFunc: () => fetch(`https://8.8.8.8/resolve?name=example.com&_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', headers: { accept: 'application/dns-json' } }) },
    { id: "google-2", name: "Google (Secondary)", ip: "8.8.4.4", fetchFunc: () => fetch(`https://8.8.4.4/resolve?name=example.com&_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', headers: { accept: 'application/dns-json' } }) },
    { id: "cf-1", name: "Cloudflare (Primary)", ip: "1.1.1.1", fetchFunc: () => fetch(`https://1.1.1.1/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }) },
    { id: "cf-2", name: "Cloudflare (Secondary)", ip: "1.0.0.1", fetchFunc: () => fetch(`https://1.0.0.1/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }) },
    { id: "q9-1", name: "Quad9 (Primary)", ip: "9.9.9.9", fetchFunc: () => fetch(`https://9.9.9.9/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }) },
    { id: "q9-2", name: "Quad9 (Secondary)", ip: "149.112.112.112", fetchFunc: () => fetch(`https://149.112.112.112/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }) },
    { id: "ag-1", name: "AdGuard (Primary)", ip: "94.140.14.14", fetchFunc: () => fetch(`https://94.140.14.14/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }) },
    { id: "ag-2", name: "AdGuard (Secondary)", ip: "94.140.15.15", fetchFunc: () => fetch(`https://94.140.15.15/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }) },
    { id: "nx-1", name: "NextDNS (Primary)", ip: "45.90.28.0", fetchFunc: () => fetch(`https://dns1.nextdns.io/info?_=${Date.now()}`, { cache: 'no-store' }) },
    { id: "nx-2", name: "NextDNS (Secondary)", ip: "45.90.30.0", fetchFunc: () => fetch(`https://dns2.nextdns.io/info?_=${Date.now()}`, { cache: 'no-store' }) }
];

interface TestResult {
    name: string;
    ping: number;
    jitter: number;
    stability: number;
    maxSpike: number;
    speedtest: number;
    ip: string;
}

interface MonitorDataPoint {
    time: string;
    pings: Record<string, number>;
}

interface NextDNSRoute {
    hostname: string;
    ip: string;
}

export default function DNSTester() {
    const [activeTab, setActiveTab] = useState<"dns" | "speedtest">("dns");
    const [providers, setProviders] = useState(INITIAL_DNS_PROVIDERS);
    const [customDnsName, setCustomDnsName] = useState("");
    const [customDnsIp, setCustomDnsIp] = useState("");

    const [testMode, setTestMode] = useState<"fast" | "monitoring">("fast");
    const [isTesting, setIsTesting] = useState(false);
    const [progress, setProgress] = useState(0);

    // Fast Mode State
    const [results, setResults] = useState<TestResult[]>([]);

    // Monitoring State
    const [monitoringData, setMonitoringData] = useState<MonitorDataPoint[]>([]);
    const [timeLeft, setTimeLeft] = useState(300); // 5 mins in seconds
    const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [nextDnsEdge, setNextDnsEdge] = useState<NextDNSRoute | null>(null);

    // Clear monitoring on unmount
    useEffect(() => {
        return () => stopMonitoring();
    }, []);

    const handleAddCustomDns = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customDnsIp || !customDnsName) return;

        const newId = `custom-${Date.now()}`;
        const newProvider = {
            id: newId,
            name: customDnsName,
            ip: customDnsIp,
            fetchFunc: () => fetch(`https://${customDnsIp}/?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' })
        };

        setProviders(prev => [...prev, newProvider]);
        setCustomDnsName("");
        setCustomDnsIp("");
    };

    const removeProvider = (id: string) => {
        setProviders(prev => prev.filter(p => p.id !== id));
    };

    const testNextDNSRoutes = async () => {
        try {
            const resp = await fetch(`https://router.nextdns.io/?_=${Date.now()}`);
            if (!resp.ok) return;
            const data = await resp.json();
            if (data && data.length > 0) {
                setNextDnsEdge(data[0]);
            }
        } catch (e) {
            console.warn("NextDNS router testi başarısız oldu:", e);
        }
    };

    // ============== FAST MODE LOGIC ============== //
    const testProviderFast = async (provider: typeof INITIAL_DNS_PROVIDERS[0]) => {
        const latencies: number[] = [];
        const NUM_TESTS = 10;
        try { await provider.fetchFunc(); } catch (e) { }

        for (let i = 0; i < NUM_TESTS; i++) {
            const start = performance.now();
            try {
                await provider.fetchFunc();
                const end = performance.now();
                latencies.push(end - start);
            } catch (e) {
                const elapsed = performance.now() - start;
                latencies.push(elapsed > 1000 ? 2000 : elapsed);
            }
            await new Promise(r => setTimeout(r, 40));
        }

        const avgPing = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        let jitterSum = 0;
        let spikes = 0;
        let maxSpike = 0;

        for (let i = 1; i < latencies.length; i++) {
            const diff = Math.abs(latencies[i] - latencies[i - 1]);
            jitterSum += diff;
            if (diff > maxSpike) maxSpike = diff;
            if (diff > 40) spikes++;
        }
        const avgJitter = jitterSum / (latencies.length - 1);
        const packetLossScore = latencies.filter(l => l >= 2000).length * 15;
        const spikeScore = spikes * 5;
        const stability = Math.max(0, 100 - packetLossScore - spikeScore - (avgJitter / 1.5));

        // Burst Speedtest
        const speedStart = performance.now();
        await Promise.all([
            provider.fetchFunc().catch(Number),
            provider.fetchFunc().catch(Number),
            provider.fetchFunc().catch(Number)
        ]);
        const speedEnd = performance.now();
        const speedtest = Math.round(speedEnd - speedStart);

        return { name: provider.name, ip: provider.ip, ping: avgPing, jitter: avgJitter, maxSpike, speedtest, stability };
    };

    const startFastTest = async () => {
        setIsTesting(true);
        setResults([]);
        setMonitoringData([]);
        setAiAdvice(null);
        setProgress(0);
        setNextDnsEdge(null);

        await testNextDNSRoutes();

        const newResults: TestResult[] = [];
        for (let i = 0; i < providers.length; i++) {
            const res = await testProviderFast(providers[i]);
            if (res) newResults.push(res);
            setProgress(((i + 1) / providers.length) * 100);
        }

        newResults.sort((a, b) => {
            const scoreA = (a.ping * 0.6) + (a.jitter * 1.4) - (a.stability * 0.4);
            const scoreB = (b.ping * 0.6) + (b.jitter * 1.4) - (b.stability * 0.4);
            return scoreA - scoreB;
        });
        setResults(newResults);
        setIsTesting(false);
    };

    // ============== MONITORING MODE LOGIC ============== //
    const singlePing = async (provider: typeof INITIAL_DNS_PROVIDERS[0]) => {
        const start = performance.now();
        try {
            await provider.fetchFunc();
            return performance.now() - start;
        } catch (e) {
            const elapsed = performance.now() - start;
            return elapsed > 1000 ? 2000 : elapsed;
        }
    };

    const stopMonitoring = () => {
        if (monitorIntervalRef.current) {
            clearInterval(monitorIntervalRef.current);
            monitorIntervalRef.current = null;
        }
        setIsTesting(false);
        setProgress(100);
    };

    const startMonitoring = async () => {
        setIsTesting(true);
        setMonitoringData([]);
        setResults([]);
        setAiAdvice(null);
        setProgress(0);
        setTimeLeft(300);
        setNextDnsEdge(null);

        await testNextDNSRoutes();

        const startTime = Date.now();
        const endTime = startTime + 300 * 1000;

        const tick = async () => {
            const now = Date.now();
            const remaining = Math.round((endTime - now) / 1000);

            if (remaining <= 0) {
                stopMonitoring();
                return;
            }

            setTimeLeft(remaining);
            setProgress(((300 - remaining) / 300) * 100);

            // Parallel Ping all providers for time series point
            const pingPromises = providers.map(p => singlePing(p).then(ping => ({ id: p.id, ping })));
            const pingResults = await Promise.all(pingPromises);

            const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const pingsMap: Record<string, number> = {};
            pingResults.forEach(r => { pingsMap[r.id] = r.ping; });

            setMonitoringData(prev => [...prev, { time: timeStr, pings: pingsMap }]);
        };

        await tick();
        monitorIntervalRef.current = setInterval(tick, 5000);
    };

    // Dynamic Aggregation for Data Table in Monitoring Mode
    const getAggregatedResults = (): TestResult[] => {
        if (testMode === "fast") return results;
        if (monitoringData.length === 0) return [];

        return providers.map(provider => {
            const pings = monitoringData.map(d => d.pings[provider.id]);
            const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
            let maxSpike = 0;
            let jitterSum = 0;
            let spikes = 0;
            for (let i = 1; i < pings.length; i++) {
                const diff = Math.abs(pings[i] - pings[i - 1]);
                jitterSum += diff;
                if (diff > maxSpike) maxSpike = diff;
                if (diff > 40) spikes++;
            }
            const avgJitter = pings.length > 1 ? jitterSum / (pings.length - 1) : 0;
            const packetLossScore = pings.filter(l => l >= 2000).length * 15;
            const spikeScore = spikes * 5;
            const stability = Math.max(0, 100 - packetLossScore - spikeScore - (avgJitter / 1.5));

            return {
                name: provider.name,
                ip: provider.ip,
                ping: avgPing,
                jitter: avgJitter,
                maxSpike,
                speedtest: avgPing,
                stability
            };
        }).sort((a, b) => {
            const scoreA = (a.ping * 0.6) + (a.jitter * 1.4) - (a.stability * 0.4);
            const scoreB = (b.ping * 0.6) + (b.jitter * 1.4) - (b.stability * 0.4);
            return scoreA - scoreB;
        });
    };

    const activeResults = getAggregatedResults();

    const analyzeWithAI = async () => {
        if (activeResults.length === 0) return;
        setIsAnalyzing(true);
        setAiAdvice(null);
        try {
            const payload = {
                mode: testMode,
                results: activeResults,
                nextDnsEdge,
                dataPoints: testMode === 'monitoring' ? monitoringData.length : 10
            };
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                setAiAdvice(data.recommendation);
            } else {
                setAiAdvice(`Hata: ${data.error}`);
            }
        } catch (e) {
            setAiAdvice("Hata: Yapay Zeka servisine iletişim kurulamadı.");
        }
        setIsAnalyzing(false);
    };

    // ============== CHARTS ============== //
    const commonColors = [
        { border: 'rgba(56, 189, 248, 1)', bg: 'rgba(56, 189, 248, 0.4)' }, // Google Pri
        { border: 'rgba(56, 189, 248, 0.4)', bg: 'rgba(56, 189, 248, 0.1)' }, // Google Sec
        { border: 'rgba(234, 179, 8, 1)', bg: 'rgba(234, 179, 8, 0.4)' },  // CF Pri
        { border: 'rgba(234, 179, 8, 0.4)', bg: 'rgba(234, 179, 8, 0.1)' },  // CF Sec
        { border: 'rgba(244, 63, 94, 1)', bg: 'rgba(244, 63, 94, 0.4)' },  // Quad9 Pri
        { border: 'rgba(244, 63, 94, 0.4)', bg: 'rgba(244, 63, 94, 0.1)' },  // Quad9 Sec
        { border: 'rgba(168, 85, 247, 1)', bg: 'rgba(168, 85, 247, 0.4)' }, // AdG Pri
        { border: 'rgba(168, 85, 247, 0.4)', bg: 'rgba(168, 85, 247, 0.1)' }, // AdG Sec
        { border: 'rgba(16, 185, 129, 1)', bg: 'rgba(16, 185, 129, 0.4)' }, // NextDNS Pri
        { border: 'rgba(16, 185, 129, 0.4)', bg: 'rgba(16, 185, 129, 0.1)' }, // NextDNS Sec
    ];

    const monitorChartData = {
        labels: monitoringData.map(d => d.time),
        datasets: providers.map((provider, i) => {
            const colorObj = commonColors[i % commonColors.length];
            return {
                type: 'line' as const,
                label: `${provider.name} (${provider.ip})`,
                data: monitoringData.map(d => d.pings[provider.id]),
                borderColor: colorObj.border,
                backgroundColor: colorObj.bg,
                borderWidth: provider.name.includes("Primary") ? 2 : 1,
                borderDash: provider.name.includes("Secondary") ? [4, 4] : [],
                pointRadius: 1,
                tension: 0.2
            }
        })
    };

    const fastChartData = {
        labels: results.map((r) => r.ip), // IP address directly on x-axis
        datasets: [
            {
                type: 'bar' as const,
                label: 'Ağ Gecikmesi (Ping ms)',
                data: results.map((r) => r.ping),
                backgroundColor: results.map(r => providers.find(p => p.ip === r.ip)?.name.includes("Primary") ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.3)'),
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 1,
                borderRadius: 4,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'Jitter (ms)',
                data: results.map((r) => r.jitter),
                borderColor: 'rgba(192, 132, 252, 1)',
                backgroundColor: 'transparent',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(192, 132, 252, 1)',
                tension: 0.3,
                yAxisID: 'y'
            },
            {
                type: 'line' as const,
                label: 'Stabilite Skoru (%)',
                data: results.map((r) => r.stability),
                borderColor: 'rgba(74, 222, 128, 1)',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointBackgroundColor: 'rgba(74, 222, 128, 1)',
                yAxisID: 'y1'
            }
        ],
    };

    const fastChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        animation: { duration: 500 },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y: { type: 'linear' as const, display: true, position: 'left' as const, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y1: { type: 'linear' as const, display: true, position: 'right' as const, grid: { drawOnChartArea: false }, ticks: { color: '#4ade80' }, min: 0, max: 100 },
        },
        plugins: { legend: { labels: { color: '#f8fafc' } } }
    };

    const monitorChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        animation: { duration: 0 },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', maxTicksLimit: 12 } },
            y: { type: 'linear' as const, title: { display: true, text: "Ping (ms)", color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        },
        plugins: { legend: { labels: { color: '#f8fafc', boxWidth: 15 } } }
    };

    const isDataPresent = testMode === "fast" ? results.length > 0 : monitoringData.length > 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10 px-4 md:px-8 overflow-x-hidden w-full">

            {/* HEADER & TABS */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 md:p-8 text-center space-y-6 shadow-[0_0_50px_rgba(56,189,248,0.1)]">
                <h1 className="text-3xl md:text-5xl font-black neon-text-blue tracking-tighter flex flex-col md:flex-row items-center justify-center md:space-x-4">
                    <span>DNS<span className="text-purple-400">LABS</span> Ops</span>
                    {testMode === "monitoring" && isTesting && <span className="bg-red-500/20 text-red-400 text-xs md:text-sm px-2 py-1 md:px-3 rounded-full animate-pulse flex items-center mt-2 md:mt-0"><div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div> LIVE</span>}
                </h1>
                <p className="text-slate-300 max-w-3xl mx-auto text-sm md:text-lg leading-relaxed">
                    Primary/Secondary (İlkil-İkincil) IP bazlı gerçek zamanlı stres testleri, IP Anycast Edge analizi ve Yapay Zeka destekli Network Optimizasyon Monitörü.
                </p>

                {/* Main Tabs */}
                <div className="flex flex-col md:flex-row justify-center space-y-3 md:space-y-0 md:space-x-4 pt-4 border-t border-slate-700/50">
                    <button
                        onClick={() => setActiveTab("dns")}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${activeTab === "dns" ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)]' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Network className="w-5 h-5" />
                        <span>DNS Test Aracı</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("speedtest")}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${activeTab === "speedtest" ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Globe className="w-5 h-5" />
                        <span>İnternet Hız Testi (Speedtest)</span>
                    </button>
                </div>
            </motion.div>

            {/* SPEEDTEST TAB */}
            {activeTab === "speedtest" && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative mx-auto w-full mt-4">
                    {/* Liquid Glow Underlay */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-teal-400 rounded-[2.5rem] blur-2xl opacity-20 animate-pulse"></div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-emerald-400 to-sky-600 rounded-[2.5rem] blur-3xl opacity-10"></div>

                    {/* Glassmorphism Container */}
                    <div className="relative p-2 md:p-6 bg-slate-900/30 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-[2.5rem] flex flex-col items-center justify-center overflow-hidden">

                        {/* Edge Highlights for Glass effect */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

                        {/* Iframe Wrapper */}
                        <div className="w-full h-[600px] md:h-[700px] rounded-[1.5rem] overflow-hidden bg-slate-950 shadow-inner relative z-10 border border-slate-800/80 backdrop-blur-md" style={{ colorScheme: 'light' }}>
                            <iframe
                                src="https://openspeedtest.com/Get-widget.php"
                                className="w-full h-full border-none opacity-95 hover:opacity-100 transition-opacity duration-700"
                                style={{ filter: 'invert(1) hue-rotate(180deg) contrast(1.15) saturate(1.5) brightness(0.9)' }}
                                allow="fullscreen"
                            ></iframe>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* DNS TAB */}
            {activeTab === "dns" && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* DNS Tester Controls */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 glass-panel p-6 space-y-6">
                            {/* Toggle Mode */}
                            <div className="flex justify-center">
                                <div className="bg-slate-800/50 p-1.5 rounded-full flex flex-col md:flex-row border border-slate-700/50 w-full">
                                    <button
                                        onClick={() => !isTesting && setTestMode("fast")}
                                        className={`flex-1 py-3 md:py-2 px-4 rounded-full text-sm font-bold transition-all ${testMode === "fast" ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'text-slate-400 hover:text-white'} ${isTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >Hızlı IP Testi (10s)</button>
                                    <button
                                        onClick={() => !isTesting && setTestMode("monitoring")}
                                        className={`flex-1 py-3 md:py-2 px-4 mt-2 md:mt-0 md:ml-2 rounded-full text-sm font-bold transition-all ${testMode === "monitoring" ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'text-slate-400 hover:text-white'} ${isTesting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >Tüm Node'ları İzle (5dk)</button>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
                                {testMode === "fast" ? (
                                    <button
                                        onClick={startFastTest}
                                        disabled={isTesting}
                                        className={`relative w-full md:w-auto inline-flex items-center justify-center space-x-2 px-6 py-4 text-base md:text-lg font-bold rounded-full text-white transition-all overflow-hidden ${isTesting ? 'bg-slate-700 cursor-wait' : 'bg-gradient-to-r from-sky-500 hover:from-sky-400 to-indigo-600 hover:to-indigo-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]'}`}
                                    >
                                        {isTesting ? <><RefreshCw className="w-6 h-6 animate-spin" /><span>Analiz Ediliyor... %{Math.round(progress)}</span></> : <><Play className="w-6 h-6" /><span>Detaylı Stres Testine Başla</span></>}
                                        {isTesting && <div className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300" style={{ width: `${progress}%` }} />}
                                    </button>
                                ) : (
                                    <button
                                        onClick={isTesting ? stopMonitoring : startMonitoring}
                                        className={`relative w-full md:w-auto inline-flex items-center justify-center space-x-2 px-6 py-4 text-base md:text-lg font-bold rounded-full text-white transition-all overflow-hidden ${isTesting ? 'bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500/30 text-rose-300' : 'bg-gradient-to-r from-rose-500 hover:from-rose-400 to-orange-600 hover:to-orange-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)]'}`}
                                    >
                                        {isTesting ? <><StopCircle className="w-6 h-6" /><span>İzlemeyi Durdur ({Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')})</span></> : <><Timer className="w-6 h-6" /><span>5 Dakikalık Monitörü Başlat</span></>}
                                        {isTesting && <div className="absolute left-0 top-0 bottom-0 bg-rose-500/10 transition-all duration-300" style={{ width: `${progress}%` }} />}
                                    </button>
                                )}
                            </div>
                        </motion.div>

                        {/* Custom DNS Form */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-6 border border-sky-500/20 bg-sky-900/5 flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-bold flex items-center space-x-2 text-sky-300 mb-4">
                                    <Plus className="w-5 h-5" />
                                    <span>Özel DNS Ekle</span>
                                </h2>
                                <form onSubmit={handleAddCustomDns} className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Sunucu Adı (Örn: Local Pi-Hole)"
                                        value={customDnsName}
                                        onChange={e => setCustomDnsName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
                                    />
                                    <input
                                        type="text"
                                        placeholder="IP Adresi (Örn: 192.168.1.5)"
                                        value={customDnsIp}
                                        onChange={e => setCustomDnsIp(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-sky-500 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isTesting || !customDnsIp || !customDnsName}
                                        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition-colors text-sm"
                                    >
                                        Listeye Ekle
                                    </button>
                                </form>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                                <span className="text-xs text-slate-400">Toplam Test Edilecek:</span>
                                <span className="bg-sky-500/20 text-sky-400 font-bold px-2 py-1 rounded text-xs">{providers.length} Node</span>
                            </div>
                        </motion.div>
                    </div>

                    <AnimatePresence>
                        {isDataPresent && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 w-full max-w-full overflow-x-hidden">

                                {/* Top Stat Row */}
                                {activeResults.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="glass-panel p-6 flex flex-col justify-center border border-emerald-500/30 bg-emerald-900/10 relative overflow-hidden min-h-[140px]">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
                                            <div className="flex items-center space-x-3 md:space-x-4 mb-2 relative z-10">
                                                <HardDrive className="w-6 h-6 md:w-8 md:h-8 text-emerald-400 shrink-0" />
                                                <p className="text-xs md:text-sm text-slate-400 uppercase tracking-widest font-bold">1 Numaralı Port İçin İdeal IP (DNS-1)</p>
                                            </div>
                                            <p className="text-2xl md:text-3xl font-mono tracking-wider font-black text-white pl-9 md:pl-12 relative z-10 break-words">{activeResults[0].ip}</p>
                                            <p className="text-emerald-400/80 text-xs md:text-sm font-bold pl-9 md:pl-12 mt-1 relative z-10">{activeResults[0].name.split('(')[0].trim()} Ağı</p>
                                        </div>
                                        <div className="glass-panel p-6 flex flex-col justify-center relative overflow-hidden min-h-[140px]">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl" />
                                            <div className="flex items-center space-x-3 md:space-x-4 mb-2 relative z-10">
                                                <HardDrive className="w-6 h-6 md:w-8 md:h-8 text-sky-400 shrink-0" />
                                                <p className="text-xs md:text-sm text-slate-400 uppercase tracking-widest font-bold">2 Numaralı Port İçin İdeal IP (DNS-2)</p>
                                            </div>
                                            <p className="text-2xl md:text-3xl font-mono tracking-wider font-black text-white pl-9 md:pl-12 relative z-10 break-words">{activeResults[1] ? activeResults[1].ip : '-'}</p>
                                            <p className="text-sky-400/80 text-xs md:text-sm font-bold pl-9 md:pl-12 mt-1 relative z-10">{activeResults[1] ? activeResults[1].name.split('(')[0].trim() + ' Ağı' : '-'}</p>
                                        </div>
                                        <div className="glass-panel p-6 flex flex-col justify-center border border-red-500/20 bg-red-900/10 min-h-[140px]">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-red-400 shrink-0" />
                                                <p className="text-xs md:text-sm text-slate-400 uppercase tracking-widest font-bold">Kaçınılması Gereken DNS Node</p>
                                            </div>
                                            <p className="text-xl md:text-2xl font-mono font-black text-red-300 pl-9 md:pl-11 break-words">{activeResults[activeResults.length - 1].ip}</p>
                                            <p className="text-red-400/60 text-[10px] md:text-xs font-bold pl-9 md:pl-11 mt-1">Kesinti & Kopma Riski Çok Yüksek!</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Chart */}
                                    <div className="lg:col-span-2 glass-panel p-4 md:p-6 flex flex-col h-[400px] md:h-[500px]">
                                        <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center space-x-2 text-slate-200">
                                            <Network className="w-5 h-5 text-sky-400" />
                                            <span>{testMode === "monitoring" ? `${providers.length}-Node Anycast Yarışı (Live)` : "Bireysel IP Anycast Çıktısı (Live)"}</span>
                                        </h2>
                                        <div className="relative flex-grow w-full">
                                            {testMode === "monitoring" ? (
                                                <Line options={monitorChartOptions as any} data={monitorChartData as any} />
                                            ) : (
                                                <Bar options={fastChartOptions as any} data={fastChartData as any} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Edge Routing Panel */}
                                    <div className="glass-panel p-6 space-y-4 relative overflow-hidden flex flex-col">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
                                        <h2 className="text-base md:text-lg font-bold flex items-center space-x-2 text-purple-300 border-b border-purple-900/50 pb-2">
                                            <ServerCrash className="w-5 h-5 shrink-0" />
                                            <span>Lokasyon / POP Anycast Teşhisi</span>
                                        </h2>
                                        <div className="flex-grow flex flex-col justify-center space-y-3">
                                            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                                                <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Global Anycast Veri Merkezi</p>
                                                {nextDnsEdge ? (
                                                    <p className="text-[12px] md:text-[14px] font-mono text-emerald-400 break-all">{nextDnsEdge.hostname}</p>
                                                ) : (
                                                    <p className="text-xs md:text-sm text-amber-500 font-mono italic">Hazırlanıyor / Test Ediliyor...</p>
                                                )}
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                                                <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Tünel BGP Çıkış IP Adresi</p>
                                                {nextDnsEdge ? (
                                                    <p className="text-base md:text-lg font-mono text-emerald-400">{nextDnsEdge.ip}</p>
                                                ) : (
                                                    <p className="text-xs md:text-sm text-slate-500 italic">Bulunamadı</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-purple-900/20 p-4 rounded-xl text-[10px] md:text-xs text-purple-200 border border-purple-800/50">
                                            <p><strong>Biliyor muydunuz?</strong> Bulut güvenlik mimarileri (Google DNS, Cloudflare, Quad9), güvenlik ve CORS kuralları gereği hangi veri merkezi (datacenter) binasından hizmet verdiğinizi tarayıcılarınıza gizler. Şeffaf Anycast uç noktasına sadece `router.nextdns.io` izin verir ve ağınızın BGP haritasını size çıkartır.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Comprehensive Data Table */}
                                {activeResults.length > 0 && (
                                    <div className="glass-panel overflow-hidden border border-slate-700/50 mt-8 w-full">
                                        <div className="p-4 md:p-5 border-b border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
                                            <h2 className="text-base md:text-lg font-bold flex items-center space-x-2 text-slate-200">
                                                <Server className="w-5 h-5 text-indigo-400" />
                                                <span>Bireysel IP (Node) Karşılaştırma Sonuçları</span>
                                            </h2>
                                            {testMode === "monitoring" && <span className="bg-slate-700 text-slate-300 px-2 py-1 md:px-3 rounded text-[10px] md:text-xs font-mono">{monitoringData.length} Çekim</span>}
                                        </div>
                                        <div className="w-full overflow-x-auto p-2 md:p-4 custom-scrollbar">
                                            <table className="w-full text-left text-xs md:text-sm whitespace-nowrap">
                                                <thead>
                                                    <tr className="text-slate-400 border-b border-slate-700/50">
                                                        <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider">DNS-Rolü</th>
                                                        <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider">Sunucu IP Adresi</th>
                                                        <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider text-right text-sky-300">Ortalama Gecikme (Ping)</th>
                                                        {testMode === "fast" && <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider text-right">Burst Kapasitesi</th>}
                                                        <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider text-right text-purple-300">Ani Kopma (Max Spike)</th>
                                                        <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider text-right text-purple-300">Jitter (Dalgalanma)</th>
                                                        <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider text-right text-emerald-300">Stabilite</th>
                                                        <th className="px-3 md:px-4 py-2 md:py-3 font-semibold tracking-wider text-center">İşlem</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/50">
                                                    {activeResults.map((r, i) => {
                                                        const originalProvider = providers.find(p => p.ip === r.ip);
                                                        const isCustom = originalProvider?.id.startsWith("custom-");
                                                        return (
                                                            <tr key={i} className={`transition-colors ${i === 0 ? 'bg-emerald-900/10 border-l-4 border-l-emerald-500' : i === 1 ? 'bg-sky-900/10 border-l-4 border-l-sky-500' : 'hover:bg-slate-800/40 border-l-4 border-l-transparent'}`}>
                                                                <td className="px-3 md:px-4 py-2 md:py-3 text-slate-200 font-bold">{r.name}</td>
                                                                <td className={`px-3 md:px-4 py-2 md:py-3 font-mono font-bold tracking-wider ${i === 0 ? 'text-emerald-400' : i === 1 ? 'text-sky-400' : 'text-slate-400'}`}>{r.ip}</td>
                                                                <td className={`px-3 md:px-4 py-2 md:py-3 font-mono text-right ${i === 0 ? 'text-emerald-300 font-black' : 'text-sky-300'}`}>{r.ping.toFixed(1)} ms</td>
                                                                {testMode === "fast" && <td className="px-3 md:px-4 py-2 md:py-3 text-yellow-400 font-mono font-bold text-right">{r.speedtest} ms</td>}
                                                                <td className={`px-3 md:px-4 py-2 md:py-3 font-mono text-right ${r.maxSpike > 50 ? 'text-red-400 border-r border-red-500/20 bg-red-500/5' : 'text-slate-300'}`}>{r.maxSpike.toFixed(1)} ms</td>
                                                                <td className={`px-3 md:px-4 py-2 md:py-3 font-mono text-right ${r.jitter > 20 ? 'text-red-400' : 'text-slate-300'}`}>{r.jitter.toFixed(1)} ms</td>
                                                                <td className={`px-3 md:px-4 py-2 md:py-3 font-mono text-right ${i === 0 ? 'text-emerald-300 font-black' : 'text-emerald-400 font-bold'}`}>%{r.stability.toFixed(1)}</td>
                                                                <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                                                                    {isCustom && !isTesting && (
                                                                        <button
                                                                            onClick={() => removeProvider(originalProvider!.id)}
                                                                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-500/10 rounded transition-colors"
                                                                        >
                                                                            Sil
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* AI Action */}
                                <div className="glass-panel p-4 md:p-6 text-center mt-6">
                                    <button
                                        onClick={analyzeWithAI}
                                        disabled={isAnalyzing || isTesting} // Don't analyze while actively testing
                                        className={`inline-flex items-center justify-center space-x-2 md:space-x-3 px-6 md:px-8 py-3 md:py-4 ${isTesting ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'} transition-all rounded-xl font-bold text-white w-full md:w-auto text-sm md:text-base`}
                                    >
                                        {isAnalyzing ? (
                                            <><RefreshCw className="w-5 h-5 animate-spin" /><span>Analiz ediliyor...</span></>
                                        ) : (
                                            <><Cpu className="w-5 h-5 md:w-6 md:h-6 animate-pulse" /><span>Yapay Zeka İle {testMode === "monitoring" ? "İdeal Raporu Al" : "Kompleks Analiz Oluştur"}</span></>
                                        )}
                                    </button>
                                    {testMode === "monitoring" && isTesting && <p className="text-[10px] md:text-xs text-rose-400 mt-3 animate-pulse">Analiz oluşturabilmek için izlemenin tamamlanmasını veya durdurulmasını bekleyin.</p>}
                                </div>

                                {aiAdvice && (
                                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 md:p-8 relative border-purple-500/40 mt-6">
                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-sky-500 to-emerald-500" />
                                        <h2 className="text-xl md:text-2xl font-black mb-6 flex items-center space-x-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-sky-400">
                                            <Cpu className="w-6 h-6 md:w-8 md:h-8 text-purple-400 shrink-0" />
                                            <span>Executive IP Routing Report</span>
                                        </h2>
                                        <div className="prose prose-invert prose-sm md:prose-lg max-w-none w-full overflow-x-auto break-words
                                        prose-h2:text-sky-300 prose-h3:text-purple-300
                                        prose-p:text-slate-300 prose-p:leading-loose 
                                        prose-strong:text-emerald-300 prose-strong:font-black
                                        prose-ul:text-slate-300 prose-li:marker:text-sky-500">
                                            <ReactMarkdown>{aiAdvice}</ReactMarkdown>
                                        </div>
                                    </motion.div>
                                )}

                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
