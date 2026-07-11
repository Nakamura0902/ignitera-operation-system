export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0f1b3a, #1e2a4a)" }}>
            <span className="text-[#c9a86a] font-bold text-sm">I</span>
          </div>
          <div className="leading-tight">
            <p className="text-slate-800 font-semibold text-sm tracking-wide">IGNITERA</p>
            <p className="text-[10px] text-slate-400">事業支援 / 集客導線設計</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {children}
      </main>

      <footer className="max-w-2xl mx-auto px-6 pb-10">
        <p className="text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} IGNITERA Inc.
        </p>
      </footer>
    </div>
  );
}
