import React from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Calendar, 
  MessageSquare, 
  FileText, 
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useAuth } from './AuthProvider';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName?: string;
  role?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userName, role }) => {
  const { logout } = useAuth();
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Alumnos', icon: Users },
    { id: 'templates', label: 'Repositorio', icon: MessageSquare },
    { id: 'reports', label: 'Informes', icon: FileText },
  ];

  return (
    <div className="w-64 bg-dark h-full text-white flex flex-col shadow-2xl">
      <div className="p-8 pt-20 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
          <GraduationCap className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">MentorPulse</h1>
          <p className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">{role}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-primary text-dark shadow-lg scale-[1.02]' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} className={activeTab === tab.id ? 'text-dark' : 'text-inherit'} />
              <span className="font-bold text-sm tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/10 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <img 
            src={`https://ui-avatars.com/api/?name=${userName}&background=ffc328&color=454540`} 
            className="w-10 h-10 rounded-full border-2 border-primary shadow-lg"
            alt="User avatar"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-none mb-1">{userName}</p>
            <p className="text-[10px] text-white/50 uppercase font-bold tracking-tighter">Mentor Online</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:text-secondary hover:bg-secondary/10 rounded-2xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-bold text-sm tracking-tight">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
