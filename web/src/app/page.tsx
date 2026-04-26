import DNSTester from "@/components/DNSTester";

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-24 bg-transparent text-slate-100 flex flex-col justify-center">
      <DNSTester />
    </main>
  );
}
