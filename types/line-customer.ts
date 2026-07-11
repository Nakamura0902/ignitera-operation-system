// LINE顧客管理 MVP の型定義

export interface LineCustomer {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  contact_method: string | null;
  source: string | null;
  form_type: string;
  website_url: string | null;
  sns_url: string | null;
  current_tools: string[] | null;
  issues: string[] | null;
  interested_services: string[] | null;
  desired_timing: string | null;
  budget: string | null;
  message: string | null;
  estimated_plan: string;
  temperature: string;
  status: string;
  assignee: string | null;
  next_action: string | null;
  memo: string | null;
}

// フォーム送信で新規作成するときのペイロード
export type NewLineCustomer = Omit<LineCustomer, "id" | "created_at" | "updated_at">;

// 詳細画面で編集できる項目
export interface LineCustomerEditable {
  status: string;
  temperature: string;
  estimated_plan: string;
  assignee: string;
  memo: string;
  next_action: string;
}
