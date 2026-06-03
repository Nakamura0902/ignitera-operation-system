import Link from "next/link";
import { Receipt, AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";
import { adminSupabase } from "@/lib/supabase/admin";
import { getInvoiceStatusColor } from "@/lib/status-utils";

const invoiceStatusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送付済み",
  paid: "入金済み",
  overdue: "延滞",
  cancelled: "キャンセル",
};

interface InvoiceRow {
  id: string; invoiceNumber: string; client: string; project: string;
  dueDate: string; amount: number; status: string; statusLabel: string;
}

interface RevenueEntry { month: string; amount: number; }

async function fetchAccountingData() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [{ data: invoices }, { data: paidInvoices }] = await Promise.all([
    adminSupabase
      .from("invoices")
      .select(`
        id, invoice_number, amount, total_amount, status, due_date,
        clients (company_name),
        projects (name)
      `)
      .order("due_date", { ascending: true })
      .limit(20),
    adminSupabase
      .from("invoices")
      .select("total_amount, paid_date")
      .eq("status", "paid")
      .gte("paid_date", sixMonthsAgo.toISOString().split("T")[0]),
  ]);

  const invoiceRows: InvoiceRow[] = (invoices ?? []).map((inv) => {
    const client = inv.clients as { company_name?: string } | null;
    const project = inv.projects as { name?: string } | null;
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      client: client?.company_name ?? "不明",
      project: project?.name ?? "案件なし",
      dueDate: inv.due_date,
      amount: Number(inv.total_amount ?? inv.amount ?? 0),
      status: inv.status,
      statusLabel: invoiceStatusLabels[inv.status] ?? inv.status,
    };
  });

  // 月次売上の集計（過去6ヶ月）
  const monthMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getMonth() + 1}月`;
    monthMap.set(key, 0);
  }

  for (const inv of paidInvoices ?? []) {
    if (!inv.paid_date) continue;
    const d = new Date(inv.paid_date);
    const key = `${d.getMonth() + 1}月`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(inv.total_amount ?? 0));
    }
  }

  const revenueHistory: RevenueEntry[] = Array.from(monthMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));

  return { invoiceRows, revenueHistory };
}

export default async function AccountingPage() {
  const { invoiceRows, revenueHistory } = await fetchAccountingData();

  const totalBilled = invoiceRows.reduce((s, inv) => s + inv.amount, 0);
  const totalPaid = invoiceRows.filter((inv) => inv.status === "paid").reduce((s, inv) => s + inv.amount, 0);
  const totalOverdue = invoiceRows.filter((inv) => inv.status === "overdue").reduce((s, inv) => s + inv.amount, 0);
  const maxRevenue = revenueHistory.length > 0 ? Math.max(...revenueHistory.map((r) => r.amount), 1) : 1;

  const lastRevenue = revenueHistory[revenueHistory.length - 1]?.amount ?? 0;
  const prevRevenue = revenueHistory[revenueHistory.length - 2]?.amount ?? 0;
  const growthPct = prevRevenue > 0 ? (((lastRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt size={20} className="text-purple-600" /> 経理・請求ダッシュボード
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">請求・入金・キャッシュフローの概況</p>
        </div>
        {totalOverdue > 0 && (
          <span className="text-[10px] px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full font-semibold">
            ⚠ 未入金 ¥{(totalOverdue / 10000).toFixed(0)}万
          </span>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "今月の請求総額", value: `¥${(totalBilled / 10000).toFixed(0)}万`, sub: "全請求書の合計", color: "#2563eb" },
          { label: "入金済み", value: `¥${(totalPaid / 10000).toFixed(0)}万`, sub: "確認済み入金", color: "#059669" },
          { label: "未入金（要対応）", value: `¥${(totalOverdue / 10000).toFixed(0)}万`, sub: "督促が必要", color: "#ef4444" },
          { label: "前月比売上", value: `${Number(growthPct) >= 0 ? "+" : ""}${growthPct}%`, sub: "直近2ヶ月比較", color: "#7c3aed" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-2">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">

          {/* 請求書一覧 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">請求書一覧</h2>
            {invoiceRows.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">請求書データがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="text-left pb-3 font-medium">請求書番号</th>
                      <th className="text-left pb-3 font-medium">クライアント</th>
                      <th className="text-left pb-3 font-medium">案件</th>
                      <th className="text-left pb-3 font-medium">期日</th>
                      <th className="text-right pb-3 font-medium">金額</th>
                      <th className="text-center pb-3 font-medium">状態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceRows.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 text-xs font-mono text-slate-500">{inv.invoiceNumber}</td>
                        <td className="py-3">
                          <p className="font-medium text-slate-800">{inv.client}</p>
                        </td>
                        <td className="py-3 text-xs text-slate-500 max-w-[160px] truncate">{inv.project}</td>
                        <td className="py-3">
                          <p className="text-xs text-slate-600">{inv.dueDate}</p>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-800">
                          ¥{inv.amount.toLocaleString()}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getInvoiceStatusColor(inv.status)}`}>
                            {inv.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalOverdue > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-600" />
                  <p className="text-sm font-bold text-red-700">未入金合計: ¥{totalOverdue.toLocaleString()}</p>
                  <p className="text-xs text-red-500">— 督促が必要です</p>
                </div>
                <Link href="/approval-center" className="text-xs text-red-600 font-bold hover:underline">
                  承認センターで確認 →
                </Link>
              </div>
            )}
          </div>

          {/* キャッシュフロー推移 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-600" /> 月次売上推移（過去6ヶ月）
            </h2>
            <div className="flex items-end gap-4 h-32">
              {revenueHistory.map((r, i) => {
                const heightPct = maxRevenue > 0 ? (r.amount / maxRevenue) * 100 : 0;
                const isLatest = i === revenueHistory.length - 1;
                return (
                  <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold text-slate-600">
                      ¥{(r.amount / 10000).toFixed(0)}万
                    </p>
                    <div className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        background: isLatest ? "linear-gradient(180deg, #2563eb, #7c3aed)" : "#e2e8f0",
                        minHeight: "8px",
                      }} />
                    <p className="text-[10px] text-slate-500">{r.month}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右パネル */}
        <div className="space-y-5">
          {/* 今月の収支サマリー */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 mb-4">今月の収支サマリー</h2>
            <div className="space-y-3">
              {[
                { label: "請求総額", value: `¥${(totalBilled / 10000).toFixed(0)}万`, color: "text-slate-800" },
                { label: "入金済み", value: `¥${(totalPaid / 10000).toFixed(0)}万`, color: "text-emerald-600" },
                { label: "未入金", value: `¥${(totalOverdue / 10000).toFixed(0)}万`, color: "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 経理AIの提案 */}
          <div className="rounded-2xl p-5 border border-purple-200"
            style={{ background: "linear-gradient(135deg, #f5f3ff, #eff6ff)" }}>
            <h2 className="text-sm font-bold text-slate-700 mb-3">経理AIの提案</h2>
            {invoiceRows.filter((i) => i.status === "overdue").length > 0 ? (
              <div className="flex items-start gap-2 mb-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <p className="text-xs text-slate-600">延滞請求書 {invoiceRows.filter((i) => i.status === "overdue").length}件 — 督促を実施してください</p>
              </div>
            ) : null}
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
              <p className="text-xs text-slate-600">送付済み請求書の入金確認を行ってください</p>
            </div>
          </div>

          <Link href="/approval-center"
            className="flex items-center justify-between p-4 bg-purple-600 rounded-2xl text-white hover:bg-purple-700 transition-colors">
            <span className="text-sm font-bold">請求を承認センターで確定</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
