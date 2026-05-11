import { Student, Interaction, Template, Profile } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'mentorship_students',
  INTERACTIONS: 'mentorship_interactions',
  TEMPLATES: 'mentorship_templates',
  USER: 'mentorship_user'
};

const get = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const save = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
  // Emit custom event to simulate real-time updates
  window.dispatchEvent(new CustomEvent('mock-db-update', { detail: { key } }));
};

export const mockDb = {
  // Students
  getStudents: () => get<Student[]>(STORAGE_KEYS.STUDENTS, []),
  saveStudent: (student: Partial<Student>) => {
    const students = mockDb.getStudents();
    if (student.id) {
      const index = students.findIndex(s => s.id === student.id);
      students[index] = { ...students[index], ...student } as Student;
    } else {
      const newStudent = {
        ...student,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        status: 'Active'
      } as Student;
      students.push(newStudent);
    }
    save(STORAGE_KEYS.STUDENTS, students);
  },
  deleteStudent: (id: string) => {
    const students = mockDb.getStudents().filter(s => s.id !== id);
    save(STORAGE_KEYS.STUDENTS, students);
  },

  // Interactions
  getInteractions: () => get<Interaction[]>(STORAGE_KEYS.INTERACTIONS, []),
  addInteraction: (interaction: Partial<Interaction>) => {
    const interactions = mockDb.getInteractions();
    const newInteraction = {
      ...interaction,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(),
    } as Interaction;
    interactions.push(newInteraction);
    save(STORAGE_KEYS.INTERACTIONS, interactions);

    // Update student's last contact
    if (interaction.studentId) {
        mockDb.saveStudent({ id: interaction.studentId, lastContactDate: new Date() });
    }
  },
  updateInteraction: (id: string, updates: Partial<Interaction>) => {
    const interactions = mockDb.getInteractions();
    const index = interactions.findIndex(i => i.id === id);
    if (index > -1) {
      interactions[index] = { ...interactions[index], ...updates };
      save(STORAGE_KEYS.INTERACTIONS, interactions);
    }
  },
  getTemplates: () => get<Template[]>(STORAGE_KEYS.TEMPLATES, []),
  saveTemplate: (template: Partial<Template>) => {
    const templates = mockDb.getTemplates();
    if (template.id) {
      const index = templates.findIndex(t => t.id === template.id);
      if (index > -1) {
        templates[index] = { ...templates[index], ...template } as Template;
      }
    } else {
      const newTemplate = {
        ...template,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date()
      } as Template;
      templates.push(newTemplate);
    }
    save(STORAGE_KEYS.TEMPLATES, templates);
  },
  addTemplate: (template: Partial<Template>) => {
    mockDb.saveTemplate(template);
  },
  deleteTemplate: (id: string) => {
    const templates = mockDb.getTemplates().filter(t => t.id !== id);
    save(STORAGE_KEYS.TEMPLATES, templates);
  }
};
