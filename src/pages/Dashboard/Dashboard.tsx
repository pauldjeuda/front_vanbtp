import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Banknote,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  ChevronRight,
  Building2,
  HardHat,
  Activity,
  LogIn,
  LogOut
} from 'lucide-react';
import { Card, cn, Button, Modal } from '../../components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';

const data: any[] = [];
const pieData: any[] = [];

const COLORS = ['#1a365d', '#e11d48', '#0ea5e9', '#10b981'];

import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { projectService } from '../../services/project.service';
import { dashboardService } from '../../services/dashboard.service';
import { attendanceService } from '../../services/attendance.service';
import { projectTaskService } from '../../services/projectTask.service';

export const Dashboard = () => {
  const { can } = usePermissions();
  const { profile, role } = useUser();
  const { projects, setProjects, transactions, incidents, employees, checklists, toggleChecklistTask } = useData();
  const { notify } = useNotification();

  const currentEmployee = employees.find(e => e.matricule === profile?.matricule);
  const technicianProjectId = currentEmployee?.projectId || 0;
  const technicianProject = currentEmployee?.project;
  const technicianHistory = currentEmployee?.assignmentHistory || [];
  const technicianChecklists = checklists.filter(c => technicianProjectId ? c.projectId === technicianProjectId : false);
  const [technicianTasks, setTechnicianTasks] = useState<any[]>([]);

  const [selectedRegion, setSelectedRegion] = useState('Toutes les régions');
  const [selectedProject, setSelectedProject] = useState<number | null>(null); // null = Tous les chantiers
  
  const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
  const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isConvoquerModalOpen, setIsConvoquerModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isEscaladerModalOpen, setIsEscaladerModalOpen] = useState(false);
  const [isAlertCenterModalOpen, setIsAlertCenterModalOpen] = useState(false);
  const [alertCenterTab, setAlertCenterTab] = useState<'active' | 'history'>('active');

  const [exportStep, setExportStep] = useState(1);

  // Charger les projets depuis l'API au montage (comme dans Projects/index.tsx)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const [data, kpis] = await Promise.all([
          projectService.getAll(),
          dashboardService.getKPIs().catch(() => null),
        ]);
        setBackendKpis(kpis);
        const normalized = data.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          client: p.client,
          status: p.status,
          budget: Number(p.budget || 0),
          progress: p.progress || 0,
          location: p.location || '',
          region: p.region || '',
          manager: p.manager || '',
          start: p.startDate || '',
          end: p.endDate || '',
        }));
        setProjects(normalized);
      } catch (err: any) {
        notify(err.message || 'Erreur lors du chargement des chantiers', 'error');
      }
    };

    loadProjects();
  }, []);
  const [activeDeepDive, setActiveDeepDive] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState('Excel Consolidé (Données Brutes)');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [backendKpis, setBackendKpis] = useState<any | null>(null);

  // Individual Clocking State
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isClocking, setIsClocking] = useState(false);

  useEffect(() => {
    if (currentEmployee?.id) {
      attendanceService.checkToday(currentEmployee.id).then(setTodayAttendance);
    }
  }, [currentEmployee?.id]);

  // Charger les tâches du technicien
  useEffect(() => {
    if (role === 'technicien' && technicianProjectId && currentEmployee?.id) {
      const loadTasks = async () => {
        try {
          const tasks = await projectTaskService.getAll(technicianProjectId);
          // Filtrer les tâches assignées au technicien actuel
          const myTasks = tasks.filter(task => task.assignedTo === currentEmployee.id);
          setTechnicianTasks(myTasks);
        } catch (err) {
          console.error('Erreur chargement tâches:', err);
        }
      };
      loadTasks();
    }
  }, [role, technicianProjectId, currentEmployee?.id]);

  const handleClockAction = async () => {
    if (!currentEmployee?.id || !technicianProjectId) {
      notify("Impossible de pointer : Vous n'êtes pas affecté à un chantier.", "warning");
      return;
    }
    
    setIsClocking(true);
    try {
      const type = todayAttendance?.arrivalTime ? 'departure' : 'arrival';
      const result = await attendanceService.clockAction({
        employeeId: currentEmployee.id,
        projectId: technicianProjectId,
        type
      });
      
      // Update local state
      const updated = await attendanceService.checkToday(currentEmployee.id);
      setTodayAttendance(updated);
      
      const time = result.time;
      const isLate = type === 'arrival' && time > '08:00';
      const message = type === 'arrival' 
        ? `Pointage d'arrivée à ${time}. ${isLate ? "Attention, vous êtes en retard (limite 08:00)." : "Vous êtes à l'heure !"}`
        : `Pointage de départ à ${time}. Bonne soirée !`;
        
      notify(message, isLate ? 'warning' : 'success');
    } catch (err: any) {
      notify("Erreur lors du pointage.", "error");
    } finally {
      setIsClocking(false);
    }
  };

  // Filtered Data
  const effectiveProjectFilter = role === 'technicien' ? (technicianProjectId || 'None') : selectedProject;

  const filteredSourceProjects = projects.filter(p => {
    const matchesRegion = selectedRegion === 'Toutes les régions' || p.region === selectedRegion;
    const matchesProject = effectiveProjectFilter === null || effectiveProjectFilter === 'None' || p.id === effectiveProjectFilter;
    return matchesRegion && matchesProject;
  });

  const filteredSourceTransactions = transactions.filter(t => {
    const project = projects.find(p => p.id === t.projectId);
    if (!project) return false; // Ignorer les transactions sans projet valide

    const matchesProject = effectiveProjectFilter === null || effectiveProjectFilter === 'None' || t.projectId === effectiveProjectFilter;
    const matchesRegion = selectedRegion === 'Toutes les régions' || project.region === selectedRegion;
    return matchesProject && matchesRegion;
  });

  const filteredSourceIncidents = incidents.filter(i => {
    const project = projects.find(p => p.id === i.projectId);
    if (!project) return false; // Ignorer les incidents sans projet valide

    const matchesProject = effectiveProjectFilter === null || effectiveProjectFilter === 'None' || i.projectId === effectiveProjectFilter;
    const matchesRegion = selectedRegion === 'Toutes les régions' || project.region === selectedRegion;
    return matchesProject && matchesRegion;
  });

  // Map context projects to dashboard format
  const dashboardProjects = filteredSourceProjects.map(p => {
    const budgetValue = Math.round(Number(p.budget)) || 0;
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      budget: budgetValue,
      ca: budgetValue * (p.progress / 100),
      margin: "20%", // Default margin for new projects
      progress: p.progress,
      status: p.status,
      region: p.region,
      dateCreation: p.dateCreation || p.startDate || new Date().toISOString().split('T')[0]
    };
  });

  
  const isGlobalView = (selectedProject === null || selectedProject === 'None') && selectedRegion === 'Toutes les régions' && role !== 'technicien';

  const totalBudget = (isGlobalView && backendKpis?.projects?.budgetTotal)
    ? backendKpis.projects.budgetTotal
    : filteredSourceProjects.reduce((sum, p) => sum + (Math.round(Number(p.budget) || 0)), 0);
  const formattedBudget = new Intl.NumberFormat('fr-FR').format(totalBudget);

  // Toutes les métriques financières depuis le backend ou local
  const localInvoices = filteredSourceTransactions
    .filter(t => t.type === 'invoice')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const localExpenses = filteredSourceTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const localPaid = filteredSourceTransactions
    .filter(t => t.type === 'invoice' && t.status === 'Payé')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalCA = (isGlobalView && backendKpis?.finances?.totalFactures) ? backendKpis.finances.totalFactures : localInvoices;
  const formattedCA = new Intl.NumberFormat('fr-FR').format(totalCA);

  const totalExpenses = (isGlobalView && backendKpis?.finances?.totalDepenses) ? backendKpis.finances.totalDepenses : localExpenses;
  const formattedExpenses = new Intl.NumberFormat('fr-FR').format(totalExpenses);

  const totalEncaisse = (isGlobalView && backendKpis?.finances?.totalFactures)
    ? backendKpis.finances.totalFactures
    : localPaid;
  const formattedEncaisse = new Intl.NumberFormat('fr-FR').format(totalEncaisse);

  // Marge = Encaissé - Dépenses (même source pour les deux)
  const totalMargin = totalEncaisse - totalExpenses;
  const formattedMargin = new Intl.NumberFormat('fr-FR').format(totalMargin);

  const avgProgress = filteredSourceProjects.length > 0
    ? Math.round(filteredSourceProjects.reduce((sum, p) => sum + p.progress, 0) / filteredSourceProjects.length)
    : 0;

  const totalProjects = (isGlobalView && backendKpis?.projects?.total) ? backendKpis.projects.total : filteredSourceProjects.length;
  const criticalIncidents = (isGlobalView && backendKpis?.incidents?.graves) ? backendKpis.incidents.graves : filteredSourceIncidents.filter(i => i.gravity === 'Critique').length;

  // Dynamic chart data
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const allMonths = months;

  const dynamicChartData = allMonths.map((monthName, idx) => {
    const currentYear = new Date().getFullYear();
    // Filter transactions for this specific month
    const monthTransactions = filteredSourceTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === idx && tDate.getFullYear() === currentYear;
    });

    const ca = monthTransactions
      .filter(t => t.type === 'invoice' || t.type === 'Vente') // Support multiple types if exists
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expenses = Math.abs(monthTransactions
      .filter(t => t.type === 'expense' || t.type === 'Achat')
      .reduce((sum, t) => sum + t.amount, 0));

    // Project date alignment logic
    let isWithinProjectBounds = true;
    if (selectedProject !== null) {
      const proj = projects.find(p => p.id === selectedProject);
      if (proj && proj.start && proj.end) {
        const start = new Date(proj.start);
        const end = new Date(proj.end);
        const currentMonthFirstDay = new Date(currentYear, idx, 1);
        isWithinProjectBounds = currentMonthFirstDay >= new Date(start.getFullYear(), start.getMonth(), 1) &&
                                 currentMonthFirstDay <= new Date(end.getFullYear(), end.getMonth(), 1);
      }
    }

    return {
      name: monthName,
      ca,
      expenses,
      margin: ca - expenses,
      isActive: isWithinProjectBounds // Can be used for styling the bars/areas
    };
  });

  // Dynamic pie data
  const expenseCategories = Array.from(new Set(filteredSourceTransactions.filter(t => t.type === 'expense').map(t => t.category)));
  const dynamicPieData = expenseCategories.map(cat => {
    const total = Math.abs(filteredSourceTransactions
      .filter(t => t.type === 'expense' && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0));
    return { name: cat, value: total };
  }).sort((a, b) => b.value - a.value).slice(0, 4);

  const totalExpenseValue = dynamicPieData.reduce((sum, item) => sum + item.value, 0);
  const pieDataWithPercentage = dynamicPieData.map(item => ({
    ...item,
    value: totalExpenseValue > 0 ? Math.round((item.value / totalExpenseValue) * 100) : 0
  }));

  const projectRegions = Array.from(new Set(projects.map(p => p.region))).map((regionName: string) => {
    // For region stats, we use all projects in that region regardless of selectedProject
    const regionProjects = projects.filter(p => p.region === regionName).map(p => {
      const budgetValue = Math.round(Number(p.budget)) || 0;
      return { ca: budgetValue * (p.progress / 100) };
    });
    const totalCA = regionProjects.reduce((sum, p) => sum + p.ca, 0);
    return {
      id: regionName.substring(0, 2).toUpperCase(),
      name: regionName,
      projects: regionProjects.length,
      ca: totalCA > 1000000000 ? (totalCA / 1000000000).toFixed(1) + 'B' : (totalCA / 1000000).toFixed(0) + 'M',
      status: 'Actif'
    };
  });

  const filteredProjects = dashboardProjects;

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dashboardProjects);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport Projets");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `Rapport_Mensuel_VAN_BTP_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "RAPPORT MENSUEL CONSOLIDÉ - VAN BTP",
            heading: HeadingLevel.HEADING_1,
            alignment: "center",
          }),
          new Paragraph({
            text: `Date de génération: ${new Date().toLocaleDateString('fr-FR')}`,
            alignment: "right",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "1. PERFORMANCE FINANCIÈRE",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Chiffre d'Affaires Total: ", bold: true }),
              new TextRun(`${formattedCA} FCFA`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Marge Nette: ", bold: true }),
              new TextRun(`${formattedMargin} FCFA`),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "2. ÉTAT D'AVANCEMENT DES CHANTIERS",
            heading: HeadingLevel.HEADING_2,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chantier", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Client", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Avancement", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Statut", bold: true })] })] }),
                ],
              }),
              ...dashboardProjects.map(p => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(p.name)] }),
                  new TableCell({ children: [new Paragraph(p.client)] }),
                  new TableCell({ children: [new Paragraph(`${p.progress}%`)] }),
                  new TableCell({ children: [new Paragraph(p.status)] }),
                ],
              })),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Rapport_Mensuel_VAN_BTP_${new Date().toISOString().split('T')[0]}.docx`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (exportFormat.includes('Excel')) {
      exportToExcel();
    } else if (exportFormat.includes('PDF') || exportFormat.includes('Word')) {
      // For demo purposes, Word is a good "realistic" doc format
      await exportToWord();
    }

    setIsExporting(false);
    setExportStep(3);
    notify(`Rapport exporté avec succès au format ${exportFormat.split(' ')[0]}.`, 'success', '/dashboard');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <Activity className="w-4 h-4" />
            <span>Pilotage {
              role === 'dg' ? 'Global Direction Générale' :
                role === 'chef' ? 'Opérationnel Chef Chantier' :
                  role === 'rh' ? 'Ressources Humaines' :
                    'Terrain Technicien'
            } </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            {role === 'dg' ? 'Tableau de Bord Global' :
              role === 'chef' ? 'Synthèse du Chantier' :
                role === 'rh' ? 'Tableau de Bord RH' :
                  'Suivi de Chantier'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {role === 'dg' ? 'Performance consolidée et indicateurs stratégiques' :
              role === 'chef' ? 'Performance opérationnelle et alertes critiques' :
                role === 'rh' ? 'Gestion du personnel et des affectations' :
                  'Saisie des rapports et suivi des tâches'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(role === 'dg' || role === 'chef') && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setIsRegionFilterOpen(true)}>
                <Filter className="w-4 h-4 mr-2" />
                {selectedRegion}
              </Button>
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setIsProjectFilterOpen(true)}>
                <HardHat className="w-4 h-4 mr-2" />
                {selectedProject === null ? 'Tous les chantiers' : projects.find(p => p.id === selectedProject)?.name || 'Chantier inconnu'}
              </Button>
            </div>
          )}
          {(role === 'dg' || role === 'chef') && (
            <Button size="sm" className="shadow-lg shadow-blue-900/20" onClick={() => { setIsExportModalOpen(true); setExportStep(1); }}>
              <Download className="w-4 h-4 mr-2" />
              Exporter Rapport {role === 'dg' ? 'Consolidé' : 'Mensuel'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(role === 'dg' || role === 'chef') && (
          <>
            <StatCard
              title="Budget Global"
              value={formattedBudget}
              unit="FCFA"
              change="+12.5%"
              isPositive={true}
              icon={Building2}
              trend="Total Marchés"
              onClick={() => setActiveDeepDive('sites')}
            />
            <StatCard
              title="Montant facturé"
              value={formattedCA}
              unit="FCFA"
              change="+8.2%"
              isPositive={true}
              icon={TrendingUp}
              trend="Total Invoices"
              onClick={() => setActiveDeepDive('ca')}
            />
            <StatCard
              title="Total Encaissé"
              value={formattedEncaisse}
              unit="FCFA"
              change="+5.4%"
              isPositive={true}
              icon={ArrowUpRight}
              trend="Versements"
              onClick={() => setActiveDeepDive('ca')}
            />
            <StatCard
              title="Dépenses Engagées"
              value={formattedExpenses}
              unit="FCFA"
              change="+15.2%"
              isPositive={false}
              icon={Banknote}
              trend="Total Expenses"
              onClick={() => setActiveDeepDive('margin')}
            />
          </>
        )}
        {role === 'rh' && (
          <>
            <StatCard
              title="Total Personnel"
              value={employees.length.toString()}
              unit="Employés"
              change="+2"
              isPositive={true}
              icon={Users}
              trend="Effectif Global"
            />
            <StatCard
              title="Chantiers Actifs"
              value={projects.length.toString()}
              unit="Sites"
              change="0"
              isPositive={true}
              icon={HardHat}
              trend="Affectations"
            />
            <StatCard
              title="Contrats CDI"
              value={employees.filter(e => e.contract === 'CDI').length.toString()}
              unit="CDI"
              change="+1"
              isPositive={true}
              icon={CheckCircle2}
              trend="Stabilité"
            />
            <StatCard
              title="Contrats CDD"
              value={employees.filter(e => e.contract === 'CDD').length.toString()}
              unit="CDD"
              change="+1"
              isPositive={false}
              icon={Clock}
              trend="Temporaires"
            />
          </>
        )}
        {role === 'technicien' && (
          <>
            <StatCard
              title="Chantier Actuel"
              value={technicianProject || "Non assigné"}
              unit=""
              change=""
              isPositive={true}
              icon={Building2}
              trend="Affectation en cours"
            />
            <StatCard
              title="Tâches du Jour"
              value={technicianChecklists.reduce((acc, c) => acc + c.tasks.filter(t => !t.completed).length, 0).toString()}
              unit="Tâches"
              change=""
              isPositive={true}
              icon={Activity}
              trend="À réaliser"
            />
            <StatCard
              title="Incidents Signalés"
              value={filteredSourceIncidents.length.toString()}
              unit="Incidents"
              change=""
              isPositive={false}
              icon={AlertTriangle}
              trend="Derniers 7j"
            />
            <StatCard
              title="Avancement Site"
              value={projects.find(p => p.name === technicianProject)?.progress.toString() || "0"}
              unit="%"
              change=""
              isPositive={true}
              icon={TrendingUp}
              trend="Progression"
            />
          </>
        )}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {(role === 'dg' || role === 'chef') ? (
          <Card className="lg:col-span-2 p-8 border-none shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Évolution Financière (FCFA)</h3>
                <p className="text-sm text-slate-500 font-medium">Montant facturé vs Dépenses (Millions)</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
                  <span className="text-xs font-bold text-slate-600">Montant facturé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]"></div>
                  <span className="text-xs font-bold text-slate-600">Dépenses</span>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicChartData}>
                  <defs>
                    <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }} tickFormatter={(value) => `${value / 1000000}M`} />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'rgb(var(--color-bg-rgb, 255, 255, 255))',
                      color: 'inherit'
                    }}
                    formatter={(value: any) => [`${value.toLocaleString()} FCFA`]}
                  />
                  <Area type="monotone" dataKey="ca" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCa)" />
                  <Area type="monotone" dataKey="expenses" stroke="var(--color-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                  {/* Masquage des zones hors-projet si un projet est sélectionné */}
                  {selectedProject !== null && (
                    <Area
                      type="step"
                      dataKey={(d: any) => d.isActive ? 0 : 1000000000} // Valeur haute pour couvrir le reste
                      stroke="none"
                      fill="#f1f5f9"
                      fillOpacity={0.5}
                      connectNulls={true}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : role === 'rh' ? (
          <Card className="lg:col-span-2 p-8 border-none shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Évolution des Effectifs</h3>
                <p className="text-sm text-slate-500 font-medium">Nombre d'employés par mois</p>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allMonths.map((m, i) => {
                  const currentYear = new Date().getFullYear();
                  const count = employees.filter(e => {
                    if (!e.dateEmbauche) return false;
                    const d = new Date(e.dateEmbauche);
                    return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() <= i);
                  }).length;
                  return { name: m, count: count || 0 };
                })}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Mes Checklists & Tâches</h3>
                  <p className="text-sm text-slate-500 font-medium">Suivi opérationnel du chantier</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                  <Building2 className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{technicianProject}</span>
                </div>
              </div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {technicianChecklists.length > 0 ? technicianChecklists.map((checklist) => (
                  <div key={checklist.id} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-black text-slate-800">{checklist.title}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{checklist.date}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {checklist.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                            task.completed ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100 hover:border-[var(--color-primary)]"
                          )}
                          onClick={() => toggleChecklistTask(checklist.id, task.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                              task.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"
                            )}>
                              {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className={cn(
                              "text-xs font-bold transition-colors",
                              task.completed ? "text-emerald-700 line-through" : "text-slate-700"
                            )}>{task.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">Aucune checklist assignée à votre chantier.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl shadow-blue-900/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  Alertes Métier
                </h3>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">{criticalIncidents} CRITIQUES</span>
              </div>
              <div className="space-y-4">
                {/* Dynamic Alerts from Projects (80% budget consumption) */}
                {filteredSourceProjects.map(p => {
                  const budget = Math.round(Number(p.budget)) || 0;
                  const projectExpenses = Math.abs(filteredSourceTransactions
                    .filter(t => t.projectId === p.id && t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0));

                  if (budget > 0 && projectExpenses >= budget * 0.8) {
                    return (
                      <AlertItem
                        key={`alert-budget-${p.id}`}
                        type="danger"
                        title="Alerte Budget (80%)"
                        desc={`${p.name} - Consommation: ${new Intl.NumberFormat('fr-FR').format(projectExpenses)} FCFA`}
                        onClick={() => setSelectedAlert({
                          title: 'Alerte Budget (80%)',
                          chantier: p.name,
                          budget: new Intl.NumberFormat('fr-FR').format(budget) + ' FCFA',
                          depenses: new Intl.NumberFormat('fr-FR').format(projectExpenses) + ' FCFA',
                          ratio: Math.round((projectExpenses / budget) * 100) + '%'
                        })}
                      />
                    );
                  }
                  return null;
                })}

                {/* Dynamic Alerts from Incidents */}
                {filteredSourceIncidents.slice(0, 4).map(incident => (
                  <AlertItem
                    key={`alert-incident-${incident.id}`}
                    type={incident.gravity === 'Critique' ? 'danger' : 'warning'}
                    title={`Incident: ${incident.type}`}
                    desc={`${projects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu'} - ${incident.desc}`}
                    onClick={() => setSelectedAlert({
                      title: `Incident ${incident.gravity}`,
                      chantier: projects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu',
                      gravite: incident.gravity,
                      description: incident.desc,
                      date: incident.date,
                      statut: incident.status
                    })}
                  />
                ))}

                {/* Alertes de Sécurité */}
                {filteredSourceIncidents.filter(i => i.gravity === 'Critique').length === 0 && filteredSourceProjects.length > 0 && (
                  <AlertItem
                    type="success"
                    title="Sécurité OK"
                    desc="Aucun incident critique sur les chantiers actifs"
                    onClick={() => {}}
                  />
                )}

                {/* Alertes de Production */}
                {filteredSourceProjects.filter(p => p.status === 'Actif').length > 0 && (
                  <AlertItem
                    type="info"
                    title="Production Active"
                    desc={`${filteredSourceProjects.filter(p => p.status === 'Actif').length} chantier(s) en cours`}
                    onClick={() => {}}
                  />
                )}
              </div>
            </Card>
          </div>
        )}

        <Card className={cn("p-8 border-none shadow-xl shadow-slate-200/50 flex flex-col", role === 'technicien' && "bg-slate-50")}>
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            {(role === 'dg' || role === 'chef') ? 'Structure des Coûts' :
              role === 'rh' ? 'Répartition par Poste' :
                'Historique des tâches'}
          </h3>
          <p className="text-sm text-slate-500 font-medium mb-8">
            {(role === 'dg' || role === 'chef') ? 'Répartition par poste de dépense' :
              role === 'rh' ? 'Répartition des effectifs par catégorie' :
                'Tâches assignées par le chef chantier'}
          </p>
          {role === 'technicien' ? (
            <div className="flex-1 space-y-4">
              {technicianTasks.length > 0 ? technicianTasks.map((task, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">{task.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {task.status === 'À faire' ? 'À faire' : 
                       task.status === 'En cours' ? 'En cours' : 
                       task.status === 'Terminé' ? 'Terminé' : 'Bloqué'}
                    </p>
                    {task.dueDate && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Échéance : {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                </div>
              )) : (
                <p className="text-center py-10 text-slate-400 text-xs font-bold italic">Aucune tâche assignée</p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(role === 'dg' || role === 'chef') ? pieDataWithPercentage :
                        role === 'rh' ? (() => {
                          const roles = Array.from(new Set(employees.map(e => e.role || 'Autre')));
                          return roles.map(r => ({
                            name: r,
                            value: employees.filter(e => e.role === r).length
                          }));
                        })() : [
                          { name: 'Pelles Hydrauliques', value: 40 },
                          { name: 'Bulldozers', value: 30 },
                          { name: 'Camions Benne', value: 20 },
                          { name: 'Compacteurs', value: 10 },
                        ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {((role === 'dg' || role === 'chef') ? pieDataWithPercentage : [1, 2, 3, 4]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-900">100%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    {(role === 'dg' || role === 'chef') ? 'Total Coûts' :
                      role === 'rh' ? 'Total Personnel' :
                        'Taux d\'Usage'}
                  </span>
                </div>
              </div>
              <div className="w-full space-y-3 mt-8">
                {((role === 'dg' || role === 'chef') ? pieDataWithPercentage :
                  role === 'rh' ? [
                    { name: 'Encadrement', value: 15 },
                    { name: 'Technique', value: 35 },
                    { name: 'Ouvriers', value: 40 },
                    { name: 'Support', value: 10 },
                  ] : [
                    { name: 'Pelles Hydrauliques', value: 40 },
                    { name: 'Bulldozers', value: 30 },
                    { name: 'Camions Benne', value: 20 },
                    { name: 'Compacteurs', value: 10 },
                  ]).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                        <span className="text-sm text-slate-700 font-bold">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{item.value}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Section: Projects & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-none shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Performance par Chantier</h3>
            <Button variant="ghost" size="sm" className="text-[var(--color-primary)] font-bold">
              Voir tout <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="pb-4">Chantier / Maître d'Ouvrage</th>
                  <th className="pb-4">Budget / Montant facturé (FCFA)</th>
                  <th className="pb-4">Marge</th>
                  <th className="pb-4">Avancement</th>
                  <th className="pb-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    name={project.name}
                    client={project.client}
                    budget={project.budget}
                    ca={project.ca}
                    margin={project.margin}
                    progress={project.progress}
                    status={project.status}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Alertes Métier Card - Uniquement pour DG et Chef */}
        {(role === 'dg' || role === 'chef') && (
          <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl shadow-blue-900/20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                Alertes Métier
              </h3>
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">{criticalIncidents} CRITIQUES</span>
            </div>
            <div className="space-y-4">
              {/* Dynamic Alerts from Projects (80% budget consumption) */}
              {filteredSourceProjects.map(p => {
                const budget = Math.round(Number(p.budget)) || 0;
                const projectExpenses = Math.abs(filteredSourceTransactions
                  .filter(t => t.projectId === p.id && t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0));

                if (budget > 0 && projectExpenses >= budget * 0.8) {
                  return (
                    <AlertItem
                      key={`alert-budget-${p.id}`}
                      type="danger"
                      title="Alerte Budget (80%)"
                      desc={`${p.name} - Consommation: ${new Intl.NumberFormat('fr-FR').format(projectExpenses)} FCFA`}
                      onClick={() => setSelectedAlert({
                        title: 'Alerte Budget (80%)',
                        chantier: p.name,
                        budget: new Intl.NumberFormat('fr-FR').format(budget) + ' FCFA',
                        depenses: new Intl.NumberFormat('fr-FR').format(projectExpenses) + ' FCFA',
                        ratio: Math.round((projectExpenses / budget) * 100) + '%'
                      })}
                    />
                  );
                }
                return null;
              })}

              {/* Dynamic Alerts from Incidents */}
              {filteredSourceIncidents.slice(0, 4).map(incident => (
                <AlertItem
                  key={`alert-incident-${incident.id}`}
                  type={incident.gravity === 'Critique' ? 'danger' : 'warning'}
                  title={`Incident: ${incident.type}`}
                  desc={`${projects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu'} - ${incident.desc}`}
                  onClick={() => setSelectedAlert({
                    title: `Incident ${incident.gravity}`,
                    chantier: projects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu',
                    type: incident.type,
                    description: incident.description,
                    date: incident.date,
                    statut: incident.status,
                    image: incident.image
                  })}
                />
              ))}

              {/* Fallback if no dynamic alerts */}
              {filteredSourceProjects.every(p => {
                const budget = Math.round(Number(p.budget)) || 0;
                const projectExpenses = Math.abs(filteredSourceTransactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
                return budget === 0 || projectExpenses < budget * 0.8;
              }) && filteredSourceIncidents.length === 0 && (
                  <div className="py-8 text-center border border-dashed border-slate-700 rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aucune alerte critique</p>
                  </div>
                )}
            </div>
            <Button
              variant="outline"
              onClick={() => setIsAlertCenterModalOpen(true)}
              className="w-full mt-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-bold"
            >
              Voir le centre d'alertes
            </Button>
          </Card>
        )}
      </div>

      {/* Drill Down Modal Simulation */}
      <AnimatePresence>
        {selectedAlert && (
          <Modal
            isOpen={!!selectedAlert}
            onClose={() => setSelectedAlert(null)}
            title={`Détail Alerte: ${selectedAlert.title}`}
            size="lg"
          >
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Fiche d'Analyse Critique</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(selectedAlert).filter(([k]) => k !== 'title' && k !== 'image').map(([key, value]: any) => {
                    const labels: Record<string, string> = {
                      chantier: 'Chantier',
                      budget: 'Budget Total',
                      depenses: 'Dépenses Actuelles',
                      ratio: 'Taux de Consommation',
                      type: 'Nature de l\'incident',
                      description: 'Description',
                      date: 'Date du rapport',
                      statut: 'Statut actuel'
                    };
                    const label = labels[key] || key.charAt(0).toUpperCase() + key.slice(1);

                    return (
                      <div key={key} className={cn("space-y-1", key === 'description' && "col-span-full")}>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-black text-slate-900">{value}</p>
                      </div>
                    );
                  })}

                  {selectedAlert.image && (
                    <div className="col-span-full mt-4">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Preuve Photo</p>
                      <img 
                        src={selectedAlert.image.startsWith('http') ? selectedAlert.image : `${import.meta.env.VITE_API_URL || ''}${selectedAlert.image}`} 
                        alt="Preuve" 
                        className="w-full h-64 object-cover rounded-2xl border border-slate-100" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  )}
                </div>
              </div>

              {(role === 'dg' || role === 'chef') && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Actions de Remédiation Immédiates</h4>
                <Button
                  className="w-full justify-between group h-14 rounded-2xl"
                  onClick={() => {
                    setIsConvoquerModalOpen(true);
                    setSelectedAlert(null);
                  }}
                >
                  <span>Convoquer le Conducteur de Travaux</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between group h-14 rounded-2xl border-slate-200"
                  onClick={() => {
                    setIsIncidentModalOpen(true);
                    setSelectedAlert(null);
                  }}
                >
                  <span>Générer un rapport d'incident pour le Client</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-red-500 hover:bg-red-50 font-bold h-14 rounded-2xl"
                  onClick={() => {
                    setIsEscaladerModalOpen(true);
                    setSelectedAlert(null);
                  }}
                >
                  Escalader au Comité de Direction
                </Button>
              </div>
            )}
            </div>
          </Modal>
        )}

        {/* Alert Center Modal */}
        {isAlertCenterModalOpen && (
          <Modal
            isOpen={isAlertCenterModalOpen}
            onClose={() => setIsAlertCenterModalOpen(false)}
            title="Centre d'Alertes Métier & Historique"
            size="lg"
          >
            <div className="space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setAlertCenterTab('active')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    alertCenterTab === 'active' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Alertes Actives
                </button>
                <button
                  onClick={() => setAlertCenterTab('history')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    alertCenterTab === 'history' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Historique / Fermées
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {alertCenterTab === 'active' ? (
                  <>
                    {/* Budget Alerts */}
                    {filteredSourceProjects.map(p => {
                      const budget = Math.round(Number(p.budget)) || 0;
                      const projectExpenses = Math.abs(filteredSourceTransactions
                        .filter(t => t.projectId === p.id && t.type === 'expense')
                        .reduce((sum, t) => sum + t.amount, 0));

                      if (budget > 0 && projectExpenses >= budget * 0.8) {
                        return (
                          <div key={`center-budget-${p.id}`} className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-black uppercase tracking-tight">Alerte Budget (80%)</span>
                              </div>
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Automatique</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900">{p.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">
                              Consommation: {new Intl.NumberFormat('fr-FR').format(projectExpenses)} / {new Intl.NumberFormat('fr-FR').format(budget)} FCFA
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {/* Active Incidents */}
                    {incidents.filter(i => i.status !== 'Fermé').map(incident => (
                      <div key={`center-incident-${incident.id}`} className="p-4 bg-white border border-slate-100 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              incident.gravity === 'Critique' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                            )}>
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{incident.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{projects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu'} • {incident.type}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                            incident.gravity === 'Critique' ? "bg-red-600 text-white" : "bg-orange-500 text-white"
                          )}>
                            {incident.gravity}
                          </span>
                        </div>

                        {/* Afficher l'image si disponible */}
                        {incident.image && (
                          <div className="pt-4 border-t border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preuve Photo</p>
                            <img 
                              src={incident.image.startsWith('http') ? incident.image : `${import.meta.env.VITE_API_URL || ''}${incident.image}`} 
                              alt="Preuve incident" 
                              className="w-full h-48 object-cover rounded-xl border border-slate-200" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historique des modifications</p>
                          <div className="space-y-2">
                            {(incident.history || [{ date: incident.date, action: 'Incident déclaré', user: incident.reporter }]).map((h: any, idx: number) => (
                              <div key={idx} className="flex gap-2 text-[10px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0"></div>
                                <p className="font-bold text-slate-600">
                                  <span className="text-slate-400">{h.date}</span> • {h.action} par <span className="text-[var(--color-primary)]">{h.user}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Closed Incidents */}
                    {incidents.filter(i => i.status === 'Fermé').map(incident => (
                      <div key={`center-closed-${incident.id}`} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl opacity-75 grayscale-[0.5] space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{incident.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{projects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu'} • {incident.type}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                            FERMÉ
                          </span>
                        </div>

                        {/* Afficher l'image si disponible */}
                        {incident.image && (
                          <div className="pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preuve Photo</p>
                            <img 
                              src={incident.image.startsWith('http') ? incident.image : `${import.meta.env.VITE_API_URL || ''}${incident.image}`} 
                              alt="Preuve incident" 
                              className="w-full h-48 object-cover rounded-xl border border-slate-200 opacity-75 grayscale-[0.5]" 
                              referrerPolicy="no-referrer" 
                            />
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historique complet</p>
                          <div className="space-y-2">
                            {(incident.history || [{ date: incident.date, action: 'Incident déclaré', user: incident.reporter }]).map((h: any, idx: number) => (
                              <div key={idx} className="flex gap-2 text-[10px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0"></div>
                                <p className="font-bold text-slate-600">
                                  <span className="text-slate-400">{h.date}</span> • {h.action} par <span className="text-slate-900">{h.user}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {incidents.filter(i => i.status === 'Fermé').length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-sm font-bold text-slate-400 italic">Aucune alerte archivée.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setIsAlertCenterModalOpen(false)} className="font-bold">Fermer le centre</Button>
              </div>
            </div>
          </Modal>
        )}

        
        {/* Convoquer Modal */}
        {isConvoquerModalOpen && (
          <Modal
            isOpen={isConvoquerModalOpen}
            onClose={() => setIsConvoquerModalOpen(false)}
            title="Convoquer le Responsable"
          >
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700">Cette action enverra une notification prioritaire au conducteur de travaux concerné.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Objet de la Convocation</label>
                <input type="text" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" defaultValue="Urgent: Revue de performance et alertes critiques" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Message / Instructions</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Détaillez les points à aborder..."></textarea>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button variant="outline" onClick={() => setIsConvoquerModalOpen(false)}>Annuler</Button>
                <Button onClick={() => setIsConvoquerModalOpen(false)} className="font-bold">Envoyer la Convocation</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Incident Report Modal */}
        {isIncidentModalOpen && (
          <Modal
            isOpen={isIncidentModalOpen}
            onClose={() => setIsIncidentModalOpen(false)}
            title="Générer un Rapport d'Incident"
            size="lg"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Type d'Incident</label>
                  <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <option>Dépassement Budgétaire</option>
                    <option>Retard Critique</option>
                    <option>Incident HSE</option>
                    <option>Problème Qualité</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Gravité</label>
                  <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <option>Critique</option>
                    <option>Majeur</option>
                    <option>Mineur</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Description des Faits</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Décrivez l'incident de manière factuelle..."></textarea>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700">Le rapport sera automatiquement formaté selon la charte VAN BTP et envoyé au client après validation.</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button variant="outline" onClick={() => setIsIncidentModalOpen(false)}>Annuler</Button>
                <Button onClick={() => setIsIncidentModalOpen(false)} className="font-bold">Générer le Rapport</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Escalader Modal */}
        {isEscaladerModalOpen && (
          <Modal
            isOpen={isEscaladerModalOpen}
            onClose={() => setIsEscaladerModalOpen(false)}
            title="Escalader au Comité de Direction"
          >
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">Confirmer l'escalade</h4>
              <p className="text-sm text-slate-500 font-medium">Cette action enverra une alerte critique à tous les membres du CODIR.</p>
              <div className="pt-6 border-t border-slate-100 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setIsEscaladerModalOpen(false)}>Annuler</Button>
                <Button className="font-bold bg-red-600 hover:bg-red-700 text-white border-none" onClick={() => setIsEscaladerModalOpen(false)}>Confirmer l'Escalade</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Region Filter Workflow */}
        {isRegionFilterOpen && (
          <Modal
            isOpen={isRegionFilterOpen}
            onClose={() => setIsRegionFilterOpen(false)}
            title="Analyse de Performance Régionale"
            size="lg"
          >
            <div className="space-y-6">
              <p className="text-sm text-slate-500 font-medium">Sélectionnez une région pour filtrer les données du tableau de bord.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => { setSelectedRegion('Toutes les régions'); setIsRegionFilterOpen(false); }}
                  className={cn(
                    "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                    selectedRegion === 'Toutes les régions' ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                  )}
                >
                  <h4 className="text-xl font-black text-slate-900 mb-1">Toutes les régions</h4>
                  <p className="text-xs font-bold text-slate-500">Vue consolidée nationale</p>
                </button>
                {projectRegions.map((region) => (
                  <button
                    key={region.name}
                    onClick={() => { setSelectedRegion(region.name); setIsRegionFilterOpen(false); }}
                    className={cn(
                      "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                      selectedRegion === region.name ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{region.id}</span>
                      <span className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg uppercase">{region.status}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{region.name}</h4>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <span>{region.projects} Chantiers</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span>Montant facturé: {region.ca} FCFA</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setIsRegionFilterOpen(false)}>Fermer</Button>
              </div>
            </div>
          </Modal>
        )}

        {isProjectFilterOpen && (
          <Modal
            isOpen={isProjectFilterOpen}
            onClose={() => setIsProjectFilterOpen(false)}
            title="Filtrer par Chantier"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => { setSelectedProject(null); setIsProjectFilterOpen(false); }}
                  className={cn(
                    "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                    selectedProject === null ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                  )}
                >
                  <h4 className="text-xl font-black text-slate-900 mb-1">Tous les chantiers</h4>
                  <p className="text-xs font-bold text-slate-500">Vue consolidée de l'entreprise</p>
                </button>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => { setSelectedProject(project.id); setIsProjectFilterOpen(false); }}
                    className={cn(
                      "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                      selectedProject === project.id ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{project.code}</span>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded-lg uppercase",
                        project.status === 'clôture' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>{project.status}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{project.name}</h4>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <span>{project.client}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setIsProjectFilterOpen(false)}>Fermer</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Export Report Workflow (Wizard) */}
        {isExportModalOpen && (
          <Modal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            title="Générateur de Rapport Mensuel DG"
          >
            <div className="space-y-8">
              {/* Stepper */}
              <div className="flex items-center justify-between px-8 relative">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
                {[1, 2, 3].map((step) => (
                  <div key={step} className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                    exportStep >= step ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
                  )}>
                    {step}
                  </div>
                ))}
              </div>

              {exportStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h4 className="text-lg font-black text-slate-900">1. Sélection des Modules</h4>
                  <p className="text-sm text-slate-500 font-medium">Cochez les sections à inclure dans le rapport consolidé.</p>
                  <div className="space-y-3">
                    {['Performance Financière (Facturation, Marges, AIR)', 'État d\'Avancement des Chantiers', 'Gestion des Ressources (RH & Matériel)', 'Analyse des Risques & Alertes'].map((module) => (
                      <label key={module} className="flex items-center p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] mr-4" />
                        <span className="text-sm font-bold text-slate-700">{module}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {exportStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h4 className="text-lg font-black text-slate-900">2. Paramètres de Sortie</h4>
                  <p className="text-sm text-slate-500 font-medium">Définissez le format et les destinataires du rapport.</p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Format du Fichier</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option>Excel Consolidé (Données Brutes)</option>
                        <option>Word Stratégique (Haute Qualité)</option>
                        <option>PDF Stratégique (Haute Qualité)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Diffusion Automatique</label>
                      <div className="flex flex-wrap gap-2">
                        {['DG', 'DGA', 'Directeur Financier', 'Conducteurs de Travaux'].map(tag => (
                          <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {exportStep === 3 && (
                <div className="space-y-6 text-center py-8 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">Rapport Prêt !</h4>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto">Le rapport mensuel consolidé a été généré avec succès et téléchargé.</p>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-between">
                <Button variant="ghost" onClick={() => exportStep > 1 ? setExportStep(exportStep - 1) : setIsExportModalOpen(false)} disabled={isExporting}>
                  {exportStep === 1 ? 'Annuler' : 'Précédent'}
                </Button>
                {exportStep === 1 && (
                  <Button onClick={() => setExportStep(2)} className="px-8 font-bold">
                    Suivant <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {exportStep === 2 && (
                  <Button onClick={handleExport} className="px-8 font-bold" isLoading={isExporting}>
                    Générer et Télécharger
                  </Button>
                )}
                {exportStep === 3 && (
                  <Button onClick={() => setIsExportModalOpen(false)} className="px-8 font-bold">Terminer</Button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Deep Dive Analytics Workflow */}
        {activeDeepDive && (
          <Modal
            isOpen={!!activeDeepDive}
            onClose={() => setActiveDeepDive(null)}
            title={`Analyse Détaillée: ${activeDeepDive === 'ca' ? 'Montant facturé' : activeDeepDive === 'expenses' ? 'Dépenses' : activeDeepDive === 'margin' ? 'Trésorerie Nette' : 'Chantiers'}`}
            size="lg"
          >
            <div className="space-y-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip
                      formatter={(value: number) => [`${new Intl.NumberFormat('fr-FR').format(value)} FCFA`, '']}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey={activeDeepDive === 'ca' ? 'ca' : activeDeepDive === 'expenses' ? 'expenses' : 'margin'} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Insights Stratégiques Réels</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Valeur Totale</p>
                    <p className="text-lg font-black text-slate-900">
                      {activeDeepDive === 'ca' ? formattedCA : activeDeepDive === 'expenses' ? formattedExpenses : formattedMargin} FCFA
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nombre d'opérations</p>
                    <p className="text-lg font-black text-slate-900">
                      {filteredSourceTransactions.filter(t =>
                        activeDeepDive === 'ca' ? t.type === 'invoice' :
                          activeDeepDive === 'expenses' ? t.type === 'expense' : true
                      ).length}
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0"></div>
                    {activeDeepDive === 'ca' ?
                      `Le montant facturé total de ${formattedCA} FCFA est réparti sur ${filteredSourceProjects.length} chantiers actifs.` :
                      activeDeepDive === 'expenses' ?
                        `Les dépenses engagées s'élèvent à ${formattedExpenses} FCFA, principalement concentrées sur les matériaux.` :
                        `La trésorerie nette actuelle est de ${formattedMargin} FCFA après déduction de toutes les dépenses validées.`
                    }
                  </li>
                </ul>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setActiveDeepDive(null)}>Fermer l'Analyse</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Attendance (Chef & Technicien) */}
      {(role === 'chef' || role === 'technicien') && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <div className="relative group">
            <Button
              onClick={handleClockAction}
              disabled={isClocking || (todayAttendance?.arrivalTime && todayAttendance?.departureTime)}
              className={cn(
                "w-16 h-16 rounded-full shadow-2xl flex items-center justify-center p-0 transition-all hover:scale-110",
                !todayAttendance?.arrivalTime ? "bg-emerald-600 hover:bg-emerald-700" : 
                !todayAttendance?.departureTime ? "bg-red-600 hover:bg-red-700" : 
                "bg-slate-400 opacity-50 cursor-not-allowed"
              )}
            >
              {isClocking ? (
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
              ) : !todayAttendance?.arrivalTime ? (
                <span className="text-white font-black text-sm">Arrivé</span>
              ) : (
                <span className="text-white font-black text-sm">Départ</span>
              )}
            </Button>
            
            {/* Badge Tooltip */}
            <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl whitespace-nowrap shadow-xl">
                {!todayAttendance?.arrivalTime ? "Pointer mon Arrivée" : 
                 !todayAttendance?.departureTime ? `Arrivé à ${todayAttendance.arrivalTime} • Pointer Départ` : 
                 "Pointage du jour complété"}
              </div>
            </div>

            {/* Pulsing indicator if not clocked in */}
            {!todayAttendance?.arrivalTime && (
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25 -z-10" />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, unit, change, isPositive, icon: Icon, trend, onClick }: any) => (
  <Card
    onClick={onClick}
    className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group overflow-hidden relative cursor-pointer"
  >
    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-slate-100 rounded-2xl text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors duration-300">
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
          isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
      <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</h4>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 mt-2">{trend}</p>
    </div>
  </Card>
);

const ProjectRow = ({ name, client, budget, ca, margin, progress, status }: any) => (
  <tr className="hover:bg-slate-50/80 transition-colors group">
    <td className="py-5 pr-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
          <HardHat className="w-5 h-5" />
        </div>
        <div>
          <p className="font-black text-slate-900 tracking-tight">{name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{client}</p>
        </div>
      </div>
    </td>
    <td className="py-5 px-4">
      <p className="text-sm font-black text-slate-900">{new Intl.NumberFormat('fr-FR').format(ca)} FCFA</p>
      <p className="text-[10px] font-bold text-slate-400">Budget: {new Intl.NumberFormat('fr-FR').format(budget)} FCFA</p>
    </td>
    <td className="py-5 px-4">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
        {margin}
      </span>
    </td>
    <td className="py-5 px-4">
      <div className="w-32">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-slate-900">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-[var(--color-primary)] rounded-full"
          />
        </div>
      </div>
    </td>
    <td className="py-5 pl-4">
      <span className={cn(
        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
        status === "clôture" ? "bg-emerald-100 text-emerald-700" :
          status === "exécution" ? "bg-blue-100 text-blue-700" :
            "bg-amber-100 text-amber-700"
      )}>
        {status}
      </span>
    </td>
  </tr>
);

const AlertItem = ({ type, title, desc, onClick }: any) => {
  const colors = {
    danger: 'border-red-500 bg-red-500/10 hover:bg-red-500/20',
    warning: 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20',
    info: 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20'
  };
  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn("p-4 rounded-2xl border-l-4 cursor-pointer transition-all", colors[type as keyof typeof colors])}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-black tracking-tight">{title}</p>
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
      <p className="text-xs text-white/60 font-medium mt-1">{desc}</p>
    </motion.div>
  );
};
