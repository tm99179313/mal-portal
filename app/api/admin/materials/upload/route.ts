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
    const formData = await req.formData();

    const courseId = String(formData.get('courseId') || '');
    const sessionNoRaw = String(formData.get('sessionNo') || '');
    const title = String(formData.get('title') || '');
    const file = formData.get('file') as File | null;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    if (!sessionNoRaw) {
      return NextResponse.json({ error: 'sessionNo is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDFファイルをアップロードしてください。' },
        { status: 400 }
      );
    }

    const sessionNo = Number(sessionNoRaw);

    if (Number.isNaN(sessionNo)) {
      return NextResponse.json(
        { error: 'sessionNo must be number' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFileName = file.name.replace(/[^\w.\-ぁ-んァ-ン一-龥]/g, '_');
    const filePath = `${courseId}/session-${String(sessionNo).padStart(2, '0')}-${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('course-materials')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: material, error: insertError } = await supabaseAdmin
      .from('course_materials')
      .insert({
        course_id: courseId,
        session_no: sessionNo,
        title,
        file_name: file.name,
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
