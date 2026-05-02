'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { upsertSession } from '@/actions/admin';

export default function EditSessionPage({ params }: { params: Promise<{ course_id: string, session_id: string }> }) {
  const router = useRouter();
  const { course_id, session_id } = use(params);
  
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ★ 既存のデータを読み込む（歯科の再診で前回の記録を確認するような工程です）
  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (data) {
        setTitle(data.title);
        setVideoUrl(data.video_url || '');
        setZoomUrl(data.zoom_url || '');
        setOrderIndex(data.order_index.toString());
      }
      setIsLoading(false);
    }
    loadData();
  }, [session_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      // ★ ここで ID を渡すことで、新規作成ではなく「上書き（更新）」になります
      formData.append('id', session_id); 
      formData.append('course_id', course_id);
      formData.append('title', title);
      formData.append('video_url', videoUrl);
      formData.append('zoom_url', zoomUrl);
      formData.append('order_index', orderIndex);

      await upsertSession(formData);
      
      // 保存が終わったら一覧に戻る
      router.push(`/admin/courses/${course_id}/sessions`);
      router.refresh();
    } catch (err: any) {
      alert('更新に失敗しました: ' + err.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-10 font-black text-3xl italic">読み込み中...</div>;

  return (
    <main className="min-h-screen bg-[#F0F0F0] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href={`/admin/courses/${course_id}/sessions`} className="text-xl font-black text-black hover:underline decoration-4">← 変更せずに戻る</Link>
        </div>

        <h1 className="text-5xl font-black text-black mb-12 border-b-8 border-black pb-4 uppercase italic">セミナー回を編集</h1>

        <form onSubmit={handleSubmit} className="bg-white border-4 border-black p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          
          <div className="mb-8">
            <label className="block text-3xl font-black mb-4 uppercase underline">講義タイトル</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full text-2xl font-bold border-4 border-black p-4 focus:bg-[#FFFFE0] outline-none" 
              required 
            />
          </div>

          <div className="mb-8">
            <label className="block text-3xl font-black mb-4 uppercase underline text-blue-600">Zoom リンク (リアルタイム用)</label>
            <input 
              type="url" 
              value={zoomUrl} 
              onChange={(e) => setZoomUrl(e.target.value)} 
              className="w-full text-2xl font-bold border-4 border-black p-4 focus:bg-[#E0F0FF] outline-none" 
              placeholder="https://zoom.us/j/..." 
            />
          </div>

          <div className="mb-8">
            <label className="block text-3xl font-black mb-4 uppercase underline text-red-600">録画URL (後から追加OK)</label>
            <input 
              type="url" 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
              className="w-full text-2xl font-bold border-4 border-black p-4 focus:bg-[#FFFFE0] outline-none" 
              placeholder="https://youtu.be/..." 
            />
          </div>

          <div className="mb-12">
            <label className="block text-3xl font-black mb-4 uppercase underline">表示順</label>
            <input 
              type="number" 
              value={orderIndex} 
              onChange={(e) => setOrderIndex(e.target.value)} 
              className="w-full md:w-1/3 text-2xl font-bold border-4 border-black p-4 focus:bg-[#FFFFE0] outline-none" 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className={`w-full text-4xl font-black py-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all ${
              isSubmitting ? 'bg-gray-400' : 'bg-[#FFFF00] hover:translate-x-1 hover:translate-y-1 hover:shadow-none'
            }`}
          >
            {isSubmitting ? '保存中...' : '変更を保存する！'}
          </button>
        </form>
      </div>
    </main>
  );
}