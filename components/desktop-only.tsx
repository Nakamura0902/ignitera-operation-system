import type { ReactNode } from "react";
import { Monitor } from "lucide-react";

// スマホでは実作業(編集・送信・承認など)を隠し、PC操作を促す。
// 閲覧・確認はモバイルでもそのまま可能。
export function DesktopOnly({
  children,
  label = "この操作はPCから行ってください",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <>
      <div className="hidden lg:block">{children}</div>
      <div className="lg:hidden flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
        <Monitor size={14} className="shrink-0 text-slate-400" />
        {label}（スマホでは確認のみ）
      </div>
    </>
  );
}
