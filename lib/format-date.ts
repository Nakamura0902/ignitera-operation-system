// 日時表示はすべて日本時間（JST）に統一する
const JST = "Asia/Tokyo";

// 例: 2026/07/04
export function formatJstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    timeZone: JST,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

// 例: 2026/07/04 22:06
export function formatJstDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: JST,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// 例: 7/4 22:06（一覧の簡易表示用）
export function formatJstShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: JST,
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
