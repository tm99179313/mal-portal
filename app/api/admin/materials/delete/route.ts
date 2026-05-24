import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const materialId = String(body.materialId || '');

    if (!materialId) {
      return NextResponse.json({ error: 'materialId is required' }, { status: 400 });
    }

    const { data: material, error: materialError } = await supabaseAdmin
      .from('course_materials')
      .select('*')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json(
        { error: materialError?.message || '資料が見つかりません。' },
        { status: 404 }
      );
    }

    // 先にAI用チャンクを削除
    const { error: chunksError } = await supabaseAdmin
      .from('material_chunks')
      .delete()
      .eq('material_id', materialId);

    if (chunksError) {
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }

    // StorageからPDFを削除
    if (material.file_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('course-materials')
        .remove([material.file_path]);

      if (storageError) {
        return NextResponse.json({ error: storageError.message }, { status: 500 });
      }
    }

    // 最後に資料本体を削除
    const { error: deleteError } = await supabaseAdmin
      .from('course_materials')
      .delete()
      .eq('id', materialId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      deletedMaterialId: materialId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
