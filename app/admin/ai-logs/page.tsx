'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const ADMIN_EMAIL = 'tm99179313@gmail.com';

type AiLog = {
  id: string;
  email: string;
  course_id: string;
  course_label: string;
  question: string;
  answer: string;
  created_at: string;
};

export default function AdminAiLogsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<AiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
　const [filterCourse, setFilterCourse] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setIsLoading(true);
    setMessage('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/login');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('ログイン情報が確認できません。再ログインしてください。');
      }

      const res = await fetch('/api/admin/ai-logs', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'AI質問ログの取得に失敗しました。');
      }

      setLogs(result.logs || []);
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }

  const courseOptions = Array.from(
  new Map(
    logs
      .filter((log) => log.course_label)
      .map((log) => [log.course_label, log.course_label])
  ).values()
);

const displayedLogs = logs.filter((log) => {
  const keyword = searchText.trim().toLowerCase();

  const matchesKeyword = keyword
    ? [
        log.email,
        log.question,
        log.answer,
        log.course_label,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    : true;

  const matchesCourse = filterCourse
    ? log.course_label === filterCourse
    : true;

  return matchesKeyword && matchesCourse;
});
  function formatDate(value: string) {
    if (!value) return '-';

    const date = new Date(value);

    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 active:scale-95 transition-all"
          >
            ← 管理画面に戻る
          </Link>

          <button
            onClick={loadLogs}
            className="text-sm font-bold border border-slate-300 rounded-lg px-4 py-2.5 bg-white hover:bg-slate-50"
          >
            更新
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold mb-2">AI質問ログ</h1>
          <p className="text-sm text-slate-500">
            受講者がAI質問箱で入力した質問と回答を確認できます。
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
  <input
    type="text"
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    placeholder="メール・質問・回答を検索"
    className="md:col-span-2 border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />

  <select
    value={filterCourse}
    onChange={(e) => setFilterCourse(e.target.value)}
    className="border border-slate-300 rounded-lg px-4 py-3 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">すべてのコース</option>
    {courseOptions.map((courseLabel) => (
      <option key={courseLabel} value={courseLabel}>
        {courseLabel}
      </option>
    ))}
  </select>
</div>

<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
  <span>
    表示：{displayedLogs.length}件 / 全{logs.length}件
  </span>

  {(searchText || filterCourse) && (
    <button
      type="button"
      onClick={() => {
        setSearchText('');
        setFilterCourse('');
      }}
      className="font-bold text-blue-600 hover:text-blue-700"
    >
      絞り込みをリセット
    </button>
  )}
</div>

          {message && (
            <div className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 p-4 text-sm font-bold">
              {message}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          {isLoading ? (
            <div className="text-sm text-slate-500 font-bold">読み込み中...</div>
          ) : displayedLogs.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
             {searchText || filterCourse
    ? '条件に一致するAI質問ログがありません。'
    : 'まだAI質問ログはありません。'}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedLogs.map((log) => {
                const isOpen = openLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className="border border-slate-200 rounded-xl p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">
                            {log.course_label}
                          </span>

                          <span className="text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded px-2 py-1">
                            {formatDate(log.created_at)}
                          </span>
                        </div>

                        <p className="text-sm text-slate-500 mb-2">
                          質問者：{log.email || '-'}
                        </p>

                        <h2 className="font-bold text-slate-800 leading-7">
                          {log.question}
                        </h2>
                      </div>

                      <button
                        onClick={() => setOpenLogId(isOpen ? null : log.id)}
                        className="border border-slate-300 text-slate-700 font-bold rounded-lg px-4 py-2 hover:bg-slate-50"
                      >
                        {isOpen ? '閉じる' : '回答を見る'}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-5">
                        <h3 className="font-bold text-slate-800 mb-3">AI回答</h3>
                        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {log.answer || '回答なし'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
