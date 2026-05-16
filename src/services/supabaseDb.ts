import { supabase } from '../lib/supabaseClient';
import { Student, Interaction, Template } from '../types';

// ─── STUDENTS ───────────────────────────────────────────────

export const getStudents = async (): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('last_contact_date', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map(dbToStudent);
};

export const saveStudent = async (student: Partial<Student>): Promise<void> => {
  const row = studentToDb(student);
  if (student.id) {
    const { error } = await supabase
      .from('students')
      .update(row)
      .eq('id', student.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('students')
      .insert({ ...row, status: 'Active' });
    if (error) throw error;
  }
};

export const deleteStudent = async (id: string): Promise<void> => {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
};

// ─── INTERACTIONS ────────────────────────────────────────────

export const getInteractions = async (): Promise<Interaction[]> => {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(dbToInteraction);
};

export const addInteraction = async (interaction: Partial<Interaction>): Promise<void> => {
  const { error } = await supabase
    .from('interactions')
    .insert(interactionToDb(interaction));
  if (error) throw error;
};

export const updateInteraction = async (id: string, updates: Partial<Interaction>): Promise<void> => {
  const { error } = await supabase
    .from('interactions')
    .update(interactionToDb(updates))
    .eq('id', id);
  if (error) throw error;
};

export const upsertInteraction = async (interaction: Partial<Interaction>): Promise<void> => {
  const row = interactionToDb(interaction);
  const { error } = await supabase
    .from('interactions')
    .upsert(row, { onConflict: 'student_id,week' });
  if (error) throw error;
};

// ─── TEMPLATES ───────────────────────────────────────────────

export const getTemplates = async (): Promise<Template[]> => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(dbToTemplate);
};

export const saveTemplate = async (template: Partial<Template>): Promise<void> => {
  const row = templateToDb(template);
  if (template.id) {
    const { error } = await supabase
      .from('templates')
      .update(row)
      .eq('id', template.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('templates').insert(row);
    if (error) throw error;
  }
};

export const deleteTemplate = async (id: string): Promise<void> => {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw error;
};

// ─── MAPPERS: DB (snake_case) ↔ App (camelCase) ─────────────

const dbToStudent = (row: any): Student => ({
  id: row.id,
  name: row.name,
  studentNumber: row.student_number ?? undefined,
  phone: row.phone ?? undefined,
  courseHistory: row.course_history,
  currentCertificate: row.current_certificate ?? undefined,
  mentorId: row.mentor_id,
  status: row.status,
  lastContactDate: row.last_contact_date ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
});

const studentToDb = (s: Partial<Student>) => ({
  ...(s.name !== undefined && { name: s.name }),
  ...(s.studentNumber !== undefined && { student_number: s.studentNumber }),
  ...(s.phone !== undefined && { phone: s.phone }),
  ...(s.courseHistory !== undefined && { course_history: s.courseHistory }),
  ...(s.currentCertificate !== undefined && { current_certificate: s.currentCertificate }),
  ...(s.mentorId !== undefined && { mentor_id: s.mentorId }),
  ...(s.status !== undefined && { status: s.status }),
  ...(s.lastContactDate !== undefined && { last_contact_date: s.lastContactDate }),
  ...(s.notes !== undefined && { notes: s.notes }),
});

const dbToInteraction = (row: any): Interaction => ({
  id: row.id,
  studentId: row.student_id,
  mentorId: row.mentor_id,
  week: row.week,
  date: row.date,
  typeContact: row.type_contact ?? undefined,
  messages: row.messages ?? undefined,
  responseType: row.response_type,
  content: row.content ?? '',
  chatHistory: row.chat_history ?? undefined,
  summary: row.summary ?? undefined,
});

const interactionToDb = (i: Partial<Interaction>) => ({
  ...(i.studentId !== undefined && { student_id: i.studentId }),
  ...(i.mentorId !== undefined && { mentor_id: i.mentorId }),
  ...(i.week !== undefined && { week: i.week }),
  ...(i.date !== undefined && { date: i.date }),
  ...(i.typeContact !== undefined && { type_contact: i.typeContact }),
  ...(i.messages !== undefined && { messages: i.messages }),
  ...(i.responseType !== undefined && { response_type: i.responseType }),
  ...(i.content !== undefined && { content: i.content }),
  ...(i.chatHistory !== undefined && { chat_history: i.chatHistory }),
  ...(i.summary !== undefined && { summary: i.summary }),
});

const dbToTemplate = (row: any): Template => ({
  id: row.id,
  mentorId: row.mentor_id,
  title: row.title,
  content: row.content,
});

const templateToDb = (t: Partial<Template>) => ({
  ...(t.mentorId !== undefined && { mentor_id: t.mentorId }),
  ...(t.title !== undefined && { title: t.title }),
  ...(t.content !== undefined && { content: t.content }),
});
