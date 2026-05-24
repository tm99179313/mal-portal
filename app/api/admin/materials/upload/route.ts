import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'materials upload API is working',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const courseId = String(body.courseId || '');
    const sessionNoRaw = String(body.sessionNo || '');
    const title = String(body.title || '');
    const fileName = String(body.fileName || '');
    const filePath = String(body.filePath || '');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    if (!sessionNoRaw) {
      return NextResponse.json({ error: 'sessionNo is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    const sessionNo = Number(sessionNoRaw);

    if (Number.isNaN(sessionNo)) {
      return NextResponse.json(
        { error: 'sessionNo must be number' },
        { status: 400 }
      );
    }

    const { data: material, error: insertError } = await supabaseAdmin
      .from('course_materials')
      .insert({
        course_id: courseId,
        session_no: sessionNo,
        title,
        file_name: fileName,
        file_path: filePath,
        status: 'draft',
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      material,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
