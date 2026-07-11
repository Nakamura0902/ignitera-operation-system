"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import { updateUserRole, toggleUserActive } from "./actions";
import { formatJstDate } from "@/lib/format-date";
import type { UserRow, RoleOption } from "./page";

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "全員" },
  { value: "ceo", label: "CEO" },
  { value: "admin", label: "マネージャー" },
  { value: "employee", label: "社員" },
];

const ROLE_BADGE_STYLES: Record<string, string> = {
  ceo: "bg-amber-100 text-amber-700 border border-amber-200",
  admin: "bg-teal-100 text-teal-700 border border-teal-200",
  employee: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

function RoleBadge({ roleName, displayName }: { roleName: string; displayName: string }) {
  const style = ROLE_BADGE_STYLES[roleName] ?? "bg-slate-100 text-slate-600 border border-slate-200";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${style}`}>
      {displayName}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
      <span className={`text-xs font-medium ${isActive ? "text-emerald-700" : "text-red-600"}`}>
        {isActive ? "有効" : "無効"}
      </span>
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
    >
      {name.charAt(0) || "?"}
    </div>
  );
}

interface UserRowProps {
  user: UserRow;
  roles: RoleOption[];
  onMessage: (msg: string) => void;
}

function UserTableRow({ user, roles, onMessage }: UserRowProps) {
  const router = useRouter();
  const [loadingField, setLoadingField] = useState<string | null>(null);

  async function handleRoleChange(roleId: string) {
    setLoadingField("role");
    const result = await updateUserRole(user.id, roleId);
    setLoadingField(null);
    if (result.error) {
      onMessage(`エラー: ${result.error}`);
    } else {
      onMessage("ロールを更新しました");
      router.refresh();
    }
  }

  async function handleToggleActive() {
    setLoadingField("active");
    const result = await toggleUserActive(user.id, !user.is_active);
    setLoadingField(null);
    if (result.error) {
      onMessage(`エラー: ${result.error}`);
    } else {
      onMessage(`ユーザーを${!user.is_active ? "有効" : "無効"}にしました`);
      router.refresh();
    }
  }

  const formattedDate = formatJstDate(user.created_at);

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-3 pl-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.full_name} />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-800 truncate">{user.full_name || "未設定"}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 text-xs text-slate-500 font-mono">
        {user.employee_id ?? "—"}
      </td>
      <td className="py-3 text-xs text-slate-600">
        {user.specialty ? (
          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full font-medium">{user.specialty}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="py-3">
        <div className="flex flex-col gap-1">
          {user.roles && (
            <RoleBadge roleName={user.roles.name} displayName={user.roles.display_name} />
          )}
          <select
            value={user.roles?.id ?? ""}
            disabled={loadingField === "role"}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
          >
            <option value="">未設定</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.display_name}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="py-3">
        <StatusBadge isActive={user.is_active} />
      </td>
      <td className="py-3 text-xs text-slate-500">{formattedDate}</td>
      <td className="py-3 pr-4">
        <button
          onClick={handleToggleActive}
          disabled={loadingField === "active"}
          className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
            user.is_active
              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
          }`}
        >
          {user.is_active ? "無効化" : "有効化"}
        </button>
      </td>
    </tr>
  );
}

interface Props {
  initialUsers: UserRow[];
  roles: RoleOption[];
}

export default function UserManagementClient({ initialUsers, roles }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [message, setMessage] = useState<string | null>(null);

  function handleMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  const filteredUsers = initialUsers.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.employee_id ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" || user.roles?.name === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {message && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl shadow-lg">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            ユーザー管理
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">社員のロール・専門・ステータスを管理する</p>
        </div>
        <span className="text-[11px] px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-semibold">
          {initialUsers.length} 名
        </span>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="名前・社員ID・メールで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {ROLE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRoleFilter(option.value)}
                className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors ${
                  roleFilter === option.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="text-left py-3 pl-4 font-medium">ユーザー</th>
              <th className="text-left py-3 font-medium">社員ID</th>
              <th className="text-left py-3 font-medium">専門</th>
              <th className="text-left py-3 font-medium">ロール</th>
              <th className="text-left py-3 font-medium">ステータス</th>
              <th className="text-left py-3 font-medium">登録日</th>
              <th className="text-left py-3 pr-4 font-medium">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                  ユーザーが見つかりませんでした
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  roles={roles}
                  onMessage={handleMessage}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 text-right">
        {filteredUsers.length} / {initialUsers.length} 名を表示中
      </p>
    </div>
  );
}
