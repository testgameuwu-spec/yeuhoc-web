import { supabase } from '@/lib/supabase';

/**
 * Reconstruct TF answer object { a: 'D', b: 'S', ... } from tfSubQuestions array.
 * This allows the answer to be stored as a plain string in the DB while
 * the UI components get the object format they need.
 */
function buildTfAnswerFromSubs(tfSubs) {
  if (!tfSubs || !Array.isArray(tfSubs) || tfSubs.length === 0) return null;
  const obj = {};
  tfSubs.forEach((sub, i) => {
    const letter = String.fromCharCode(97 + i); // a, b, c, d...
    obj[letter] = sub.answer ? 'D' : 'S';
  });
  return obj;
}

function mapExamFromDb(dbExam) {
  if (!dbExam) return null;
  return {
    id: dbExam.id,
    title: dbExam.title,
    subject: dbExam.subject,
    examType: dbExam.exam_type,
    year: dbExam.year,
    duration: dbExam.duration,
    published: dbExam.published,
    scoringConfig: dbExam.scoring_config || null,
    totalQ: dbExam.total_q || 0,
    createdAt: dbExam.created_at,
    questions: dbExam.questions ? dbExam.questions.map(q => {
      const tfSubs = q.tf_sub_questions || undefined;
      const stmts = q.statements || undefined;
      // For TF questions, reconstruct answer as object from tfSubQuestions
      const answer = (q.type === 'TF' && tfSubs)
        ? buildTfAnswerFromSubs(tfSubs)
        : q.answer;
      return {
        id: q.id,
        type: q.type,
        level: q.level,
        content: q.content,
        options: q.options || [],
        answer,
        solution: q.solution,
        tfSubQuestions: tfSubs,
        statements: stmts,
        image: q.image_url || null
      };
    }) : []
  };
}

export async function getAllExams() {
  const { data, error } = await supabase
    .from('exams')
    .select('*, questions(*)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getAllExams error:', error);
    return [];
  }
  return data.map(mapExamFromDb);
}

export async function getPublishedExams() {
  const { data, error } = await supabase
    .from('exams')
    .select('*, questions(*)')
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getPublishedExams error:', error);
    return [];
  }
  return data.map(mapExamFromDb);
}

export async function getExamById(id) {
  const { data, error } = await supabase
    .from('exams')
    .select('*, questions(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return mapExamFromDb(data);
}

export async function saveExam(examData) {
  // Check for duplicate title
  const { data: existingTitle, error: checkError } = await supabase
    .from('exams')
    .select('id')
    .eq('title', examData.title)
    .maybeSingle();

  if (!checkError && existingTitle) {
    if (!examData.id || String(existingTitle.id) !== String(examData.id)) {
      throw new Error('Tên đề thi này đã tồn tại, vui lòng chọn tên khác.');
    }
  }

  // 1. Save Exam
  const dbExam = {
    title: examData.title,
    subject: examData.subject,
    exam_type: examData.examType,
    year: examData.year,
    duration: examData.duration,
    published: examData.published,
    scoring_config: examData.scoringConfig,
    total_q: examData.questions?.length || 0,
  };

  let savedExamId = examData.id;

  if (savedExamId) {
    const { error } = await supabase.from('exams').update(dbExam).eq('id', savedExamId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('exams').insert([dbExam]).select().single();
    if (error) throw error;
    savedExamId = data.id;
  }

  // 2. Save Questions
  if (examData.questions && examData.questions.length > 0) {
    // Delete existing questions if updating
    if (examData.id) {
      await supabase.from('questions').delete().eq('exam_id', savedExamId);
    }
    
    // Insert new questions
    const dbQuestions = examData.questions.map(q => ({
      exam_id: savedExamId,
      type: q.type,
      level: q.level,
      content: q.content,
      options: q.options || null,
      answer: q.answer,
      solution: q.solution || null,
      tf_sub_questions: q.tfSubQuestions || null,
      statements: q.statements || null,
      image_url: q.image || null
    }));
    
    const { error: qError } = await supabase.from('questions').insert(dbQuestions);
    if (qError) throw qError;
  }

  return getExamById(savedExamId);
}

export async function deleteExam(id) {
  // Assuming cascading delete on exams -> questions
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) console.error('deleteExam error:', error);
}

export async function togglePublish(id) {
  const { data: exam } = await supabase.from('exams').select('published').eq('id', id).single();
  if (exam) {
    const { error } = await supabase.from('exams').update({ published: !exam.published }).eq('id', id);
    if (error) console.error('togglePublish error:', error);
  }
}

export async function seedIfEmpty(seedExams) {
  // For DB flow, we don't need seed since the DB acts as source of truth
}
