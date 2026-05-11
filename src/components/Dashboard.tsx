import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock
} from 'lucide-react';

interface DashboardProps {
  students: any[];
  interactions: any[];
}

export const Dashboard: React.FC<DashboardProps> = ({ students, interactions }) => {
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const activeInteractions = interactions.length;
    const significantCount = interactions.filter(i => 
      i.typeContact?.toLowerCase().includes('significant')
    ).length;
    const noResponseCount = interactions.filter(i => 
      i.typeContact === 'No Response'
    ).length;

    // Course History Distribution
    const courseOptions = ['Current', 'Schedule', 'Other', 'Not enroled'];
    const courseDistribution = courseOptions.map((type, index) => ({
      name: type,
      value: students.filter(s => s.courseHistory === type).length,
      color: ['#34d399', '#38bdf8', '#94a3b8', '#fb7185'][index]
    })).filter(d => d.value > 0);

    return { totalStudents, activeInteractions, significantCount, noResponseCount, courseDistribution };
  }, [students, interactions]);

  const interactionTrend = useMemo(() => {
    const weeks = [1, 2, 3, 4];
    return weeks.map(w => ({
      name: `S${w}`,
      total: interactions.filter(i => i.week === w).length,
      significant: interactions.filter(i => i.week === w && i.typeContact?.toLowerCase().includes('significant')).length,
      emoji: interactions.filter(i => i.week === w && i.typeContact?.toLowerCase().includes('emoji')).length,
      noResponse: interactions.filter(i => i.week === w && i.typeContact === 'No Response').length
    }));
  }, [interactions]);

  const contactDistribution = useMemo(() => {
    const types = [
      { key: 'Significant', label: 'Significativo', color: '#5E5CE6', match: 'significant' },
      { key: 'Emoji', label: 'Emoji / Gesto', color: '#f59e0b', match: 'emoji' },
      { key: 'No Response', label: 'Sin Respuesta', color: '#e2e8f0', match: 'no response' }
    ];
    
    return types.map(type => ({
      name: type.label,
      value: interactions.filter(i => i.typeContact?.toLowerCase().includes(type.match.toLowerCase())).length,
      color: type.color
    }));
  }, [interactions]);

  return (
    <div className="p-4 lg:p-8 space-y-8 overflow-y-auto max-h-screen animate-in fade-in duration-700">
      <div className="px-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-dark tracking-tight uppercase">Dashboard Mentoría</h2>
          <p className="text-slate-500 font-medium tracking-tight">Análisis de rendimiento y seguimiento de impacto.</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-2xl flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-dark/60">Datos correspondientes al mes en curso</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Alumnos" 
          value={stats.totalStudents} 
          icon={<Users className="text-primary" size={24} />}
          accent="primary"
        />
        <StatCard 
          title="Interacciones" 
          value={stats.activeInteractions} 
          icon={<MessageSquareIcon className="text-secondary" size={24} />}
          accent="secondary"
        />
        <StatCard 
          title="Significativo" 
          value={stats.significantCount} 
          icon={<CheckCircle2 className="text-[#5E5CE6]" size={24} />}
          accent="secondary"
        />
        <StatCard 
          title="Pendientes" 
          value={stats.noResponseCount} 
          icon={<Clock className="text-slate-300" size={24} />}
          accent="gray"
        />
      </div>

      {/* Middle Row: Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-dark rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[450px]">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full" />
          <h3 className="text-xl font-bold mb-8 relative z-10">Impacto Mensual</h3>
          <div className="h-[250px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contactDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {contactDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', color: '#1F1F39', padding: '12px'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-3 relative z-10">
            {contactDistribution.map((r, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: r.color}} />
                  <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider group-hover:text-white transition-colors">{r.name}</span>
                </div>
                <span className="text-sm font-black">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-50 relative overflow-hidden flex flex-col min-h-[450px]">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-slate-100 rounded-full opacity-50" />
          <h3 className="text-xl font-bold text-dark mb-8 relative z-10">Course History</h3>
          <div className="h-[250px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.courseDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {stats.courseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-3 relative z-10">
            {stats.courseDistribution.map((r, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: r.color}} />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-dark transition-colors">{r.name}</span>
                </div>
                <span className="text-sm font-black text-dark">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Trends Chart Full Width */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-50 shadow-xl overflow-hidden relative">
        <h3 className="text-xl font-bold text-dark mb-8 flex items-center gap-3">
            <div className="w-2 h-8 bg-primary rounded-full" />
            Tendencias por Impacto
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={interactionTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
              <Tooltip 
                contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '12px'}}
              />
              <Line type="monotone" dataKey="significant" name="Significativo" stroke="#5E5CE6" strokeWidth={4} dot={{ r: 6, fill: '#5E5CE6', strokeWidth: 3, stroke: '#fff' }} />
              <Line type="monotone" dataKey="emoji" name="Emoji" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 3, stroke: '#fff' }} />
              <Line type="monotone" dataKey="noResponse" name="Sin Respuesta" stroke="#e2e8f0" strokeWidth={4} dot={{ r: 6, fill: '#e2e8f0', strokeWidth: 3, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, accent }: any) => (
  <div className="bg-white p-6 rounded-[28px] border border-slate-50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className="text-4xl font-black text-dark tracking-tighter">{value}</p>
      </div>
      <div className={`p-4 rounded-2xl ${
        accent === 'primary' ? 'bg-primary/10' : 
        accent === 'secondary' ? 'bg-secondary/10' : 
        accent === 'green' ? 'bg-green-100' : 'bg-amber-100'
      }`}>
        {icon}
      </div>
    </div>
    <div className="mt-6 flex items-center gap-2">
       <TrendingUp size={14} className="text-green-500" />
       <p className="text-[10px] font-bold text-slate-400 uppercase">Actividad Creciente</p>
    </div>
  </div>
);

const MessageSquareIcon = ({ className, size }: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
