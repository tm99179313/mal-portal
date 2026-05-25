'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const ADMIN_EMAIL = 'tm99179313@gmail.com';

type Guideline = {
  id: string;
  key: string;
  title: string;
  content: string;
  updated_at: string;
};

export default function AdminAiBrainPage() {
  const router = useRouter();

  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [selectedKey, setSelectedKey] = useState('mal_case_core_policy');
  const [title, setTitle] = useState('MAL+症例検討の基本思想');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadGuidelines();
  }, []);

  async function getAccessToken() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/login');
      throw new Error('管理者権限がありません。');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('ログイン情報が確認できません。再ログインしてください。');
    }

    return session.access_token;
  }

  async function loadGuidelines() {
    setIsLoading(true);
    setMessage('');

    try {
      const token = await getAccessToken();

      const res = await fetch('/api/admin/ai-guidelines', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'AI思想データの取得に失敗しました。');
      }

      const rows = result.guidelines || [];
      setGuidelines(rows);

      const current =
        rows.find((row: Guideline) => row.key === selectedKey) || rows[0];

      if (current) {
        setSelectedKey(current.key);
        setTitle(current.title);
        setContent(current.content);
      }
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelect(key: string) {
    const target = guidelines.find((row) => row.key === key);
    if (!target) return;

    setSelectedKey(target.key);
    setTitle(target.title);
    setContent(target.content);
    setMessage('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setMessage('');
    setIsSaving(true);

    try {
      const token = await getAccessToken();

      const res = await fetch('/api/admin/ai-guidelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: selectedKey,
          title,
          content,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || '保存に失敗しました。');
      }

      setMessage('MAL+ AI Brainを保存しました。次回の症例AI回答から反映されます。');
      await loadGuidelines();
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 active:scale-95 transition-all"
          >
            ← 管理画面に戻る
          </Link>

          <button
            onClick={loadGuidelines}
            className="text-sm font-bold border border-slate-300 rounded-lg px-4 py-2.5 bg-white hover:bg-slate-50"
          >
            更新
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <p className="text-xs font-bold tracking-[0.25em] text-blue-600 mb-3">
            MAL+ AI BRAIN
          </p>

          <h1 className="text-2xl font-bold mb-2">
            MAL+ AI思想設定
          </h1>

          <p className="text-sm text-slate-500 leading-7">
            症例相談AIが毎回参照する、MAL+の診査診断・治療計画の思想を管理します。
            顔貌起点、本命・対抗・大穴、抜歯・非抜歯の考え方などをここに書きます。
          </p>

          {message && (
            <div className="mt-6 rounded-lg bg-slate-100 border border-slate-200 p-4 text-sm font-bold">
              {message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 h-fit">
            <h2 className="text-sm font-bold text-slate-500 mb-3">
              思想カテゴリ
            </h2>

            {isLoading ? (
              <p className="text-sm text-slate-400">読み込み中...</p>
            ) : (
              <div className="space-y-2">
                {guidelines.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelect(item.key)}
                    className={
                      selectedKey === item.key
                        ? 'w-full text-left rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-3 py-3 text-sm font-bold'
                        : 'w-full text-left rounded-lg border border-slate-200 bg-white text-slate-600 px-3 py-3 text-sm font-bold hover:bg-slate-50'
                    }
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSave}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-5"
          >
            <div>
              <label className="block text-sm font-bold mb-2">
                キー
              </label>
              <input
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono bg-slate-50"
              />
              <p className="text-xs text-slate-400 mt-2">
                通常は変更しません。例：mal_case_core_policy
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                タイトル
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                MAL+思想本文
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[420px] border border-slate-300 rounded-xl p-4 text-sm leading-7"
                placeholder="ここにMAL+の症例検討思想を書いてください。"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-slate-900 text-white font-bold rounded-xl py-4 hover:bg-slate-800 disabled:bg-slate-300 transition-all"
            >
              {isSaving ? '保存中...' : 'MAL+思想を保存'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
