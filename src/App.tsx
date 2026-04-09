import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import bcrypt from 'bcryptjs';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  History, 
  BrainCircuit, 
  Settings,
  Bell,
  Menu,
  X,
  ChevronRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Send,
  Loader2,
  Trash2,
  Calendar,
  Tag,
  Building2,
  LineChart,
  Calculator,
  Home,
  User,
  Info,
  LogOut,
  Mail,
  Lock,
  UserPlus,
  Target,
  Linkedin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { useAuth } from './contexts/AuthContext';
import { db, auth } from './firebase';
import { cn } from './lib/utils';
import { Transaction, CATEGORIES, TransactionType, Property, MARKET_INDICES, FinancialGoal, RentalInstallment, PropertyExpense, CreditCard, CreditCardInstallment, MarketIndex } from './types';
import { getFinancialAdvice } from './services/geminiService';

// --- Utilities ---

const roundABNT = (num: number, precision: number = 2): number => {
  const multiplier = Math.pow(10, precision);
  const val = num * multiplier;
  const integer = Math.floor(val);
  const fraction = val - integer;

  // ABNT NBR 5891: Round half to even
  if (Math.abs(fraction - 0.5) < 1e-10) {
    return (integer % 2 === 0 ? integer : integer + 1) / multiplier;
  }
  return Math.round(val) / multiplier;
};

// --- Firebase Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Auth Components ---

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Erro no login:', err);
      if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O login por e-mail/senha não está habilitado no Firebase Console.');
      } else {
        setError('Erro ao entrar. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-outline/5"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-primary-fixed/30 rounded-3xl mb-4">
            <ShieldCheck className="w-12 h-12 text-brand-primary" />
          </div>
          <h1 className="text-display-small text-brand-primary">Bem-vindo ao Guardian</h1>
          <p className="text-on-surface-variant mt-2">Sua gestão financeira segura</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-on-surface-variant ml-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 pl-12 bg-surface-container-low rounded-2xl border border-outline/10 focus:ring-2 focus:ring-brand-primary"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-on-surface-variant ml-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pl-12 bg-surface-container-low rounded-2xl border border-outline/10 focus:ring-2 focus:ring-brand-primary"
                placeholder="Sua senha"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-on-surface-variant">Não tem uma conta?</p>
          <Link to="/registrar" className="text-brand-primary font-bold hover:underline mt-1 inline-block">
            Criar conta agora
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update profile with display name
      await updateProfile(user, { displayName: name });

      // 3. Hash password for Firestore storage (as requested)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 4. Store user data in Firestore 'users' collection
      try {
        await setDoc(doc(db, 'users', user.uid), {
          id_user: user.uid,
          user: name,
          email: email,
          senha: hashedPassword,
          createdAt: new Date().toISOString()
        });
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.CREATE, `users/${user.uid}`);
      }

      navigate('/');
    } catch (err: any) {
      console.error('Erro no registro:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido (ex: usuario@email.com).');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O cadastro por e-mail/senha não está habilitado no Firebase Console.');
      } else if (err.message && err.message.includes('Firestore Error')) {
        setError('Erro ao salvar dados no banco. Contate o suporte.');
      } else {
        setError('Erro ao criar conta. Verifique os dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-outline/5"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-primary-fixed/30 rounded-3xl mb-4">
            <UserPlus className="w-12 h-12 text-brand-primary" />
          </div>
          <h1 className="text-display-small text-brand-primary">Criar Conta</h1>
          <p className="text-on-surface-variant mt-2">Comece sua jornada segura hoje</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-on-surface-variant ml-2">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 pl-12 bg-surface-container-low rounded-2xl border border-outline/10 focus:ring-2 focus:ring-brand-primary"
                placeholder="Seu nome"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-on-surface-variant ml-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 pl-12 bg-surface-container-low rounded-2xl border border-outline/10 focus:ring-2 focus:ring-brand-primary"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-on-surface-variant ml-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pl-12 bg-surface-container-low rounded-2xl border border-outline/10 focus:ring-2 focus:ring-brand-primary"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-on-surface-variant ml-2">Confirmar Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 pl-12 bg-surface-container-low rounded-2xl border border-outline/10 focus:ring-2 focus:ring-brand-primary"
                placeholder="Repita sua senha"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-on-surface-variant">Já tem uma conta?</p>
          <Link to="/login" className="text-brand-primary font-bold hover:underline mt-1 inline-block">
            Fazer login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const IntroductionView = () => {
  return (
    <div className="space-y-12 pb-24 md:pt-20 max-w-4xl mx-auto">
      <header className="text-center space-y-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex p-6 bg-primary-fixed/20 rounded-[3rem] mb-4"
        >
          <ShieldCheck className="w-16 h-16 text-brand-primary" />
        </motion.div>
        <h1 className="text-display-medium font-bold text-brand-primary">The Guardian</h1>
        <p className="text-headline-small text-on-surface-variant">Sua Fortaleza Financeira</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 bg-surface-container-low rounded-[2.5rem] border border-outline/5 space-y-4">
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl w-fit">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Gestão Completa</h3>
          <p className="text-on-surface-variant">Controle total sobre suas receitas, despesas e patrimônio em um único lugar.</p>
        </div>

        <div className="p-8 bg-surface-container-low rounded-[2.5rem] border border-outline/5 space-y-4">
          <div className="p-3 bg-green-500/10 text-green-600 rounded-2xl w-fit">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Projeções Inteligentes</h3>
          <p className="text-on-surface-variant">Visualize o futuro das suas finanças com projeções baseadas em seus lançamentos e índices de mercado.</p>
        </div>

        <div className="p-8 bg-surface-container-low rounded-[2.5rem] border border-outline/5 space-y-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl w-fit">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Patrimônio Imobiliário</h3>
          <p className="text-on-surface-variant">Gerencie seus imóveis, aluguéis e despesas de manutenção com precisão cirúrgica.</p>
        </div>

        <div className="p-8 bg-surface-container-low rounded-[2.5rem] border border-outline/5 space-y-4">
          <div className="p-3 bg-purple-500/10 text-purple-600 rounded-2xl w-fit">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Metas Dinâmicas</h3>
          <p className="text-on-surface-variant">Crie metas financeiras vinculadas a índices de correção reais para acompanhar seu crescimento real.</p>
        </div>
      </div>

      <div className="p-10 bg-brand-primary text-white rounded-[3rem] text-center space-y-6 shadow-xl">
        <h2 className="text-headline-medium font-bold">Acesso Gratuito e Universal</h2>
        <p className="text-lg opacity-90">
          O The Guardian nasceu com o propósito de democratizar a gestão financeira de alto nível. 
          Por isso, o software será disponibilizado de forma <span className="font-bold">totalmente gratuita</span> para todas as pessoas que desejarem organizar sua vida financeira.
        </p>
      </div>

      <footer className="text-center space-y-4 pt-12 border-t border-outline/10">
        <p className="text-on-surface-variant font-medium">Desenvolvido com dedicação por</p>
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-brand-primary">Danilo Paul</h3>
          <p className="text-on-surface-variant text-sm font-medium">danilopaul98@gmail.com</p>
        </div>
        <div className="flex justify-center gap-4">
          <a 
            href="https://www.linkedin.com/in/danilopaul" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0077b5] text-white rounded-2xl font-bold hover:opacity-90 transition-all"
          >
            <Linkedin className="w-5 h-5" />
            Conectar no LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
};

const Navbar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { path: '/', label: 'Início', icon: LayoutDashboard },
    { path: '/extrato', label: 'Extrato', icon: History },
    { path: '/patrimonio', label: 'Patrimônio', icon: Building2 },
    { path: '/cartoes', label: 'Cartões', icon: ShieldCheck },
    { path: '/metas', label: 'Metas', icon: Calculator },
    { path: '/analise', label: 'Análise', icon: LineChart },
    { path: '/indices', label: 'Índices', icon: TrendingUp },
    { path: '/guardian', label: 'Guardian', icon: BrainCircuit },
    { path: '/sobre', label: 'Sobre', icon: Info },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-72 bg-surface-container-lowest border-r border-outline/10 p-8 z-50 overflow-y-auto">
        <div className="flex items-center gap-3 text-brand-primary font-bold text-2xl mb-12">
          <div className="p-2 bg-primary-fixed/30 rounded-2xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <span>The Guardian</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-[2rem] transition-all duration-300 text-lg font-medium",
                  isActive 
                    ? "text-brand-primary bg-primary-fixed/30 shadow-sm" 
                    : "text-on-surface-variant hover:bg-surface-container-low"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive ? "text-brand-primary" : "text-on-surface-variant")} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="ml-auto w-2 h-2 bg-brand-primary rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8 border-t border-outline/10 space-y-2">
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-4 px-6 py-4 rounded-[2rem] text-red-500 hover:bg-red-50 w-full text-lg font-medium transition-all"
          >
            <LogOut className="w-6 h-6" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Tabbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline/10 px-4 py-3 z-50 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 relative",
                isActive ? "text-brand-primary" : "text-on-surface-variant"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabMobile"
                  className="absolute inset-0 bg-primary-fixed/20 rounded-2xl -z-10"
                />
              )}
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

