import ManpowerApp from "@/components/ManpowerApp";

// Pure Server Component — no props, no functions, no client state here.
// All client-side logic lives in ManpowerApp ("use client").
export default function Home() {
  return (
    <main className="min-h-screen bg-[#050507]">
      <ManpowerApp />
    </main>
  );
}
