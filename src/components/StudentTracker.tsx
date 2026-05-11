import React, { useState, useEffect, useRef } from 'react';
import * as db from '../services/supabaseDb';
import { useAuth } from './AuthProvider';
import { Student, Interaction, ResponseType, Template } from '../types';
import { format } from 'date-fns';
import { getCurrentWeek } from '../lib/dateUtils';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  MessageSquare, 
  Calendar, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Upload,
  UserPlus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  X,
  FileText,
  Phone,
  Video as VideoIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StudentTracker: React.FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({ name: '', studentNumber: '', phone: '', courseHistory: '' });
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedStudentForChat, setSelectedStudentForChat] = useState<Student | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [s, i] = await Promise.all([db.getStudents(), db.getInteractions()]);
      setStudents(s);
      setInteractions(i);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('supabase-db-update', handler);
    return () => window.removeEventListener('supabase-db-update', handler);
  }, []);

  const handleAddStudent = async () => {
    if (!newStudent.name) return;
    await db.saveStudent({
      ...newStudent,
      id: editingStudent?.id,
      mentorId: profile?.id || 'mentor_123',
    });
    window.dispatchEvent(new CustomEvent('supabase-db-update'));
    setNewStudent({ name: '', studentNumber: '', phone: '', courseHistory: '' });
    setEditingStudent(null);
    setIsAddingStudent(false);
  };

  const handleEdit = (student: Student) => {
    setNewStudent({ 
      name: student.name, 
      studentNumber: student.studentNumber || '', 
      phone: student.phone || '',
      courseHistory: student.courseHistory 
    });
    setEditingStudent(student);
    setIsAddingStudent(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este alumno?')) {
      await db.deleteStudent(id);
      window.dispatchEvent(new CustomEvent('supabase-db-update'));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      for (const row of data) {
        await db.saveStudent({
          name: row['Full Name'] || row['Nombre'] || row['name'],
          studentNumber: String(row['Student Number'] || row['ID'] || row['id'] || ''),
          courseHistory: row['Student Course History'] || row['Curso'] || '',
          mentorId: profile?.id || 'mentor_123',
        });
      }
      window.dispatchEvent(new CustomEvent('supabase-db-update'));
      alert(`¡${data.length} alumnos importados con éxito!`);
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    const dataToExport = filteredStudents.map(student => {
      const interaction = selectedWeek === 0 
        ? interactions.filter(i => i.studentId === student.id).sort((a,b) => b.week - a.week)[0]
        : interactions.find(i => i.studentId === student.id && i.week === selectedWeek);
      
      return {
        'Nombre Completo': student.name,
        'ID / Student Number': student.studentNumber || '',
        'Último Contacto': student.lastContactDate ? format(new Date(student.lastContactDate), 'dd/MM/yyyy HH:mm') : 'Sin contacto',
        'Course History': student.courseHistory,
        'Semana': selectedWeek === 0 ? (interaction?.week ? `Semana ${interaction.week}` : 'N/A') : `Semana ${selectedWeek}`,
        'Tipo de Contacto': interaction?.typeContact || '',
        'Mensajes': interaction?.messages || '',
        'Respuesta del Estudiante': interaction?.responseType || '',
        'Observaciones': interaction?.content || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos');
    
    // Generate filename with current date
    const fileName = `Seguimiento_Alumnos_${format(new Date(), 'yyyy-MM-dd')}_S${selectedWeek === 0 ? 'Todas' : selectedWeek}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleUpdateStudentField = async (id: string, field: string, value: any) => {
    await db.saveStudent({ id, [field]: value });
    window.dispatchEvent(new CustomEvent('supabase-db-update'));
  };

  const handleUpdateInteractionField = async (studentId: string, field: string, value: any, weekOverride?: number) => {
    const targetWeek = weekOverride !== undefined ? weekOverride : selectedWeek;
    if (targetWeek === 0) return;

    await db.upsertInteraction({
      studentId,
      mentorId: profile?.id || 'mentor_123',
      week: targetWeek,
      responseType: 'No Response',
      [field]: value,
    });
    window.dispatchEvent(new CustomEvent('supabase-db-update'));
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredStudents = [...students].filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentNumber?.includes(searchTerm)
  ).sort((a, b) => {
    if (!sortConfig) {
      // Default sort by lastContactDate desc
      const dateA = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
      const dateB = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
      return dateB - dateA;
    }

    const { key, direction } = sortConfig;
    
    const getInteractionValue = (student: Student, field: string) => {
      const interaction = selectedWeek === 0 
        ? interactions.filter(i => i.studentId === student.id).sort((p,q) => q.week - p.week)[0]
        : interactions.find(i => i.studentId === student.id && i.week === selectedWeek);
      return (interaction as any)?.[field] || '';
    };

    let valA: any = '';
    let valB: any = '';

    if (['name', 'lastContactDate', 'courseHistory'].includes(key)) {
      valA = (a as any)[key] || '';
      valB = (b as any)[key] || '';
      
      // Handle dates
      if (key === 'lastContactDate') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }
    } else {
      valA = getInteractionValue(a, key);
      valB = getInteractionValue(b, key);
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const COURSE_HISTORY_OPTIONS = ['Current', 'Schedule', 'Other', 'Not enroled'];
  const CONTACT_TYPE_OPTIONS = [
    'Significant High Impact',
    'Significant Moderately',
    'Emoji',
    'Emoji and Thank you',
    'No Response'
  ];
  const MESSAGE_OPTIONS = ['Follow up', 'RA', 'Video Call'];
  const RESPONSE_OPTIONS = [
    'No Response',
    'Yes - Only emoji or thank you',
    'Yes - High impact conversation',
    'Yes - Moderately significant conversation'
  ];

  const getCourseStatusColor = (status: string) => {
    switch (status) {
      case 'Schedule': return 'bg-sky-100/90 hover:bg-sky-200/90 border-l-4 border-sky-400';
      case 'Not enroled': return 'bg-rose-100/90 hover:bg-rose-200/90 border-l-4 border-rose-400';
      case 'Other': return 'bg-slate-100 hover:bg-slate-200 border-l-4 border-slate-300';
      case 'Current': return 'bg-emerald-100/90 hover:bg-emerald-200/90 border-l-4 border-emerald-400';
      default: return 'hover:bg-slate-50 border-l-4 border-transparent';
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ChevronsUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />;
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2">
        <div className="shrink-0">
          <h2 className="text-2xl font-black text-dark tracking-tight uppercase">Seguimiento</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Buscar alumno..."
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl focus:ring-4 focus:ring-primary/10 shadow-sm outline-none w-full text-xs font-bold transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-50 overflow-hidden shrink-0">
            <span className="pl-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">Semana</span>
            <select 
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="px-3 py-2.5 outline-none font-black text-primary cursor-pointer text-xs"
            >
              {[1, 2, 3, 4].map(w => (
                <option key={w} value={w}>S{w}</option>
              ))}
              <option value={0}>Todas</option>
            </select>
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-100 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm shrink-0 text-xs"
          >
            <FileSpreadsheet size={16} className="text-green-500" />
            <span>Importar</span>
          </button>

          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-100 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm shrink-0 text-xs"
          >
            <FileText size={16} className="text-secondary" />
            <span>Exportar</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />

          <button 
            onClick={() => {
              setEditingStudent(null);
              setNewStudent({ name: '', studentNumber: '', phone: '', courseHistory: '' });
              setIsAddingStudent(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-dark text-white rounded-xl font-bold shadow-lg hover:brightness-125 transition-all text-xs shrink-0"
          >
            <Plus size={16} />
            <span>Nuevo Alumno</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAddingStudent && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-dark p-8 rounded-[32px] shadow-2xl text-white relative"
          >
            <button 
              onClick={() => setIsAddingStudent(false)}
              className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
              <UserPlus className="text-primary" size={24} />
              {editingStudent ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-primary/60 px-1">Nombre Completo</label>
                <input 
                  type="text" 
                  placeholder="Ej: Alejandro Mendoza" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary text-white placeholder:text-white/30"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-primary/60 px-1">ID / Student Number</label>
                <input 
                  type="text" 
                  placeholder="Ej: 30102687" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary text-white placeholder:text-white/30"
                  value={newStudent.studentNumber}
                  onChange={(e) => setNewStudent({...newStudent, studentNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-primary/60 px-1">Teléfono</label>
                <input 
                  type="text" 
                  placeholder="Ej: +549112345678" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary text-white placeholder:text-white/30"
                  value={newStudent.phone}
                  onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-primary/60 px-1">Course History</label>
                <select 
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary text-white"
                  value={newStudent.courseHistory}
                  onChange={(e) => setNewStudent({...newStudent, courseHistory: e.target.value})}
                >
                  {COURSE_HISTORY_OPTIONS.map(opt => <option key={opt} value={opt} className="text-dark font-bold">{opt}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3 pb-0.5">
                <button 
                  onClick={handleAddStudent}
                  className="flex-1 bg-secondary text-white rounded-xl py-3 font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg"
                >
                  {editingStudent ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {chatModalOpen && selectedStudentForChat && (
          <ChatHistoryModal 
            student={selectedStudentForChat}
            interaction={interactions.find(i => i.studentId === selectedStudentForChat.id && i.week === (selectedWeek || 1))}
            studentInteractions={interactions.filter(i => i.studentId === selectedStudentForChat.id).sort((a, b) => b.week - a.week)}
            onClose={() => {
              setChatModalOpen(false);
              setSelectedStudentForChat(null);
            }}
            onSave={(chatHistory) => {
              handleUpdateInteractionField(selectedStudentForChat.id, 'chatHistory', chatHistory, selectedWeek || 1);
            }}
            onMessageTypeChange={(newMsgType) => {
              handleUpdateInteractionField(selectedStudentForChat.id, 'messages', newMsgType, selectedWeek || 1);
            }}
          />
        )}
      </AnimatePresence>

      <div className="hidden lg:block bg-white rounded-[32px] shadow-xl border border-slate-50 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h3 className="font-bold text-dark">Listado de Alumnos</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listado ordenable de alumnos</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-5 font-black w-64 cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Alumno / ID
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th className="px-6 py-5 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('lastContactDate')}>
                  <div className="flex items-center gap-2">
                    Contacto / Ingreso
                    <SortIcon columnKey="lastContactDate" />
                  </div>
                </th>
                <th className="px-6 py-5 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('courseHistory')}>
                  <div className="flex items-center gap-2">
                    Course History
                    <SortIcon columnKey="courseHistory" />
                  </div>
                </th>
                <th className="px-6 py-5 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('typeContact')}>
                  <div className="flex items-center gap-2">
                    Type Contact
                    <SortIcon columnKey="typeContact" />
                  </div>
                </th>
                <th className="px-6 py-5 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('messages')}>
                  <div className="flex items-center gap-2">
                    Messages
                    <SortIcon columnKey="messages" />
                  </div>
                </th>
                <th className="px-6 py-5 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('responseType')}>
                  <div className="flex items-center gap-2">
                    Student Response
                    <SortIcon columnKey="responseType" />
                  </div>
                </th>
                <th className="px-6 py-5 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('content')}>
                  <div className="flex items-center gap-2">
                    Observaciones
                    <SortIcon columnKey="content" />
                  </div>
                </th>
                <th className="px-6 py-5 font-black text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const weeklyInteraction = selectedWeek === 0 
                  ? interactions.filter(i => i.studentId === student.id).sort((a,b) => b.week - a.week)[0]
                  : interactions.find(i => i.studentId === student.id && i.week === selectedWeek);
                
                return (
                  <tr key={student.id} className={`${getCourseStatusColor(student.courseHistory)} transition-all duration-300 group`}>
                    <td className="px-6 py-6 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-dark text-white flex items-center justify-center font-black text-xs shadow-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-dark text-sm truncate">{student.name}</div>
                          {student.studentNumber && <div className="text-[9px] text-slate-500 font-black">#{student.studentNumber}</div>}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 border-b border-slate-100">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-col">
                          <span className="text-[7px] uppercase font-black text-slate-400 leading-none">Último</span>
                          <span className="text-[11px] font-black text-slate-700">
                            {student.lastContactDate ? format(new Date(student.lastContactDate), 'dd MMM, HH:mm') : 'Sin contacto'}
                          </span>
                        </div>
                        <div className="flex flex-col border-t border-slate-200/50 pt-1">
                          <span className="text-[7px] uppercase font-black text-slate-400 leading-none">Ingreso</span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {student.createdAt ? format(new Date(student.createdAt), 'dd MMM, yyyy') : 'Sin fecha'}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 border-b border-slate-100">
                      <select 
                        value={student.courseHistory}
                        onChange={(e) => handleUpdateStudentField(student.id, 'courseHistory', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer shadow-sm"
                      >
                        {COURSE_HISTORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-4 py-4 border-b border-slate-100">
                      <select 
                        disabled={selectedWeek === 0}
                        value={weeklyInteraction?.typeContact || ''}
                        onChange={(e) => handleUpdateInteractionField(student.id, 'typeContact', e.target.value)}
                        className={`w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer shadow-sm ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      >
                        <option value="">- Seleccionar -</option>
                        {CONTACT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-4 py-4 border-b border-slate-100">
                      <select 
                        disabled={selectedWeek === 0}
                        value={weeklyInteraction?.messages || ''}
                        onChange={(e) => handleUpdateInteractionField(student.id, 'messages', e.target.value)}
                        className={`w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer shadow-sm ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      >
                        <option value="">- Seleccionar -</option>
                        {MESSAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-4 py-4 border-b border-slate-100">
                      <select 
                        disabled={selectedWeek === 0}
                        value={weeklyInteraction?.responseType || 'No Response'}
                        onChange={(e) => handleUpdateInteractionField(student.id, 'responseType', e.target.value)}
                        className={`max-w-[200px] w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-[10px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer truncate shadow-sm ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      >
                        {RESPONSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-4 py-4 border-b border-slate-100">
                      <textarea 
                        disabled={selectedWeek === 0}
                        rows={1}
                        placeholder="..."
                        value={weeklyInteraction?.content || ''}
                        onChange={(e) => handleUpdateInteractionField(student.id, 'content', e.target.value)}
                        className={`w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/40 resize-none min-h-[40px] shadow-sm ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      />
                    </td>

                    <td className="px-6 py-6 text-right border-b border-slate-100">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedStudentForChat(student);
                            setChatModalOpen(true);
                          }}
                          className="p-2.5 text-slate-400 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                          title="Historial de Chat"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(student)}
                          className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id)}
                          className="p-2.5 text-slate-400 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users size={40} className="text-slate-200" />
              </div>
              <h4 className="text-slate-400 font-bold mb-1">Sin Resultados</h4>
              <p className="text-slate-300 text-xs font-medium italic">No se encontraron alumnos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredStudents.map((student) => {
          const weeklyInteraction = selectedWeek === 0 
            ? interactions.filter(i => i.studentId === student.id).sort((a,b) => b.week - a.week)[0]
            : interactions.find(i => i.studentId === student.id && i.week === selectedWeek);
          
          return (
            <div key={student.id} className={`${getCourseStatusColor(student.courseHistory).split(' ')[0]} p-6 rounded-3xl shadow-md border-2 border-slate-100 space-y-4`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-dark text-white flex items-center justify-center font-black text-sm shadow-md">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-dark text-base tracking-tight">{student.name}</div>
                    {student.studentNumber && <div className="text-[10px] text-slate-600 font-black">#{student.studentNumber}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedStudentForChat(student);
                      setChatModalOpen(true);
                    }}
                    className="p-2.5 bg-white text-secondary border border-slate-100 rounded-xl shadow-sm hover:bg-secondary hover:text-white transition-all"
                  >
                    <MessageSquare size={18} />
                  </button>
                  <button 
                    onClick={() => handleEdit(student)}
                    className="p-2.5 bg-white text-primary border border-slate-100 rounded-xl shadow-sm hover:bg-primary hover:text-white transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-500">Último Contacto</label>
                    <div className="text-xs font-black text-slate-800">
                      {student.lastContactDate ? format(new Date(student.lastContactDate), 'dd MMM, HH:mm') : 'Sin contacto'}
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-slate-200/50">
                    <label className="text-[8px] uppercase font-black tracking-widest text-slate-400">Ingreso Sistema</label>
                    <div className="text-[10px] font-bold text-slate-500">
                      {student.createdAt ? format(new Date(student.createdAt), 'dd MMM, yyyy') : 'Sin fecha'}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500">Course History</label>
                  <select 
                    value={student.courseHistory}
                    onChange={(e) => handleUpdateStudentField(student.id, 'courseHistory', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 outline-none shadow-sm"
                  >
                    {COURSE_HISTORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-500">Mensajes</label>
                    <select 
                      disabled={selectedWeek === 0}
                      value={weeklyInteraction?.messages || ''}
                      onChange={(e) => handleUpdateInteractionField(student.id, 'messages', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-2 text-xs font-bold text-slate-800 shadow-sm"
                    >
                      <option value="">- Tipo -</option>
                      {MESSAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-500">Contacto</label>
                    <select 
                      disabled={selectedWeek === 0}
                      value={weeklyInteraction?.typeContact || ''}
                      onChange={(e) => handleUpdateInteractionField(student.id, 'typeContact', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-2 text-xs font-bold text-slate-800 shadow-sm"
                    >
                      <option value="">- Tipo -</option>
                      {CONTACT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-500">Observaciones</label>
                  <textarea 
                    disabled={selectedWeek === 0}
                    rows={2}
                    placeholder="Sin observaciones..."
                    value={weeklyInteraction?.content || ''}
                    onChange={(e) => handleUpdateInteractionField(student.id, 'content', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-xs font-bold text-slate-800 shadow-sm resize-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
        {filteredStudents.length === 0 && (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-50 text-center">
            <p className="text-slate-400 font-bold text-sm">No se encontraron alumnos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChatHistoryModalProps {
  student: Student;
  interaction?: Interaction;
  studentInteractions: Interaction[];
  onClose: () => void;
  onSave: (history: string) => void;
  onMessageTypeChange: (type: string) => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ student, interaction, studentInteractions, onClose, onSave, onMessageTypeChange }) => {
  const [history, setHistory] = useState(interaction?.chatHistory || '');
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'import' | 'history' | 'templates'>('import');
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    db.getTemplates().then(t => setTemplates(t)).catch(console.error);
  }, []);

  const MESSAGE_TYPES = ['Follow up', 'RA', 'Video Call'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setHistory(content);
    };
    reader.readAsText(file);
  };

  const handleCopyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    alert('Plantilla copiada al portapapeles');
  };

  const handleWhatsAppClick = (content?: string) => {
    if (student.phone) {
      const phone = student.phone.replace(/[^0-9]/g, '');
      const textParam = content ? `?text=${encodeURIComponent(content)}` : '';
      window.open(`https://wa.me/${phone}${textParam}`, '_blank');
    } else {
      alert("El alumno no tiene un número de teléfono registrado.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
      >
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-dark rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-dark uppercase tracking-tight">Registro de Mensajes</h3>
              <p className="text-sm font-bold text-slate-500">{student.name} {student.phone ? `- ${student.phone}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-8 pt-4 bg-slate-50/30 gap-4">
          <button 
            onClick={() => setActiveTab('import')}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'import' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Registro de Chat
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Historial
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'templates' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Nuevos Mensajes
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {activeTab === 'import' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">Mensaje (Opciones)</label>
                    <div className="flex flex-wrap gap-2">
                      {MESSAGE_TYPES.map(msgType => (
                        <button
                          key={msgType}
                          onClick={() => onMessageTypeChange(msgType)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            interaction?.messages === msgType 
                              ? 'bg-secondary text-white shadow-md' 
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {msgType}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col items-end gap-3 h-full justify-center">
                    <p className="text-[10px] font-bold text-slate-400 text-right">Sube el archivo .txt exportado de WhatsApp para registrar el historial completo.</p>
                    <button 
                      onClick={() => chatInputRef.current?.click()}
                      className="flex items-center gap-2 px-6 py-4 bg-green-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-200 w-full md:w-auto"
                    >
                      <Upload size={18} />
                      Importar Chat
                    </button>
                  </div>
                </div>
              </div>
              
              <input type="file" ref={chatInputRef} accept=".txt" className="hidden" onChange={handleFileUpload} />

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">
                  Notas / Contenido del Chat Actual
                </label>
                <textarea 
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="Escribe aquí los detalles del chat o sube el historial..."
                  className="w-full h-64 p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-primary/10 text-sm font-medium text-slate-700 placeholder:text-slate-300 resize-none font-mono leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">
                Historial de Mensajes Pasados
              </label>
              {studentInteractions.length === 0 || (studentInteractions.length === 1 && studentInteractions[0].id === interaction?.id) ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-sm font-medium text-slate-400">No hay historial registrado aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentInteractions
                    .filter(i => i.id !== interaction?.id)
                    .map((inter) => (
                    <div key={inter.id} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-[10px] font-black text-dark uppercase tracking-widest">Semana {inter.week} - {inter.messages || 'Sin tipo'}</div>
                        <div className="text-[9px] text-slate-400 font-bold">{inter.date ? format(new Date(inter.date), 'dd MMM yyyy') : ''}</div>
                      </div>
                      {inter.chatHistory ? (
                        <div className="text-[11px] text-slate-600 font-mono line-clamp-3 whitespace-pre-wrap">
                          {inter.chatHistory}
                        </div>
                      ) : inter.content ? (
                        <div className="text-[11px] text-slate-600 italic">
                          {inter.content}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">Sin contenido registrado.</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1">
                  Generar Nuevo Mensaje
                </label>
                <button
                  onClick={() => handleWhatsAppClick()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-md"
                >
                  <Phone size={14} />
                  WhatsApp Libre
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-sm font-medium text-slate-400">No hay plantillas guardadas en el repositorio.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-3 group hover:border-primary/30 transition-colors">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-dark uppercase">{template.title}</h4>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleCopyTemplate(template.content)}
                            className="px-3 py-1.5 bg-white text-primary rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-primary hover:text-white transition-all"
                          >
                            Copiar
                          </button>
                          <button 
                            onClick={() => handleWhatsAppClick(template.content)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-green-600 transition-all"
                          >
                            <Phone size={12} />
                            Enviar
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium whitespace-pre-wrap">{template.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-50 flex justify-end gap-3 bg-white">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-[10px]"
          >
            Cerrar
          </button>
          <button 
            onClick={() => {
              onSave(history);
              onClose();
            }}
            className="px-10 py-3 bg-primary text-dark rounded-2xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all font-black uppercase tracking-widest text-[10px]"
          >
            Guardar Cambios
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