const TransactionItem = ({ tx, onDelete, onEdit }: { tx: Transaction & { isInvoice?: boolean }, onDelete: (id: string) => void, onEdit: (tx: Transaction) => void }) => {
  const category = CATEGORIES.find(c => c.id === tx.categoryId) || CATEGORIES[CATEGORIES.length - 1];
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex items-center gap-4 p-5 rounded-3xl border border-outline/5 shadow-sm hover:shadow-md transition-shadow group",
        tx.isInvoice ? "bg-brand-primary/5 border-brand-primary/20" : "bg-surface-container-lowest"
      )}
    >
      <div className={cn(
        "p-4 rounded-2xl",
        tx.isInvoice ? "bg-brand-primary text-white" : (tx.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")
      )}>
        {tx.isInvoice ? <ShieldCheck className="w-7 h-7" /> : (tx.type === 'income' ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />)}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-xl text-on-surface">{tx.title}</p>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="text-sm px-2 py-0.5 bg-surface-container-low rounded-lg flex items-center gap-1">
            <Tag className="w-3 h-3" /> {category.name}
          </span>
          <span className="text-sm flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
          {tx.goalId && (
            <span className="text-[10px] px-2 py-0.5 bg-primary-fixed/30 text-brand-primary rounded-lg font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Meta
            </span>
          )}
          {tx.isInvoice && (
            <span className="text-[10px] px-2 py-0.5 bg-brand-primary/20 text-brand-primary rounded-lg font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Fatura Agrupada
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-2">
        <p className={cn(
          "font-bold text-xl",
          tx.isInvoice ? "text-brand-primary" : (tx.type === 'income' ? "text-green-600" : "text-on-surface")
        )}>
          {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        {!tx.isInvoice && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <button 
              onClick={() => onEdit(tx)}
              className="p-2 text-brand-primary hover:bg-primary-fixed/10 rounded-xl transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onDelete(tx.id)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Dashboard = ({ transactions, onDelete, onEdit, userName }: { transactions: Transaction[], onDelete: (id: string) => void, onEdit: (tx: Transaction) => void, userName: string }) => {
  const navigate = useNavigate();
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expenses;
  const [tip, setTip] = useState<string | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(false);

  useEffect(() => {
    const fetchTip = async () => {
      setIsTipLoading(true);
      const advice = await getFinancialAdvice("Dê uma dica financeira curta e prática para um idoso hoje. Seja direto e acolhedor.");
      setTip(advice || null);
      setIsTipLoading(false);
    };
    fetchTip();
  }, []);

  return (
    <div className="space-y-8 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-display-small text-brand-primary">Olá, {userName}</h1>
          <p className="text-on-surface-variant">Seu resumo financeiro de hoje</p>
        </div>
        <button className="p-3 bg-surface-container-lowest rounded-full shadow-ambient border border-outline/5 relative">
          <Bell className="w-6 h-6 text-brand-primary" />
          <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      <div className="space-y-8">
        {/* Tip Section */}
        <AnimatePresence>
          {tip && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary-fixed/20 p-6 rounded-[2rem] border border-brand-primary/10 flex gap-4 items-start"
            >
              <div className="p-3 bg-brand-primary text-white rounded-2xl shrink-0">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-brand-primary">Dica do Guardian</p>
                <div className="text-on-surface-variant text-sm prose prose-sm max-w-none">
                  <ReactMarkdown>{tip}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

            {/* Balance Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-primary text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
            >
              <div className="relative z-10">
                <p className="text-white/80 font-medium">Saldo disponível</p>
                <h2 className="text-5xl font-bold mt-2">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl flex items-center gap-3">
                    <div className="p-2 bg-green-400/20 rounded-full">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Entradas</p>
                      <p className="font-semibold text-sm">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl flex items-center gap-3">
                    <div className="p-2 bg-red-400/20 rounded-full">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Saídas</p>
                      <p className="font-semibold text-sm">R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-brand-secondary/20 rounded-full blur-3xl" />
            </motion.div>

            {/* Quick Actions */}
            <section>
              <h3 className="text-headline-small mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/adicionar/expense" className="flex items-center justify-center gap-3 p-6 bg-surface-container-lowest rounded-3xl shadow-ambient border border-outline/5 hover:bg-red-50 transition-colors group">
                  <PlusCircle className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-lg">Nova Saída</span>
                </Link>
                <Link to="/adicionar/income" className="flex items-center justify-center gap-3 p-6 bg-surface-container-lowest rounded-3xl shadow-ambient border border-outline/5 hover:bg-green-50 transition-colors group">
                  <ArrowUpRight className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-lg">Nova Entrada</span>
                </Link>
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-headline-small">Últimas Atividades</h3>
                <Link to="/extrato" className="text-brand-secondary font-medium flex items-center gap-1">
                  Ver tudo <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {transactions.slice(0, 5).map((tx) => (
                    <TransactionItem key={tx.id} tx={tx} onDelete={onDelete} onEdit={onEdit} />
                  ))}
                </AnimatePresence>
                {transactions.length === 0 && (
                  <div className="text-center p-12 bg-surface-container-low rounded-[2.5rem] border-2 border-dashed border-outline/20">
                    <Wallet className="w-12 h-12 text-outline/40 mx-auto mb-4" />
                    <p className="text-on-surface-variant">Nenhuma transação registrada ainda.</p>
                  </div>
                )}
              </div>
            </section>
      </div>
    </div>
  );
};

const GuardianAI = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const query = text || input;
    if (!query.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setInput('');
    setIsLoading(true);

    const answer = await getFinancialAdvice(query);
    setMessages(prev => [...prev, { role: 'ai', text: answer }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] md:pt-20">
      <header className="text-center space-y-2 mb-6">
        <div className="inline-flex p-4 bg-primary-fixed/30 rounded-full mb-2">
          <BrainCircuit className="w-10 h-10 text-brand-primary" />
        </div>
        <h1 className="text-display-small text-brand-primary">Guardian AI</h1>
        <p className="text-on-surface-variant max-w-md mx-auto text-sm">
          Seu assistente financeiro inteligente. Tire dúvidas sobre investimentos, taxas ou peça dicas de economia.
        </p>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 px-2 pb-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-ambient border border-outline/5 text-center space-y-6">
            <p className="text-headline-small text-on-surface-variant">Como posso te ajudar hoje?</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "O que é Selic?",
                "Como economizar no mercado?",
                "Dicas para evitar golpes",
                "Como funciona o Pix?"
              ].map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(q)}
                  className="px-6 py-3 bg-surface-container-low rounded-full text-brand-primary font-medium hover:bg-primary-fixed/20 transition-colors text-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[85%] p-5 rounded-3xl shadow-sm",
              m.role === 'user' 
                ? "bg-brand-primary text-white ml-auto rounded-tr-none" 
                : "bg-surface-container-lowest text-on-surface border border-outline/5 rounded-tl-none"
            )}
          >
            <div className="prose prose-sm max-w-none prose-headings:text-inherit prose-p:text-inherit">
              <ReactMarkdown>{m.text}</ReactMarkdown>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="bg-surface-container-lowest p-5 rounded-3xl rounded-tl-none border border-outline/5 w-fit flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
            <span className="text-on-surface-variant text-sm">O Guardian está pensando...</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 relative">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pergunte qualquer coisa..." 
          className="w-full p-5 pr-16 bg-surface-container-lowest rounded-3xl border border-outline/10 focus:ring-2 focus:ring-brand-primary text-lg shadow-ambient"
        />
        <button 
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-brand-primary text-white rounded-2xl shadow-lg disabled:opacity-50 disabled:bg-on-surface-variant"
        >
          <Send className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const AssetsView = ({ 
  properties, 
  installments, 
  propertyExpenses, 
  onDelete, 
  onEdit, 
  onMarkPaid, 
  onAddExpense,
  onGenerateInstallments,
  marketIndices
}: { 
  properties: Property[], 
  installments: RentalInstallment[], 
  propertyExpenses: PropertyExpense[],
  onDelete: (id: string) => void, 
  onEdit: (p: Property) => void,
  onMarkPaid: (inst: RentalInstallment, paymentDate?: string) => void,
  onAddExpense: (exp: PropertyExpense) => void,
  onGenerateInstallments: (p: Property) => void,
  marketIndices: MarketIndex[]
}) => {
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'installments' | 'expenses'>('details');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<PropertyExpense>>({
    title: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'repair'
  });
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);

  const totalValue = properties.reduce((acc, p) => acc + p.value, 0);
  const totalRent = properties.filter(p => p.status === 'rented').reduce((acc, p) => acc + (p.rentalValue || 0), 0);

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-display-small text-brand-primary">Seu Patrimônio</h1>
          <p className="text-on-surface-variant">Gestão de imóveis e aluguéis</p>
        </div>
        <Link to="/adicionar/imovel" className="p-4 bg-brand-primary text-white rounded-2xl shadow-lg flex items-center gap-2 font-bold">
          <PlusCircle className="w-6 h-6" />
          Novo Imóvel
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {marketIndices.map((idx) => (
          <div key={idx.id} className="p-4 bg-surface-container-lowest rounded-2xl border border-outline/5 shadow-sm text-center">
            <p className="text-xs text-on-surface-variant font-bold uppercase">{idx.name}</p>
            <p className="text-lg font-bold text-brand-primary">{idx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</p>
          </div>
        ))}
        {marketIndices.length === 0 && (
          <div className="col-span-full p-4 bg-surface-container-low rounded-2xl border border-dashed border-outline/20 text-center">
            <p className="text-xs text-on-surface-variant">Nenhum índice cadastrado. <Link to="/indices" className="text-brand-primary font-bold hover:underline">Cadastrar</Link></p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <p className="text-on-surface-variant font-medium">Valor Total em Imóveis</p>
              <h2 className="text-3xl font-bold text-on-surface">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>
        </div>
        <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <p className="text-on-surface-variant font-medium">Renda Mensal de Aluguéis</p>
              <h2 className="text-3xl font-bold text-on-surface">R$ {totalRent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-headline-small">Seus Imóveis</h3>
          <Link to="/projecoes" className="text-brand-secondary font-bold flex items-center gap-2 hover:underline">
            <LineChart className="w-5 h-5" />
            Ver Projeções
          </Link>
        </div>
        
        <div className="grid gap-6">
          {properties.map((p) => {
            const isExpanded = expandedProperty === p.id;
            const propInstallments = installments.filter(i => i.propertyId === p.id).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            const propExpenses = propertyExpenses.filter(e => e.propertyId === p.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return (
              <motion.div 
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-lowest rounded-[2rem] border border-outline/5 shadow-sm overflow-hidden"
              >
                <div 
                  className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center group cursor-pointer"
                  onClick={() => setExpandedProperty(isExpanded ? null : p.id)}
                >
                  <div className="p-5 bg-surface-container-low rounded-2xl text-brand-primary">
                    <Home className="w-10 h-10" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold">{p.address}</h4>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        p.status === 'rented' ? "bg-green-100 text-green-700" : 
                        p.status === 'vacant' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      )}>
                        {p.status === 'rented' ? 'Alugado' : p.status === 'vacant' ? 'Vago' : 'Manutenção'}
                      </span>
                    </div>
                    <p className="text-on-surface-variant capitalize">{p.type} • {p.name}</p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-on-surface-variant">
                        <Calculator className="w-4 h-4" />
                        Valor: R$ {p.value.toLocaleString()}
                      </div>
                      {p.status === 'rented' && (
                        <div className="flex items-center gap-1 text-sm text-on-surface-variant">
                          <User className="w-4 h-4" />
                          Inquilino: {p.tenantName}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs font-bold text-brand-secondary animate-pulse">
                        <Info className="w-3 h-3" />
                        Clique para ver detalhes e parcelas
                      </div>
                    </div>
                  </div>
                  <div className="text-right w-full md:w-auto flex flex-col items-end gap-2">
                    {p.status === 'rented' ? (
                      <p className="text-2xl font-bold text-green-600">R$ {p.rentalValue?.toLocaleString()}/mês</p>
                    ) : (
                      <p className="text-2xl font-bold text-on-surface-variant italic">Disponível</p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                          className="p-2 text-brand-primary hover:bg-primary-fixed/10 rounded-xl transition-all"
                          title="Editar Imóvel"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir Imóvel"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className={cn(
                        "p-2 rounded-full transition-all",
                        isExpanded ? "bg-brand-primary text-white rotate-180" : "bg-surface-container-high text-on-surface-variant"
                      )}>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-outline/10 bg-surface-container-lowest"
                    >
                      <div className="flex border-b border-outline/10">
                        {[
                          { id: 'details', label: 'Detalhes' },
                          { id: 'installments', label: 'Parcelas' },
                          { id: 'expenses', label: 'Despesas' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveDetailTab(tab.id as any)}
                            className={cn(
                              "px-6 py-4 font-bold text-xs transition-all relative",
                              activeDetailTab === tab.id ? "text-brand-primary" : "text-on-surface-variant hover:text-brand-primary"
                            )}
                          >
                            {tab.label.toUpperCase()}
                            {activeDetailTab === tab.id && (
                              <motion.div layoutId="activeDetailTab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary" />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="p-8">
                        {activeDetailTab === 'details' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <h5 className="font-bold text-brand-primary uppercase text-xs tracking-widest">Informações do Contrato</h5>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-surface-container-low rounded-2xl">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Início</p>
                                  <p className="font-bold">{p.leaseStart ? new Date(p.leaseStart).toLocaleDateString('pt-BR') : '-'}</p>
                                </div>
                                <div className="p-4 bg-surface-container-low rounded-2xl">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Fim</p>
                                  <p className="font-bold">{p.leaseEnd ? new Date(p.leaseEnd).toLocaleDateString('pt-BR') : '-'}</p>
                                </div>
                                <div className="p-4 bg-surface-container-low rounded-2xl">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Vencimento</p>
                                  <p className="font-bold">Dia {p.rentDueDate || '-'}</p>
                                </div>
                                <div className="p-4 bg-surface-container-low rounded-2xl">
                                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Correção</p>
                                  <p className="font-bold">{p.correctionIndex || '-'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h5 className="font-bold text-brand-primary uppercase text-xs tracking-widest">Resumo Financeiro</h5>
                              <div className="p-6 bg-primary-fixed/10 rounded-3xl space-y-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">Total Recebido</span>
                                  <span className="font-bold text-green-600">R$ {propInstallments.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">Total Despesas</span>
                                  <span className="font-bold text-red-600">R$ {propExpenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</span>
                                </div>
                                <div className="pt-4 border-t border-outline/10 flex justify-between items-center">
                                  <span className="font-bold">Resultado Líquido</span>
                                  <span className="text-xl font-bold text-brand-primary">
                                    R$ {(propInstallments.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0) - propExpenses.reduce((acc, e) => acc + e.amount, 0)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeDetailTab === 'installments' && (
                          <div className="space-y-6">
                            <div className="flex justify-between items-center">
                              <h5 className="font-bold text-brand-primary uppercase text-xs tracking-widest">Controle de Parcelas</h5>
                              {propInstallments.length === 0 && p.status === 'rented' && (
                                <button 
                                  onClick={() => onGenerateInstallments(p)}
                                  className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg"
                                >
                                  Gerar Parcelas do Contrato
                                </button>
                              )}
                            </div>
                            <div className="grid gap-3">
                              {propInstallments.map(inst => (
                                <div key={inst.id} className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "p-2 rounded-xl",
                                      inst.status === 'paid' ? "bg-green-100 text-green-600" :
                                      inst.status === 'pending' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                    )}>
                                      <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="font-bold">Vencimento: {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                      <p className={cn(
                                        "text-xs uppercase font-bold",
                                        inst.status === 'paid' ? "text-green-600" :
                                        inst.status === 'pending' ? "text-red-600" : "text-blue-600"
                                      )}>
                                        {inst.status === 'paid' ? `Pago em ${new Date(inst.paymentDate! + 'T12:00:00').toLocaleDateString('pt-BR')}` : 
                                         inst.status === 'pending' ? 'Atrasado / Pendente' : 'A Vencer'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <p className="font-bold text-lg">R$ {inst.amount.toLocaleString()}</p>
                                    {inst.status !== 'paid' && (
                                      <div className="flex flex-col items-end gap-2">
                                        {payingInstallmentId === inst.id ? (
                                          <div className="flex flex-col gap-2 bg-surface-container-lowest p-3 rounded-xl border border-outline/10 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                                            <label className="text-[10px] font-bold uppercase text-on-surface-variant">Data do Pagamento</label>
                                            <input 
                                              type="date" 
                                              value={selectedPaymentDate}
                                              onChange={(e) => setSelectedPaymentDate(e.target.value)}
                                              className="p-2 bg-surface-container-low rounded-lg border-none text-xs font-bold"
                                            />
                                            <div className="flex gap-2">
                                              <button 
                                                onClick={() => setPayingInstallmentId(null)}
                                                className="flex-1 px-3 py-2 bg-surface-container-high text-on-surface rounded-lg text-[10px] font-bold"
                                              >
                                                Cancelar
                                              </button>
                                              <button 
                                                onClick={() => {
                                                  onMarkPaid(inst, selectedPaymentDate);
                                                  setPayingInstallmentId(null);
                                                }}
                                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-[10px] font-bold"
                                              >
                                                Confirmar
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex gap-2">
                                            {inst.status !== 'pending' && (
                                              <button 
                                                onClick={() => onMarkPaid({ ...inst, status: 'pending' } as any)}
                                                className="px-4 py-2 bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold shadow-sm hover:bg-outline/10 transition-all"
                                              >
                                                Marcar Atrasada
                                              </button>
                                            )}
                                            <button 
                                              onClick={() => {
                                                setPayingInstallmentId(inst.id);
                                                setSelectedPaymentDate(new Date().toISOString().split('T')[0]);
                                              }}
                                              className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                                            >
                                              <ShieldCheck className="w-4 h-4" />
                                              Baixar Parcela
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {propInstallments.length === 0 && (
                                <div className="text-center py-8 text-on-surface-variant italic">
                                  Nenhuma parcela registrada.
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeDetailTab === 'expenses' && (
                          <div className="space-y-6">
                            <div className="flex justify-between items-center">
                              <h5 className="font-bold text-brand-primary uppercase text-xs tracking-widest">Despesas do Imóvel</h5>
                              <button 
                                onClick={() => setShowExpenseForm(!showExpenseForm)}
                                className="px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-all"
                              >
                                {showExpenseForm ? 'Cancelar' : 'Nova Despesa'}
                              </button>
                            </div>

                            {showExpenseForm && (
                              <div className="p-6 bg-surface-container-low rounded-3xl space-y-4 border border-brand-primary/20">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Título</label>
                                    <input 
                                      type="text" 
                                      value={newExpense.title || ''}
                                      onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                                      className="w-full bg-surface-container-lowest p-3 rounded-xl border-none text-sm font-bold"
                                      placeholder="Ex: Reparo Elétrico"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Valor</label>
                                    <input 
                                      type="number" 
                                      value={newExpense.amount || ''}
                                      onChange={(e) => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                                      className="w-full bg-surface-container-lowest p-3 rounded-xl border-none text-sm font-bold"
                                      placeholder="0,00"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Data</label>
                                    <input 
                                      type="date" 
                                      value={newExpense.date || ''}
                                      onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                                      className="w-full bg-surface-container-lowest p-3 rounded-xl border-none text-sm font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">Categoria</label>
                                    <select 
                                      value={newExpense.category || 'repair'}
                                      onChange={(e) => setNewExpense({...newExpense, category: e.target.value as any})}
                                      className="w-full bg-surface-container-lowest p-3 rounded-xl border-none text-sm font-bold"
                                    >
                                      <option value="repair">Reparo / Manutenção</option>
                                      <option value="tax">Imposto (IPTU, etc)</option>
                                      <option value="utility">Contas (Água, Luz)</option>
                                      <option value="other">Outros</option>
                                    </select>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    if (newExpense.title && newExpense.amount) {
                                      onAddExpense({ ...newExpense as PropertyExpense, propertyId: p.id });
                                      setNewExpense({ title: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'repair' });
                                      setShowExpenseForm(false);
                                    }
                                  }}
                                  className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg"
                                >
                                  Salvar Despesa
                                </button>
                              </div>
                            )}

                            <div className="grid gap-3">
                              {propExpenses.map(exp => (
                                <div key={exp.id} className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                                      <TrendingDown className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="font-bold">{exp.title}</p>
                                      <p className="text-xs text-on-surface-variant uppercase font-bold">
                                        {new Date(exp.date).toLocaleDateString('pt-BR')} • {exp.category}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="font-bold text-lg text-red-600">- R$ {exp.amount.toLocaleString()}</p>
                                </div>
                              ))}
                              {propExpenses.length === 0 && (
                                <div className="text-center py-8 text-on-surface-variant italic">
                                  Nenhuma despesa registrada para este imóvel.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const CreditCardsView = ({ cards, installments, onDelete, onEdit }: { cards: CreditCard[], installments: CreditCardInstallment[], onDelete: (id: string) => void, onEdit: (c: CreditCard) => void }) => {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<string | null>(cards[0]?.id || null);
  const cardInstallments = installments.filter(i => i.cardId === selectedCard);
  
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const selectedMonthStr = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`;

  const currentInvoiceInstallments = cardInstallments.filter(i => i.dueDate.startsWith(selectedMonthStr));
  const invoiceTotal = currentInvoiceInstallments.reduce((acc, i) => acc + i.amount, 0);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-display-small text-brand-primary">Cartões de Crédito</h1>
          <p className="text-on-surface-variant">Gerencie seus limites e faturas.</p>
        </div>
        <Link to="/adicionar/cartao" className="p-4 bg-brand-primary text-white rounded-2xl shadow-lg flex items-center gap-2 font-bold">
          <PlusCircle className="w-6 h-6" />
          Novo Cartão
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cards List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-headline-small px-2">Seus Cartões</h3>
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => setSelectedCard(card.id)}
                className={cn(
                  "w-full p-6 rounded-[2.5rem] border-2 transition-all text-left flex flex-col gap-4 relative group cursor-pointer",
                  selectedCard === card.id 
                    ? "border-brand-primary bg-primary-fixed/20 shadow-lg" 
                    : "border-transparent bg-surface-container-low hover:bg-surface-container-medium"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/50 rounded-2xl">
                    <ShieldCheck className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(card); navigate('/adicionar/cartao'); }}
                      className="p-2 text-brand-primary hover:bg-white/50 rounded-xl"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-on-surface">{card.name}</p>
                  <div className="flex gap-4 mt-2 text-sm text-on-surface-variant">
                    <span>Fecha: Dia {card.closingDay}</span>
                    <span>Vence: Dia {card.dueDay}</span>
                  </div>
                </div>
              </div>
            ))}
            {cards.length === 0 && (
              <div className="text-center p-12 bg-surface-container-low rounded-[2.5rem] border-2 border-dashed border-outline/10">
                <PlusCircle className="w-12 h-12 text-outline/40 mx-auto mb-4" />
                <p className="text-on-surface-variant">Nenhum cartão cadastrado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCard ? (
            <>
              <div className="flex flex-wrap gap-3 items-center justify-between px-2">
                <h3 className="text-headline-small">Detalhes da Fatura</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => navigate('/adicionar/expense', { state: { cardId: selectedCard } })}
                    className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl font-bold flex items-center gap-2 hover:bg-brand-primary/20 transition-all"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Novo Lançamento
                  </button>
                  <div className="flex gap-2">
                    <select 
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                      className="p-3 bg-surface-container-low rounded-xl border-none font-bold text-brand-primary"
                    >
                      {months.map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={filterYear}
                      onChange={(e) => setFilterYear(parseInt(e.target.value))}
                      className="p-3 bg-surface-container-low rounded-xl border-none font-bold text-brand-primary"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient overflow-hidden">
                <div className="p-8 bg-brand-primary text-white flex justify-between items-center">
                  <div>
                    <p className="text-white/80 font-medium uppercase tracking-wider text-xs">Total da Fatura</p>
                    <h2 className="text-4xl font-bold mt-1">R$ {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 font-medium uppercase tracking-wider text-xs">Vencimento</p>
                    <p className="text-xl font-bold mt-1">
                      {cards.find(c => c.id === selectedCard)?.dueDay}/{String(filterMonth + 1).padStart(2, '0')}/{filterYear}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {currentInvoiceInstallments.map((inst) => (
                    <div key={inst.id} className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-2xl transition-all group">
                      <div className="p-3 bg-surface-container-low rounded-xl text-brand-primary">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-on-surface">{inst.title}</p>
                        <p className="text-xs text-on-surface-variant">
                          Parcela {inst.installmentNumber} de {inst.totalInstallments}
                        </p>
                      </div>
                      <p className="font-bold text-lg text-on-surface">
                        R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                  {currentInvoiceInstallments.length === 0 && (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-outline/20 mx-auto mb-4" />
                      <p className="text-on-surface-variant">Nenhum lançamento nesta fatura.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-surface-container-low rounded-[2.5rem] border-2 border-dashed border-outline/10 text-center">
              <ShieldCheck className="w-16 h-16 text-outline/20 mb-4" />
              <h3 className="text-xl font-bold text-on-surface-variant">Selecione um cartão</h3>
              <p className="text-on-surface-variant max-w-xs">Escolha um cartão ao lado para ver os detalhes da fatura e lançamentos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddCreditCard = ({ onSave, initialData }: { onSave: (c: CreditCard) => void, initialData?: CreditCard }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<CreditCard>>(initialData || {
    name: '',
    closingDay: 5,
    dueDay: 15
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      id: formData.id || Math.random().toString(36).substr(2, 9),
    } as CreditCard);
    navigate('/cartoes');
  };

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header>
        <h1 className="text-display-small text-brand-primary">
          {initialData ? 'Editar Cartão' : 'Novo Cartão'}
        </h1>
        <p className="text-on-surface-variant">Configure os dados do seu cartão para gerenciar as faturas.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-ambient border border-outline/5">
        <div className="space-y-2">
          <label className="text-headline-small block">Nome do Cartão / Banco</label>
          <input 
            type="text" 
            value={formData.name || ''}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Ex: Nubank, Itaú, Viacredi..." 
            className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-headline-small block">Dia de Fechamento</label>
            <input 
              type="number" 
              min="1"
              max="31"
              value={formData.closingDay || ''}
              onChange={(e) => setFormData({...formData, closingDay: parseInt(e.target.value)})}
              placeholder="Ex: 5" 
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl font-bold"
              required
            />
            <p className="text-xs text-on-surface-variant px-2">Dia em que a fatura "vira" para o mês seguinte.</p>
          </div>
          <div className="space-y-2">
            <label className="text-headline-small block">Dia de Vencimento</label>
            <input 
              type="number" 
              min="1"
              max="31"
              value={formData.dueDay || ''}
              onChange={(e) => setFormData({...formData, dueDay: parseInt(e.target.value)})}
              placeholder="Ex: 15" 
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl font-bold text-brand-primary"
              required
            />
            <p className="text-xs text-on-surface-variant px-2">Dia limite para pagamento da fatura.</p>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            type="button" 
            onClick={() => window.history.back()}
            className="flex-1 p-5 bg-surface-container-low rounded-2xl font-bold text-xl text-on-surface-variant"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="flex-1 p-5 bg-brand-primary text-white rounded-2xl font-bold text-xl shadow-lg"
          >
            Salvar Cartão
          </button>
        </div>
      </form>
    </div>
  );
};

const SettingsView = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header>
        <h1 className="text-display-small text-brand-primary">Configurações</h1>
        <p className="text-on-surface-variant">Personalize sua experiência no The Guardian.</p>
      </header>

      <div className="grid gap-6">
        <section className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-fixed/30 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-brand-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface">Aplicativo Desktop</h3>
              <p className="text-on-surface-variant">Instale o The Guardian no seu computador para acesso rápido e offline.</p>
            </div>
          </div>

          {installPrompt ? (
            <div className="bg-primary-fixed/10 p-6 rounded-3xl border border-brand-primary/10 space-y-4">
              <p className="text-sm font-medium text-on-surface">O instalador está pronto!</p>
              <button 
                onClick={handleInstallClick}
                className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Instalar Agora
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-low p-6 rounded-3xl border border-outline/5">
              <p className="text-sm text-on-surface-variant italic">
                O aplicativo já está instalado ou seu navegador não suporta instalação direta. 
                Se estiver no Chrome, procure pelo ícone de instalação na barra de endereços.
              </p>
            </div>
          )}
        </section>

        <section className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient space-y-6">
          <h3 className="text-xl font-bold text-on-surface">Sobre o Sistema</h3>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-outline/10">
              <span className="text-on-surface-variant">Versão</span>
              <span className="font-bold">1.2.0 (PWA)</span>
            </div>
            <div className="flex justify-between py-3 border-b border-outline/10">
              <span className="text-on-surface-variant">Modo Offline</span>
              <span className="text-green-600 font-bold">Ativado</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-on-surface-variant">Segurança</span>
              <span className="text-brand-primary font-bold">Criptografia Ponta-a-Ponta</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ProjectionsView = ({ totalBalance, totalPropertyValue, indices }: { totalBalance: number, totalPropertyValue: number, indices: MarketIndex[] }) => {
  const [years, setYears] = useState(5);
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(indices[0] || null);

  const generateData = () => {
    const data = [];
    let currentTotal = totalBalance + totalPropertyValue;
    const rate = selectedIndex?.value || 0;
    const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;

    for (let i = 0; i <= years * 12; i++) {
      if (i % 12 === 0) {
        data.push({
          name: `Ano ${i / 12}`,
          valor: Math.round(currentTotal)
        });
      }
      currentTotal *= (1 + monthlyRate);
    }
    return data;
  };

  const projectionData = generateData();
  const finalValue = projectionData[projectionData.length - 1].valor;

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header>
        <h1 className="text-display-small text-brand-primary">Projeções Financeiras</h1>
        <p className="text-on-surface-variant">Simule o crescimento do seu patrimônio com base em índices de mercado.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient space-y-6">
            <div className="space-y-4">
              <label className="text-headline-small block">Período (Anos)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-surface-container-low rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
                <span className="text-2xl font-bold text-brand-primary w-12 text-center">{years}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-headline-small block">Índice de Referência</label>
              <div className="grid grid-cols-1 gap-3">
                {indices.map((idx) => (
                  <button
                    key={idx.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center",
                      selectedIndex?.id === idx.id 
                        ? "border-brand-primary bg-primary-fixed/20" 
                        : "border-transparent bg-surface-container-low"
                    )}
                  >
                    <div>
                      <p className="font-bold">{idx.name}</p>
                      <p className="text-xs text-on-surface-variant">{idx.description}</p>
                    </div>
                    <span className="font-bold text-brand-primary">{idx.value}% aa</span>
                  </button>
                ))}
                {indices.length === 0 && (
                  <p className="text-xs text-on-surface-variant text-center p-4">Nenhum índice cadastrado.</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 bg-brand-primary text-white rounded-[2.5rem] shadow-2xl">
            <p className="text-white/80 font-medium">Patrimônio Estimado em {years} anos</p>
            <h2 className="text-4xl font-bold mt-2">R$ {finalValue.toLocaleString('pt-BR')}</h2>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm text-white/80">
              <Info className="w-4 h-4" />
              Baseado no valor atual de R$ {(totalBalance + totalPropertyValue).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient">
          <h3 className="text-headline-small mb-8">Crescimento Projetado</h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6750A4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6750A4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="valor" stroke="#6750A4" strokeWidth={4} fillOpacity={1} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-6 text-sm text-on-surface-variant text-center italic">
            * Esta é uma simulação baseada em taxas históricas. Rendimentos passados não garantem resultados futuros.
          </p>
        </div>
      </div>
    </div>
  );
};


const GoalsView = ({ goals, onDelete, onEdit, indices }: { goals: FinancialGoal[], onDelete: (id: string) => void, onEdit: (g: FinancialGoal) => void, indices: MarketIndex[] }) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-display-small text-brand-primary">Suas Metas</h1>
          <p className="text-on-surface-variant">Planeje seu futuro financeiro</p>
        </div>
        <Link to="/adicionar/meta" className="p-4 bg-brand-primary text-white rounded-2xl shadow-lg flex items-center gap-2 font-bold">
          <PlusCircle className="w-6 h-6" />
          Nova Meta
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const targetDate = new Date(goal.deadline + 'T12:00:00');
          const monthsRemaining = Math.max(1, (targetDate.getFullYear() - new Date().getFullYear()) * 12 + (targetDate.getMonth() - new Date().getMonth()));
          
          // Calculate projection based on linked index
          const linkedIndex = indices.find(idx => idx.id === goal.indexId);
          const annualRate = (linkedIndex?.value || 0) * ((goal.indexPercentage || 100) / 100);
          const monthlyRate = annualRate / 12 / 100;
          
          let projectedValue = goal.currentAmount;
          for (let i = 0; i < monthsRemaining; i++) {
            projectedValue = projectedValue * (1 + monthlyRate);
          }

          return (
            <motion.div 
              key={goal.id}
              layout
              className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient flex flex-col justify-between group"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="p-4 bg-primary-fixed/30 rounded-2xl text-brand-primary">
                    <Target className="w-8 h-8" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => { onEdit(goal); navigate('/adicionar/meta'); }}
                      className="p-2 text-brand-primary hover:bg-primary-fixed/10 rounded-xl"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onDelete(goal.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-on-surface">{goal.title}</h3>
                  <p className="text-on-surface-variant text-sm mt-1">Meta: R$ {goal.targetAmount.toLocaleString()}</p>
                  {linkedIndex && (
                    <p className="text-[10px] font-bold text-brand-secondary uppercase mt-2">
                      Vinculado ao {linkedIndex.name} ({goal.indexPercentage}%)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Progresso</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-surface-container-low rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, progress)}%` }}
                      className="h-full bg-brand-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-outline/10 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Atual</p>
                  <p className="text-2xl font-bold text-on-surface">R$ {goal.currentAmount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-brand-primary uppercase">Projeção</p>
                  <p className="text-lg font-bold text-brand-primary">R$ {projectedValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-on-surface-variant">Até {targetDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
        {goals.length === 0 && (
          <div className="col-span-full text-center p-12 bg-surface-container-low rounded-[2.5rem] border-2 border-dashed border-outline/20">
            <Calculator className="w-12 h-12 text-outline/40 mx-auto mb-4" />
            <p className="text-on-surface-variant">Nenhuma meta de investimento cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AddGoal = ({ onSave, initialData, indices }: { onSave: (g: FinancialGoal) => void, initialData?: FinancialGoal, indices: MarketIndex[] }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<FinancialGoal>>(initialData || {
    targetAmount: 0,
    currentAmount: 0,
    deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    indexPercentage: 100
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      id: formData.id || Math.random().toString(36).substr(2, 9),
    } as FinancialGoal);
    navigate('/metas');
  };

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header>
        <h1 className="text-display-small text-brand-primary">
          {initialData ? 'Editar Meta' : 'Nova Meta'}
        </h1>
        <p className="text-on-surface-variant">Defina seus objetivos financeiros e acompanhe o progresso.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-ambient border border-outline/5">
        <div className="space-y-2">
          <label className="text-headline-small block">Título da Meta</label>
          <input 
            type="text" 
            value={formData.title || ''}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="Ex: Reserva de Emergência, Viagem..." 
            className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-headline-small block">Valor Alvo (R$)</label>
            <input 
              type="number" 
              value={formData.targetAmount || ''}
              onChange={(e) => setFormData({...formData, targetAmount: roundABNT(parseFloat(e.target.value))})}
              placeholder="0,00" 
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl font-bold"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-headline-small block">Valor Já Guardado (R$)</label>
            <input 
              type="number" 
              value={formData.currentAmount || ''}
              onChange={(e) => setFormData({...formData, currentAmount: roundABNT(parseFloat(e.target.value))})}
              placeholder="0,00" 
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl font-bold text-brand-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-headline-small block">Prazo Final</label>
            <input 
              type="date" 
              value={formData.deadline || ''}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-headline-small block">Índice de Correção (Opcional)</label>
            <div className="flex gap-2">
              <select 
                value={formData.indexId || ''}
                onChange={(e) => setFormData({...formData, indexId: e.target.value})}
                className="flex-1 p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              >
                <option value="">Nenhum</option>
                {indices.map(idx => (
                  <option key={idx.id} value={idx.id}>{idx.name}</option>
                ))}
              </select>
              {formData.indexId && (
                <div className="w-32 relative">
                  <input 
                    type="number" 
                    value={formData.indexPercentage || 100}
                    onChange={(e) => setFormData({...formData, indexPercentage: parseFloat(e.target.value)})}
                    className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold">%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            type="button" 
            onClick={() => window.history.back()}
            className="flex-1 p-5 bg-surface-container-low rounded-2xl font-bold text-xl text-on-surface-variant"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="flex-1 p-5 bg-brand-primary text-white rounded-2xl font-bold text-xl shadow-lg"
          >
            Salvar Meta
          </button>
        </div>
      </form>
    </div>
  );
};


const MarketIndicesView = ({ indices, onDelete, onEdit }: { indices: MarketIndex[], onDelete: (id: string) => void, onEdit: (idx: MarketIndex) => void }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-display-small text-brand-primary">Índices de Correção</h1>
          <p className="text-on-surface-variant">Gerencie os índices para correção de aluguéis e metas.</p>
        </div>
        <Link to="/adicionar/indice" className="p-4 bg-brand-primary text-white rounded-2xl shadow-lg flex items-center gap-2 font-bold">
          <PlusCircle className="w-6 h-6" />
          Novo Índice
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {indices.map((idx) => (
          <div key={idx.id} className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-4 bg-primary-fixed/30 rounded-2xl text-brand-primary">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => { onEdit(idx); navigate('/adicionar/indice'); }}
                    className="p-2 text-brand-primary hover:bg-primary-fixed/10 rounded-xl"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onDelete(idx.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-on-surface">{idx.name}</h3>
                <p className="text-on-surface-variant text-sm mt-1">{idx.description}</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-outline/10">
              <p className="text-4xl font-bold text-brand-primary">{idx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% <span className="text-sm font-medium text-on-surface-variant">ao ano</span></p>
            </div>
          </div>
        ))}
        {indices.length === 0 && (
          <div className="col-span-full text-center p-12 bg-surface-container-low rounded-[2.5rem] border-2 border-dashed border-outline/10">
            <TrendingUp className="w-12 h-12 text-outline/40 mx-auto mb-4" />
            <p className="text-on-surface-variant">Nenhum índice cadastrado.</p>
            <Link to="/adicionar/indice" className="text-brand-primary font-bold mt-2 inline-block hover:underline">Clique aqui para adicionar o primeiro</Link>
          </div>
        )}
      </div>
    </div>
  );
};

const AddMarketIndex = ({ onSave, initialData }: { onSave: (idx: MarketIndex) => void, initialData?: MarketIndex }) => {
  const navigate = useNavigate();
  const [name, setName] = useState(initialData?.name || '');
  const [value, setValue] = useState(initialData?.value.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;
    await onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      name,
      value: parseFloat(value),
      description,
      userId: '' // Handled by save function
    });
    navigate('/indices');
  };

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header>
        <h1 className="text-display-small text-brand-primary">
          {initialData ? 'Editar Índice' : 'Novo Índice'}
        </h1>
        <p className="text-on-surface-variant">Configure os parâmetros do índice de correção.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline/5 shadow-ambient space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-headline-small block">Nome do Índice</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              placeholder="Ex: CDI, IPCA, Selic"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-headline-small block">Valor Anual (%)</label>
            <input 
              type="number" 
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              placeholder="Ex: 10.75"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-headline-small block">Descrição (Opcional)</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl min-h-[120px]"
            placeholder="Breve descrição sobre o índice..."
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            type="button" 
            onClick={() => window.history.back()}
            className="flex-1 p-5 bg-surface-container-high text-on-surface rounded-2xl font-bold text-xl"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="flex-1 p-5 bg-brand-primary text-white rounded-2xl font-bold text-xl shadow-lg"
          >
            Salvar Índice
          </button>
        </div>
      </form>
    </div>
  );
};

const AnalyticsView = ({ 
  transactions, 
  properties, 
  installments, 
  propertyExpenses, 
  creditCardInstallments 
}: { 
  transactions: Transaction[], 
  properties: Property[], 
  installments: RentalInstallment[], 
  propertyExpenses: PropertyExpense[],
  creditCardInstallments: CreditCardInstallment[]
}) => {
  const [timeFilter, setTimeFilter] = useState<'mes' | 'ano'>('mes');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      if (timeFilter === 'mes') {
        return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
      }
      return txDate.getFullYear() === selectedYear;
    });
  };

  const filteredTxs = getFilteredTransactions();
  const income = filteredTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = filteredTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const profit = income - expense;

  const paymentBreakdown = [
    { label: 'Dinheiro', id: 'dinheiro', icon: Wallet },
    { label: 'PIX / Transferência', id: 'pix', icon: Building2 },
    { label: 'Cartão de Crédito', id: 'credito', icon: Tag },
    { label: 'Cartão de Débito', id: 'debito', icon: Tag },
    { label: 'Cheque', id: 'cheque', icon: Calculator },
    { label: 'Cortesia', id: 'cortesia', icon: PlusCircle },
  ].map(pm => {
    const amount = filteredTxs.filter(t => t.paymentMethod === pm.id).reduce((acc, t) => acc + t.amount, 0);
    const percentage = income > 0 ? (amount / income) * 100 : 0;
    return { ...pm, amount, percentage };
  });

  const generateHistoricalData = () => {
    const data = [];
    if (timeFilter === 'ano') {
      for (let m = 0; m < 12; m++) {
        const d = new Date(selectedYear, m, 1);
        const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
        const monthTxs = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getMonth() === m && txDate.getFullYear() === selectedYear;
        });
        data.push({
          name: monthName,
          receita: monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          despesa: monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
        });
      }
    } else {
      // Last 6 months including selected month
      for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - i, 1);
        const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
        const monthTxs = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear();
        });
        data.push({
          name: monthName,
          receita: monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          despesa: monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
        });
      }
    }
    return data;
  };

  const historyData = generateHistoricalData();
  const bestMonth = [...historyData].sort((a, b) => b.receita - a.receita)[0];
  const worstMonth = [...historyData].sort((a, b) => a.receita - b.receita)[0];
  const avgIncome = historyData.reduce((acc, d) => acc + d.receita, 0) / historyData.length;

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 p-1 bg-surface-container-low rounded-2xl w-fit">
          {[
            { id: 'mes', label: 'MÊS' },
            { id: 'ano', label: 'ANO' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id as any)}
              className={cn(
                "px-8 py-2 rounded-xl text-xs font-bold transition-all",
                timeFilter === f.id ? "bg-brand-primary text-white shadow-lg" : "text-on-surface-variant hover:bg-surface-container-lowest"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          {timeFilter === 'mes' && (
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-surface-container-low p-3 rounded-xl border-none font-bold text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}
                </option>
              ))}
            </select>
          )}
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-surface-container-low p-3 rounded-xl border-none font-bold text-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient space-y-8">
        <h3 className="text-headline-small font-bold">
          Resumo - {timeFilter === 'mes' ? `${new Date(0, selectedMonth).toLocaleDateString('pt-BR', { month: 'long' })} / ${selectedYear}` : selectedYear}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-surface-container-low rounded-3xl flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase">Receita</p>
              <p className="text-3xl font-bold text-on-surface">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-green-500 text-white rounded-2xl">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
          <div className="p-6 bg-surface-container-low rounded-3xl flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase">Despesas</p>
              <p className="text-3xl font-bold text-on-surface">R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-red-500 text-white rounded-2xl">
              <TrendingDown className="w-8 h-8" />
            </div>
          </div>
          <div className="p-6 bg-green-600 text-white rounded-3xl flex justify-between items-center shadow-lg">
            <div>
              <p className="text-xs font-bold text-white/80 uppercase">Lucro</p>
              <p className="text-3xl font-bold">R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="p-4 bg-white/20 rounded-full">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-8 border-t border-outline/10">
          {paymentBreakdown.map(pm => {
            const Icon = pm.icon;
            return (
              <div key={pm.id} className="text-center space-y-1">
                <Icon className="w-6 h-6 mx-auto text-green-600" />
                <p className="text-[10px] font-bold text-green-600 uppercase">{pm.label}</p>
                <p className="text-sm font-bold">R$ {pm.amount.toLocaleString('pt-BR')}</p>
                <p className="text-xs font-bold text-green-600">{pm.percentage.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-headline-small font-bold">Projeções Futuras</h3>
            <p className="text-on-surface-variant">Entradas e saídas previstas (Aluguéis e Cartões)</p>
          </div>
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
            <LineChart className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-widest text-brand-primary">Próximos 6 Meses</h4>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() + i);
                const monthKey = d.toISOString().substring(0, 7);
                const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                const projectedIncome = installments
                  .filter(inst => {
                    if (inst.status === 'paid') return false;
                    if (i === 0) {
                      // No primeiro mês da projeção, inclui tudo que está pendente ou em atraso
                      return inst.dueDate <= monthKey + '-31';
                    }
                    return inst.dueDate.startsWith(monthKey);
                  })
                  .reduce((acc, inst) => acc + inst.amount, 0);
                
                const projectedExpense = creditCardInstallments
                  .filter(inst => {
                    if (i === 0) {
                      // No primeiro mês, inclui parcelas de cartão vencidas (se houver lógica para isso)
                      return inst.dueDate <= monthKey + '-31';
                    }
                    return inst.dueDate.startsWith(monthKey);
                  })
                  .reduce((acc, inst) => acc + inst.amount, 0);

                const balance = projectedIncome - projectedExpense;

                return (
                  <div key={monthKey} className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between group hover:bg-surface-container-high transition-all">
                    <div>
                      <p className="font-bold capitalize">{monthName}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-[10px] font-bold text-green-600 uppercase">↑ R$ {projectedIncome.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-red-600 uppercase">↓ R$ {projectedExpense.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", balance >= 0 ? "text-green-600" : "text-red-600")}>
                        {balance >= 0 ? '+' : ''} R$ {balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-primary-fixed/10 rounded-3xl">
              <h4 className="font-bold text-brand-primary mb-4">Resumo da Projeção</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Previsto (Entradas)</span>
                  <span className="font-bold text-green-600">
                    R$ {installments.filter(i => i.status !== 'paid').reduce((acc, i) => acc + i.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Previsto (Saídas Cartão)</span>
                  <span className="font-bold text-red-600">
                    R$ {creditCardInstallments.reduce((acc, i) => acc + i.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 border-t border-outline/10 flex justify-between items-center">
                  <span className="font-bold">Saldo Projetado</span>
                  <span className="text-2xl font-bold text-brand-primary">
                    R$ {(installments.filter(i => i.status !== 'paid').reduce((acc, i) => acc + i.amount, 0) - creditCardInstallments.reduce((acc, i) => acc + i.amount, 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface-container-low rounded-3xl border border-outline/5">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-5 h-5 text-brand-secondary" />
                <h5 className="font-bold text-sm">Sobre as Projeções</h5>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                As projeções são baseadas em parcelas de aluguel pendentes ou futuras e em parcelas de cartão de crédito já lançadas. 
                Valores de despesas fixas ou variáveis não parceladas não são incluídos nesta visão.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-headline-small font-bold">Receita x Despesa</h3>
            <p className="text-xs font-bold text-on-surface-variant mt-1 uppercase">Visualização {timeFilter === 'mes' ? 'Semestral' : 'Anual'}</p>
          </div>
          <div className="flex gap-8">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface-variant flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" /> Melhor Mês
              </p>
              <p className="text-xl font-bold text-green-500">R$ {bestMonth.receita.toLocaleString('pt-BR')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface-variant flex items-center justify-end gap-1">
                <TrendingDown className="w-3 h-3 text-red-500" /> Pior Mês
              </p>
              <p className="text-xl font-bold text-red-500">R$ {worstMonth.receita.toLocaleString('pt-BR')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface-variant flex items-center justify-end gap-1">
                <span className="w-3 h-0.5 bg-brand-primary" /> Ganho Médio
              </p>
              <p className="text-xl font-bold text-brand-primary">R$ {avgIncome.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v/1000}k`} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] border border-outline/5 shadow-ambient">
        <h3 className="text-headline-small font-bold mb-6">Análise de Rendimento Patrimonial</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.filter(p => p.status === 'rented').map(p => {
            const propExpenses = propertyExpenses.filter(e => e.propertyId === p.id);
            const totalExpenses = propExpenses.reduce((acc, e) => acc + e.amount, 0);
            
            const annualRent = (p.rentalValue || 0) * 12;
            const netAnnualRent = annualRent - totalExpenses;
            const yieldPerc = (annualRent / p.value) * 100;
            const netYieldPerc = (netAnnualRent / p.value) * 100;
            
            const index = MARKET_INDICES.find(idx => idx.id === p.correctionIndex?.toLowerCase()) || MARKET_INDICES[1];
            
            const propInstallments = installments.filter(i => i.propertyId === p.id);
            const totalReceived = propInstallments.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0);
            const totalPending = propInstallments.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.amount, 0);
            const totalUpcoming = propInstallments.filter(i => i.status === 'upcoming').reduce((acc, i) => acc + i.amount, 0);
            const overdueCount = propInstallments.filter(i => i.status === 'pending' && new Date(i.dueDate) < new Date()).length;

            return (
              <div key={p.id} className="p-6 bg-surface-container-low rounded-3xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg">{p.name}</h4>
                    <p className="text-xs text-on-surface-variant">{p.tenantName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-brand-primary uppercase">Rendimento Líquido AA</p>
                    <p className="text-2xl font-bold text-brand-primary">{netYieldPerc.toFixed(2)}%</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">Bruto: {yieldPerc.toFixed(2)}%</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 py-4 border-y border-outline/10">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Recebido</p>
                    <p className="text-sm font-bold text-green-600">R$ {totalReceived.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Despesas</p>
                    <p className="text-sm font-bold text-red-600">R$ {totalExpenses.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Pendente</p>
                    <p className="text-sm font-bold text-amber-600">R$ {totalPending.toLocaleString('pt-BR')}</p>
                    {overdueCount > 0 && <p className="text-[8px] text-red-500 font-bold">{overdueCount} atrasadas</p>}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">A Vencer</p>
                    <p className="text-sm font-bold text-blue-600">R$ {totalUpcoming.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase">Comparativo ({index.name})</p>
                    <p className="text-sm font-medium">Índice Atual: {index.value}% aa</p>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm",
                    netYieldPerc > index.value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {netYieldPerc > index.value ? 'Acima do Índice' : 'Abaixo do Índice'}
                  </div>
                </div>

                {p.leaseStart && p.leaseEnd && (
                  <div className="flex gap-4 text-xs text-on-surface-variant font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Início: {new Date(p.leaseStart).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Fim: {new Date(p.leaseEnd).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {properties.filter(p => p.status === 'rented').length === 0 && (
            <div className="col-span-2 text-center p-8 bg-surface-container-low rounded-3xl border-2 border-dashed border-outline/20">
              <p className="text-on-surface-variant">Nenhum imóvel alugado para análise de rendimento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddProperty = ({ onSave, initialData, indices }: { onSave: (p: Property) => void, initialData?: Property, indices: MarketIndex[] }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<Property>>(initialData || {
    type: 'apartamento',
    status: 'vacant',
    correctionIndex: indices[0]?.name || 'IGP-M',
    rentDueDate: 10
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      id: formData.id || Math.random().toString(36).substr(2, 9),
    } as Property);
    navigate('/patrimonio');
  };

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header>
        <h1 className="text-display-small text-brand-primary">
          {initialData ? 'Editar Imóvel' : 'Novo Imóvel'}
        </h1>
        <p className="text-on-surface-variant">Cadastre os detalhes do seu patrimônio imobiliário.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-ambient border border-outline/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-headline-small block">Nome do Imóvel</label>
            <input 
              type="text" 
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Apartamento Centro" 
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-headline-small block">Tipo</label>
            <select 
              value={formData.type || 'apartamento'}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl appearance-none"
            >
              <option value="terreno">Terreno</option>
              <option value="apartamento">Apartamento</option>
              <option value="casa">Casa</option>
              <option value="sala comercial">Sala Comercial</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-headline-small block">Endereço Completo</label>
          <input 
            type="text" 
            value={formData.address || ''}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            placeholder="Rua, Número, Bairro, Cidade..." 
            className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-headline-small block">Valor de Mercado</label>
            <input 
              type="number" 
              value={formData.value || ''}
              onChange={(e) => setFormData({...formData, value: roundABNT(parseFloat(e.target.value))})}
              placeholder="R$ 0,00" 
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl font-bold"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-headline-small block">Status Atual</label>
            <select 
              value={formData.status || 'vacant'}
              onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl appearance-none"
            >
              <option value="vacant">Vago</option>
              <option value="rented">Alugado</option>
              <option value="maintenance">Em Manutenção</option>
            </select>
          </div>
        </div>

        {formData.status === 'rented' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline/10"
          >
            <div className="space-y-2">
              <label className="text-headline-small block">Valor do Aluguel</label>
              <input 
                type="number" 
                value={formData.rentalValue || ''}
                onChange={(e) => setFormData({...formData, rentalValue: roundABNT(parseFloat(e.target.value))})}
                placeholder="R$ 0,00" 
                className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl font-bold text-green-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-headline-small block">Nome do Inquilino</label>
              <input 
                type="text" 
                value={formData.tenantName || ''}
                onChange={(e) => setFormData({...formData, tenantName: e.target.value})}
                placeholder="Nome completo" 
                className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-headline-small block">Índice de Correção</label>
              <select 
                value={formData.correctionIndex || 'Fixo'}
                onChange={(e) => setFormData({...formData, correctionIndex: e.target.value})}
                className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl appearance-none"
              >
                {indices.map(idx => (
                  <option key={idx.id} value={idx.name}>{idx.name}</option>
                ))}
                {indices.length === 0 && <option value="Fixo">Fixo (Sem correção)</option>}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-headline-small block">Dia do Vencimento</label>
              <input 
                type="number" 
                min="1" 
                max="31"
                value={formData.rentDueDate || ''}
                onChange={(e) => setFormData({...formData, rentDueDate: parseInt(e.target.value)})}
                className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-headline-small block">Início do Contrato</label>
              <input 
                type="date" 
                value={formData.leaseStart || ''}
                onChange={(e) => setFormData({...formData, leaseStart: e.target.value})}
                className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-headline-small block">Fim do Contrato</label>
              <input 
                type="date" 
                value={formData.leaseEnd || ''}
                onChange={(e) => setFormData({...formData, leaseEnd: e.target.value})}
                className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
              />
            </div>
          </motion.div>
        )}

        <div className="pt-4 flex gap-4">
          <button 
            type="button" 
            onClick={() => window.history.back()}
            className="flex-1 p-5 bg-surface-container-low rounded-2xl font-bold text-xl text-on-surface-variant"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="flex-1 p-5 bg-brand-primary text-white rounded-2xl font-bold text-xl shadow-lg"
          >
            Salvar Imóvel
          </button>
        </div>
      </form>
    </div>
  );
};

const AddTransaction = ({ onAdd, initialData, goals, creditCards }: { onAdd: (tx: Transaction) => void, initialData?: Transaction, goals: FinancialGoal[], creditCards: CreditCard[] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const type = initialData?.type || (location.pathname.includes('income') ? 'income' : 'expense');
  const [title, setTitle] = useState(initialData?.title || '');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || CATEGORIES[0].id);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || (location.state?.cardId ? 'credito' : 'pix'));
  const [goalId, setGoalId] = useState(initialData?.goalId || '');
  const [cardId, setCardId] = useState(initialData?.cardId || location.state?.cardId || '');
  const [installments, setInstallments] = useState(initialData?.installments || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    await onAdd({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      title,
      amount: roundABNT(parseFloat(amount)),
      type,
      categoryId,
      date,
      paymentMethod,
      goalId: goalId || null,
      cardId: paymentMethod === 'credito' ? cardId : null,
      installments: paymentMethod === 'credito' ? installments : null
    });
    navigate(goalId ? '/metas' : '/');
  };

  return (
    <div className="space-y-8 pb-24 md:pt-20">
      <header>
        <h1 className="text-display-small text-brand-primary">
          {type === 'income' ? 'Nova Entrada' : 'Nova Saída'}
        </h1>
        <p className="text-on-surface-variant">Preencha os dados abaixo com calma.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-ambient border border-outline/5">
        <div className="space-y-2">
          <label className="text-headline-small block">Destino do Valor</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGoalId('')}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                !goalId 
                  ? "border-brand-primary bg-primary-fixed/20" 
                  : "border-transparent bg-surface-container-low"
              )}
            >
              <Wallet className="w-5 h-5" />
              <span className="font-bold">Conta Geral</span>
            </button>
            {goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => setGoalId(goal.id)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                  goalId === goal.id 
                    ? "border-brand-primary bg-primary-fixed/20" 
                    : "border-transparent bg-surface-container-low"
                )}
              >
                <ShieldCheck className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-bold text-sm">{goal.title}</p>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant">Saldo: R$ {goal.currentAmount.toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-headline-small block">O que é?</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Aposentadoria, Mercado..." 
            className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-headline-small block">Quanto?</label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-on-surface-variant">R$</span>
            <input 
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00" 
              className="w-full p-5 pl-14 bg-surface-container-low rounded-2xl border-none text-xl font-bold"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-headline-small block">Categoria</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                  categoryId === cat.id 
                    ? "border-brand-primary bg-primary-fixed/20" 
                    : "border-transparent bg-surface-container-low"
                )}
              >
                <span className="text-xs font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-headline-small block">Forma de Pagamento</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'dinheiro', label: 'Dinheiro' },
              { id: 'pix', label: 'PIX' },
              { id: 'credito', label: 'Crédito' },
              { id: 'debito', label: 'Débito' },
              { id: 'cheque', label: 'Cheque' },
              { id: 'cortesia', label: 'Cortesia' }
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id as any)}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                  paymentMethod === pm.id 
                    ? "border-brand-primary bg-primary-fixed/20" 
                    : "border-transparent bg-surface-container-low"
                )}
              >
                <span className="text-xs font-medium">{pm.label}</span>
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'credito' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-6 pt-4 border-t border-outline/10"
          >
            <div className="space-y-2">
              <label className="text-headline-small block">Qual Cartão?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {creditCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setCardId(card.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex items-center gap-3",
                      cardId === card.id 
                        ? "border-brand-primary bg-primary-fixed/20" 
                        : "border-transparent bg-surface-container-low"
                    )}
                  >
                    <div className="p-2 bg-white/50 rounded-lg">
                      <ShieldCheck className="w-5 h-5 text-brand-primary" />
                    </div>
                    <span className="font-bold">{card.name}</span>
                  </button>
                ))}
                {creditCards.length === 0 && (
                  <Link 
                    to="/cartoes" 
                    className="p-4 rounded-2xl border-2 border-dashed border-outline/20 text-on-surface-variant flex items-center justify-center gap-2 hover:bg-surface-container-low transition-all"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Cadastrar Cartão
                  </Link>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-headline-small block">Número de Parcelas</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="24" 
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-surface-container-low rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
                <span className="text-2xl font-bold text-brand-primary w-12 text-center">{installments}x</span>
              </div>
              {installments > 1 && amount && (
                <p className="text-sm text-on-surface-variant">
                  {installments} parcelas de <span className="font-bold text-brand-primary">R$ {roundABNT(parseFloat(amount) / installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}

        <div className="space-y-2">
          <label className="text-headline-small block">Quando?</label>
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-5 bg-surface-container-low rounded-2xl border-none text-xl"
            required
          />
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            type="button" 
            onClick={() => window.history.back()}
            className="flex-1 p-5 bg-surface-container-low rounded-2xl font-bold text-xl text-on-surface-variant"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="flex-1 p-5 bg-brand-primary text-white rounded-2xl font-bold text-xl shadow-lg"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};

const App = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [installments, setInstallments] = useState<RentalInstallment[]>([]);
  const [propertyExpenses, setPropertyExpenses] = useState<PropertyExpense[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardInstallments, setCreditCardInstallments] = useState<CreditCardInstallment[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [editingIndex, setEditingIndex] = useState<MarketIndex | null>(null);

  const [extratoMonth, setExtratoMonth] = useState<number>(new Date().getMonth());
  const [extratoYear, setExtratoYear] = useState<number>(new Date().getFullYear());
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setProperties([]);
      setGoals([]);
      setInstallments([]);
      setPropertyExpenses([]);
      setCreditCards([]);
      setCreditCardInstallments([]);
      setMarketIndices([]);
      setLoading(false);
      return;
    }

    const qTx = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const qProp = query(collection(db, 'properties'), where('userId', '==', user.uid));
    const unsubscribeProp = onSnapshot(qProp, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
      setProperties(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'properties'));

    const qGoal = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubscribeGoal = onSnapshot(qGoal, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialGoal));
      setGoals(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'goals'));

    const qInst = query(collection(db, 'rental_installments'), where('userId', '==', user.uid));
    const unsubscribeInst = onSnapshot(qInst, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalInstallment));
      setInstallments(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rental_installments'));

    const qPExp = query(collection(db, 'property_expenses'), where('userId', '==', user.uid));
    const unsubscribePExp = onSnapshot(qPExp, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyExpense));
      setPropertyExpenses(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'property_expenses'));

    const qCards = query(collection(db, 'credit_cards'), where('userId', '==', user.uid));
    const unsubscribeCards = onSnapshot(qCards, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditCard));
      setCreditCards(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'credit_cards'));

    const qCardInst = query(collection(db, 'credit_card_installments'), where('userId', '==', user.uid));
    const unsubscribeCardInst = onSnapshot(qCardInst, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditCardInstallment));
      setCreditCardInstallments(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'credit_card_installments'));

    const qIndices = query(collection(db, 'market_indices'), where('userId', '==', user.uid));
    const unsubscribeIndices = onSnapshot(qIndices, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketIndex));
      setMarketIndices(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'market_indices'));

    setLoading(false);

    return () => {
      unsubscribeTx();
      unsubscribeProp();
      unsubscribeGoal();
      unsubscribeInst();
      unsubscribePExp();
      unsubscribeCards();
      unsubscribeCardInst();
      unsubscribeIndices();
    };
  }, [user]);

  const addTransaction = async (tx: Transaction) => {
    if (!user) return;
    try {
      if (editingTx) {
        const { id, ...data } = tx;
        await updateDoc(doc(db, 'transactions', id), { ...data, userId: user.uid });
        setEditingTx(null);
      } else {
        const { id, ...data } = tx;
        const docRef = await addDoc(collection(db, 'transactions'), { ...data, userId: user.uid });
        
        // Handle Credit Card Installments
        if (tx.paymentMethod === 'credito' && tx.cardId) {
          const card = creditCards.find(c => c.id === tx.cardId);
          if (card) {
            const numInstallments = tx.installments || 1;
            const baseAmount = roundABNT(tx.amount / numInstallments);
            let remainingTotal = tx.amount;
            
            for (let i = 0; i < numInstallments; i++) {
              const currentInstallmentAmount = i === numInstallments - 1 ? remainingTotal : baseAmount;
              remainingTotal = roundABNT(remainingTotal - currentInstallmentAmount);
              
              const dueDate = calculateInvoiceDate(tx.date, card.closingDay, card.dueDay, i);
              await addDoc(collection(db, 'credit_card_installments'), {
                cardId: card.id,
                transactionId: docRef.id,
                amount: currentInstallmentAmount,
                installmentNumber: i + 1,
                totalInstallments: numInstallments,
                dueDate,
                userId: user.uid,
                title: tx.title,
                categoryId: tx.categoryId
              });
            }
          }
        }

        // Update goal balance if linked
        if (tx.goalId) {
          const goal = goals.find(g => g.id === tx.goalId);
          if (goal) {
            const newAmount = tx.type === 'income' 
              ? goal.currentAmount + tx.amount 
              : goal.currentAmount - tx.amount;
            await updateDoc(doc(db, 'goals', goal.id), { currentAmount: Math.max(0, newAmount) });
          }
        }
      }
      showToast(editingTx ? 'Transação atualizada com sucesso!' : 'Transação registrada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, editingTx ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
      showToast('Erro ao salvar transação.', 'error');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  };

  const saveProperty = async (p: Property) => {
    if (!user) return;
    try {
      if (editingProperty) {
        const { id, ...data } = p;
        await updateDoc(doc(db, 'properties', id), { ...data, userId: user.uid });
        setEditingProperty(null);
      } else {
        const { id, ...data } = p;
        await addDoc(collection(db, 'properties'), { ...data, userId: user.uid });
      }
      showToast(editingProperty ? 'Imóvel atualizado com sucesso!' : 'Imóvel cadastrado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, editingProperty ? OperationType.UPDATE : OperationType.CREATE, 'properties');
      showToast('Erro ao salvar imóvel.', 'error');
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'properties', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'properties');
    }
  };

  const saveGoal = async (g: FinancialGoal) => {
    if (!user) return;
    try {
      if (editingGoal) {
        const { id, ...data } = g;
        await updateDoc(doc(db, 'goals', id), { ...data, userId: user.uid });
        setEditingGoal(null);
      } else {
        const { id, ...data } = g;
        await addDoc(collection(db, 'goals'), { ...data, userId: user.uid });
      }
      showToast(editingGoal ? 'Meta atualizada com sucesso!' : 'Meta cadastrada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, editingGoal ? OperationType.UPDATE : OperationType.CREATE, 'goals');
      showToast('Erro ao salvar meta.', 'error');
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'goals');
    }
  };

  const saveInstallment = async (inst: RentalInstallment) => {
    if (!user) return;
    try {
      if (inst.id) {
        const { id, ...data } = inst;
        await updateDoc(doc(db, 'rental_installments', id), { ...data, userId: user.uid });
      } else {
        const { id, ...data } = inst;
        await addDoc(collection(db, 'rental_installments'), { ...data, userId: user.uid });
      }
    } catch (error) {
      handleFirestoreError(error, inst.id ? OperationType.UPDATE : OperationType.CREATE, 'rental_installments');
    }
  };

  const markInstallmentAsPaid = async (inst: RentalInstallment, customPaymentDate?: string) => {
    if (!user) return;
    try {
      // If we are just marking as pending (overdue)
      if (inst.status === 'pending' && !customPaymentDate) {
        await updateDoc(doc(db, 'rental_installments', inst.id), { status: 'pending' });
        return;
      }

      // Normal payment flow
      const paymentDate = customPaymentDate || new Date().toISOString().split('T')[0];
      await updateDoc(doc(db, 'rental_installments', inst.id), { 
        status: 'paid', 
        paymentDate 
      });

      // Create transaction
      const prop = properties.find(p => p.id === inst.propertyId);
      await addDoc(collection(db, 'transactions'), {
        title: `Aluguel - ${prop?.name || 'Imóvel'}`,
        amount: inst.amount,
        type: 'income',
        categoryId: 'aluguel',
        date: paymentDate,
        paymentMethod: 'pix',
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'rental_installments');
    }
  };

  const savePropertyExpense = async (exp: PropertyExpense) => {
    if (!user) return;
    try {
      const { id, ...data } = exp;
      await addDoc(collection(db, 'property_expenses'), { ...data, userId: user.uid });
      
      // Also add to main transactions
      const prop = properties.find(p => p.id === exp.propertyId);
      await addDoc(collection(db, 'transactions'), {
        title: `Despesa Imóvel - ${prop?.name || 'Imóvel'} (${exp.title})`,
        amount: exp.amount,
        type: 'expense',
        categoryId: 'housing',
        date: exp.date,
        paymentMethod: 'pix',
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'property_expenses');
    }
  };

  const generateInstallments = async (property: Property) => {
    if (!user || !property.leaseStart || !property.leaseEnd || !property.rentalValue) return;
    
    const start = new Date(property.leaseStart);
    const end = new Date(property.leaseEnd);
    let current = new Date(start);
    
    const batch = [];
    while (current <= end) {
      const dueDate = new Date(current.getFullYear(), current.getMonth(), property.rentDueDate || 1);
      if (dueDate >= start && dueDate <= end) {
        batch.push({
          propertyId: property.id,
          dueDate: dueDate.toISOString().split('T')[0],
          amount: property.rentalValue,
          status: dueDate < new Date() ? 'pending' : 'upcoming',
          userId: user.uid
        });
      }
      current.setMonth(current.getMonth() + 1);
    }

    try {
      for (const inst of batch) {
        await addDoc(collection(db, 'rental_installments'), inst);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rental_installments');
    }
  };

  const saveCreditCard = async (card: CreditCard) => {
    if (!user) return;
    try {
      if (editingCard) {
        const { id, ...data } = card;
        await updateDoc(doc(db, 'credit_cards', id), { ...data, userId: user.uid });
        setEditingCard(null);
      } else {
        const { id, ...data } = card;
        await addDoc(collection(db, 'credit_cards'), { ...data, userId: user.uid });
      }
      showToast(editingCard ? 'Cartão atualizado com sucesso!' : 'Cartão cadastrado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, editingCard ? OperationType.UPDATE : OperationType.CREATE, 'credit_cards');
      showToast('Erro ao salvar cartão.', 'error');
    }
  };

  const deleteCreditCard = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'credit_cards', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'credit_cards');
    }
  };

  const saveMarketIndex = async (index: MarketIndex) => {
    if (!user) return;
    try {
      if (editingIndex) {
        const { id, ...data } = index;
        await updateDoc(doc(db, 'market_indices', id), { ...data, userId: user.uid });
        setEditingIndex(null);
      } else {
        const { id, ...data } = index;
        await addDoc(collection(db, 'market_indices'), { ...data, userId: user.uid });
      }
      showToast(editingIndex ? 'Índice atualizado com sucesso!' : 'Índice cadastrado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, editingIndex ? OperationType.UPDATE : OperationType.CREATE, 'market_indices');
      showToast('Erro ao salvar índice.', 'error');
    }
  };

  const deleteMarketIndex = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'market_indices', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'market_indices');
    }
  };

  const calculateInvoiceDate = (purchaseDate: string, closingDay: number, dueDay: number, installmentIndex: number = 0) => {
    const date = new Date(purchaseDate + 'T12:00:00');
    let year = date.getFullYear();
    let month = date.getMonth();
    const day = date.getDate();

    // If purchase is after closing day, it goes to the next invoice cycle
    if (day > closingDay) {
      month++;
    }

    // If due day is smaller than closing day, it typically means it's in the next month
    if (dueDay < closingDay) {
      month++;
    }

    // Add installment offset
    month += installmentIndex;

    // Create the due date
    const dueDate = new Date(year, month, dueDay);
    return dueDate.toISOString().split('T')[0];
  };

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  // Grouped transactions for Extrato and Dashboard
  const displayTransactions = (() => {
    // 1. Non-credit transactions
    const nonCredit = transactions.filter(t => {
      if (t.goalId) return false;
      if (t.paymentMethod === 'credito') return false;
      const d = new Date(t.date + 'T12:00:00');
      return d.getMonth() === extratoMonth && d.getFullYear() === extratoYear;
    });
    
    // 2. Group installments by card and month
    const groupedInvoices: any[] = [];
    const cardMap = new Map(creditCards.map(c => [c.id, c]));
    
    const groups = new Map<string, number>(); // key: cardId_YYYY-MM
    
    const selectedMonthStr = `${extratoYear}-${String(extratoMonth + 1).padStart(2, '0')}`;

    creditCardInstallments.forEach(inst => {
      if (inst.dueDate.startsWith(selectedMonthStr)) {
        groups.set(inst.cardId, roundABNT((groups.get(inst.cardId) || 0) + inst.amount));
      }
    });
    
    groups.forEach((amount, cardId) => {
      const card = cardMap.get(cardId);
      if (card) {
        const dueDate = `${selectedMonthStr}-${String(card.dueDay).padStart(2, '0')}`;
        groupedInvoices.push({
          id: `invoice_${cardId}_${selectedMonthStr}`,
          title: `Fatura ${card.name}`,
          amount: amount,
          type: 'expense',
          categoryId: 'utilities',
          date: dueDate,
          paymentMethod: 'credito',
          isInvoice: true
        });
      }
    });
    
    return [...nonCredit, ...groupedInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })();

  const generalTransactions = displayTransactions;
  const income = generalTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = generalTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = income - expenses;
  const totalPropertyValue = properties.reduce((acc, p) => acc + p.value, 0);

  return (
    <div className="min-h-screen bg-surface selection:bg-primary-fixed/50 flex">
      {user && <Navbar />}
      
      {/* PWA Install Banner */}
      {installPrompt && (
        <div className="fixed bottom-24 left-6 right-6 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50 bg-brand-primary text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Instalar The Guardian</h4>
                <p className="text-sm text-white/80">Acesse suas finanças offline e direto da sua área de trabalho.</p>
              </div>
            </div>
            <button onClick={() => setInstallPrompt(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={handleInstallClick}
            className="w-full py-4 bg-white text-brand-primary rounded-xl font-bold text-sm hover:bg-opacity-90 transition-all shadow-lg"
          >
            Instalar Agora
          </button>
        </div>
      )}

      <main className={cn("flex-1 max-w-5xl mx-auto px-6 py-8 md:py-12", user && "md:ml-72")}>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/registrar" element={!user ? <Register /> : <Navigate to="/" />} />
          
          <Route path="/" element={user ? <Dashboard transactions={generalTransactions} onDelete={deleteTransaction} onEdit={(tx) => { setEditingTx(tx); navigate('/adicionar/expense'); }} userName={user.displayName || 'Usuário'} /> : <Navigate to="/login" />} />
          <Route path="/extrato" element={user ? (
            <div className="space-y-8 pb-24">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-display-small text-brand-primary">Extrato Completo</h1>
                  <p className="text-on-surface-variant">Histórico detalhado de suas finanças.</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline/10">
                    <select 
                      value={extratoMonth}
                      onChange={(e) => setExtratoMonth(parseInt(e.target.value))}
                      className="bg-transparent border-none text-sm font-bold px-4 py-2 focus:ring-0 cursor-pointer"
                    >
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={extratoYear}
                      onChange={(e) => setExtratoYear(parseInt(e.target.value))}
                      className="bg-transparent border-none text-sm font-bold px-4 py-2 focus:ring-0 cursor-pointer border-l border-outline/10"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Link to="/adicionar/income" className="p-4 bg-green-500 text-white rounded-2xl shadow-lg font-bold flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5" />
                      Receita
                    </Link>
                    <Link to="/adicionar/expense" className="p-4 bg-red-500 text-white rounded-2xl shadow-lg font-bold flex items-center gap-2">
                      <ArrowDownLeft className="w-5 h-5" />
                      Despesa
                    </Link>
                  </div>
                </div>
              </header>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {displayTransactions.map((tx) => (
                    <TransactionItem key={tx.id} tx={tx} onDelete={deleteTransaction} onEdit={(tx) => { setEditingTx(tx); navigate('/adicionar/expense'); }} />
                  ))}
                </AnimatePresence>
                {displayTransactions.length === 0 && (
                  <div className="text-center p-12 bg-surface-container-low rounded-[2.5rem]">
                    <Wallet className="w-12 h-12 text-outline/40 mx-auto mb-4" />
                    <p className="text-on-surface-variant">Nenhuma transação registrada.</p>
                  </div>
                )}
              </div>
            </div>
          ) : <Navigate to="/login" />} />
          <Route path="/patrimonio" element={user ? <AssetsView 
            properties={properties} 
            installments={installments} 
            propertyExpenses={propertyExpenses} 
            onDelete={deleteProperty} 
            onEdit={(p) => { setEditingProperty(p); navigate('/adicionar/imovel'); }} 
            onMarkPaid={markInstallmentAsPaid}
            onAddExpense={savePropertyExpense}
            onGenerateInstallments={generateInstallments}
            marketIndices={marketIndices}
          /> : <Navigate to="/login" />} />
          <Route path="/metas" element={user ? <GoalsView goals={goals} onDelete={deleteGoal} onEdit={(g) => { setEditingGoal(g); navigate('/adicionar/meta'); }} indices={marketIndices} /> : <Navigate to="/login" />} />
          <Route path="/indices" element={user ? <MarketIndicesView indices={marketIndices} onDelete={deleteMarketIndex} onEdit={(idx) => { setEditingIndex(idx); navigate('/adicionar/indice'); }} /> : <Navigate to="/login" />} />
          <Route path="/cartoes" element={user ? <CreditCardsView cards={creditCards} installments={creditCardInstallments} onDelete={deleteCreditCard} onEdit={(c) => { setEditingCard(c); navigate('/adicionar/cartao'); }} /> : <Navigate to="/login" />} />
          <Route path="/dashboards" element={user ? <AnalyticsView transactions={generalTransactions} properties={properties} installments={installments} propertyExpenses={propertyExpenses} creditCardInstallments={creditCardInstallments} /> : <Navigate to="/login" />} />
          <Route path="/analise" element={user ? <AnalyticsView transactions={generalTransactions} properties={properties} installments={installments} propertyExpenses={propertyExpenses} creditCardInstallments={creditCardInstallments} /> : <Navigate to="/login" />} />
          <Route path="/configuracoes" element={user ? <SettingsView /> : <Navigate to="/login" />} />
          <Route path="/projecoes" element={user ? <ProjectionsView totalBalance={totalBalance} totalPropertyValue={totalPropertyValue} indices={marketIndices} /> : <Navigate to="/login" />} />
          <Route path="/guardian" element={user ? <GuardianAI /> : <Navigate to="/login" />} />
          <Route path="/sobre" element={user ? <IntroductionView /> : <Navigate to="/login" />} />
          <Route path="/adicionar/income" element={user ? <AddTransaction onAdd={addTransaction} initialData={editingTx || undefined} goals={goals} creditCards={creditCards} /> : <Navigate to="/login" />} />
          <Route path="/adicionar/expense" element={user ? <AddTransaction onAdd={addTransaction} initialData={editingTx || undefined} goals={goals} creditCards={creditCards} /> : <Navigate to="/login" />} />
          <Route path="/adicionar/imovel" element={user ? <AddProperty onSave={saveProperty} initialData={editingProperty || undefined} indices={marketIndices} /> : <Navigate to="/login" />} />
          <Route path="/adicionar/meta" element={user ? <AddGoal onSave={saveGoal} initialData={editingGoal || undefined} indices={marketIndices} /> : <Navigate to="/login" />} />
          <Route path="/adicionar/indice" element={user ? <AddMarketIndex onSave={saveMarketIndex} initialData={editingIndex || undefined} /> : <Navigate to="/login" />} />
          <Route path="/adicionar/cartao" element={user ? <AddCreditCard onSave={saveCreditCard} initialData={editingCard || undefined} /> : <Navigate to="/login" />} />
        </Routes>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3",
              toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.type === 'success' ? <ShieldCheck className="w-6 h-6" /> : <X className="w-6 h-6" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
