'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * コース（親）の情報を更新する関数
 */
export async function updateCourse(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  const { error } = await supabase
    .from('courses')
    .update({ name, description })
    .eq('id', id);

  if (error) {
    console.error('Course Update Error:', error);
    throw new Error(error.message);
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/courses/${id}/edit`);
}

/**
 * セッション（講義回）を【新規登録】＆【上書き更新】する万能関数
 */
export async function upsertSession(formData: FormData) {
  // フォームからデータを受け取る
  const id = formData.get('id') as string | null; // IDがあれば受け取る（更新時）
  const course_id = formData.get('course_id') as string;
  const title = formData.get('title') as string;
  const video_url = formData.get('video_url') as string;
  const zoom_url = formData.get('zoom_url') as string;
  const order_index = parseInt(formData.get('order_index') as string);

  // 保存するデータをまとめる
  const sessionData: any = {
    course_id,
    title,
    video_url,
    zoom_url,
    order_index,
  };

  // もし既存の「id」がある場合（＝編集の時）は、そのIDをセットして上書きモードにする
  if (id) {
    sessionData.id = id;
  }

  // insertではなく「upsert（あれば上書き、なければ新規作成）」を実行
  const { error } = await supabase
    .from('sessions')
    .upsert(sessionData);

  if (error) {
    console.error('Session Upsert Error:', error);
    throw new Error(error.message);
  }

  // 登録・更新後に一覧画面をリフレッシュする
  revalidatePath(`/admin/courses/${course_id}/sessions`);
}