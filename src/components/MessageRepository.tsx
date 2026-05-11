import React, { useState, useEffect, useMemo } from 'react';
import * as db from '../services/supabaseDb';
import { useAuth } from './AuthProvider';
import { Template } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MessageSquare, 
  Copy,
  Layout,
  Search,
  Edit2,
  Trash2,
  X,
  Check
} from 'lucide-react';

export const MessageRepository: React.FC = () => {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState({ title: '', content: '' });

  const loadData = () => {
    db.getTemplates().then(t => setTemplates(t)).catch(console.error);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('supabase-db-update', loadData);
    return () => window.removeEventListener('supabase-db-update', loadData);
  }, []);

  const handleSaveTemplate = async () => {
    if (!newTemplate.title || !newTemplate.content) return;
    
    if (editingTemplate) {
      await db.saveTemplate({ ...editingTemplate, ...newTemplate });
    window.dispatchEvent(new CustomEvent('supabase-db-update'));
    } else {
      await db.saveTemplate({ ...newTemplate, mentorId: profile?.id || 'mentor_123' });
    window.dispatchEvent(new CustomEvent('supabase-db-update'));
    }
    
    setNewTemplate({ title: '', content: '' });
    setIsAddingTemplate(false);
    setEditingTemplate(null);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplate({ title: template.title, content: template.content });
    setIsAddingTemplate(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      await db.deleteTemplate(id);
      window.dispatchEvent(new CustomEvent('supabase-db-update'));
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  return (
    <div className="p-4 lg:p-8 space-y-8 overflow-y-auto max-h-screen animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-dark tracking-tight uppercase">Repositorio de Mensajes</h2>
          <p className="text-slate-500 font-bold">Plantillas personalizadas para comunicación rápida con tus alumnos.</p>
        </div>
        <button 
          onClick={() => {
            setEditingTemplate(null);
            setNewTemplate({ title: '', content: '' });
            setIsAddingTemplate(true);
          }}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-dark text-white rounded-[24px] font-black uppercase tracking-widest text-[10px] shadow-xl hover:brightness-125 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Nueva Plantilla</span>
        </button>
      </div>

      <div className="relative group max-w-xl px-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Buscar mensajes o títulos..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[24px] shadow-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-dark"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <AnimatePresence>
        {isAddingTemplate && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 mb-12"
          >
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black uppercase tracking-tight">{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
               <button onClick={() => setIsAddingTemplate(false)}><X size={24} className="text-slate-400" /></button>
             </div>
             <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título de la Plantilla</label>
                 <input 
                   type="text" 
                   placeholder="Ej: Recordatorio de Cita" 
                   className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 text-dark font-bold"
                   value={newTemplate.title}
                   onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contenido del Mensaje</label>
                 <textarea 
                   placeholder="Usa {nombre} para personalizar..." 
                   rows={6}
                   className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 text-dark font-medium leading-relaxed"
                   value={newTemplate.content}
                   onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                 />
               </div>
               <div className="flex gap-4 justify-end pt-4">
                 <button 
                  onClick={() => setIsAddingTemplate(false)} 
                  className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition hover:bg-slate-200"
                >
                  Cancelar
                </button>
                 <button 
                  onClick={handleSaveTemplate} 
                  className="px-10 py-4 bg-primary text-dark rounded-2xl font-black uppercase tracking-widest text-[10px] transition shadow-lg shadow-primary/20 hover:brightness-110"
                >
                  {editingTemplate ? 'Actualizar' : 'Guardar'} Plantilla
                </button>
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden lg:block bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Plantilla</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Contenido Predeterminado</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTemplates.map((template) => (
                <tr key={template.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <MessageSquare size={18} />
                      </div>
                      <span className="font-black text-dark text-sm uppercase tracking-tight">{template.title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 max-w-lg">
                    <p className="text-slate-500 text-sm italic line-clamp-2 leading-relaxed">
                      "{template.content}"
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(template.content);
                          alert('Copiado!');
                        }}
                        className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(template)}
                        className="p-3 text-slate-400 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(template.id)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTemplates.length === 0 && (
            <div className="py-24 text-center">
              <Layout size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No se encontraron plantillas</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Template Cards */}
      <div className="lg:hidden space-y-4">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <h4 className="font-black text-dark text-xs uppercase tracking-tight">{template.title}</h4>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(template.content);
                    alert('Copiado!');
                  }}
                  className="p-2 text-slate-400 hover:text-primary rounded-lg"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => handleEdit(template)}
                  className="p-2 text-slate-400 hover:text-secondary rounded-lg"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-slate-500 text-xs italic leading-relaxed bg-slate-50 p-4 rounded-2xl">
              "{template.content}"
            </p>
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="bg-white p-12 rounded-[32px] text-center">
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No se encontraron plantillas</p>
          </div>
        )}
      </div>
    </div>
  );
};

