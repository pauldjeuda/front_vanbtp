import React, { useState } from 'react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import {
  TrendingUp, TrendingDown, Receipt, Banknote,
  ArrowUpRight, Search, Building2, AlertTriangle,
  Wallet, RefreshCw, BarChart3, BookOpen, FileText
} from 'lucide-react';

import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useHistory } from '../../context/HistoryContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { debtService } from '../../services/debt.service';
import { financialAnalysisService } from '../../services/financialAnalysis.service';
import { Navigate } from 'react-router-dom';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    'Payé': 'bg-emerald-100 text-emerald-700',
    'En attente': 'bg-amber-100 text-amber-700',
    'Validé': 'bg-blue-100 text-blue-700',
    'Rejeté': 'bg-red-100 text-red-700',
    'Non remboursé': 'bg-red-100 text-red-700',
    'Partiellement remboursé': 'bg-blue-100 text-blue-700',
    'Remboursé': 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};

const MarginBar = ({ value }: { value: number }) => {
  const color = value >= 15 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${value >= 15 ? 'text-emerald-600' : value >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
        {value}%
      </span>
    </div>
  );
};

const AlertBadge = ({ alert }: { alert: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    ok: { label: 'Sain', cls: 'bg-emerald-100 text-emerald-700' },
    warning: { label: 'Vigilance', cls: 'bg-amber-100 text-amber-700' },
    danger: { label: 'Critique', cls: 'bg-red-100 text-red-700' },
    neutral: { label: 'Sans facture', cls: 'bg-slate-100 text-slate-500' },
  };
  const { label, cls } = cfg[alert] || { label: alert, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

export const FinancesPage = () => {
  const { can } = usePermissions();
  const { role, profile } = useUser();
  const name = profile?.name;
  const { addLog } = useHistory();
  const { projects, transactions, addTransaction } = useData();
  const { notify } = useNotification();
  const today = new Date().toISOString().split('T')[0];

  // ── Onglets ──
  const [mainTab, setMainTab] = useState<'flux' | 'rentabilite' | 'comptabilite'>('flux');
  const [txTab, setTxTab] = useState<'all' | 'expenses' | 'invoices'>('all');

  // ── Filtres ──
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(15);

  // ── Modales ──
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseStep, setExpenseStep] = useState(1);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isFinanceErrorModalOpen, setIsFinanceErrorModalOpen] = useState(false);
  const [financeErrorMessage, setFinanceErrorMessage] = useState('');

  // États de chargement pour éviter les soumissions multiples
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ── Dettes ──
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [isSubmittingRepayment, setIsSubmittingRepayment] = useState(false);
  const [newRepayment, setNewRepayment] = useState({
    amount: '', repaymentDate: today, paymentMethod: 'Virement', reference: '', note: '',
  });

  // ── KPIs Rentabilité ──
  const [analysis, setAnalysis] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any>(null);
  const [loadingKpi, setLoadingKpi] = useState(false);

  // ── Comptabilité ──
  const [accounting, setAccounting] = useState<any[]>([]);
  const [loadingAccounting, setLoadingAccounting] = useState(false);
  const [accFilters, setAccFilters] = useState({ projectId: '', from: '', to: '' });

  // ── Forms ──
  const CATEGORY_PROVIDERS: Record<string, string> = {
    'Ciment': 'CIMENCAM', 'Acier / Fer à béton': 'QUIFEUROU',
    'Carburant': 'TRADEX', 'Sable': 'Carrière Sanaga', 'Gravier': 'Razel Carrière',
    "Main-d'œuvre": 'Personnel Local', 'Sous-traitance': 'PME Partenaire',
  };
  const [newExpense, setNewExpense] = useState({
    projectId: projects[0]?.id || 0, category: 'Ciment', provider: 'CIMENCAM',
    amount: '', date: today, isClientDebt: false,
  });
  const [newInvoice, setNewInvoice] = useState({
    projectId: projects[0]?.id || 0, period: '', amount: '', progress: '',
    client: '', categorieFacture: 'Situation Travaux' as string, dueDate: '', description: '',
  });
  const [newPayment, setNewPayment] = useState({
    projectId: projects[0]?.id || 0, client: '', amount: '',
    date: today, method: 'Virement Bancaire',
  });

  const getProjectNameById = (id?: number) => projects.find((p: any) => p.id === id)?.name || 'Chantier inconnu';

  // ── Calculs ──
  const filteredTx = transactions.filter((t: any) => selectedProjectFilter === null || t.projectId === selectedProjectFilter);
  const encaisse = Math.abs(filteredTx.filter((t: any) => t.type === 'invoice' && t.status === 'Payé').reduce((s: number, t: any) => s + (t.amount || 0), 0));
  const depenses = Math.abs(filteredTx.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + (t.amount || 0), 0));
  const tresorerie = encaisse - depenses;
  const impayeesTotal = Math.abs(filteredTx.filter((t: any) => t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté').reduce((s: number, t: any) => s + (t.amount || 0), 0));
  const overdueCount = transactions.filter((t: any) => t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté' && t.dueDate && t.dueDate < today).length;

  const displayedTx = transactions.filter((t: any) => {
    const matchTab = txTab === 'all' || (txTab === 'expenses' && t.type === 'expense') || (txTab === 'invoices' && t.type === 'invoice');
    const matchProj = selectedProjectFilter === null || t.projectId === selectedProjectFilter;
    const q = searchQuery.toLowerCase();
    const matchQ = !q || getProjectNameById(t.projectId).toLowerCase().includes(q)
      || (t.provider || t.client || '').toLowerCase().includes(q)
      || (t.category || '').toLowerCase().includes(q);
    return matchTab && matchProj && matchQ;
  }).sort((a: any, b: any) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id - a.id;
  });

  // ── Loaders ──
  const loadDebts = async () => {
    setIsLoadingDebts(true);
    try { setDebts(await debtService.getAll()); } catch { setDebts([]); }
    finally { setIsLoadingDebts(false); }
  };
  React.useEffect(() => { loadDebts(); }, []);

  const loadKpis = async () => {
    setLoadingKpi(true);
    try { setKpiData(await financialAnalysisService.getAllKPIs()); } catch { /* */ }
    finally { setLoadingKpi(false); }
  };
  React.useEffect(() => { if (mainTab === 'rentabilite' && !kpiData) loadKpis(); }, [mainTab]);


  const loadAccounting = async () => {
    setLoadingAccounting(true);
    try {
      const f: any = {};
      if (accFilters.projectId) f.projectId = Number(accFilters.projectId);
      if (accFilters.from) f.from = accFilters.from;
      if (accFilters.to) f.to = accFilters.to;
      setAccounting(await financialAnalysisService.getAccounting(f));
    } catch { /* */ }
    finally { setLoadingAccounting(false); }
  };
  React.useEffect(() => { if (mainTab === 'comptabilite') loadAccounting(); }, [mainTab]);

  // ── Handlers ──
  const handleSendReminder = async (transactionId: number) => {
    try {
      const res = await financialAnalysisService.sendReminder(transactionId);
      notify(`Relance N°${res.reminderCount} enregistrée`, 'success');
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
  };

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !newRepayment.amount) return;
    const montant = Number(newRepayment.amount);
    const reste = Number(selectedDebt.amount) - Number(selectedDebt.debtAmountPaid || 0);
    if (montant > reste + 0.01) { notify(`Montant dépasse le reste dû (${fmt(reste)} FCFA)`, 'error'); return; }
    if (montant <= 0) { notify('Montant invalide', 'error'); return; }
    setIsSubmittingRepayment(true);
    try {
      await debtService.addRepayment(selectedDebt.id, { ...newRepayment, amount: montant });
      notify(`Remboursement de ${fmt(montant)} FCFA enregistré`, 'success');
      setIsRepaymentModalOpen(false);
      setNewRepayment({ amount: '', repaymentDate: today, paymentMethod: 'Virement', reference: '', note: '' });
      loadDebts();
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmittingRepayment(false); }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Empêcher les soumissions multiples
    if (isSubmittingExpense) return;
    setIsSubmittingExpense(true);

    if (expenseStep < 2) {
      setIsSubmittingExpense(false);
      setExpenseStep(2);
      return;
    }

    const amount = parseInt(newExpense.amount) || 0;
    const projectTotalEncaisse = transactions
      .filter((t: any) => t.projectId === newExpense.projectId && t.type === 'invoice' && t.status === 'Payé')
      .reduce((s: number, t: any) => s + t.amount, 0);
    if (projectTotalEncaisse === 0) {
      setFinanceErrorMessage(`Aucun encaissement pour ce chantier. Enregistrez d'abord un versement client.`);
      setIsFinanceErrorModalOpen(true);
      setIsExpenseModalOpen(false);
      setExpenseStep(1);
      setIsSubmittingExpense(false);
      return;
    }
    if (amount > projectTotalEncaisse) {
      setFinanceErrorMessage(`Fonds insuffisants : ${fmt(projectTotalEncaisse)} FCFA disponible, ${fmt(amount)} FCFA demandé.`);
      setIsFinanceErrorModalOpen(true);
      setIsSubmittingExpense(false);
      return;
    }

    try {
      await addTransaction({
        date: newExpense.date, projectId: newExpense.projectId,
        category: newExpense.category.split(' ')[0], provider: newExpense.provider,
        amount, status: 'Validé', type: 'expense', paymentMethod: 'Virement',
      });
      addLog({ module: 'Finances', action: `Dépense ${newExpense.category} - ${fmt(amount)} FCFA`, user: name || 'Utilisateur', type: 'warning' });
      notify(`Dépense de ${fmt(amount)} FCFA enregistrée`, 'success');
      setIsExpenseModalOpen(false);
      setExpenseStep(1);
      setNewExpense({ projectId: projects[0]?.id || 0, category: 'Ciment', provider: 'CIMENCAM', amount: '', date: today, isClientDebt: false });
    } catch (err: any) {
      notify(err?.message || 'Erreur', 'error');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Empêcher les soumissions multiples
    if (isSubmittingInvoice) return;
    setIsSubmittingInvoice(true);

    const amount = parseInt(newInvoice.amount) || 0;
    try {
      await addTransaction({
        date: today,
        transactionDate: today,
        projectId: newInvoice.projectId,
        category: newInvoice.categorieFacture, categorieFacture: newInvoice.categorieFacture,
        client: newInvoice.client || projects.find((p: any) => p.id === newInvoice.projectId)?.client || 'Client',
        amount, status: 'En attente', type: 'invoice', paymentMethod: 'Virement',
        dueDate: newInvoice.dueDate || undefined, description: newInvoice.description || undefined,
      });
      addLog({ module: 'Finances', action: `Facture ${newInvoice.categorieFacture} - ${fmt(amount)} FCFA`, user: name || 'Utilisateur', type: 'info' });
      notify(`Facture de ${fmt(amount)} FCFA émise`, 'success');
      setIsInvoiceModalOpen(false);
      setNewInvoice({ projectId: projects[0]?.id || 0, period: '', amount: '', progress: '', client: '', categorieFacture: 'Situation Travaux', dueDate: '', description: '' });
    } catch (err: any) {
      notify(err?.message || 'Erreur', 'error');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Empêcher les soumissions multiples
    if (isSubmittingPayment) return;
    setIsSubmittingPayment(true);

    const amount = parseInt(newPayment.amount) || 0;
    try {
      await addTransaction({
        date: newPayment.date,
        transactionDate: newPayment.date,
        projectId: newPayment.projectId,
        category: 'Encaissement', client: newPayment.client || 'Client',
        amount, status: 'Payé', type: 'invoice', paymentMethod: newPayment.method,
      });
      addLog({ module: 'Finances', action: `Encaissement - ${fmt(amount)} FCFA`, user: name || 'Utilisateur', type: 'success' });
      notify(`Encaissement de ${fmt(amount)} FCFA validé`, 'success');
      setIsPaymentModalOpen(false);
      setNewPayment({ projectId: projects[0]?.id || 0, client: '', amount: '', date: today, method: 'Virement Bancaire' });
    } catch (err: any) {
      notify(err?.message || 'Erreur', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (!can('consult_budget')) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 pb-12">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Finances
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Gestion Financière</h1>
          <p className="text-sm text-slate-400 mt-0.5">Flux, rentabilité et comptabilité de vos chantiers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedProjectFilter ?? ''}
            onChange={e => setSelectedProjectFilter(e.target.value ? Number(e.target.value) : null)}
            className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            <option value="">Tous les chantiers</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(role === 'chef' || role === 'dg') && (<>
            <Button size="sm" variant="outline" onClick={() => setIsExpenseModalOpen(true)} className="gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Dépense
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsPaymentModalOpen(true)} className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <ArrowUpRight className="w-3.5 h-3.5" /> Encaissement
            </Button>
            <Button size="sm" onClick={() => setIsInvoiceModalOpen(true)} className="gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Nouvelle Facture
            </Button>
          </>)}
        </div>
      </div>

      {/* KPI CARDS — vraies données, sans faux pourcentages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Total Encaissé', value: encaisse, Icon: TrendingUp, colorCls: 'text-emerald-600', bgCls: 'bg-emerald-50', trend: 'Paiements clients reçus' },
          { label: 'Dépenses Engagées', value: depenses, Icon: TrendingDown, colorCls: 'text-red-600', bgCls: 'bg-red-50', trend: 'Charges validées' },
          {
            label: 'Trésorerie Nette', value: tresorerie, Icon: Banknote,
            colorCls: tresorerie >= 0 ? 'text-blue-600' : 'text-red-600',
            bgCls: tresorerie >= 0 ? 'bg-blue-50' : 'bg-red-50',
            trend: tresorerie >= 0 ? 'Situation excédentaire' : 'Situation déficitaire'
          },
        ].map(({ label, value, Icon, colorCls, bgCls, trend }) => (
          <Card key={label} className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div className={cn("p-3 rounded-2xl transition-colors duration-300 group-hover:bg-[var(--color-primary)] group-hover:text-white", bgCls)}>
                  <Icon className={cn("w-6 h-6", colorCls)} />
                </div>
              </div>
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</h4>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{fmt(value)}</p>
                <span className="text-[10px] font-bold text-slate-400 uppercase">FCFA</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2">{trend}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ALERTE IMPAYÉS — vraies données */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">{overdueCount} facture{overdueCount > 1 ? 's' : ''} en retard</p>
            <p className="text-xs text-red-500">Cliquez sur le bouton "Relancer" pour enregistrer une relance</p>
          </div>
          <p className="text-sm font-bold text-red-700 shrink-0 whitespace-nowrap">{fmt(impayeesTotal)} FCFA</p>
        </div>
      )}

      {/* ONGLETS PRINCIPAUX */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { key: 'flux', label: 'Flux de trésorerie' },
          { key: 'rentabilite', label: 'Rentabilité' },
          { key: 'comptabilite', label: 'Comptabilité' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setMainTab(tab.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
              mainTab === tab.key ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ ONGLET FLUX ═══════════════════ */}
      {mainTab === 'flux' && (
        <div className="space-y-5">
          <Card>
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {([
                  { k: 'all', label: 'Tout' },
                  { k: 'expenses', label: 'Dépenses' },
                  { k: 'invoices', label: 'Factures' },
                ] as const).map(t => (
                  <button key={t.k} onClick={() => setTxTab(t.k)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      txTab === t.k ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500')}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Rechercher…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full sm:w-56" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Date', 'Chantier', 'Désignation', 'Montant', 'Statut', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedTx.slice(0, visibleCount).length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Aucune transaction</td></tr>
                  ) : displayedTx.slice(0, visibleCount).map((t: any) => {
                    const isOverdue = t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté' && t.dueDate && t.dueDate < today;
                    return (
                      <tr key={t.id} onClick={() => setSelectedTransaction(t)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{t.date}</p>
                          {isOverdue && <p className="text-[10px] text-red-500 font-bold">● Échu</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 truncate max-w-[130px]">{getProjectNameById(t.projectId)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{t.category}</p>
                          <p className="text-xs text-slate-400">{t.provider || t.client || ''}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-bold ${t.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {t.type === 'expense' ? '−' : '+'}{fmt(Math.abs(t.amount || 0))} FCFA
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {t.type === 'invoice' && (
                              <button title="Télécharger PDF"
                                onClick={() => generateInvoicePDF({
                                  invoiceNumber: t.reference || `FAC-${t.id}`,
                                  date: t.date,
                                  dueDate: t.dueDate,
                                  clientName: t.client || 'Client Divers',
                                  projectName: getProjectNameById(t.projectId),
                                  category: t.category,
                                  description: t.description,
                                  amount: t.amount,
                                  status: t.status
                                })}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-[var(--color-primary)] rounded-lg transition-colors border border-transparent hover:border-slate-200">
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            {t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté' && (
                              <button title={`Relancer${t.reminderCount ? ` (${t.reminderCount}×)` : ''}`}
                                onClick={() => handleSendReminder(t.id)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border ${t.reminderCount > 0 ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 border-transparent hover:border-amber-200'}`}>
                                Relancer{t.reminderCount > 0 ? ` (${t.reminderCount})` : ''}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visibleCount < displayedTx.length && (
              <div className="p-4 border-t border-slate-100 text-center">
                <button onClick={() => setVisibleCount(c => c + 15)}
                  className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                  Charger plus ({displayedTx.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </Card>

          {/* Dettes client */}
          {(debts.length > 0 || isLoadingDebts) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Avances pour client
                  {debts.length > 0 && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{debts.length}</span>}
                </h2>
                <button onClick={loadDebts} disabled={isLoadingDebts}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1 disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${isLoadingDebts ? 'animate-spin' : ''}`} /> Actualiser
                </button>
              </div>
              <div className="grid gap-3">
                {debts.map((debt: any) => {
                  const remaining = Number(debt.amount) - Number(debt.debtAmountPaid || 0);
                  const pct = Math.min(100, Math.round((Number(debt.debtAmountPaid || 0) / Number(debt.amount)) * 100));
                  return (
                    <Card key={debt.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{debt.category} — {debt.project?.name || 'Chantier'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{debt.transactionDate}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-bold text-slate-900">{fmt(Number(debt.amount))} FCFA</p>
                          <StatusBadge status={debt.debtStatus || 'Non remboursé'} />
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full mb-2">
                        <div className="h-1.5 bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">Reste dû : <span className="font-bold text-red-600">{fmt(remaining)} FCFA</span></p>
                        {debt.debtStatus !== 'Remboursé' && (
                          <button onClick={() => { setSelectedDebt(debt); setIsRepaymentModalOpen(true); }}
                            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                            + Remboursement
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ ONGLET RENTABILITÉ ═══════════════════ */}
      {mainTab === 'rentabilite' && (
        <div className="space-y-4">
          <div>
            <Card>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Rentabilité par chantier</h2>
                <button onClick={loadKpis} disabled={loadingKpi}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingKpi ? 'animate-spin' : ''}`} /> Actualiser
                </button>
              </div>
              {loadingKpi ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin h-7 w-7 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Chantier', 'Budget prévu', 'Dépenses', 'Écart', 'CA facturé', 'À facturer', 'Reste', 'Taux marge', 'Statut'].map(h => (<th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!kpiData ? (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                          Cliquez "Actualiser" pour charger
                        </td></tr>
                      ) : [...(kpiData?.kpis || [])].sort((a: any, b: any) => b.id - a.id).map((k: any) => (
                        <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm text-slate-900 truncate max-w-[160px]">{k.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{k.code}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(k.budget)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(k.depenses)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm font-bold ${k.ecartBudget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {k.ecartBudget >= 0 ? '+' : ''}{fmt(k.ecartBudget)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(k.ca || 0)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-bold text-amber-600">{fmt(Math.max(0, (k.budget || 0) - (k.ca || 0)))}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-sm font-bold ${(k.marge || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {(k.marge || 0) >= 0 ? '+' : ''}{fmt(k.marge || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3"><MarginBar value={k.tauxMarge} /></td>
                          <td className="px-4 py-3"><AlertBadge alert={k.alert} /></td>
                        </tr>
                      ))}
                    </tbody>
                    {kpiData?.totals && (
                      <tfoot>
                        <tr className="bg-slate-900 text-white">
                          <td className="px-4 py-3 text-sm font-bold">TOTAL</td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">{fmt(kpiData.totals.budget || 0)}</td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">{fmt(kpiData.totals.depenses || 0)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-emerald-400 whitespace-nowrap">
                            {fmt((kpiData.totals.budget || 0) - (kpiData.totals.depenses || 0))}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">{fmt(kpiData.totals.ca || 0)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-amber-300 whitespace-nowrap">
                            {fmt(Math.max(0, (kpiData.totals.budget || 0) - (kpiData.totals.ca || 0)))}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">
                            <span className={(kpiData.totals.marge || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {fmt(kpiData.totals.marge || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3"><MarginBar value={kpiData.totals.tauxMargeGlobal || 0} /></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════ ONGLET COMPTABILITÉ ═══════════════════ */}
      {mainTab === 'comptabilite' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Chantier</label>
              <select value={accFilters.projectId} onChange={e => setAccFilters(p => ({ ...p, projectId: e.target.value }))}
                className="h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                <option value="">Tous</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Du</label>
              <input type="date" value={accFilters.from} onChange={e => setAccFilters(p => ({ ...p, from: e.target.value }))}
                className="h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Au</label>
              <input type="date" value={accFilters.to} onChange={e => setAccFilters(p => ({ ...p, to: e.target.value }))}
                className="h-10 px-3 border border-slate-200 rounded-xl text-sm outline-none" />
            </div>
            <Button onClick={loadAccounting} size="sm" disabled={loadingAccounting} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAccounting ? 'animate-spin' : ''}`} /> Filtrer
            </Button>
          </div>

          <Card>
            <div className="p-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Journal comptable</h2>
                <p className="text-xs text-slate-400 mt-0.5">{accounting.length} écriture(s) · 411 Clients · 706 CA · 601 Achats · 401 Fournisseurs</p>
              </div>
            </div>
            {loadingAccounting ? (
              <div className="flex justify-center py-12"><div className="animate-spin h-7 w-7 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>
            ) : accounting.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Aucune écriture — les écritures sont générées automatiquement</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Date', 'Chantier', 'Libellé', 'Compte', 'Débit', 'Crédit', 'Réf.'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...accounting].sort((a: any, b: any) => {
                      const dateDiff = new Date(b.journalDate).getTime() - new Date(a.journalDate).getTime();
                      if (dateDiff !== 0) return dateDiff;
                      return b.id - a.id;
                    }).map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600 font-mono whitespace-nowrap">{entry.journalDate}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[120px] truncate">{entry.project?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[180px] truncate" title={entry.label}>{entry.label}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full font-mono', {
                            'bg-blue-100 text-blue-700': entry.account === '411',
                            'bg-emerald-100 text-emerald-700': entry.account === '706',
                            'bg-amber-100 text-amber-700': entry.account === '601',
                            'bg-slate-100 text-slate-600': entry.account === '401',
                          })}>
                            {entry.account} {entry.accountLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right whitespace-nowrap">{Number(entry.debit) > 0 ? fmt(Number(entry.debit)) : '—'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right whitespace-nowrap">{Number(entry.credit) > 0 ? fmt(Number(entry.credit)) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{entry.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold">TOTAUX</td>
                      <td className="px-4 py-3 text-sm font-bold text-right whitespace-nowrap">{fmt(accounting.reduce((s: number, e: any) => s + Number(e.debit || 0), 0))}</td>
                      <td className="px-4 py-3 text-sm font-bold text-right whitespace-nowrap">{fmt(accounting.reduce((s: number, e: any) => s + Number(e.credit || 0), 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ═══════════════════ MODALES ═══════════════════ */}

      {/* Erreur finance */}
      <Modal isOpen={isFinanceErrorModalOpen} onClose={() => setIsFinanceErrorModalOpen(false)} title="Règle financière" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{financeErrorMessage}</p>
          </div>
          <p className="text-xs text-slate-500">Enregistrez d'abord un encaissement pour ce chantier avant d'imputer des dépenses.</p>
          <div className="flex justify-end">
            <Button onClick={() => setIsFinanceErrorModalOpen(false)}>Compris</Button>
          </div>
        </div>
      </Modal>

      {/* Dépense */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setExpenseStep(1); }} title="Enregistrer une dépense" size="md">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          {expenseStep === 1 ? (<>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Chantier *</label>
              <select value={newExpense.projectId} onChange={e => setNewExpense(p => ({ ...p, projectId: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Catégorie *</label>
                <select value={newExpense.category}
                  onChange={e => setNewExpense(p => ({ ...p, category: e.target.value, provider: CATEGORY_PROVIDERS[e.target.value] || p.provider }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  {['Ciment', 'Acier / Fer à béton', 'Carburant', 'Sable', 'Gravier', "Main-d'œuvre", 'Sous-traitance', 'Location Matériel', 'Frais généraux', 'Autre'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Input label="Fournisseur" value={newExpense.provider}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense(p => ({ ...p, provider: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Montant HT (FCFA) *" type="number" min="0" required value={newExpense.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense(p => ({ ...p, amount: e.target.value }))} />
              <Input label="Date *" type="date" min={today} required value={newExpense.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense(p => ({ ...p, date: e.target.value }))} />
            </div>
            {newExpense.amount && Number(newExpense.amount) > 0 && (
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
                <div className="flex justify-between"><span>HT</span><span className="font-bold">{fmt(Number(newExpense.amount))} FCFA</span></div>
                <div className="flex justify-between"><span>TVA 19,25%</span><span className="font-bold">{fmt(Number(newExpense.amount) * 0.1925)} FCFA</span></div>
                <div className="flex justify-between border-t border-blue-200 pt-1"><span className="font-bold">TTC</span><span className="font-bold">{fmt(Number(newExpense.amount) * 1.1925)} FCFA</span></div>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50 rounded-xl border border-amber-200">
              <input type="checkbox" checked={newExpense.isClientDebt}
                onChange={e => setNewExpense(p => ({ ...p, isClientDebt: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-amber-800 font-medium">Avance pour le client <span className="text-xs text-amber-600">(sera suivie comme dette client)</span></span>
            </label>
          </>) : (
            <div className="text-center py-6 space-y-2">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7 text-blue-500" />
              </div>
              <p className="font-bold text-slate-900">{newExpense.category} — {newExpense.provider}</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(Number(newExpense.amount))} FCFA</p>
              <p className="text-xs text-slate-400">Chantier : {getProjectNameById(newExpense.projectId)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => expenseStep > 1 ? setExpenseStep(1) : setIsExpenseModalOpen(false)}>
              {expenseStep === 1 ? 'Annuler' : 'Retour'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingExpense}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingExpense && expenseStep === 2 ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Enregistrement...
                </span>
              ) : (
                <span>{expenseStep === 1 ? 'Continuer ->' : 'Enregistrer'}</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Facture */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title="Nouvelle Facture" size="md">
        <form onSubmit={handleInvoiceSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Chantier *</label>
            <select value={newInvoice.projectId} onChange={e => setNewInvoice(p => ({ ...p, projectId: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Type de facture *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { value: 'Situation Travaux', label: 'Situation Travaux', desc: 'Avancement en cours' },
                { value: 'Honoraires Études', label: 'Honoraires Études', desc: 'Études et conception' },
                { value: 'Honoraires Réalisation', label: 'Honoraires Réalisation', desc: 'Pilotage travaux' },
                { value: 'Décompte Final', label: 'Décompte Final', desc: 'Clôture du marché' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setNewInvoice(p => ({ ...p, categorieFacture: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${newInvoice.categorieFacture === opt.value ? 'border-[var(--color-primary)] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Client *" required value={newInvoice.client} placeholder="MINTP, MINHDU…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, client: e.target.value }))} />
            <Input label="Montant HT (FCFA) *" type="number" min="0" required value={newInvoice.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date d'échéance" type="date" min={today} value={newInvoice.dueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, dueDate: e.target.value }))} />
            <Input label="Référence" value={newInvoice.description} placeholder="N° marché…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, description: e.target.value }))} />
          </div>
          {newInvoice.amount && Number(newInvoice.amount) > 0 && (
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
              <div className="flex justify-between"><span>HT</span><span className="font-bold">{fmt(Number(newInvoice.amount))} FCFA</span></div>
              <div className="flex justify-between"><span>TVA 19,25%</span><span className="font-bold">{fmt(Number(newInvoice.amount) * 0.1925)} FCFA</span></div>
              <div className="flex justify-between border-t border-blue-200 pt-1"><span className="font-bold">TTC</span><span className="font-bold">{fmt(Number(newInvoice.amount) * 1.1925)} FCFA</span></div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsInvoiceModalOpen(false)}>Annuler</Button>
            <Button
              type="submit"
              disabled={isSubmittingInvoice}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingInvoice ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Émission...
                </span>
              ) : (
                'Émettre la Facture'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Encaissement */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Enregistrer un Encaissement" size="sm">
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Chantier *</label>
            <select value={newPayment.projectId} onChange={e => setNewPayment(p => ({ ...p, projectId: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Client" value={newPayment.client}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment(p => ({ ...p, client: e.target.value }))} />
            <Input label="Montant (FCFA) *" type="number" min="0" required value={newPayment.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date *" type="date" min={today} required value={newPayment.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment(p => ({ ...p, date: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mode</label>
              <select value={newPayment.method} onChange={e => setNewPayment(p => ({ ...p, method: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                {['Virement Bancaire', 'Chèque', 'Espèces', 'Mobile Money'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsPaymentModalOpen(false)}>Annuler</Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmittingPayment}
            >
              {isSubmittingPayment ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Enregistrement...
                </span>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Détail transaction */}
      <Modal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} title="Détail transaction" size="sm">
        {selectedTransaction && (
          <div className="space-y-2">
            {([
              ['Type', selectedTransaction.type === 'expense' ? 'Dépense' : 'Facture'],
              ['Chantier', getProjectNameById(selectedTransaction.projectId)],
              ['Catégorie', selectedTransaction.category || '—'],
              ['Tiers', selectedTransaction.provider || selectedTransaction.client || '—'],
              ['Montant', `${fmt(Math.abs(selectedTransaction.amount || 0))} FCFA`],
              ['Statut', selectedTransaction.status],
              ['Date', selectedTransaction.date],
              ...(selectedTransaction.dueDate ? [['Échéance', selectedTransaction.dueDate]] : []),
              ...(selectedTransaction.reminderCount > 0 ? [['Relances', `${selectedTransaction.reminderCount}×`]] : []),
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-sm font-semibold text-slate-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-100">
              {selectedTransaction.type === 'invoice' && (
                <Button variant="outline" className="gap-2 h-9 text-xs" onClick={() => generateInvoicePDF({
                  invoiceNumber: selectedTransaction.reference || `FAC-${selectedTransaction.id}`,
                  date: selectedTransaction.date,
                  dueDate: selectedTransaction.dueDate,
                  clientName: selectedTransaction.client || 'Client Divers',
                  projectName: getProjectNameById(selectedTransaction.projectId),
                  category: selectedTransaction.category,
                  description: selectedTransaction.description,
                  amount: selectedTransaction.amount,
                  status: selectedTransaction.status
                })}>
                  <FileText className="w-3.5 h-3.5" /> Exporter PDF
                </Button>
              )}
              <Button variant="ghost" className="h-9 text-xs" onClick={() => setSelectedTransaction(null)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remboursement dette */}
      {isRepaymentModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsRepaymentModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Enregistrer un remboursement</h3>
            <div className="p-3 bg-amber-50 rounded-xl mb-4">
              <p className="text-sm text-amber-800"><strong>{selectedDebt.category}</strong> — {fmt(Number(selectedDebt.amount))} FCFA</p>
              <p className="text-sm text-amber-800 mt-0.5">Reste dû : <strong className="text-red-600">{fmt(Number(selectedDebt.amount) - Number(selectedDebt.debtAmountPaid || 0))} FCFA</strong></p>
            </div>
            <form onSubmit={handleRepaymentSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Montant (FCFA) *" type="number" min="0" required value={newRepayment.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRepayment(p => ({ ...p, amount: e.target.value }))} />
                <Input label="Date *" type="date" min={today} required value={newRepayment.repaymentDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRepayment(p => ({ ...p, repaymentDate: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Mode</label>
                  <select value={newRepayment.paymentMethod} onChange={e => setNewRepayment(p => ({ ...p, paymentMethod: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white">
                    {['Virement', 'Chèque', 'Espèces', 'Mobile Money'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <Input label="Référence" value={newRepayment.reference} placeholder="N° virement…"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRepayment(p => ({ ...p, reference: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsRepaymentModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={isSubmittingRepayment}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                  {isSubmittingRepayment && <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
