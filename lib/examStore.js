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
  const questions = Array.isArray(dbExam.questions) ? dbExam.questions : [];
  const mcq = questions.filter(q => q.type === 'MCQ').length;
  const tf = questions.filter(q => q.type === 'TF').length;
  const sa = questions.filter(q => q.type === 'SA').length;

  return {
    id: dbExam.id,
    title: dbExam.title,
    subject: dbExam.subject,
    examType: dbExam.exam_type,
    year: dbExam.year,
    duration: dbExam.duration,
    published: dbExam.published,
    orderIndex: dbExam.order_index || 0,
    folderId: dbExam.folder_id || null,
    scoringConfig: dbExam.scoring_config || null,
    totalQ: dbExam.total_q || 0,
    createdAt: dbExam.created_at,
    antiCheatEnabled: dbExam.anti_cheat_enabled !== false,
    note: dbExam.note || '',
    mcq,
    tf,
    sa,
    questions: questions.map(q => {
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
        image: q.image_url || null,
        linkedTo: q.parent_id || null
      };
    })
  };
}

export async function getAllExams() {
  const { data, error } = await supabase
    .from('exams')
    .select('*, questions(*)')
    .order('order_index', { ascending: true })
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
    .select('id, title, subject, exam_type, year, duration, published, order_index, folder_id, scoring_config, total_q, created_at, anti_cheat_enabled, note, questions(type)')
    .eq('published', true)
    .order('order_index', { ascending: true })
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
    order_index: examData.orderIndex || 0,
    folder_id: examData.folderId || null,
    scoring_config: examData.scoringConfig,
    total_q: examData.questions?.length || 0,
    anti_cheat_enabled: examData.antiCheatEnabled !== false,
    note: examData.note || null,
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
    
    // Generate new UUIDs to map parent-child relationships before inserting
    const idMap = {};
    examData.questions.forEach(q => {
      const newUuid = crypto.randomUUID();
      q._newUuid = newUuid;
      if (q.id) {
        idMap[q.id] = newUuid;
      }
    });

    // Insert new questions
    const dbQuestions = examData.questions.map(q => ({
      id: q._newUuid,
      exam_id: savedExamId,
      type: q.type,
      level: q.level,
      content: q.content,
      options: q.options || null,
      answer: q.answer,
      solution: q.solution || null,
      tf_sub_questions: q.tfSubQuestions || null,
      statements: q.statements || null,
      image_url: q.image || null,
      parent_id: q.linkedTo ? (idMap[q.linkedTo] || null) : null
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

export async function updateExamsOrder(updates) {
  // updates is an array of { id, order_index }
  if (!updates || updates.length === 0) return;
  
  // Update sequentially to avoid database row lock contention or rate limits
  for (const update of updates) {
    const { error } = await supabase
      .from('exams')
      .update({ order_index: update.order_index })
      .eq('id', update.id);
      
    if (error) throw error;
  }
}

// ==========================================
// Folder Management Functions
// ==========================================

export async function getAllFolders() {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('getAllFolders error:', error);
    return [];
  }
  return data.map(f => ({
    id: f.id,
    name: f.name,
    visibility: f.visibility,
    orderIndex: f.order_index,
    createdAt: f.created_at
  }));
}

export async function createFolder(folderData) {
  const dbFolder = {
    name: folderData.name,
    visibility: folderData.visibility || 'public',
    order_index: folderData.orderIndex || 0
  };
  const { data, error } = await supabase.from('folders').insert([dbFolder]).select().single();
  if (error) throw error;
  return data;
}

export async function updateFolder(id, folderData) {
  const dbFolder = {
    name: folderData.name,
    visibility: folderData.visibility,
    order_index: folderData.orderIndex
  };
  const { data, error } = await supabase.from('folders').update(dbFolder).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFolder(id) {
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}

export async function updateFoldersOrder(updates) {
  if (!updates || updates.length === 0) return;
  for (const update of updates) {
    const { error } = await supabase
      .from('folders')
      .update({ order_index: update.order_index })
      .eq('id', update.id);
    if (error) throw error;
  }
}

