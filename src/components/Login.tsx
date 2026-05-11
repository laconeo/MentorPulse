import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { motion } from 'motion/react';
import { LogIn, GraduationCap, Mail, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <GraduationCap size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">MentorPulse</h2>
          <p className="mt-2 text-sm text-gray-600 font-medium">Gestión inteligente para mentores</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-secondary transition-all"
                placeholder="mentor@unlar.edu.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-secondary transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-dark font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
          >
            <LogIn size={20} />
            Ingresar al Sistema
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-600 text-center bg-red-50 py-2 rounded-lg font-bold">{error}</p>
        )}

        <div className="pt-6 border-t border-gray-100 italic text-[11px] text-center text-gray-400 font-medium">
          Simplifica el seguimiento, potencia los resultados.
        </div>
      </motion.div>

      <div className="absolute bottom-4 text-[10px] text-slate-400 font-medium">
        Version 0.0.1 - 10/5/2026
      </div>
    </div>
  );
};
