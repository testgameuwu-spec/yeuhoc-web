import { supabase } from '@/lib/supabase';

export function mapTargetExamFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    examDate: row.exam_date,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTargetExams({ includeInactive = false } = {}) {
  let query = supabase
    .from('target_exams')
    .select('id, name, exam_date, is_active, created_at, updated_at')
    .order('exam_date', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapTargetExamFromDb);
}

export async function getUserTargetExams(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_exam_targets')
    .select('target_exam_id, target_exams(id, name, exam_date, is_active, created_at, updated_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row) => mapTargetExamFromDb(row.target_exams))
    .filter(Boolean);
}

export async function syncUserTargetExams(userId, selectedTargetExamIds) {
  if (!userId) throw new Error('Thiếu user.');

  const nextIds = [...new Set((selectedTargetExamIds || []).filter(Boolean))];

  const { data: existingRows, error: existingError } = await supabase
    .from('user_exam_targets')
    .select('target_exam_id')
    .eq('user_id', userId);

  if (existingError) throw existingError;

  const currentIds = new Set((existingRows || []).map((row) => row.target_exam_id));
  const nextIdSet = new Set(nextIds);
  const idsToInsert = nextIds.filter((id) => !currentIds.has(id));
  const idsToDelete = [...currentIds].filter((id) => !nextIdSet.has(id));

  if (idsToInsert.length > 0) {
    const rows = idsToInsert.map((targetExamId) => ({
      user_id: userId,
      target_exam_id: targetExamId,
    }));

    const { error } = await supabase
      .from('user_exam_targets')
      .insert(rows);

    if (error) throw error;
  }

  if (idsToDelete.length > 0) {
    const { error } = await supabase
      .from('user_exam_targets')
      .delete()
      .eq('user_id', userId)
      .in('target_exam_id', idsToDelete);

    if (error) throw error;
  }
}

export async function saveTargetExam(examData) {
  const payload = {
    name: examData.name.trim(),
    exam_date: examData.examDate,
    is_active: examData.isActive !== false,
  };

  if (examData.id) {
    const { data, error } = await supabase
      .from('target_exams')
      .update(payload)
      .eq('id', examData.id)
      .select()
      .single();

    if (error) throw error;
    return mapTargetExamFromDb(data);
  }

  const { data, error } = await supabase
    .from('target_exams')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return mapTargetExamFromDb(data);
}

export async function deleteTargetExam(id) {
  const { error } = await supabase
    .from('target_exams')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
