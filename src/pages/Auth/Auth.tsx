import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../../components/ui';
import { useTranslation } from 'react-i18next';
import { LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useUser } from '../../context/UserContext';
import { useNotification } from '../../context/NotificationContext';
import { authService } from '../../services/auth.service';

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const { role, setRole, setProfile } = useUser();
  const { notify } = useNotification();

  useEffect(() => {
    if (role) {
      navigate('/dashboard', { replace: true });
    }
  }, [role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanMatricule = matricule.trim();
const cleanPassword = password.trim();

if (!cleanMatricule || !cleanPassword) {
  notify('Le matricule et le mot de passe sont obligatoires.', 'error', '/login');
  setIsLoading(false);
  return;
}

const result = await authService.login({
  matricule: cleanMatricule,
  password: cleanPassword,
});

    if (result.success && result.user && result.role) {
      setRole(result.role);
      setProfile({
        matricule: result.user.matricule,
        name: [result.user.prenom, result.user.nom].filter(Boolean).join(' ').trim() || result.user.matricule,
        email: result.user.email,
        photoUrl: result.user.photoUrl,
      });
      notify(`Bienvenue, ${[result.user.prenom, result.user.nom].filter(Boolean).join(' ').trim() || result.user.matricule} !`, 'success', '/dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      notify(result.error || 'Matricule ou mot de passe incorrect.', 'error', '/login');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary)]"></div>
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[var(--color-accent)]/5 rounded-full blur-3xl"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-35 h-35  mb-4 overflow-hidden">
            <img src="/logo.png?v=2" alt="VAN BTP" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('auth.welcome')}</h1>
          <p className="text-slate-500 mt-2 font-medium">{t('auth.subtitle')}</p>
        </div>

        <Card className="p-8 border-t-4 border-t-[var(--color-primary)] shadow-2xl shadow-slate-200/50">
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              label="Matricule" 
              type="text" 
              placeholder="Ex: VMAT0001" 
              required 
              className="h-12"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
            />
            <div className="space-y-1">
              <Input 
                label={t('auth.password')} 
                type="password" 
                placeholder="••••••••" 
                required 
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
              <label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer">{t('auth.remember_me')}</label>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-blue-900/20" isLoading={isLoading}>
              <LogIn className="w-5 h-5 mr-2" />
              {t('auth.login')}
            </Button>
          </form>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Sécurisé par Dowhile</span>
        </div>
      </motion.div>
    </div>
  );
};

export const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Inscription Désactivée</h1>
        <p className="text-slate-500 mb-6">Veuillez contacter l'administrateur pour obtenir vos accès.</p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </Card>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Récupération Désactivée</h1>
        <p className="text-slate-500 mb-6">Veuillez contacter le service IT pour réinitialiser votre mot de passe.</p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </Card>
    </div>
  );
};
