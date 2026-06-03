export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-slate-800">ヘルプ</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        {[
          { q: "タスクはどうやって割り当てられますか？", a: "社長がAI秘書に指示を出し、AIが各部門AIを通じてタスクを自動生成・割り当てます。" },
          { q: "ポイントはいつ確定しますか？", a: "タスク完了後、管理者がレビューを行い確定します。確定後に給与計算に反映されます。" },
          { q: "タスクマーケットとは？", a: "担当が難しいタスクを他のメンバーに引き継ぐための会社承認付き再配分機能です。" },
          { q: "給与見込みはどう計算されますか？", a: "基本給 + ポイント報酬 + 品質ボーナスの合計です。社長の最終承認後に確定します。" },
        ].map(({ q, a }) => (
          <div key={q} className="py-3 border-b border-slate-100 last:border-0">
            <p className="text-sm font-semibold text-slate-800 mb-1">{q}</p>
            <p className="text-sm text-slate-500">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
