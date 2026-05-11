import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StudentTracker } from './components/StudentTracker';
import { MessageRepository } from './components/MessageRepository';
import { ReportGenerator } from './components/ReportGenerator';
import { getStudents, getInteractions } from './services/supabaseDb';
import { Student, Interaction } from './types';
import { Loader2, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MentorPulseApp: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Close sidebar by default on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    try {
      const [s, i] = await Promise.all([getStudents(), getInteractions()]);
      setStudents(s);
      setInteractions(i);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
    const handler = () => loadData();
    window.addEventListener('supabase-db-update', handler);
    return () => window.removeEventListener('supabase-db-update', handler);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen relative overflow-x-hidden">
      {/* Mobile & Desktop Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-3 bg-dark text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all outline-none border border-white/10"
        title={isSidebarOpen ? "Contraer menú" : "Expandir menú"}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-500 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
          }} 
          userName={profile?.name}
          role={profile?.role}
        />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-dark/40 backdrop-blur-sm z-30" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <main className={`flex-1 transition-all duration-500 ease-in-out min-w-0 ${isSidebarOpen ? 'lg:pl-64' : 'pl-0'}`}>
        <div className="max-w-[1600px] mx-auto min-h-screen">
          <div className="h-16 lg:h-0" /> {/* Spacer for the floating button on mobile/desktop top */}
          {activeTab === 'dashboard' && <Dashboard students={students} interactions={interactions} />}
          {activeTab === 'students' && <StudentTracker />}
          {activeTab === 'templates' && <MessageRepository />}
          {activeTab === 'reports' && <ReportGenerator students={students} interactions={interactions} />}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MentorPulseApp />
    </AuthProvider>
  );
}
