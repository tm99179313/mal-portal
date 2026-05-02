import { redirect } from 'next/navigation';

export default async function CourseDetailPage({ params }: { params: Promise<{ course_id: string }> }) {
  const { course_id } = await params;
  
  // この「古いページ」に来た人を、新しい「セミナー回一覧」へ自動で送る
  redirect(`/admin/courses/${course_id}/sessions`);
}