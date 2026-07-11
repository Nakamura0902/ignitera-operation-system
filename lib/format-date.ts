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

// 現在(または指定日)のJSTでの年・月
export function jstYearMonth(d = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JST, year: "numeric", month: "numeric",
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

// JSTのその月の開始/翌月開始をISO(+09:00)で返す。timestamptz比較に使う。
export function jstMonthRange(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  return {
    start: `${year}-${pad(month)}-01T00:00:00+09:00`,
    end: `${ny}-${pad(nm)}-01T00:00:00+09:00`,
  };
}
