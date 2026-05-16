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
  ChevronsUpDown,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  onSave: (val: string) => void;
  initialValue: string;
}

const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({ onSave, initialValue, ...props }) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (value !== initialValue) {
      onSave(value);
    }
  };

  return (
    <textarea
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

export const StudentTracker: React.FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({ name: '', studentNumber: '', phone: '', courseHistory: 'Current' });
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedStudentForChat, setSelectedStudentForChat] = useState<Student | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');
  const [importModal, setImportModal] = useState<{
    open: boolean;
    fileName: string;
    columns: string[];
    rows: any[];
    mapping: Record<string, string>;
  }>({ open: false, fileName: '', columns: [], rows: [], mapping: {} });

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
    setNewStudent({ name: '', studentNumber: '', phone: '', courseHistory: 'Current' });
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
    // Reset so same file can be re-selected
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      // Auto-detect common column names
      const guess = (candidates: string[]) =>
        columns.find(c => candidates.some(k => c.toLowerCase().includes(k.toLowerCase()))) || '';

      setImportModal({
        open: true,
        fileName: file.name,
        columns,
        rows,
        mapping: {
          name:              guess(['Full Name', 'Fullname', 'Nombre', 'Name', 'Student Name']),
          studentNumber:     guess(['Student Number', 'ID', 'Number', 'Numero']),
          phone:             guess(['WhatsApp', 'Phone', 'Telefono', 'Teléfono', 'Mobile']),
          currentCertificate:guess(['Certificate', 'Certificado', 'Course Name', 'Programa']),
          courseHistory:     guess(['Course History', 'Status', 'Curso', 'Estado']),
        },
      });
    };
    reader.readAsBinaryString(file);
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("Por favor, configura VITE_GEMINI_API_KEY en tu archivo .env con tu clave de Google AI Studio para usar esta función.");
      return;
    }

    setIsProcessingAI(true);
    setAiProgress(0);
    setAiStatus('Leyendo imagen...');

    // Simulated progress ticker
    const progressInterval = setInterval(() => {
      setAiProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return prev; }
        return prev + Math.random() * 8;
      });
    }, 400);

    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64Data = base64Image.split(',')[1];

      setAiStatus('Analizando con Gemini AI...');
      setAiProgress(20);

      const prompt = `Analiza la siguiente imagen que contiene una tabla de alumnos. 
Extrae la información de cada alumno en formato JSON, devolviendo estrictamente un array de objetos JSON con la siguiente estructura y claves EXACTAS:
[
  {
    "Fullname": "Nombre completo del alumno",
    "Student Number": "Número de estudiante",
    "Current Certificate": "Certificado actual o programa",
    "Student Status": "Estado del alumno (ej. Active)",
    "Whatsapp": "Número de Whatsapp o teléfono"
  }
]
Si un dato no está en la imagen, déjalo como "". Solo devuelve la salida JSON, sin texto adicional ni marcadores de código como \`\`\`json.`;

      const response = await fetch(
        `/gemini-api/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: file.type, data: base64Data } }
              ]
            }]
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errBody}`);
      }

      clearInterval(progressInterval);
      setAiProgress(75);
      setAiStatus('Extrayendo datos de alumnos...');

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const studentsData = JSON.parse(cleanText);

      setAiProgress(85);
      const existingNames = new Set(students.map(s => s.name.toLowerCase().trim()));
      const existingNumbers = new Set(students.map(s => s.studentNumber?.toLowerCase().trim()).filter(Boolean));

      let savedCount = 0;
      let skippedCount = 0;
      for (const row of studentsData) {
        if (!row['Fullname']) continue;
        const rowName = row['Fullname'].toLowerCase().trim();
        const rowNum  = String(row['Student Number'] || '').toLowerCase().trim();
        // Skip if name or student number already exists
        if (existingNames.has(rowName) || (rowNum && existingNumbers.has(rowNum))) {
          skippedCount++;
          continue;
        }
        setAiStatus(`Guardando ${savedCount + 1} / ${studentsData.length - skippedCount}...`);
        await db.saveStudent({
          name: row['Fullname'],
          studentNumber: String(row['Student Number'] || ''),
          courseHistory: 'Current',
          currentCertificate: row['Current Certificate'] || '',
          status: row['Student Status'] || 'Active',
          phone: row['Whatsapp'] || '',
          mentorId: profile?.id || 'mentor_123',
        });
        savedCount++;
      }

      setAiProgress(100);
      setAiStatus(
        skippedCount > 0
          ? `¡${savedCount} nuevos! ${skippedCount} ya existían.`
          : '¡Importación completada!'
      );
      await new Promise(r => setTimeout(r, 1200));

      window.dispatchEvent(new CustomEvent('supabase-db-update'));
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Error procesando imagen con IA:', err);
      alert('Hubo un error al procesar la imagen con IA: ' + (err.message || err));
    } finally {
      setIsProcessingAI(false);
      setAiProgress(0);
      setAiStatus('');
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (id: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudents(newSet);
  };

  const handleMassDelete = async () => {
    if (window.confirm(`¿Estás seguro de eliminar ${selectedStudents.size} alumnos seleccionados?`)) {
      await Promise.all(Array.from(selectedStudents).map(id => db.deleteStudent(id)));
      window.dispatchEvent(new CustomEvent('supabase-db-update'));
      setSelectedStudents(new Set());
    }
  };

  const filteredStudents = [...students].filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentNumber?.includes(searchTerm)
  ).sort((a, b) => {
    if (!sortConfig) {
      // Default sort by createdAt desc (so newest imports are at the top)
      // This prevents rows from jumping around when interactions are updated
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return a.name.localeCompare(b.name);
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
    <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500 relative">
      {/* AI Processing Overlay */}
      <AnimatePresence>
        {isProcessingAI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-6 w-80"
            >
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles size={36} className="text-purple-500" />
                </div>
                <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#ede9fe" strokeWidth="6" />
                  <motion.circle
                    cx="40" cy="40" r="36" fill="none"
                    stroke="#a855f7" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - aiProgress / 100) }}
                    transition={{ duration: 0.4 }}
                  />
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-black text-dark">{aiStatus}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procesando con IA · Por favor espere</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                  animate={{ width: `${aiProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-2xl font-black text-purple-500">{Math.round(aiProgress)}%</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2">
        <div className="shrink-0">
          <h2 className="text-2xl font-black text-dark tracking-tight uppercase">Seguimiento</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          {selectedStudents.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl border border-primary/20 shrink-0 animate-in fade-in slide-in-from-right-4">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedStudents.size} seleccionados</span>
              
              <select 
                onChange={async (e) => {
                  if (!e.target.value) return;
                  if (window.confirm(`¿Actualizar el curso de ${selectedStudents.size} alumnos a "${e.target.value}"?`)) {
                    await Promise.all(Array.from(selectedStudents).map(id => db.saveStudent({ id, courseHistory: e.target.value })));
                    window.dispatchEvent(new CustomEvent('supabase-db-update'));
                    setSelectedStudents(new Set());
                  }
                  e.target.value = "";
                }}
                className="ml-2 px-2 py-1 bg-white rounded border border-primary/20 text-[10px] font-bold text-primary outline-none cursor-pointer"
              >
                <option value="">Cambiar Curso...</option>
                {COURSE_HISTORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              <button 
                onClick={handleMassDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors ml-1 font-bold text-[10px] uppercase tracking-widest border border-rose-200"
                title="Eliminar seleccionados"
              >
                <Trash2 size={14} />
                <span>Eliminar</span>
              </button>
            </div>
          )}
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

          <button 
            onClick={() => imageInputRef.current?.click()}
            disabled={isProcessingAI}
            className={`flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-100 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm shrink-0 text-xs ${isProcessingAI ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isProcessingAI ? <Clock className="animate-spin text-purple-500" size={16} /> : <Sparkles size={16} className="text-purple-500" />}
            <span className="hidden sm:inline">{isProcessingAI ? 'Procesando...' : 'IA Import'}</span>
            <span className="sm:hidden">{isProcessingAI ? '...' : 'IA'}</span>
          </button>

          <input 
            type="file" 
            ref={imageInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />

          {/* Import Mapping Modal */}
          {importModal.open && (
            <ImportMappingModal
              fileName={importModal.fileName}
              columns={importModal.columns}
              rows={importModal.rows}
              mapping={importModal.mapping}
              onMappingChange={(field, col) =>
                setImportModal(prev => ({ ...prev, mapping: { ...prev.mapping, [field]: col } }))
              }
              onClose={() => setImportModal(prev => ({ ...prev, open: false }))}
              onImport={async (mapping) => {
                const existingNames   = new Set(students.map(s => s.name.toLowerCase().trim()));
                const existingNumbers = new Set(students.map(s => s.studentNumber?.toLowerCase().trim()).filter(Boolean));

                let count = 0;
                let skipped = 0;
                for (const row of importModal.rows) {
                  const name = mapping.name ? String(row[mapping.name] || '').trim() : '';
                  if (!name) continue;
                  const rowNum = mapping.studentNumber ? String(row[mapping.studentNumber] || '').toLowerCase().trim() : '';
                  // Skip duplicates
                  if (existingNames.has(name.toLowerCase()) || (rowNum && existingNumbers.has(rowNum))) {
                    skipped++;
                    continue;
                  }
                  await db.saveStudent({
                    name,
                    studentNumber: mapping.studentNumber ? String(row[mapping.studentNumber] || '') : '',
                    phone:              mapping.phone ? String(row[mapping.phone] || '') : '',
                    currentCertificate: mapping.currentCertificate ? String(row[mapping.currentCertificate] || '') : '',
                    courseHistory:      mapping.courseHistory ? String(row[mapping.courseHistory] || '') : 'Current',
                    mentorId: profile?.id || 'mentor_123',
                  });
                  count++;
                }
                window.dispatchEvent(new CustomEvent('supabase-db-update'));
                setImportModal(prev => ({ ...prev, open: false }));
                const msg = skipped > 0
                  ? `¡${count} alumnos importados! (${skipped} omitidos porque ya existen en el sistema)`
                  : `¡${count} alumnos importados correctamente!`;
                alert(msg);
              }}
            />
          )}

          <button 
            onClick={() => {
              setEditingStudent(null);
              setNewStudent({ name: '', studentNumber: '', phone: '', courseHistory: 'Current' });
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
          <table className="w-full text-left min-w-[950px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 bg-slate-50/50">
                <th className="px-4 py-5 font-black w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-3 py-3 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('name')}>
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
                <th className="px-3 py-3 font-black">
                  Contacto / Info
                </th>
                <th className="px-3 py-3 font-black cursor-pointer hover:text-dark transition-colors group" onClick={() => handleSort('content')}>
                  <div className="flex items-center gap-2">
                    Observaciones
                    <SortIcon columnKey="content" />
                  </div>
                </th>
                <th className="px-3 py-3 font-black text-right sticky right-0 bg-slate-50/95 backdrop-blur z-10 shadow-[-12px_0_15px_-4px_rgba(0,0,0,0.05)] w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const weeklyInteraction = selectedWeek === 0 
                  ? interactions.filter(i => i.studentId === student.id).sort((a,b) => b.week - a.week)[0]
                  : interactions.find(i => i.studentId === student.id && i.week === selectedWeek);
                
                return (
                  <tr key={student.id} className={`${getCourseStatusColor(student.courseHistory)} transition-all duration-300 group`}>
                    <td className="px-4 py-3 border-b border-slate-100">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                      />
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100">
                      <div className="min-w-0">
                        <div className="font-bold text-dark text-xs truncate">
                          {student.name}
                          {!student.lastContactDate && (
                            <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] uppercase font-black rounded inline-block align-middle">
                              Nuevo
                            </span>
                          )}
                        </div>
                        {student.studentNumber && <div className="text-[9px] text-slate-500 font-black">#{student.studentNumber}</div>}
                      </div>
                    </td>
                    
                    <td className="px-3 py-3 border-b border-slate-100 min-w-[100px]">
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
                    
                    <td className="px-2 py-3 border-b border-slate-100">
                      <select 
                        value={student.courseHistory}
                        onChange={(e) => handleUpdateStudentField(student.id, 'courseHistory', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-[10px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer shadow-sm min-w-[90px]"
                      >
                        {COURSE_HISTORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-2 py-3 border-b border-slate-100">
                      <select 
                        disabled={selectedWeek === 0}
                        value={weeklyInteraction?.typeContact || ''}
                        onChange={(e) => handleUpdateInteractionField(student.id, 'typeContact', e.target.value)}
                        className={`w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-[10px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer shadow-sm min-w-[90px] ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      >
                        <option value="">- Tipo -</option>
                        {CONTACT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-2 py-3 border-b border-slate-100">
                      <select 
                        disabled={selectedWeek === 0}
                        value={weeklyInteraction?.messages || ''}
                        onChange={(e) => handleUpdateInteractionField(student.id, 'messages', e.target.value)}
                        className={`w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-[10px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer shadow-sm min-w-[90px] ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      >
                        <option value="">- Msg -</option>
                        {MESSAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-2 py-3 border-b border-slate-100">
                      <select 
                        disabled={selectedWeek === 0}
                        value={weeklyInteraction?.responseType || 'No Response'}
                        onChange={(e) => handleUpdateInteractionField(student.id, 'responseType', e.target.value)}
                        className={`w-full bg-white border border-slate-200 rounded py-1 px-1.5 text-[10px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer truncate shadow-sm min-w-[100px] ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      >
                        {RESPONSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>

                    <td className="px-2 py-3 border-b border-slate-100 min-w-[110px]">
                      <div className="flex flex-col gap-1.5">
                        {student.phone && (
                          <a href={`https://wa.me/${student.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[9px] font-black text-emerald-600 hover:text-emerald-700 transition-colors w-fit"
                          >
                            <Phone size={10} />
                            <span>{student.phone}</span>
                          </a>
                        )}
                        {student.currentCertificate && (
                          <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 text-[8px] font-black rounded border border-sky-100 w-fit line-clamp-1" title={student.currentCertificate}>
                            {student.currentCertificate}
                          </span>
                        )}
                        {!student.phone && !student.currentCertificate && (
                          <span className="text-[10px] text-slate-300 font-bold">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-2 py-3 border-b border-slate-100">
                      <DebouncedTextarea 
                        disabled={selectedWeek === 0}
                        rows={1}
                        placeholder="..."
                        initialValue={weeklyInteraction?.content || ''}
                        onSave={(val) => handleUpdateInteractionField(student.id, 'content', val)}
                        className={`w-full bg-white border border-slate-200 rounded py-1.5 px-2 text-[10px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-primary/40 resize-none min-h-[28px] shadow-sm min-w-[120px] ${selectedWeek === 0 ? 'opacity-50' : ''}`}
                      />
                    </td>

                    <td className="px-3 py-3 border-b border-slate-100 sticky right-0 bg-white/95 backdrop-blur z-10 shadow-[-12px_0_15px_-4px_rgba(0,0,0,0.05)] group-hover:bg-slate-50/95 transition-colors align-middle text-center">
                      <div className="relative inline-block text-left group/dropdown">
                        <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all focus:outline-none">
                          <MoreVertical size={16} />
                        </button>
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-50 transform scale-95 group-hover/dropdown:scale-100 origin-top-right [tr:nth-last-child(-n+3)_&]:bottom-full [tr:nth-last-child(-n+3)_&]:top-auto [tr:nth-last-child(-n+3)_&]:mb-1 [tr:nth-last-child(-n+3)_&]:mt-0 [tr:nth-last-child(-n+3)_&]:origin-bottom-right">
                          <div className="p-1 flex flex-col gap-0.5">
                            <button 
                              onClick={() => {
                                setSelectedStudentForChat(student);
                                setChatModalOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-600 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-all w-full text-left"
                            >
                              <MessageSquare size={12} /> Chat
                            </button>
                            <button 
                              onClick={() => handleEdit(student)}
                              className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-all w-full text-left"
                            >
                              <Edit2 size={12} /> Editar
                            </button>
                            <div className="h-px bg-slate-100 my-0.5 w-full" />
                            <button 
                              onClick={() => handleDelete(student.id)}
                              className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all w-full text-left"
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        </div>
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

              {/* WhatsApp & Certificate row */}
              {(student.phone || student.currentCertificate) && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {student.phone && (
                    <a href={`https://wa.me/${student.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <Phone size={12} />
                      <span>{student.phone}</span>
                    </a>
                  )}
                  {student.currentCertificate && (
                    <span className="flex items-center px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-xl text-[10px] font-black">
                      {student.currentCertificate}
                    </span>
                  )}
                </div>
              )}

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
                  <DebouncedTextarea 
                    disabled={selectedWeek === 0}
                    rows={2}
                    placeholder="Sin observaciones..."
                    initialValue={weeklyInteraction?.content || ''}
                    onSave={(val) => handleUpdateInteractionField(student.id, 'content', val)}
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

// ─── IMPORT MAPPING MODAL ───────────────────────────────────────────────────

const DB_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'name',               label: 'Nombre Completo',   required: true },
  { key: 'studentNumber',      label: 'Número de Alumno' },
  { key: 'phone',              label: 'WhatsApp / Teléfono' },
  { key: 'currentCertificate', label: 'Certificado Actual' },
  { key: 'courseHistory',      label: 'Course History' },
];

interface ImportMappingModalProps {
  fileName: string;
  columns: string[];
  rows: any[];
  mapping: Record<string, string>;
  onMappingChange: (field: string, col: string) => void;
  onClose: () => void;
  onImport: (mapping: Record<string, string>) => Promise<void>;
}

const ImportMappingModal: React.FC<ImportMappingModalProps> = ({
  fileName, columns, rows, mapping, onMappingChange, onClose, onImport,
}) => {
  const [loading, setLoading] = useState(false);
  const preview = rows.slice(0, 3);
  const mappedCount = rows.filter(r => mapping.name && String(r[mapping.name] || '').trim()).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm"
    >
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-dark">Importar Excel</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5 truncate max-w-[280px]">{fileName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-8 space-y-7">

          {/* Step 1 — Column Mapping */}
          <div>
            <p className="text-[10px] font-black text-dark uppercase tracking-widest mb-4">
              Paso 1 · Mapear columnas
            </p>
            <div className="space-y-3">
              {DB_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-44 shrink-0">
                    <p className="text-[11px] font-black text-slate-700">{field.label}</p>
                    {field.required && <span className="text-[9px] text-rose-500 font-bold">Requerido</span>}
                  </div>
                  <div className="flex-1">
                    <select
                      value={mapping[field.key] || ''}
                      onChange={e => onMappingChange(field.key, e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-[11px] font-bold outline-none transition-all cursor-pointer ${
                        mapping[field.key]
                          ? 'border-primary/30 bg-primary/5 text-primary focus:ring-2 focus:ring-primary/20'
                          : 'border-slate-200 bg-white text-slate-400 focus:ring-2 focus:ring-slate-100'
                      }`}
                    >
                      <option value="">— Sin mapear —</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                  {mapping[field.key] && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-[9px] font-black">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2 — Preview */}
          {mapping.name && preview.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-dark uppercase tracking-widest mb-3">
                Paso 2 · Previsualización ({mappedCount} alumnos a importar)
              </p>
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {DB_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <th key={f.key} className="px-3 py-2 text-left font-black text-slate-500 uppercase tracking-wide">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        {DB_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <td key={f.key} className="px-3 py-2 font-medium text-slate-700 truncate max-w-[120px]">
                            {String(row[mapping[f.key]] || '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 3 && (
                <p className="text-[10px] text-slate-400 font-medium mt-2 px-1">
                  +{rows.length - 3} filas más no mostradas en la previsualización
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-50 flex justify-between items-center bg-white">
          <p className="text-[10px] text-slate-400 font-bold">
            {rows.length} filas en el archivo
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
              Cancelar
            </button>
            <button
              disabled={!mapping.name || loading}
              onClick={async () => { setLoading(true); await onImport(mapping); setLoading(false); }}
              className="flex items-center gap-2 px-8 py-2.5 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Clock size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              {loading ? 'Importando...' : `Importar ${mappedCount} alumnos`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
  const [newEntry, setNewEntry] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'templates'>('new');
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    db.getTemplates().then(t => setTemplates(t)).catch(console.error);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setNewEntry(evt.target?.result as string);
    reader.readAsText(file);
  };

  const handleSaveEntry = () => {
    if (!newEntry.trim()) return;
    const now = new Date();
    const ts = now.toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const separator = `\n\n── ${ts} ──────────────────────\n`;
    const existing = interaction?.chatHistory || '';
    const updated = existing
      ? `${existing}${separator}${newEntry.trim()}`
      : `── ${ts} ──────────────────────\n${newEntry.trim()}`;
    onSave(updated);
    setNewEntry('');
    setActiveTab('history');
  };


  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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

  // Build flat timeline from all interactions
  const allEntries = studentInteractions
    .filter(i => i.chatHistory || i.content)
    .sort((a, b) => {
      if (!a.date && !b.date) return a.week - b.week;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[88vh]"
      >
        {/* Header */}
        <div className="px-8 pt-6 pb-5 border-b border-slate-100 flex justify-between items-start bg-white">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary/70 text-dark rounded-2xl flex items-center justify-center shadow-md">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-dark tracking-tight">{student.name}</h3>
              <p className="text-[11px] font-bold text-slate-400">{student.phone || 'Sin teléfono'} · Sem. {interaction?.week ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6">
          {(['new', 'history', 'templates'] as const).map((tab, idx) => {
            const labels = ['Nuevo Registro', 'Historial', 'Nuevo Mensaje'];
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab ? 'text-primary border-primary' : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {labels[idx]}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ─── TAB 1: NUEVO REGISTRO ─── */}
          {activeTab === 'new' && (
            <div className="p-7 flex flex-col gap-5 h-full min-h-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-black text-dark">Pega la respuesta del alumno</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Se guardará con fecha y hora automáticas en el historial</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['Follow up', 'RA', 'Video Call'] as const).map(t => (
                    <button key={t} onClick={() => onMessageTypeChange(t)}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        interaction?.messages === t ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <textarea
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder="Pega aquí la respuesta del alumno desde WhatsApp..."
                className="flex-1 w-full min-h-[260px] p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/20 text-sm text-slate-700 placeholder:text-slate-300 resize-none leading-relaxed transition-all font-medium"
                autoFocus
              />
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => chatInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all">
                  <Upload size={13} /> Importar .txt
                </button>
                <input type="file" ref={chatInputRef} accept=".txt" className="hidden" onChange={handleFileUpload} />
                <button onClick={handleSaveEntry} disabled={!newEntry.trim()}
                  className="px-8 py-3 bg-primary text-dark rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Guardar Registro
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 2: HISTORIAL (TIMELINE) ─── */}
          {activeTab === 'history' && (
            <div className="p-7">
              {allEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <MessageSquare size={24} className="text-slate-200" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">Sin historial aún</p>
                  <p className="text-[11px] text-slate-300 mt-1">Usa "Nuevo Registro" para agregar la primera entrada</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-slate-200 to-transparent rounded-full" />
                  <div className="space-y-6 pl-8">
                    {allEntries.map((inter, idx) => (
                      <div key={inter.id} className="relative">
                        <div className="absolute -left-[26px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-primary shadow-sm" />
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-black uppercase tracking-widest">Sem. {inter.week}</span>
                          {inter.date && (
                            <span className="text-[10px] font-bold text-slate-400">{format(new Date(inter.date), "dd MMM yyyy")}</span>
                          )}
                          {inter.messages && (
                            <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-[8px] font-black uppercase">{inter.messages}</span>
                          )}
                          {inter.typeContact && (
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-500 rounded text-[8px] font-black uppercase">{inter.typeContact}</span>
                          )}
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed font-medium max-h-72 overflow-y-auto">
                          {inter.chatHistory || inter.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 3: NUEVO MENSAJE (TEMPLATES) ─── */}
          {activeTab === 'templates' && (
            <div className="p-7 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-black text-dark">Base de Conocimiento</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Copia o envía un mensaje predefinido</p>
                </div>
                {student.phone && (
                  <button onClick={() => handleWhatsAppClick()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-md">
                    <Phone size={13} /> Abrir WhatsApp
                  </button>
                )}
              </div>
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <FileText size={28} className="text-slate-200 mb-3" />
                  <p className="text-sm font-bold text-slate-400">Sin plantillas guardadas</p>
                  <p className="text-[11px] text-slate-300 mt-1">Agrégalas desde "Base de Mensajes"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(template => (
                    <div key={template.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-primary/20 hover:bg-white transition-all flex gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-dark uppercase tracking-wide mb-1.5">{template.title}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap line-clamp-4">{template.content}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => handleCopy(template.content, template.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            copied === template.id ? 'bg-emerald-500 text-white' : 'bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white'
                          }`}
                        >
                          <FileText size={11} />
                          {copied === template.id ? '✓ Copiado' : 'Copiar'}
                        </button>
                        {student.phone && (
                          <button onClick={() => handleWhatsAppClick(template.content)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all">
                            <Phone size={11} /> Enviar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
