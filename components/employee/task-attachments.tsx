"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Upload, FileText, Image, Trash2, Loader2, Download } from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploaderName: string;
  url: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image size={16} className="text-blue-500" />;
  return <FileText size={16} className="text-slate-500" />;
}

export default function TaskAttachments({ taskId, userId }: { taskId: string; userId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/attachments?taskId=${taskId}`)
      .then((r) => r.json())
      .then((d) => setAttachments(d.attachments ?? []));
  }, [taskId]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("userId", userId);
      form.append("taskId", taskId);

      const res = await fetch("/api/attachments", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました");
      } else {
        // 最新一覧を再取得
        const listRes = await fetch(`/api/attachments?taskId=${taskId}`);
        const listData = await listRes.json();
        setAttachments(listData.attachments ?? []);
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await fetch("/api/attachments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId: id, userId }),
      });
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      setDeletingId(null);
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.zip,.txt,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFileSelect}
      />

      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group">
              <FileIcon mimeType={att.mimeType} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{att.fileName}</p>
                <p className="text-[10px] text-slate-400">
                  {formatSize(att.fileSize)} · {att.uploaderName} · {att.uploadedAt.slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {att.url && (
                  <a href={att.url} download={att.fileName} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
                    <Download size={13} />
                  </a>
                )}
                {att.uploaderName !== "" && (
                  <button
                    onClick={() => handleDelete(att.id)}
                    disabled={deletingId === att.id}
                    className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-slate-400 hover:text-red-500 disabled:opacity-50"
                  >
                    {deletingId === att.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-2 mb-2">添付ファイルはまだありません</p>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <><Loader2 size={14} className="animate-spin" /> アップロード中...</>
        ) : (
          <><Upload size={14} /> ファイルを追加（最大10MB）</>
        )}
      </button>
    </div>
  );
}
