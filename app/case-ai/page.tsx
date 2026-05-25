'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function CaseAiPage() {
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [caseSummary, setCaseSummary] = useState('');
  const [findings, setFindings] = useState('');
  const [records, setRecords] = useState('');
  const [userPlan, setUserPlan] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage('');
    setAnswer('');

    if (!chiefComplaint && !caseSummary && !findings && files.length === 0) {
      setMessage('主訴・症例概要・所見・画像のいずれかを入力してください。');
      return;
    }

    const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalFileSize = 4 * 1024 * 1024;

    if (totalFileSize > maxTotalFileSize) {
      setMessage('画像の合計サイズが大きすぎます。合計4MB以内にしてください。');
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

      const formData = new FormData();

      formData.append('patientAge', patientAge);
      formData.append('patientSex', patientSex);
      formData.append('chiefComplaint', chiefComplaint);
      formData.append('caseSummary', caseSummary);
      formData.append('findings', findings);
      formData.append('records', records);
      formData.append('userPlan', userPlan);

      files.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/case-ai/review', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const text = await res.text();

      let result: any = {};
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          '症例相談AI APIがJSONではない応答を返しました。APIルートまたはデプロイ状態を確認してください。'
        );
      }

      if (!res.ok) {
        throw new Error(result.error || '症例相談AIの実行に失敗しました。');
      }

      setAnswer(result.answer || '');
    } catch (err: any) {
      setMessage(err.message || 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);

    const validFiles = selected
      .filter((file) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      )
      .slice(0, 8);

    setFiles(validFiles);
    setMessage('');
  }

  function removeFile(indexToRemove: number) {
    setFiles((current) =>
      current.filter((_, index) => index !== indexToRemove)
    );
  }

  function renderFormattedAnswer(text: string) {
    const lines = text.split('\n');

    return (
      <div className="space-y-3">
        {lines.map((line, index) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={index} className="h-2" />;
          }

          const isHeading =
            /^\d+\./.test(trimmed) ||
            trimmed.startsWith('【') ||
            trimmed.includes('本命プラン') ||
            trimmed.includes('対抗プラン') ||
            trimmed.includes('大穴プラン') ||
            trimmed.includes('MAL+的コメント') ||
            trimmed.includes('追加で必要な資料') ||
            trimmed.includes('顔貌から見た') ||
            trimmed.includes('顎位の変化可能性');

          if (isHeading) {
            return (
              <div
                key={index}
                className="mt-5 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-bold"
              >
                {trimmed}
              </div>
            );
          }

          if (
            trimmed.startsWith('-') ||
            trimmed.startsWith('・') ||
            trimmed.startsWith('✓') ||
            trimmed.startsWith('※')
          ) {
            return (
              <div
                key={index}
                className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 text-sm leading-7 text-slate-700"
              >
                {trimmed}
              </div>
            );
          }

          return (
            <p key={index} className="text-sm leading-8 text-slate-700">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  }

  const totalFileSizeMb = (
    files.reduce((sum, file) => sum + file.size, 0) /
    1024 /
    1024
  ).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            href="/courses"
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <span>←</span> コース一覧へ
          </Link>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full tracking-widest">
            🥷 CASE LAB
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-12">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.25em] text-blue-600 mb-3">
            HIDDEN CASE ROOM
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
            症例相談・診断AI
          </h1>
          <p className="text-slate-500 font-medium leading-7">
            症例情報と資料画像をもとに、顔貌起点で問題点・診断上の論点・治療計画の方向性を整理します。
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 leading-7">
          <p className="font-bold mb-1">ご利用前の注意</p>
          <p>
            このAIは診断確定や治療指示を行うものではなく、症例検討の論点整理を補助するものです。
            最終的な診断・治療計画は、担当歯科医師が資料を確認して判断してください。
          </p>
          <p className="mt-1">
            顔貌写真・口腔内写真などを添付する場合は、患者名・カルテ番号など個人情報が写らないようにしてください。
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold mb-2">年齢</label>
              <input
                type="text"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="例：41歳"
                className="w-full border border-slate-300 rounded-xl p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">性別</label>
              <input
                type="text"
                value={patientSex}
                onChange={(e) => setPatientSex(e.target.value)}
                placeholder="例：男性"
                className="w-full border border-slate-300 rounded-xl p-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">主訴</label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="例：かみ合わせが悪い、前歯が気になる"
              className="w-full border border-slate-300 rounded-xl p-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">症例概要</label>
            <textarea
              value={caseSummary}
              onChange={(e) => setCaseSummary(e.target.value)}
              placeholder="例：矯正既往あり。補綴治療後に咬合が不安定になり、再評価希望。"
              className="w-full min-h-[110px] border border-slate-300 rounded-xl p-4 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              口腔内・咬合・顔貌・セファロなどの所見
            </label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="例：側貌で口唇突出感あり、スマイル時バッカルコリドーあり、Angle Class II傾向、正中偏位、過蓋咬合など"
              className="w-full min-h-[150px] border border-slate-300 rounded-xl p-4 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">取得済み資料</label>
            <textarea
              value={records}
              onChange={(e) => setRecords(e.target.value)}
              placeholder="例：口腔内写真、顔貌写真、パノラマ、セファロ、CT、iTeroスキャン"
              className="w-full min-h-[90px] border border-slate-300 rounded-xl p-4 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">症例資料</label>

            <div className="border border-slate-300 rounded-xl p-4 bg-white">
              <label className="inline-flex w-fit cursor-pointer items-center justify-center rounded-lg bg-slate-100 border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 active:scale-95 transition-all">
                画像を選択
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <p className="text-xs text-slate-400 mt-3 leading-6">
                顔貌・スマイル・口腔内・パノラマ・セファロ・CTスクショなどを最大8枚まで添付できます。
                画像は合計4MB以内を目安にしてください。患者名・カルテ番号など個人情報が写らないようにしてください。
              </p>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-bold text-slate-500">
                    選択中：{files.length}枚 / 合計 {totalFileSizeMb} MB
                  </div>

                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <span className="truncate">
                        {index + 1}. {file.name}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="shrink-0 text-red-500 font-bold hover:text-red-700"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              自分が考えている治療方針
            </label>
            <textarea
              value={userPlan}
              onChange={(e) => setUserPlan(e.target.value)}
              placeholder="例：非抜歯でアライナーを検討。遠心移動とIPRでスペース確保を考えている。"
              className="w-full min-h-[110px] border border-slate-300 rounded-xl p-4 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white font-bold rounded-xl py-4 hover:bg-slate-800 disabled:bg-slate-300 transition-all"
          >
            {isLoading ? '症例を検討中...' : '🥷 症例を検討する'}
          </button>
        </form>

        {message && (
          <div className="mt-6 rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm font-bold">
            {message}
          </div>
        )}

        {answer && (
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4">AIによる症例整理</h2>
            {renderFormattedAnswer(answer)}
          </div>
        )}
      </main>
    </div>
  );
}
