import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10 text-center">
      <div className="font-jp text-6xl mb-4 text-accent2">迷</div>
      <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
      <p className="text-white/40 text-sm mb-8">
        That page doesn&apos;t exist — maybe it was a wrong kanji?
      </p>
      <Link href="/">
        <button className="btn-primary" style={{ width: "auto", padding: "12px 32px" }}>
          Back to home
        </button>
      </Link>
    </main>
  );
}
