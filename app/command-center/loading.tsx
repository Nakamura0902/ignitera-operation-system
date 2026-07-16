export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
      <span className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-[#b08d57] rounded-full mr-2" />
      読み込み中...
    </div>
  );
}
