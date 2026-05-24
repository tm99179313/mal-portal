'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type CourseAiBoxProps = {
  courseId: string;
};

export default function CourseAiBox({ courseId }: CourseAiBoxProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [references, setReferences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setAnswer('');
    setReferences([]);

    if (!question.trim()) {
      setMessage('質問を入力してください。');
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('ログイン情報が確認できません。再ログインしてください。');
      }

      const res = await fetch('/api/course-ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseId,
          question,
        }),
      });

      const text = await res.text();

      let result: any = {};
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          'AI質問APIがJSONではない応答を返しました。APIルートまたはデプロイ状態を確認してください。'
        );
      }

      if (!res.ok) {
        throw new Error(result.error || 'AI回答の生成に失敗しました。');
      }

      setAnswer(result.answer || '');
      setReferences(result.references || []);
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">
          このコース全体にAIで質問する
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          アップロード済み資料をもとに、コース全体から関連箇所を探して回答します。
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 leading-6">
        <p className="font-bold mb-1">ご利用前の注意</p>
        <p>
          本AIはセミナー資料をもとに回答します。資料に含まれない内容は正確に回答できない場合があります。
        </p>
        <p className="mt-1">
          詳しく聞きたい方は、メールにて直接ご相談ください。
        </p>
      </div>

      <form onSubmit={handleAsk} className="space-y-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例：アライナーのアンフィットが起きる原因を整理して"
          className="w-full min-h-[120px] border border-slate-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto bg-blue-600 text-white font-bold rounded-lg px-6 py-3 hover:bg-blue-700 disabled:bg-slate-300"
        >
          {isLoading ? '回答作成中...' : 'AIに質問する'}
        </button>
      </form>

      {message && (
        <div className="mt-5 rounded-lg bg-red-50 border border-red-200 text-red-700 p-4 text-sm font-bold">
          {message}
        </div>
      )}

      {answer && (
        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-3">回答</h3>
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {answer}
          </div>
        </div>
      )}

      {references.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-3">参照候補</h3>
          <div className="space-y-2">
            {references.map((ref, index) => (
              <div
                key={`${ref.material_id}-${index}`}
                className="text-sm text-slate-600 bg-white border border-slate-100 rounded-lg p-3"
              >
                第{ref.session_no ?? '-'}回 / p.{ref.page_start ?? '-'}-
                {ref.page_end ?? '-'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
