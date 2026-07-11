"use server";

import { adminSupabase } from "@/lib/supabase/admin";
import { estimatePlanFromBudget, judgeTemperature } from "@/lib/line-customer-utils";

export interface FormSubmission {
  form_type: "セットプラン相談" | "まずは相談";
  name: string;
  company_name?: string;
  industry?: string;
  contact_method?: string;
  website_url?: string;
  sns_url?: string;
  current_tools?: string[];
  issues?: string[];
  interested_services?: string[];
  desired_timing?: string;
  budget?: string;
  message?: string;
}

// 公開フォームの送信。未認証で呼ばれる。estimated_plan / temperature はサーバー側で判定する。
export async function createLineCustomer(input: FormSubmission) {
  if (!input.name?.trim()) {
    return { error: "お名前を入力してください" };
  }

  // セットプラン相談は予算からプラン判定、まずは相談は「未定」固定
  const estimated_plan =
    input.form_type === "セットプラン相談"
      ? estimatePlanFromBudget(input.budget)
      : "未定";

  const { error } = await adminSupabase.from("line_customers").insert({
    form_type: input.form_type,
    source: "LINE",
    status: "未対応",
    name: input.name.trim(),
    company_name: input.company_name?.trim() || null,
    industry: input.industry?.trim() || null,
    contact_method: input.contact_method || null,
    website_url: input.website_url?.trim() || null,
    sns_url: input.sns_url?.trim() || null,
    current_tools: input.current_tools?.length ? input.current_tools : null,
    issues: input.issues?.length ? input.issues : null,
    interested_services: input.interested_services?.length ? input.interested_services : null,
    desired_timing: input.desired_timing || null,
    budget: input.budget || null,
    message: input.message?.trim() || null,
    estimated_plan,
    temperature: judgeTemperature(input.desired_timing),
  });

  if (error) {
    return { error: "送信に失敗しました。時間をおいて再度お試しください。" };
  }

  return { success: true };
}
