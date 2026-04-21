import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  MapPin,
  User,
  FileText,
  Banknote,
  Settings2,
  ChevronRight,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HardHat,
  ClipboardList,
  ClipboardCheck,
  Users,
  Handshake,
  Globe,
  DollarSign
} from 'lucide-react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import { motion, AnimatePresence } from 'motion/react';

import { exportToCSV } from '../../lib/exportUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useHistory } from '../../context/HistoryContext';

// Fonction simple pour calculer le temps restant
const calculateTimeRemaining = (endDate: string): string => {
  if (!endDate) return '142 Jours'; // Valeur par défaut
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} jours de retard`;
  } else if (diffDays === 0) {
    return 'Dernier jour';
  } else {
    return `${diffDays} jours`;
  }
};

// Fonction pour formater les dates des avenants
const formatDateAmendment = (dateStr: string): string => {
  if (!dateStr || dateStr === '0000-00-00') return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { projectService } from '../../services/project.service';
import { ProjectTasksPanel } from '../../components/project/ProjectTasksPanel';
import { amendmentService } from '../../services/amendment.service';

export const ProjectsPage = () => {
  const today = new Date().toISOString().split('T')[0];
  const { can } = usePermissions();
  const { role, profile } = useUser();
  const userName = profile?.name;
  const { addLog } = useHistory();
  const { projects, setProjects, addProject, updateProject, deleteProject, transactions, dailyReports, addDailyReport, employees, subcontracts, updateSubcontract } = useData();
  const { notify } = useNotification();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'personnel' | 'subcontracting' | 'tasks' | 'reports'>('info');
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Toutes les régions');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isGanttModalOpen, setIsGanttModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [ganttProject, setGanttProject] = useState<any>(null);
  const [isGanttEditMode, setIsGanttEditMode] = useState(false);

  const loadAmendments = async (projectId: number) => {
    setIsLoadingAmendments(true);
    try {
      const data = await amendmentService.getAll(projectId);
      setAmendments(data);
    } catch { setAmendments([]); }
    finally { setIsLoadingAmendments(false); }
  };

  const handleCreateAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!newAmendment.justification.trim()) { notify('La justification est obligatoire', 'error'); return; }
    setIsSubmittingAmendment(true);
    try {
      await amendmentService.create(editingProject.id, {
        ...newAmendment,
        ancienBudget: newAmendment.ancienBudget ? Number(newAmendment.ancienBudget) : undefined,
        nouveauBudget: newAmendment.nouveauBudget ? Number(newAmendment.nouveauBudget) : undefined
});
      notify('Avenant créé avec succès — En attente de validation DG', 'success');
      setIsAmendmentModalOpen(false);
      setNewAmendment({ type: 'Délai', justification: '', ancienneDate: '', nouvelleDate: '', ancienBudget: '', nouveauBudget: '' });
      loadAmendments(editingProject.id);
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmittingAmendment(false); }
  };
  const [isUpdatingGantt, setIsUpdatingGantt] = useState(false);
  const [isUpdatingGanttPanel, setIsUpdatingGanttPanel] = useState(false);
  const [isExportGanttModalOpen, setIsExportGanttModalOpen] = useState(false);
  const [isExportingGantt, setIsExportingGantt] = useState(false);
  const [isExportSuccess, setIsExportSuccess] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [amendments, setAmendments] = useState<any[]>([]);
  const [isAmendmentModalOpen, setIsAmendmentModalOpen] = useState(false);
  const [isLoadingAmendments, setIsLoadingAmendments] = useState(false);
  const [newAmendment, setNewAmendment] = useState({
    type: 'Délai' as 'Délai' | 'Budget' | 'Périmètre' | 'Autre',
    justification: '',
    ancienneDate: '',
    nouvelleDate: '',
    ancienBudget: '',
    nouveauBudget: ''
});
  const [isSubmittingAmendment, setIsSubmittingAmendment] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '',
    code: '',
    client: 'MINTP (Travaux Publics)',
    region: 'Littoral',
    location: '',
    budget: '',
    air: '2.2% (Régime Réel)',
    guarantee: '10',
    bank: '',
    manager: '',
    startDate: '',
    duration: '12',
    status: 'préparation',
    category: 'Bâtiment' as 'Bâtiment' | 'Voirie' | 'Autre',
    subCategory: '' as string
});

  const regions = [
    'Toutes les régions',
    'Littoral',
    'Centre',
    'Sud',
    'Ouest',
    'Est',
    'Nord',
    'Extrême-Nord',
    'Adamaoua',
    'Nord-Ouest',
    'Sud-Ouest'
  ];

  // Charger les projets depuis l'API au montage
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectService.getAll();
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
          category: p.category || '',
          subCategory: p.subCategory || ''
}));
        setProjects(normalized);
      } catch (err: any) {
        notify(err.message || 'Erreur lors du chargement des chantiers', 'error');
      }
    };

    loadProjects();
  }, []);

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      (project.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (project.client?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (project.code?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    const matchesRegion = selectedRegion === 'Toutes les régions' || project.region === selectedRegion;

    // For technicians, only show projects they are assigned to or have been assigned to
    if (role === 'technicien') {
      const currentEmployee = employees.find(e => e.name === userName);
      const isAssigned = project.id === currentEmployee?.projectId;
      const wasAssigned = currentEmployee?.assignmentHistory?.includes(project.name);
      return matchesSearch && matchesRegion && (isAssigned || wasAssigned);
    }

    return matchesSearch && matchesRegion;
  });

  const handlePrint = () => {
    window.print();
  };

  // Suppression de mapFrontendStatusToBackend au profit de la conservation des statuts détaillés

  // Charger les informations existantes du projet selon le type d'avenant
  const handleAmendmentTypeChange = (type: string) => {
    if (!editingProject) return;
    
    setNewAmendment(p => ({ 
      ...p, 
      type: type as any,
      // Réinitialiser les champs selon le type
      ancienneDate: type === 'Délai' ? editingProject.end || editingProject.endDate || '' : '',
      nouvelleDate: '',
      ancienBudget: type === 'Budget' ? String(editingProject.budget || 0) : '',
      nouveauBudget: ''
    }));
  };

  // Charger les avenants quand un projet est sélectionné
  useEffect(() => {
    if (selectedProject) {
      loadAmendments(selectedProject.id);
    }
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addStep < 4) {
      setAddStep(addStep + 1);
      return;
    }

    try {
      const startDate = newProject.startDate || new Date().toISOString().split('T')[0];
      const durationMonths = parseInt(newProject.duration || '12', 10);
      const computedEndDate = new Date(startDate);
      computedEndDate.setMonth(computedEndDate.getMonth() + durationMonths);

      const payload = {
        code: newProject.code || `CH-${Date.now()}`,
        name: newProject.name || '',
        client: newProject.client || '',
        budget: Number(newProject.budget || 0),
        location: newProject.location || '',
        region: newProject.region || '',
        startDate,
        endDate: computedEndDate.toISOString().split('T')[0],
        status: newProject.status || 'préparation',
        category: newProject.category || 'Autre',
        subCategory: (newProject.subCategory && newProject.subCategory !== '') ? newProject.subCategory : undefined,
        manager: newProject.manager || '',
        progress: { 'préparation': 0, 'lancement': 15, 'exécution': 40, 'suivi': 65, 'contrôle': 85, 'clôture': 100 }[newProject.status] ?? 0
};

      const createdProject = await projectService.create(payload as any);

      addProject({
        id: createdProject.id,
        code: createdProject.code,
        name: createdProject.name,
        client: createdProject.client,
        status: createdProject.status,
        budget: Number(createdProject.budget),
        progress: createdProject.progress || 0,
        location: createdProject.location || '',
        region: createdProject.region || '',
        manager: createdProject.manager || '',
        category: createdProject.category || 'Autre',
        subCategory: createdProject.subCategory || '',
        start: createdProject.startDate || '',
        end: createdProject.endDate || '',
        startDate: createdProject.startDate || '',
        endDate: createdProject.endDate || ''
} as any);

      addLog({
        module: 'Projets',
        action: `Création du chantier: ${createdProject.name}`,
        user: userName || 'Utilisateur',
        type: 'success'
      });

      notify(`Le chantier "${createdProject.name}" a été créé avec succès.`, 'success', '/projects');

      setIsAddModalOpen(false);
      setAddStep(1);
      setNewProject({
        name: '',
        code: '',
        client: 'MINTP (Travaux Publics)',
        region: 'Littoral',
        location: '',
        budget: '',
        air: '2.2% (Régime Réel)',
        guarantee: '10',
        bank: '',
        manager: '',
        startDate: '',
        duration: '12'
      });
    } catch (err: any) {
      notify(err.message || 'Erreur lors de la création du chantier', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await projectService.remove(projectToDelete.id);
      deleteProject(projectToDelete.id);
      
      // Forcer le rafraîchissement des données depuis le backend
      setTimeout(() => {
        window.location.reload();
      }, 500);

      addLog({
        module: 'Projets',
        action: `Suppression du chantier: ${projectToDelete.name}`,
        user: userName || 'Utilisateur',
        type: 'warning'
      });

      notify(`Le chantier "${projectToDelete.name}" a été supprimé avec succès.`, 'success', '/projects');
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (err: any) {
      notify(err.message || 'Erreur lors de la suppression du chantier', 'error');
    }
  };
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <HardHat className="w-4 h-4" />
            <span>Exécution Chantier</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gestion des Chantiers</h1>
          <p className="text-slate-500 font-medium mt-1">Digitalisation complète du cycle de vie BTP au Cameroun</p>
        </div>
        {(role === 'dg' || role === 'chef') && (
          <Button onClick={() => setIsAddModalOpen(true)} className="shadow-lg shadow-blue-900/20 h-12 px-6 font-bold">
            <Plus className="w-5 h-5 mr-2" />
            Créer un Chantier
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      {/* ... */}

      {/* Project Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProjects.map((project) => (
            <motion.div
              key={project.id ?? `tmp-${project.code ?? Math.random()}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="group cursor-pointer"
              onClick={() => {
                setSelectedProject(project);
              }}
            >
              <Card className="h-full border-none shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 overflow-hidden flex flex-col">
                <div className="h-2 bg-[var(--color-primary)] w-full"></div>
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{project.code}</span>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                        project.status === 'clôture' ? "bg-slate-900 text-white" :
                        project.status === 'contrôle' ? "bg-emerald-500 text-white" :
                        project.status === 'exécution' ? "bg-blue-600 text-white shadow-lg shadow-blue-200" :
                        project.status === 'suivi' ? "bg-indigo-500 text-white" :
                        project.status === 'lancement' ? "bg-amber-500 text-white" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 mr-1.5 animate-pulse" />
                        {project.status}
                      </span>
                    </div>
                    {(role === 'dg' || role === 'chef') && (
                      <div className="relative">
                        <button 
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const dropdown = e.currentTarget.nextElementSibling;
                            if (dropdown) {
                              dropdown.classList.toggle('opacity-100');
                              dropdown.classList.toggle('visible');
                            }
                          }}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <div className="menu-dropdown absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 opacity-0 invisible transition-all">
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setIsEditProjectModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Settings2 className="w-4 h-4" />
                            Modifier les Informations
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                              setIsDeleteModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Supprimer le Chantier
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-[var(--color-primary)] transition-colors tracking-tight leading-tight">
                    {project.name}
                  </h3>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-sm text-slate-600 font-medium">
                      <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                      {project.client}
                    </div>
                    <div className="flex items-center text-sm text-slate-600 font-medium">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                      {project.location}
                    </div>
                    <div className="flex items-center text-sm text-slate-600 font-medium">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      {project.manager}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Avancement Physique</span>
                      <span className="text-slate-900">{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-[var(--color-primary)] rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs font-bold text-slate-600 hover:text-[var(--color-primary)] hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(project);
                      setActiveTab('info');
                    }}
                  >
                    Détails Marché
                  </Button>
                  {(role === 'dg' || role === 'chef') && (
                    <>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs font-bold text-slate-600 hover:text-[var(--color-primary)] hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                          setIsEditProjectModalOpen(true);
                        }}
                      >
                        Modifier
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Chantier</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Localisation</th>
                <th className="px-6 py-4">Avancement</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                        <HardHat className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm">{project.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{project.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{project.client}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{project.location}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-900">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                      project.status === 'clôture' ? "bg-emerald-100 text-emerald-700" :
                        project.status === 'exécution' ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                    )}>{project.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                          setActiveTab('info');
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      {(role === 'dg' || role === 'chef') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                            setIsEditProjectModalOpen(true);
                          }}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Project Modal (Wizard) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ouverture de Dossier Marché"
        size="lg"
      >
        <div className="space-y-8">
          {/* Stepper */}
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[
              { step: 1, label: 'Admin' },
              { step: 2, label: 'Finances' },
              { step: 3, label: 'Technique' },
              { step: 4, label: 'Résumé' }
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-2 z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all",
                  addStep >= s.step ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
                )}>
                  {s.step}
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest", addStep >= s.step ? "text-slate-900" : "text-slate-300")}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateProject} className="space-y-6">
            {addStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Identification Administrative</h4>
                <Input
                  label="Libellé du Marché"
                  placeholder="Ex: Construction d'un dalot à Douala"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Numéro de Marché"
                    placeholder="N° 001/M/MINTP/..."
                    required
                    value={newProject.code}
                    onChange={(e) => setNewProject({ ...newProject, code: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Maître d'Ouvrage</label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      placeholder="Ex: MINTP, MINSANTE, PAK..."
                      value={newProject.client}
                      onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Région</label>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newProject.region}
                      onChange={(e) => setNewProject({ ...newProject, region: e.target.value })}
                    >
                      {regions.filter(r => r !== 'Toutes les régions').map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  {/* Catégorie du chantier */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Catégorie du chantier</label>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newProject.category}
                      onChange={(e) => setNewProject({ ...newProject, category: e.target.value as any, subCategory: '' })}
                    >
                      <option value="Bâtiment"> Bâtiment</option>
                      <option value="Voirie"> Voirie</option>
                      <option value="Autre"> Autre</option>
                    </select>
                  </div>
                  {newProject.category === 'Bâtiment' && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Sous-catégorie</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Gros œuvre', 'Second œuvre'] as const).map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setNewProject({ ...newProject, subCategory: sub })}
                            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${newProject.subCategory === sub ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                          >
                            {sub === 'Gros œuvre' ? '' : '🪟'} {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                  <Input
                    label="Lieu d'Exécution"
                    placeholder="Ville, PK..."
                    required
                    value={newProject.location}
                    onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                  />
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Paramètres Financiers & Fiscaux</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Montant TTC (FCFA)</label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="0"
                        value={newProject.budget}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value >= 0) {
                            setNewProject({ ...newProject, budget: value });
                          }
                        }}
                        min="0"
                        step="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Taux AIR (%)</label>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newProject.air}
                      onChange={(e) => setNewProject({ ...newProject, air: e.target.value })}
                    >
                      <option>2.2% (Régime Réel)</option>
                      <option>5.5% (Régime Simplifié)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Statut Initial</label>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newProject.status}
                      onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                    >
                      <option value="préparation">Préparation</option>
                      <option value="lancement">Lancement</option>
                      <option value="exécution">Exécution</option>
                      <option value="suivi">Suivi</option>
                      <option value="contrôle">Contrôle</option>
                      <option value="clôture">Clôture</option>
                    </select>
                  </div>
                </div>
                <Input
                    label="Retenue de Garantie (%)"
                    type="number"
                    min="0" max="100"
                    placeholder="10"
                    value={newProject.guarantee}
                    onChange={(e) => setNewProject({ ...newProject, guarantee: e.target.value })}
                  />
                <Input
                  label="Banque de Cautionnement"
                  placeholder="Ex: SCB, BICEC, Afriland..."
                  value={newProject.bank}
                  onChange={(e) => setNewProject({ ...newProject, bank: e.target.value })}
                />
              </div>
            )}

            {addStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Organisation Technique</h4>
                <Input
                  label="Conducteur de Travaux"
                  placeholder="Nom du responsable"
                  required
                  value={newProject.manager}
                  onChange={(e) => setNewProject({ ...newProject, manager: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date Ordre de Service"
                    type="date" min={today}
                    required
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  />
                  <Input
                    label="Délai Contractuel (Mois)"
                    type="number"
                    min="1"
                    placeholder="12"
                    required
                    value={newProject.duration}
                    onChange={(e) => setNewProject({ ...newProject, duration: e.target.value })}
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Note: La validation crée automatiquement le planning initial.
                  </p>
                </div>
              </div>
            )}

            {addStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Résumé du Dossier Marché</h4>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Libellé</p>
                      <p className="text-sm font-black text-slate-900">{newProject.name || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Maître d'Ouvrage</p>
                      <p className="text-sm font-black text-slate-900">{newProject.client}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Montant TTC</p>
                      <p className="text-sm font-black text-slate-900">{newProject.budget ? `${parseInt(newProject.budget).toLocaleString()} FCFA` : '0 FCFA'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Délai</p>
                      <p className="text-sm font-black text-slate-900">{newProject.duration} Mois</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Le dossier est prêt à être créé. Les équipes seront notifiées.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="ghost" type="button" onClick={() => addStep > 1 ? setAddStep(addStep - 1) : setIsAddModalOpen(false)}>
                {addStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20">
                {addStep === 4 ? 'Créer le Chantier' : 'Suivant'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Project Details Modal Simulation */}
      <AnimatePresence>
        {selectedProject && (
          <Modal
            isOpen={!!selectedProject}
            onClose={() => setSelectedProject(null)}
            title={`Dossier Marché: ${selectedProject.name}`}
            size="xl"
          >
            <div className="space-y-8">
              {/* Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-0">
                {[
                  { id: 'info', label: 'Infos', icon: FileText, roles: ['dg', 'chef', 'technicien', 'rh'] },
                  { id: 'personnel', label: 'Personnel', icon: Users, roles: ['dg', 'chef', 'rh'] },
                  { id: 'subcontracting', label: 'Sous-traitance', icon: Handshake, roles: ['dg', 'chef'] },
                  { id: 'tasks', label: 'Tâches', icon: ClipboardCheck, roles: ['dg', 'chef', 'technicien'] },
                  { id: 'reports', label: 'Journal', icon: ClipboardList, roles: ['dg', 'chef', 'technicien'] },
                ].filter(tab => tab.roles.includes(role || '')).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative",
                      activeTab === tab.id 
                        ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-blue-50" 
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[450px]">
                {activeTab === 'info' && (
                  <div className="space-y-8">
                    {/* Header avec informations principales */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-slate-900">{selectedProject.name}</h3>
                              <p className="text-sm text-slate-600">Code: {selectedProject.code}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-4">
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                              selectedProject.status === 'clôture' ? "bg-slate-900 text-white" :
                              selectedProject.status === 'contrôle' ? "bg-emerald-500 text-white" :
                              selectedProject.status === 'exécution' ? "bg-blue-600 text-white" :
                              selectedProject.status === 'suivi' ? "bg-indigo-500 text-white" :
                              selectedProject.status === 'lancement' ? "bg-amber-500 text-white" :
                              "bg-slate-100 text-slate-700"
                            )}>
                              {selectedProject.status}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                              {selectedProject.category}
                            </span>
                            {selectedProject.subCategory && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                {selectedProject.subCategory}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-blue-600">
                            {Number(selectedProject.budget || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-600 font-medium">FCFA</div>
                        </div>
                      </div>
                    </div>

                    {/* Informations détaillées en grille */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Carte Client et Localisation */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                          </div>
                          <h4 className="font-bold text-slate-900">Client & Localisation</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <User className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Maître d'Ouvrage</div>
                              <div className="font-medium text-slate-900">{selectedProject.client}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Localisation</div>
                              <div className="font-medium text-slate-900">{selectedProject.location}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Globe className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Région</div>
                              <div className="font-medium text-slate-900">{selectedProject.region}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Carte Équipe */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <h4 className="font-bold text-slate-900">Équipe</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <HardHat className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Conducteur de Travaux</div>
                              <div className="font-medium text-slate-900">{selectedProject.manager || 'Non assigné'}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Avenants</div>
                              <div className="font-medium text-slate-900">{amendments.length} avenant(s)</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Carte Planning */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-amber-600" />
                          </div>
                          <h4 className="font-bold text-slate-900">Planning</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Date de Début</div>
                              <div className="font-medium text-slate-900">{selectedProject.start}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Date de Fin</div>
                              <div className="font-medium text-slate-900">{selectedProject.end}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <div className="text-xs text-slate-500">Temps restant</div>
                              <div className="font-bold text-blue-600">{calculateTimeRemaining(selectedProject.end)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Budget Détaillé */}
                    {(selectedProject.budgetItems && selectedProject.budgetItems.length > 0) && (
                      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-lg">Budget Détaillé par Poste</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedProject.budgetItems.map((item: any, index: number) => (
                            <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                              <div className="text-sm font-medium text-slate-700 mb-2">{item.poste}</div>
                              <div className="text-xl font-bold text-green-700">
                                {Number(item.montantPrevu || 0).toLocaleString()} FCFA
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'personnel' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Personnel Affecté</h4>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher..."
                          className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[var(--color-primary)] outline-none w-64"
                        />
                      </div>
                    </div>
                    <div className="overflow-hidden border border-slate-100 rounded-3xl">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Employé</th>
                            <th className="px-6 py-4">Poste</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {employees.filter(e => e.projectId === selectedProject.id).map(e => (
                            <tr key={e.id} className="text-sm font-medium hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-black">{e.name}</td>
                              <td className="px-6 py-4 text-slate-500">{e.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'subcontracting' && (
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contrats de Sous-traitance</h4>
                    <div className="grid grid-cols-1 gap-6">
                      {subcontracts.filter(s => s.projectId === selectedProject.id).map(s => (
                        <Card key={s.id} className="p-6 border-none shadow-sm bg-slate-50/50">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[var(--color-primary)] shadow-sm">
                                <Handshake className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-lg">{s.entreprise}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.objet}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montant Contrat</p>
                              <p className="text-lg font-black text-slate-900">{s.montant.toLocaleString()} FCFA</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Avancement des tâches</span>
                              <span className="text-xs font-black text-[var(--color-primary)]">{s.progress}%</span>
                            </div>
                            <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${s.progress}%` }}
                                className="h-full bg-[var(--color-primary)]"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                              {s.tasks?.map((task: any) => (
                                <div
                                  key={task.id}
                                  onClick={() => {
                                    const updatedTasks = s.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t);
                                    const completedCount = updatedTasks.filter(t => t.completed).length;
                                    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;
                                    updateSubcontract(s.id, { tasks: updatedTasks, progress });
                                  }}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                    task.completed
                                      ? "bg-emerald-50 border-emerald-100 text-emerald-900"
                                      : "bg-white border-slate-100 text-slate-600 hover:border-[var(--color-primary)]"
                                  )}
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                    task.completed
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "bg-white border-slate-300"
                                  )}>
                                    {task.completed && <ClipboardCheck className="w-3 h-3" />}
                                  </div>
                                  <span className={cn(
                                    "text-xs font-bold",
                                    task.completed && "line-through opacity-50"
                                  )}>
                                    {task.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                      {subcontracts.filter(s => s.projectId === selectedProject.id).length === 0 && (
                        <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <p className="text-slate-400 font-bold">Aucun contrat de sous-traitance pour ce chantier</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <ProjectTasksPanel
                    projectId={selectedProject.id}
                    employees={employees.filter((e: any) => Number(e.projectId) === Number(selectedProject.id))}
                    canEdit={role === 'chef' || role === 'dg'}
                  />
                )}

                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Journal de Chantier Digital</h4>
                      <Button size="sm" className="font-bold" onClick={() => setIsNewReportModalOpen(true)}>Nouveau Rapport Journalier</Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {dailyReports
                        .filter(r => r.projectId === selectedProject.id)
                        .map((report) => (
                          <div key={report.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:shadow-xl hover:border-[var(--color-primary)] transition-all cursor-pointer group">
                            <div className="flex items-center gap-6">
                              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                                <ClipboardList className="w-7 h-7" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-lg tracking-tight">Rapport du {new Date(report.date).toLocaleDateString('fr-FR')}</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-slate-500 font-bold flex items-center"><User className="w-3 h-3 mr-1" /> {report.reporter}</span>
                                  <span className="text-xs text-slate-500 font-bold flex items-center"><MapPin className="w-3 h-3 mr-1" /> {report.location}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right hidden md:block">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Météo</p>
                                <p className="text-sm font-black text-slate-900">{report.weather}</p>
                              </div>
                              <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                              <span className={cn(
                                "text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider",
                                report.status === 'Validé' ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                              )}>{report.status}</span>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[var(--color-primary)] transition-colors" />
                            </div>
                          </div>
                        ))}
                      {dailyReports.filter(r => r.projectId === selectedProject.id).length === 0 && (
                        <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <p className="text-slate-400 font-bold">Aucun rapport journalier pour ce chantier</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-end gap-3 print:hidden">
                <Button variant="outline" onClick={() => setSelectedProject(null)} className="font-bold h-12 px-6">Fermer</Button>
                <Button onClick={handlePrint} className="font-bold h-12 px-8 shadow-lg shadow-blue-900/20">Imprimer Fiche Marché</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Project Modal */}
        {isEditProjectModalOpen && (
          <Modal
            isOpen={isEditProjectModalOpen}
            onClose={() => setIsEditProjectModalOpen(false)}
            title={`Modifier le Chantier: ${editingProject?.name}`}
            size="lg"
          >
            <form
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newStatus = formData.get('status') as string;
                // Progress uniquement si le statut change
                const STATUS_PROGRESS: Record<string, number> = {
                  'préparation': 0, 'lancement': 15, 'exécution': 40,
                  'suivi': 65, 'contrôle': 85, 'clôture': 100
};
                const updates: any = {
                  name: formData.get('name') as string,
                  code: formData.get('code') as string,
                  client: formData.get('client') as string,
                  manager: formData.get('manager') as string,
                  status: newStatus,
                  budget: formData.get('budget') as string,
                  location: formData.get('location') as string,
                  region: formData.get('region') as string,
                  startDate: formData.get('start') as string,
                  endDate: formData.get('end') as string
};
                // Calculer progress UNIQUEMENT si le statut a changé
                if (newStatus !== editingProject?.status) {
                  updates.progress = STATUS_PROGRESS[newStatus] ?? editingProject?.progress ?? 0;
                }
                try {
                  await updateProject(editingProject!.id, updates);
                  addLog({
                    action: "Modification chantier",
                    user: userName || "Utilisateur",
                    details: `Chantier ${updates.name} mis à jour`,
                    type: "info"
                  });
                  notify(`Chantier "${updates.name}" mis à jour avec succès.`, 'success', '/projects');
                  setIsEditProjectModalOpen(false);
                } catch (err: any) {
                  notify(err?.message || 'Erreur lors de la mise à jour', 'error', '/projects');
                }
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nom du Projet" name="name" defaultValue={editingProject?.name} required />
                <Input label="Code Projet" name="code" defaultValue={editingProject?.code} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Client" name="client" defaultValue={editingProject?.client} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Statut</label>
                  <select
                    name="status"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    defaultValue={editingProject?.status}
                  >
                    <option value="préparation">Préparation</option>
                    <option value="lancement">Lancement</option>
                    <option value="exécution">Exécution</option>
                    <option value="suivi">Suivi</option>
                    <option value="contrôle">Contrôle</option>
                    <option value="clôture">Clôture</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Budget (FCFA)" name="budget" defaultValue={editingProject?.budget} required />
                <Input label="Localisation" name="location" defaultValue={editingProject?.location} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Conducteur de Travaux" name="manager" defaultValue={editingProject?.manager} />
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Région</label>
                  <select
                    name="region"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    defaultValue={editingProject?.region}
                  >
                    {regions.filter(r => r !== 'Toutes les régions').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Date Début" name="start" type="date" min={today} defaultValue={editingProject?.start} required />
                <Input label="Date Fin Prévue" name="end" type="date" min={today} defaultValue={editingProject?.end} required />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsEditProjectModalOpen(false)}>Annuler</Button>
                <Button variant="outline" type="button"
                  onClick={() => { loadAmendments(editingProject!.id); setIsAmendmentModalOpen(true); }}
                  className="font-bold border-amber-300 text-amber-700 hover:bg-amber-50 gap-1">
                   Avenants {amendments.length > 0 && `(${amendments.length})`}
                </Button>
                <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20">Enregistrer</Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Avenants */}
        {isAmendmentModalOpen && editingProject && (
          <Modal isOpen={isAmendmentModalOpen} onClose={() => setIsAmendmentModalOpen(false)}
            title={`Avenants — ${editingProject.name}`} size="lg">
            <div className="space-y-6">
              {/* Historique */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-slate-900">Historique des avenants</h3>
                  <span className="text-sm text-slate-500">{amendments.length} avenant(s)</span>
                </div>
                {isLoadingAmendments ? (
                  <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>
                ) : amendments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-500">Aucun avenant enregistré</div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {amendments.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">{a.type}</span>
                            <p className="text-sm font-medium text-slate-700 mt-1">{a.justification}</p>
                            {a.type === 'Délai' && a.ancienneDate && a.nouvelleDate && (
                              <p className="text-xs text-slate-500 mt-1"> {formatDateAmendment(a.ancienneDate)} &rarr; <span className="font-bold text-[var(--color-primary)]">{formatDateAmendment(a.nouvelleDate)}</span></p>
                            )}
                            {a.type === 'Budget' && a.ancienBudget && a.nouveauBudget && (
                              <p className="text-xs text-slate-500 mt-1"> {Number(a.ancienBudget).toLocaleString()} &rarr; <span className="font-bold text-[var(--color-primary)]">{Number(a.nouveauBudget).toLocaleString()} FCFA</span></p>
                            )}
                          </div>
                          <span className={`text-xs font-black px-2 py-1 rounded-full ${a.statut === 'Approuvé' ? 'bg-emerald-100 text-emerald-700' : a.statut === 'Rejeté' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {a.statut}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire nouvel avenant */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-black text-slate-900 mb-4">Nouvel avenant</h3>
                <form onSubmit={handleCreateAmendment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Type de modification</label>
                      <select value={newAmendment.type} onChange={e => handleAmendmentTypeChange(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                        <option value="Délai"> Modification de délai</option>
                        <option value="Budget"> Modification de budget</option>
                        <option value="Périmètre"> Modification de périmètre</option>
                        <option value="Autre"> Autre</option>
                      </select>
                    </div>
                  </div>
                  {newAmendment.type === 'Délai' && (
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Ancienne date de fin" type="date" min={today} value={newAmendment.ancienneDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, ancienneDate: e.target.value }))} 
                        readonly className="bg-slate-100 cursor-not-allowed" />
                      <Input label="Nouvelle date de fin" type="date" min={today} value={newAmendment.nouvelleDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, nouvelleDate: e.target.value }))} />
                    </div>
                  )}
                  {newAmendment.type === 'Budget' && (
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Budget initial (FCFA)" type="number" min="0" value={newAmendment.ancienBudget}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, ancienBudget: e.target.value }))} 
                        readonly className="bg-slate-100 cursor-not-allowed" />
                      <Input label="Nouveau budget (FCFA)" type="number" min="0" value={newAmendment.nouveauBudget}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, nouveauBudget: e.target.value }))} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Justification <span className="text-red-500">*</span></label>
                    <textarea value={newAmendment.justification} required
                      onChange={e => setNewAmendment(p => ({ ...p, justification: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                      placeholder="Décrivez la raison de cette modification (retards approvisionnement, intempéries, modification client...)"/>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" type="button" onClick={() => setIsAmendmentModalOpen(false)}>Fermer</Button>
                    <Button type="submit" isLoading={isSubmittingAmendment}>Soumettre l'avenant</Button>
                  </div>
                </form>
              </div>
            </div>
          </Modal>
        )}

        {/* Gantt Modal */}
        {isGanttModalOpen && (
          <Modal
            isOpen={isGanttModalOpen}
            onClose={() => setIsGanttModalOpen(false)}
            title={`Planning GANTT: ${ganttProject?.name}`}
            size="xl"
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900">Calendrier d'Exécution</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Période: {ganttProject?.start} au {ganttProject?.end}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="font-bold" onClick={() => setIsExportGanttModalOpen(true)}>
                    Exporter MS Project
                  </Button>
                  <Button
                    variant={isGanttEditMode ? "primary" : "outline"}
                    size="sm"
                    className="font-bold"
                    onClick={() => {
                      if (isGanttEditMode) {
                        setIsUpdatingGantt(true);
                        setTimeout(() => {
                          setIsUpdatingGantt(false);
                          setIsGanttEditMode(false);
                          // planning updated
                        }, 1000);
                      } else {
                        setIsGanttEditMode(true);
                      }
                    }}
                    disabled={isUpdatingGantt}
                  >
                    {isUpdatingGantt ? "Mise à jour..." : isGanttEditMode ? "Mettre à jour le Planning" : "Éditer le Planning"}
                  </Button>
                  <Button variant="outline" size="sm" className="font-bold" onClick={() => setIsAddTaskModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une Tâche
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                <div className="min-w-[800px] p-6 space-y-6">
                  {/* Gantt Header */}
                  <div className="grid grid-cols-12 gap-4 border-b border-slate-100 pb-4">
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tâche / Activité</div>
                    <div className="col-span-9 grid grid-cols-6 gap-2">
                      {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'].map(m => (
                        <div key={m} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{m}</div>
                      ))}
                    </div>
                  </div>

                  {/* Gantt Rows */}
                  {[
                    { task: 'Terrassement & Fouilles', start: 0, duration: 2, progress: 100, color: 'bg-blue-500' },
                    { task: 'Ouvrages d\'Art (Dalots)', start: 1, duration: 3, progress: 60, color: 'bg-emerald-500' },
                    { task: 'Couche de Fondation', start: 3, duration: 2, progress: 20, color: 'bg-amber-500' },
                    { task: 'Bitumage (BB)', start: 5, duration: 1, progress: 0, color: 'bg-slate-500' },
                  ].map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <p className="text-sm font-black text-slate-900">{item.task}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.progress}% complété</p>
                      </div>
                      <div className="col-span-9 grid grid-cols-6 gap-2 relative h-8 bg-slate-50 rounded-lg overflow-hidden">
                        <div
                          className={cn(
                            "absolute top-1 bottom-1 rounded-md shadow-sm flex items-center justify-center text-[10px] font-black text-white px-2 transition-all",
                            item.color,
                            isGanttEditMode ? "cursor-ew-resize hover:brightness-110" : ""
                          )}
                          style={{
                            left: `${(item.start / 6) * 100}%`,
                            width: `${(item.duration / 6) * 100}%`
                          }}
                        >
                          {item.duration}m
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isGanttEditMode && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Modification des Informations Gantt</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Tâche Sélectionnée" defaultValue="Ouvrages d'Art (Dalots)" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Début (Mois)" type="number" min="0" defaultValue="2" />
                      <Input label="Durée (Mois)" type="number" min="1" defaultValue="3" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      className="font-bold"
                      onClick={() => {
                        setIsUpdatingGanttPanel(true);
                        setTimeout(() => {
                          setIsUpdatingGanttPanel(false);
                          // task updated
                        }, 1000);
                      }}
                      disabled={isUpdatingGanttPanel}
                    >
                      {isUpdatingGanttPanel ? "Mise à jour..." : "Mettre à jour la Tâche"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsGanttModalOpen(false)} className="font-bold">Fermer</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Project Modal */}
        {isDeleteModalOpen && (
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Confirmer la suppression"
            size="sm"
          >
            <div className="space-y-6">
              <p className="text-sm text-slate-600">Êtes-vous sûr de vouloir supprimer le chantier <span className="font-black text-slate-900">{projectToDelete?.name}</span> ? Cette action est irréversible.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Annuler</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 font-bold"
                  onClick={handleDeleteProject}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {/* New Daily Report Modal Workflow */}
        {isNewReportModalOpen && (
          <Modal
            isOpen={isNewReportModalOpen}
            onClose={() => setIsNewReportModalOpen(false)}
            title="Saisie Journal de Chantier"
            size="lg"
          >
            <form className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <Input label="Date du Jour" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Effectifs Présents (VAN BTP + Sous-traitants)</label>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Ouvriers" type="number" min="0" />
                  <Input placeholder="Engins" type="number" min="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Travaux Réalisés (Tâches & PK)</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium h-32 focus:ring-2 focus:ring-[var(--color-primary)] outline-none" placeholder="Détaillez les activités du jour..."></textarea>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700">Note: Ce rapport sera transmis au Bureau de Contrôle pour visa contradictoire.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsNewReportModalOpen(false)} disabled={isSubmittingReport}>Annuler</Button>
                <Button
                  type="button"
                  className="px-8 font-bold"
                  onClick={async () => {
                    setIsSubmittingReport(true);
                    try {
                      await addDailyReport({
                        reportDate: new Date().toISOString().split('T')[0],
                        projectId: selectedProject.id,
                        weather: 'Ensoleillé',
                        // ENUM DB: Brouillon / Soumis / Validé
                        status: 'Soumis',
                        workDone: '',
                        issuesEncountered: '',
                        nextDayPlan: '',
                        workerCount: 0
});
                      addLog({
                        action: "Nouveau rapport journalier",
                        user: userName || "Utilisateur",
                        details: `Rapport créé pour le chantier ${selectedProject.name}`,
                        type: "control"
                      });
                      notify("Rapport journalier enregistré avec succès.", 'success', '/projects');
                      setIsNewReportModalOpen(false);
                    } catch (err: any) {
                      notify(err?.message || 'Erreur lors de la soumission du rapport', 'error', '/projects');
                    } finally {
                      setIsSubmittingReport(false);
                    }
                  }}
                  disabled={isSubmittingReport}
                >
                  {isSubmittingReport ? "Soumission..." : "Soumettre au MDC"}
                </Button>
              </div>
            </form>
          </Modal>
        )}
        {/* Export Gantt Modal */}
        <Modal
          isOpen={isExportGanttModalOpen}
          onClose={() => {
            setIsExportGanttModalOpen(false);
            setIsExportSuccess(false);
          }}
          title="Exporter vers MS Project"
          size="sm"
        >
          {isExportSuccess ? (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-600">L'export MS Project a été généré avec succès.</p>
              <Button className="w-full font-bold" onClick={() => {
                setIsExportGanttModalOpen(false);
                setIsExportSuccess(false);
              }}>Télécharger le fichier .mpp</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Format d'export</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option>MS Project XML (.xml)</option>
                  <option>MS Project (.mpp)</option>
                  <option>Excel (.xlsx)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Période</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option>Projet complet</option>
                  <option>3 prochains mois</option>
                  <option>Mois en cours</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsExportGanttModalOpen(false)} disabled={isExportingGantt}>Annuler</Button>
                <Button
                  className="font-bold"
                  onClick={() => {
                    setIsExportingGantt(true);

                    // Prepare tasks for export
                    const tasks = [
                      { task: 'Terrassement & Fouilles', start: 0, duration: 2, progress: 100 },
                      { task: 'Ouvrages d\'Art (Dalots)', start: 1, duration: 3, progress: 60 },
                      { task: 'Couche de Fondation', start: 3, duration: 2, progress: 20 },
                      { task: 'Bitumage (BB)', start: 5, duration: 1, progress: 0 },
                    ].map(t => ({
                      Tache: t.task,
                      Debut_Mois: t.start + 1,
                      Duree_Mois: t.duration,
                      Progression: `${t.progress}%`
                    }));

                    setTimeout(() => {
                      exportToCSV(tasks, `planning_gantt_${ganttProject?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
                      setIsExportingGantt(false);
                      setIsExportSuccess(true);
                    }, 1500);
                  }}
                  disabled={isExportingGantt}
                >
                  {isExportingGantt ? "Génération..." : "Générer l'export"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add Task Modal */}
        <Modal
          isOpen={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          title="Ajouter une Tâche"
          size="md"
        >
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            setIsAddTaskModalOpen(false);
            // task added
          }}>
            <Input label="Nom de la tâche" required />
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Lot / Phase</label>
              <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                <option>Terrassement</option>
                <option>Ouvrages d'Art</option>
                <option>Chaussée</option>
                <option>Signalisation</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date de début" type="date" min={today} required />
              <Input label="Date de fin" type="date" min={today} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Responsable" required />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Statut</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option>À faire</option>
                  <option>En cours</option>
                  <option>Terminé</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setIsAddTaskModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="font-bold">Ajouter la tâche</Button>
            </div>
          </form>
        </Modal>

      </AnimatePresence>
    </div>
  );
};

const InfoItem = ({ label, value }: any) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <p className="text-sm font-black text-slate-900">{value}</p>
  </div>
);
