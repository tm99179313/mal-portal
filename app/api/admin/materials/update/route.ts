import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const materialId = String(body.materialId || '');
    const title = String(body.title || '');
    const sessionNoRaw = String(body.sessionNo || '');

    if (!materialId) {
      return NextResponse.json({ error: 'materialId is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!sessionNoRaw) {
      return NextResponse.json({ error: 'sessionNo is required' }, { status: 400 });
    }

    const sessionNo = Number(sessionNoRaw);

    if (Number.isNaN(sessionNo)) {
      return NextResponse.json({ error: 'sessionNo must be number' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('course_materials')
      .update({
        title,
        session_no: sessionNo,
      })
      .eq('id', materialId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      material: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
