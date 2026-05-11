import React, { useState } from 'react';
import { generateWeeklySummary } from '../services/geminiService';
import { useAuth } from './AuthProvider';
import { Student, Interaction } from '../types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Loader2,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportGeneratorProps {
  students: Student[];
  interactions: Interaction[];
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ students, interactions }) => {
  const { profile } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<{summary: string, improvementPoints: string[]} | null>(null);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    const weeklyInteractions = selectedWeek === 0 ? interactions : interactions.filter(i => i.week === selectedWeek);
    const result = await generateWeeklySummary(
      profile?.name || 'Mentor',
      selectedWeek === 0 ? 'Total' : selectedWeek,
      students,
      weeklyInteractions
    );
    setReport(result);
    setIsGenerating(false);
  };

  const exportToExcel = () => {
    const dataToExport = selectedWeek === 0 ? interactions : interactions.filter(i => i.week === selectedWeek);
    
    const data = dataToExport.map(interaction => {
      const student = students.find(s => s.id === interaction.studentId);
      return {
        'Semana': interaction.week,
        'Alumno': student?.name,
        'Course History': student?.courseHistory,
        'Último Contacto': interaction.date ? format(new Date(interaction.date), 'dd/MM/yyyy') : 'N/A',
        'Type Contact': interaction.typeContact || 'N/A',
        'Messages': interaction.messages || 'N/A',
        'Student Response': interaction.responseType,
        'Observaciones': interaction.content
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, selectedWeek === 0 ? 'General' : `Semana ${selectedWeek}`);
    XLSX.writeFile(workbook, `Reporte_Mentoria_${selectedWeek === 0 ? 'General' : 'S'+selectedWeek}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center px-4">
        <h2 className="text-4xl font-black text-dark tracking-tighter">Reporte Maestro</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-3">Sincroniza tus resultados y genera insights estratégicos.</p>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Semana a reportar</span>
              <select 
                value={selectedWeek}
                onChange={(e) => {
                    setSelectedWeek(Number(e.target.value));
                    setReport(null);
                }}
                className="px-8 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 shadow-sm font-black text-primary appearance-none cursor-pointer text-lg min-w-[200px]"
              >
                {[1, 2, 3, 4].map(w => (
                  <option key={w} value={w}>Semana {w}</option>
                ))}
                <option value={0}>Todas las Semanas</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
             <button 
              onClick={exportToExcel}
              className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-700 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-md font-bold"
            >
              <FileSpreadsheet size={24} className="text-green-500 group-hover:scale-110 transition-transform" />
              <span>Reporte Excel</span>
            </button>
            <button 
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="flex items-center gap-3 px-8 py-4 bg-primary text-dark rounded-2xl hover:brightness-110 hover:shadow-primary/30 transition-all shadow-xl font-black disabled:opacity-50 active:scale-95"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
              <span>Insights AI</span>
            </button>
          </div>
        </div>

        <div className="p-10 min-h-[500px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!report && !isGenerating && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-slate-300 py-16"
              >
                <div className="w-32 h-32 bg-indigo-50/50 rounded-full flex items-center justify-center mb-8">
                  <Sparkles size={64} className="opacity-20 text-primary" />
                </div>
                <h4 className="text-xl font-bold text-slate-400 mb-2">Motor de Análisis Listo</h4>
                <p className="text-sm font-medium">Pulsa el botón de Insights para analizar {selectedWeek === 0 ? 'todas las semanas' : `la Semana ${selectedWeek}`}.</p>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-8 py-16"
              >
                <div className="relative w-24 h-24">
                   <div className="absolute inset-0 rounded-full border-8 border-indigo-50" />
                   <motion.div 
                     className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent"
                     animate={{ rotate: 360 }}
                     transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                   />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-primary mb-2">Generando Inteligencia</p>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Utilizando Gemini 2.0 Flash</p>
                </div>
              </motion.div>
            )}

            {report && (
              <motion.div 
                key="report"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-12 py-4"
              >
                <div className="space-y-6">
                  <h3 className="text-2xl font-black flex items-center gap-4 text-dark uppercase tracking-tight">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    Análisis del Mentor
                  </h3>
                  <div className="bg-dark p-10 rounded-[40px] text-white/90 leading-relaxed italic text-lg shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 text-primary">
                      <Sparkles size={80} />
                    </div>
                    <span className="relative z-10 leading-loose">"{report.summary}"</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-black text-dark uppercase tracking-tight px-2 flex items-center gap-3">
                    <div className="w-2 h-8 bg-secondary rounded-full" />
                    Puntos de Acción Estratégica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {report.improvementPoints.map((point, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-5 p-6 bg-white border border-slate-100 rounded-[32px] shadow-lg hover:border-secondary/30 transition-all group"
                      >
                        <div className="h-10 w-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center text-sm font-black shrink-0 group-hover:scale-110 transition-transform">
                          0{idx + 1}
                        </div>
                        <span className="text-sm font-bold text-slate-600 leading-normal mt-2">{point}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
