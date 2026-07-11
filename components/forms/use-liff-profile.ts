"use client";

import { useEffect, useState } from "react";

export interface LiffProfile {
  line_user_id: string;
  line_display_name: string;
  line_picture_url?: string;
}

// LINE内(LIFF)で開かれた場合、ログイン済みユーザーのプロフィールを取得する。
// LIFF未設定 / 外部ブラウザ / 失敗時は null のまま（フォームは通常どおり使える）。
export function useLiffProfile(): LiffProfile | null {
  const [profile, setProfile] = useState<LiffProfile | null>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return;

    let cancelled = false;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) return;
        const p = await liff.getProfile();
        if (!cancelled) {
          setProfile({
            line_user_id: p.userId,
            line_display_name: p.displayName,
            line_picture_url: p.pictureUrl,
          });
        }
      } catch {
        // LIFF外 / 初期化失敗は無視
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
