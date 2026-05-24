import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'tm99179313@gmail.com';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'ログイン情報が確認できません。' },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: '管理者権限がありません。' },
        { status: 403 }
      );
    }

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('ai_question_logs')
      .select('id, email, course_id, question, answer, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      return NextResponse.json(
        { error: logsError.message },
        { status: 500 }
      );
    }

    const courseIds = Array.from(
      new Set((logs || []).map((log) => log.course_id).filter(Boolean))
    );

    let courseMap: Record<string, string> = {};

    if (courseIds.length > 0) {
      const { data: courses, error: coursesError } = await supabaseAdmin
        .from('courses')
        .select('id, name, year')
        .in('id', courseIds);

      if (coursesError) {
        return NextResponse.json(
          { error: coursesError.message },
          { status: 500 }
        );
      }

      courseMap = Object.fromEntries(
        (courses || []).map((course) => [
          course.id,
          `${course.year ? `${course.year} ` : ''}${course.name}`,
        ])
      );
    }

    const rows = (logs || []).map((log) => ({
      ...log,
      course_label: courseMap[log.course_id] || log.course_id,
    }));

    return NextResponse.json({
      ok: true,
      logs: rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
