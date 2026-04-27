import React, { useState } from 'react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileWarning,
  Plus,
  MapPin,
  Clock,
  Camera,
  User,
  Search,
  Filter,
  ChevronRight,
  ClipboardCheck,
  Eye,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Trash2,
  Edit,
  Download,
  ArrowUpDown,
  Check,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { exportToCSV } from '../../lib/exportUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useHistory } from '../../context/HistoryContext';
import { useUser } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';

export const ControlPage = () => {
  const { can } = usePermissions();
  const { addLog } = useHistory();
  const { profile, role } = useUser();
  const name = profile?.name;
  const { projects, incidents, addIncident, updateIncident, audits, addAudit, employees, checklists, addChecklist, updateChecklist, deleteChecklist, toggleChecklistTask } = useData();
  const { notify } = useNotification();

  const getProjectNameById = (projectId?: number) => projects.find(p => p.id === projectId)?.name || 'Chantier inconnu';
  const getProjectIdByName = (name?: string) => projects.find(p => p.name === name)?.id || 0;

  const currentEmployee = employees.find(e => e.matricule === profile?.matricule);
  const technicianProjectId = currentEmployee?.projectId || getProjectIdByName(currentEmployee?.project);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentStep, setIncidentStep] = useState(1);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditStep, setAuditStep] = useState(1);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'hse' | 'quality'>('all');
  const [controlTab, setControlTab] = useState<'incidents' | 'audits' | 'checklists'>('incidents');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  
  // New States
  const [isFullHistoryModalOpen, setIsFullHistoryModalOpen] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [statusUpdateComment, setStatusUpdateComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [showToast, setShowToast] = useState(false);

  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [isNewChecklistModalOpen, setIsNewChecklistModalOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistProjectId, setNewChecklistProjectId] = useState(projects[0]?.id || 0);
  const [newChecklistTasks, setNewChecklistTasks] = useState<string[]>([""]);
  const [editingChecklist, setEditingChecklist] = useState<any>(null);
  const [isEditChecklistModalOpen, setIsEditChecklistModalOpen] = useState(false);
  const [editChecklistTitle, setEditChecklistTitle] = useState("");
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);

  const [newIncident, setNewIncident] = useState({
    type: 'Accident de travail',
    gravity: 'Moyen',
    projectId: projects[0]?.id || 0,
    desc: '',
    title: ''
  });

  const [newAudit, setNewAudit] = useState({
    type: 'Inspection HSE Terrain',
    projectId: projects[0]?.id || 0,
    auditor: '',
    date: '',
    location: '',
    observations: '',
    recommendations: '',
    score: ''
});

  const AUDIT_TYPES = [
    'Inspection HSE Terrain',
    'Contrôle Qualité Ouvrage',
    'Visite de Conformité',
    'Audit Sécurité Chantier',
    'Réception Partielle Travaux',
    'Vérification Matériaux',
    'Contrôle Métrés',
    'Autre',
  ];

  const incidentsData: any[] = [];

  const effectiveProjectFilter = role === 'technicien' ? (technicianProjectId || null) : selectedProjectFilter;

  const filteredIncidents = incidents.filter(incident => {
    const matchesTab = activeTab === 'all' || incident.category === activeTab;
    const matchesProject = effectiveProjectFilter === null || incident.projectId === effectiveProjectFilter;
    return matchesTab && matchesProject;
  });

  const filteredAudits = audits.filter(audit => 
    effectiveProjectFilter === null || audit.projectId === effectiveProjectFilter
  );

  const [incidentImage, setIncidentImage] = useState<string | null>(null);
  const [incidentFile, setIncidentFile] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIncidentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIncidentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incidentStep < 2) {
      setIncidentStep(incidentStep + 1);
    } else {
      if (isSubmittingIncident) return; // Protection contre les clics multiples
      
      setIsSubmittingIncident(true);
      try {
        const incidentId = Date.now();
        const incidentTitle = newIncident.title || `${newIncident.type} - ${getProjectNameById(newIncident.projectId)}`;
        await addIncident({
          projectId: newIncident.projectId,
          type: newIncident.type,
          category: newIncident.type.toLowerCase().includes('accident') || newIncident.type.toLowerCase().includes('hse') || newIncident.type.toLowerCase().includes('pollution') ? 'hse' : 'quality',
          // Mapper 'Moyen' vers 'Modéré' (ENUM DB: Mineur/Modéré/Grave/Critique)
          gravity: newIncident.gravity === 'Moyen' ? 'Modéré' : (newIncident.gravity || 'Mineur'),
          title: incidentTitle,
          description: newIncident.desc,
          incidentDate: new Date().toISOString().split('T')[0],
          // status ENUM DB: 'Ouvert', 'En cours de traitement', 'Résolu', 'Fermé'
          status: 'Ouvert',
          actionPlan: 'Analyse en cours par le responsable HSE.',
          impact: 'Évaluation de l\'impact en cours.',
          imageFile: incidentFile
        });
        addLog({
          module: 'Contrôle',
          action: `Déclaration d'un incident: ${incidentTitle}`,
          user: name || 'Utilisateur',
          type: 'danger'
        });
        notify(`Incident "${incidentTitle}" déclaré avec succès.`, 'warning', '/control');
        setIsIncidentModalOpen(false);
        setIncidentStep(1);
        setIncidentImage(null);
        setIncidentFile(null);
        setNewIncident({
          type: 'Accident de travail',
          gravity: 'Moyen',
          projectId: projects[0]?.id || 0,
          desc: '',
          title: ''
        });
      } catch (err: any) {
        notify(err?.message || 'Erreur lors de la déclaration de l\'incident', 'error');
      } finally {
        setIsSubmittingIncident(false);
      }
    }
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auditStep < 2) {
      setAuditStep(auditStep + 1);
    } else {
      if (isSubmittingAudit) return; // Protection contre les clics multiples
      
      setIsSubmittingAudit(true);
      try {
        await addAudit({
          title: newAudit.type,
        auditDate: newAudit.date || new Date().toISOString().split('T')[0],
        auditor: newAudit.auditor,
        projectId: newAudit.projectId,
        status: 'Planifié',
        observations: newAudit.observations || '',
        recommendations: newAudit.recommendations || '',
        score: newAudit.score ? Number(newAudit.score) : undefined
});
      addLog({
        module: 'Contrôle',
        action: `Planification d'un audit: ${newAudit.type} sur ${getProjectNameById(newAudit.projectId)}`,
        user: name || 'Utilisateur',
        type: 'info'
      });
      notify(`Audit "${newAudit.type}" planifié avec succès.`, 'success', '/control');
      setIsAuditModalOpen(false);
      setAuditStep(1);
      setNewAudit({
          type: 'Inspection HSE Terrain',
          projectId: projects[0]?.id || 0,
          auditor: '',
          date: '',
          location: '',
          observations: '',
          recommendations: '',
          score: ''
        });
      } catch (err: any) {
        notify(err?.message || 'Erreur lors de la planification de l\'audit', 'error');
      } finally {
        setIsSubmittingAudit(false);
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Contrôle, Qualité & HSE</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Pilotage de la Conformité</h1>
          <p className="text-slate-500 font-medium mt-1">Garantir la sécurité des hommes et la qualité des ouvrages selon les normes MINTP/MINSANTE</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(role === 'dg' || role === 'chef' || role === 'rh') && (
            <Button variant="outline" onClick={() => setIsAuditModalOpen(true)} className="bg-white border-slate-200 h-12 px-6 font-bold">
              <ClipboardCheck className="w-5 h-5 mr-2" />
              Nouveau Contrôle (Audit)
            </Button>
          )}
          {(role === 'chef' || role === 'technicien' || role === 'rh') && (
            <Button variant="danger" onClick={() => setIsIncidentModalOpen(true)} className="shadow-lg shadow-red-900/20 h-12 px-6 font-bold">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Déclarer un Incident
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
            <Filter className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filtrer par Chantier</p>
            {role === 'technicien' ? (
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                <span>{getProjectNameById(technicianProjectId) || "Non assigné"}</span>
              </div>
            ) : (
              <select 
                value={selectedProjectFilter ?? ''}
                onChange={(e) => setSelectedProjectFilter(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer"
              >
                <option value="">Tous les chantiers</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        </Card>
        <ControlKpiCard 
          title="Incidents Ouverts" 
          value={filteredIncidents.filter(i => i.status !== 'Résolu').length.toString()} 
          change={filteredIncidents.filter(i => i.status !== 'Résolu').length > 0 ? "+1" : "0"} 
          isPositive={filteredIncidents.filter(i => i.status !== 'Résolu').length === 0} 
          icon={FileWarning} 
          color="red"
        />
        <ControlKpiCard 
          title="Controle (Audit)" 
          value={filteredAudits.length.toString()} 
          change={filteredAudits.length > 0 ? `+${filteredAudits.length}` : "0"} 
          isPositive={true} 
          icon={ClipboardCheck} 
          color="blue"
        />
      </div>

      {/* Onglets principaux */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { key: 'incidents',  label: 'Incidents' },
          { key: 'audits',     label: 'Audits Terrain' },
          { key: 'checklists', label: 'Checklists' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setControlTab(tab.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
              controlTab === tab.key ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
            {tab.label}
          </button>
        ))}
      </div>

      {controlTab === 'incidents' && (
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Registre des Incidents & Alertes</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('all')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'all' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700")}
              >
                Tout
              </button>
              <button 
                onClick={() => setActiveTab('hse')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'hse' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700")}
              >
                HSE
              </button>
              <button 
                onClick={() => setActiveTab('quality')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'quality' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700")}
              >
                Qualité
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-4 flex-1">
            {filteredIncidents.filter(i => i.status !== 'Fermé').length > 0 ? filteredIncidents.filter(i => i.status !== 'Fermé').map((incident) => (
              <motion.div 
                key={incident.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedIncident(incident)}
                className="p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      incident.gravity === 'Critique' ? "bg-red-100 text-red-600" : 
                      incident.gravity === 'Haute' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                    )}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{incident.type}</span>
                      <h4 className="text-sm font-black text-slate-900 leading-tight">{incident.title}</h4>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1",
                      incident.gravity === 'Critique' ? "bg-red-600 text-white" : 
                      incident.gravity === 'Haute' ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                    )}>
                      {incident.gravity}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{incident.date}</span>
                  </div>
                </div>
                
                <p className="text-xs text-slate-600 font-medium mb-4 line-clamp-2">{incident.desc}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center text-blue-600"><MapPin className="w-3 h-3 mr-1" /> {incident.location}</span>
                    <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {incident.reporter}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-1 rounded-lg",
                      incident.status === 'Résolu' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {incident.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--color-primary)] transition-colors" />
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold">Aucun incident à signaler pour ce chantier.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-center">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500" onClick={() => setIsFullHistoryModalOpen(true)}>
              Voir l'historique complet des incidents
            </Button>
          </div>
        </Card>
      )}

      {controlTab === 'audits' && (
        <Card className="p-8 border-none shadow-xl shadow-slate-200/50 ">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-6">Prochains Audits HSE</h3>
            <div className="space-y-4">
              {filteredAudits.length > 0 ? filteredAudits.map((audit) => (
                <AuditItem 
                  key={audit.id}
                  title={audit.title} 
                  date={audit.date} 
                  auditor={audit.auditor} 
                  onClick={() => setSelectedAudit(audit)}
                />
              )) : (
                <div className="py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-slate-400 text-xs font-bold">Aucun audit planifié.</p>
                </div>
              )}
            </div>
            {(role === 'dg' || role === 'chef' || role === 'rh') && (
              <Button 
                onClick={() => setIsAuditModalOpen(true)}
                className="w-full mt-8 bg-white text-blue-900 hover:bg-blue-50 font-bold border-none"
              >
                Planifier un Audit
              </Button>
            )}
          </Card>
      )}

      {controlTab === 'checklists' && (
        <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Checklists de Contrôle</h3>
                <CheckSquare className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div className="space-y-4">
                {checklists.filter(c => effectiveProjectFilter === null || c.projectId === effectiveProjectFilter).map((checklist) => (
                  <ChecklistItem 
                    key={checklist.id} 
                    checklist={checklist}
                    onToggleTask={(taskId: string) => toggleChecklistTask(checklist.id, taskId)}
                    onClick={() => setSelectedChecklist(checklist)}
                    getProjectName={getProjectNameById}
                  />
                ))}
                {checklists.filter(c => effectiveProjectFilter === null || c.projectId === effectiveProjectFilter).length === 0 && (
                  <p className="text-center py-4 text-slate-400 text-xs font-bold italic">Aucune checklist pour ce chantier</p>
                )}
              </div>
              {(role === 'dg' || role === 'chef') && (
                <Button variant="outline" className="w-full mt-8 border-slate-200 text-slate-500 hover:text-[var(--color-primary)] hover:bg-slate-50 font-bold" onClick={() => setIsNewChecklistModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Créer une Checklist
                </Button>
              )}
            </Card>
      )}


      {/* Full History Modal */}
      <Modal
        isOpen={isFullHistoryModalOpen}
        onClose={() => setIsFullHistoryModalOpen(false)}
        title="Historique Complet des Incidents"
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher par titre, lieu, déclarant..." 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <Button variant="outline" size="sm" className="h-10 px-4 font-bold">
                <Filter className="w-4 h-4 mr-2" />
                Filtres
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 px-4 font-bold"
              onClick={() => {
                const dataToExport = filteredIncidents.map(i => ({
                  ID: i.id,
                  Date: i.date,
                  Titre: i.title,
                  Type: i.type,
                  Chantier: i.location,
                  Gravite: i.gravity,
                  Statut: i.status,
                  Declarant: i.reporter,
                  Description: i.desc
                }));
                exportToCSV(dataToExport, `historique_incidents_${new Date().toISOString().split('T')[0]}.csv`);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter (CSV)
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                      Date <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                      Incident <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                      Chantier <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gravité</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredIncidents.map((incident, i) => (
                  <tr key={`incident-history-${incident.id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-bold text-slate-500">{incident.date}</td>
                    <td className="p-4">
                      <p className="text-xs font-black text-slate-900">{incident.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{incident.type}</p>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-600">{incident.location}</td>
                    <td className="p-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                        incident.gravity === 'Critique' ? "bg-red-100 text-red-600" : 
                        incident.gravity === 'Haute' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {incident.gravity}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-1 rounded-lg",
                        incident.status === 'Résolu' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedIncident(incident);
                          setIsFullHistoryModalOpen(false);
                        }}
                        className="p-2 text-slate-400 hover:text-[var(--color-primary)] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                      Aucun incident trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={() => setIsFullHistoryModalOpen(false)} className="font-bold">Fermer</Button>
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        isOpen={isStatusUpdateModalOpen}
        onClose={() => setIsStatusUpdateModalOpen(false)}
        title="Mettre à jour le statut"
        size="sm"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Nouveau Statut</label>
            <select 
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Sélectionner un statut...</option>
              <option value="En cours">En cours</option>
              <option value="Audit requis">Audit requis</option>
              <option value="En attente">En attente</option>
              <option value="Résolu">Résolu</option>
              <option value="Fermé">Fermé</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Commentaire (Optionnel)</label>
            <textarea 
              value={statusUpdateComment}
              onChange={(e) => setStatusUpdateComment(e.target.value)}
              placeholder="Précisez les raisons du changement..."
              className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsStatusUpdateModalOpen(false)} className="font-bold">Annuler</Button>
            <Button 
              className="font-bold shadow-lg shadow-blue-900/20"
              onClick={() => {
                if (newStatus && selectedIncident) {
                  const updatedHistory = [
                    ...(selectedIncident.history || [{ date: selectedIncident.date, action: 'Incident déclaré', user: selectedIncident.reporter }]),
                    { date: new Date().toLocaleString('fr-FR'), action: `Statut mis à jour: ${newStatus}`, user: name || 'Utilisateur' }
                  ];
                  
                  updateIncident(selectedIncident.id, { 
                    status: newStatus,
                    history: updatedHistory
                  });

                  addLog({
                    module: 'Contrôle',
                    action: `Mise à jour statut incident: ${selectedIncident.title} -> ${newStatus}`,
                    user: name || 'Utilisateur',
                    type: newStatus === 'Résolu' || newStatus === 'Fermé' ? 'success' : 'warning'
                  });

                  if (newStatus === 'Fermé') {
                    notify(`Incident "${selectedIncident.title}" fermé et archivé.`, 'info', '/control');
                  } else {
                    notify(`Statut de l'incident "${selectedIncident.title}" mis à jour: ${newStatus}`, 'info', '/control');
                  }

                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 3000);
                  setIsStatusUpdateModalOpen(false);
                  setSelectedIncident(null);
                }
              }}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Checklist Modal */}
      <Modal
        isOpen={isNewChecklistModalOpen}
        onClose={() => setIsNewChecklistModalOpen(false)}
        title="Nouvelle Checklist de Chantier"
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Intitulé de la Checklist</label>
            <Input 
              placeholder="Ex: Contrôle Fondations" 
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Chantier Concerné</label>
            <select 
              value={newChecklistProjectId}
              onChange={(e) => setNewChecklistProjectId(Number(e.target.value))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">Points de Contrôle (Tâches)</label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[var(--color-primary)] h-8 font-bold"
                onClick={() => setNewChecklistTasks([...newChecklistTasks, ""])}
              >
                <Plus className="w-3 h-3 mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {newChecklistTasks.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <Input 
                    placeholder={`Tâche ${index + 1}`} 
                    value={task}
                    onChange={(e) => {
                      const updated = [...newChecklistTasks];
                      updated[index] = e.target.value;
                      setNewChecklistTasks(updated);
                    }}
                  />
                  {newChecklistTasks.length > 1 && (
                    <Button 
                      variant="ghost" 
                      className="text-red-500 h-11 w-11 p-0"
                      onClick={() => setNewChecklistTasks(newChecklistTasks.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsNewChecklistModalOpen(false)} className="font-bold">Annuler</Button>
            <Button 
              className="font-bold shadow-lg shadow-blue-900/20"
              onClick={async () => {
                if (newChecklistTitle.trim() && newChecklistProjectId) {
                  const tasks = newChecklistTasks
                    .filter(t => t.trim() !== "")
                    .map((t, i) => ({ id: `${Date.now()}-${i}`, title: t, completed: false }));
                  
                  await addChecklist({
                    title: newChecklistTitle,
                    category: 'Qualité',
                    projectId: newChecklistProjectId,
                    tasks,
                    active: true,
                    date: new Date().toISOString().split('T')[0]
                  });
                  notify(`Checklist "${newChecklistTitle}" créée pour ${getProjectNameById(newChecklistProjectId)}.`, 'success', '/control');
                  setNewChecklistTitle("");
                  setNewChecklistTasks([""]);
                  setIsNewChecklistModalOpen(false);
                }
              }}
            >
              Créer la Checklist
            </Button>
          </div>
        </div>
      </Modal>

      {/* Checklist Detail Modal */}
      <Modal
        isOpen={!!selectedChecklist}
        onClose={() => setSelectedChecklist(null)}
        title={`Détails Checklist: ${selectedChecklist?.title}`}
        size="md"
      >
        {(() => {
          const currentChecklist = checklists.find(c => c.id === selectedChecklist?.id);
          if (!currentChecklist) return null;

          return (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chantier</p>
                <p className="text-sm font-bold text-slate-900">{getProjectNameById(currentChecklist.projectId) || currentChecklist.chantier}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Points de Contrôle</h4>
                <div className="space-y-2">
                  {currentChecklist.tasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-[var(--color-primary)] transition-all cursor-pointer"
                      onClick={() => toggleChecklistTask(currentChecklist.id, task.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                          task.completed ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-slate-300 bg-white"
                        )}>
                          {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={cn(
                          "text-xs font-bold transition-colors",
                          task.completed ? "text-slate-400 line-through" : "text-slate-700"
                        )}>{task.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedChecklist(null)} className="font-bold">Fermer</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit Checklist Modal */}
      <Modal
        isOpen={isEditChecklistModalOpen}
        onClose={() => setIsEditChecklistModalOpen(false)}
        title="Modifier la Checklist"
        size="sm"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Intitulé de la Checklist</label>
            <Input 
              placeholder="Ex: Contrôle Fondations" 
              value={editChecklistTitle}
              onChange={(e) => setEditChecklistTitle(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditChecklistModalOpen(false)} className="font-bold">Annuler</Button>
            <Button 
              className="font-bold shadow-lg shadow-blue-900/20"
              onClick={() => {
                if (editChecklistTitle.trim() && editingChecklist) {
                  updateChecklist(editingChecklist.id, { title: editChecklistTitle });
                  notify(`Checklist "${editChecklistTitle}" mise à jour.`, 'success', '/control');
                  setIsEditChecklistModalOpen(false);
                  setEditingChecklist(null);
                }
              }}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Audit Detail Modal */}
      <Modal
        isOpen={!!selectedAudit}
        onClose={() => setSelectedAudit(null)}
        title="Détails de l'Audit Planifié"
        size="md"
      >
        {selectedAudit && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedAudit.title}</h3>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">{getProjectNameById(selectedAudit.projectId) || selectedAudit.chantier}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date Prévue</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><Calendar className="w-3 h-3 mr-2 text-slate-400" /> {selectedAudit.date}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Auditeur</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><User className="w-3 h-3 mr-2 text-slate-400" /> {selectedAudit.auditor}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Objectifs & Points de Contrôle</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <p className="text-xs font-bold text-slate-700">Vérification de la conformité des EPI sur site</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <p className="text-xs font-bold text-slate-700">Contrôle des certificats de conformité des matériaux</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <p className="text-xs font-bold text-slate-700">Audit de la gestion des déchets de chantier</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedAudit(null)} className="font-bold">Fermer</Button>
              <Button className="font-bold shadow-lg shadow-blue-900/20">Lancer l'Audit Maintenant</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Incident Detail Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Détails de l'Incident / Alerte"
        size="lg"
      >
        {selectedIncident && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  selectedIncident.gravity === 'Critique' ? "bg-red-100 text-red-600" : 
                  selectedIncident.gravity === 'Haute' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                )}>
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedIncident.type}</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedIncident.title}</h3>
                </div>
              </div>
              <span className={cn(
                "text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg",
                selectedIncident.gravity === 'Critique' ? "bg-red-600 text-white" : 
                selectedIncident.gravity === 'Haute' ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
              )}>
                {selectedIncident.gravity}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><MapPin className="w-3 h-3 mr-2" /> {selectedIncident.location}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Déclaré par</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><User className="w-3 h-3 mr-2" /> {selectedIncident.reporter}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date incident</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><Clock className="w-3 h-3 mr-2" /> {selectedIncident.date}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight border-b border-slate-100 pb-2">Description des faits</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedIncident.desc}</p>
              {selectedIncident.image && (
                <div className="mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preuve Photo</p>
                  <img 
                    src={selectedIncident.image.startsWith('http') ? selectedIncident.image : `${import.meta.env.VITE_API_URL || ''}${selectedIncident.image}`} 
                    alt="Preuve incident" 
                    className="w-full h-64 object-cover rounded-2xl border border-slate-100" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight border-b border-slate-100 pb-2">Timeline / Historique</h4>
                <div className="space-y-3">
                  {(selectedIncident.history || [
                    { date: selectedIncident.date, action: 'Incident déclaré', user: selectedIncident.reporter }
                  ]).map((h: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        idx === 0 ? "bg-red-500" : "bg-blue-500"
                      )}></div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{h.action}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{h.date} • {h.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedIncident(null)} className="font-bold">Fermer</Button>
              {(role === 'dg' || role === 'chef' || role === 'rh') && (
                <Button className="font-bold shadow-lg shadow-blue-900/20" onClick={() => setIsStatusUpdateModalOpen(true)}>Mettre à jour le statut</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Incident Modal (Workflow) */}
      <Modal 
        isOpen={isIncidentModalOpen} 
        onClose={() => setIsIncidentModalOpen(false)} 
        title="Déclaration d'Incident Chantier - Cameroun"
        size="lg"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                incidentStep >= s ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleIncidentSubmit} className="space-y-8">
            {incidentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Nature de l'Incident</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Titre de l'Incident</label>
                    <Input 
                      placeholder="Ex: Chute de pierre PK 45" 
                      value={newIncident.title}
                      onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Type d'Incident</label>
                    <select 
                      value={newIncident.type}
                      onChange={(e) => setNewIncident({...newIncident, type: e.target.value})}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option>Accident de travail</option>
                      <option>Presqu'accident (Near Miss)</option>
                      <option>Panne matériel critique (Engin)</option>
                      <option>Non-conformité technique (LABOGENIE)</option>
                      <option>Incident environnemental (Pollution)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Niveau de Gravité</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                      {['Faible', 'Moyen', 'Haut', 'Critique'].map(g => (
                        <button 
                          key={g} 
                          type="button" 
                          onClick={() => setNewIncident({...newIncident, gravity: g})}
                          className={cn(
                            "py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                            newIncident.gravity === g 
                              ? "bg-red-600 text-white border-red-600" 
                              : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Chantier Concerné</label>
                    <select 
                      value={newIncident.projectId}
                      onChange={(e) => setNewIncident({...newIncident, projectId: Number(e.target.value)})}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Description & Preuves</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Description des faits</label>
                    <textarea 
                      value={newIncident.desc}
                      onChange={(e) => setNewIncident({...newIncident, desc: e.target.value})}
                      className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Décrivez précisément l'incident..."
                      required
                    ></textarea>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Preuve Photo</label>
                    <div 
                      className={cn(
                        "relative p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
                        incidentImage ? "border-red-500 bg-red-50/10" : "border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-500 bg-slate-50/50"
                      )}
                      onClick={() => document.getElementById('incident-image-upload')?.click()}
                    >
                      {incidentImage ? (
                        <img src={incidentImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                      ) : (
                        <Camera className="w-10 h-10 mb-2" />
                      )}
                      <p className="text-[10px] font-black uppercase tracking-widest relative z-10">
                        {incidentImage ? "Changer la photo" : "Preuve Photo / Vidéo"}
                      </p>
                      <input 
                        id="incident-image-upload"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {incidentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Rapport d'Incident Envoyé</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">Le rapport a été transmis au Responsable HSE et à la Direction Générale pour action immédiate.</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => incidentStep > 1 ? setIncidentStep(1) : setIsIncidentModalOpen(false)} className="font-bold h-12 px-6">
                {incidentStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              <Button variant="danger" type="submit" className="px-8 font-bold h-12 shadow-lg shadow-red-900/20" disabled={isSubmittingIncident}>
                {isSubmittingIncident ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  incidentStep === 2 ? 'Fermer' : 'Envoyer le Rapport'
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Audit Modal (Workflow) */}
      <Modal 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
        title="Nouveau Contrôle / Audit Terrain"
        size="lg"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                auditStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleAuditSubmit} className="space-y-8">
            {auditStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Paramètres du Contrôle</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Type de Contrôle</label>
                    <select 
                      value={newAudit.type}
                      onChange={(e) => setNewAudit({...newAudit, type: e.target.value})}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {AUDIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Chantier</label>
                    <select 
                      value={newAudit.projectId}
                      onChange={(e) => setNewAudit({...newAudit, projectId: Number(e.target.value)})}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <Input 
                    label="Auditeur / Contrôleur" 
                    placeholder="Nom du responsable" 
                    required 
                    value={newAudit.auditor}
                    onChange={(e) => setNewAudit({...newAudit, auditor: e.target.value})}
                  />
                </div>
                <Input 
                  label="Lieu d'inspection (PK, zone...)" 
                  placeholder="Ex: PK 14+200, Zone fondations bloc A"
                  value={newAudit.location}
                  onChange={(e) => setNewAudit({...newAudit, location: e.target.value})}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Observations terrain</label>
                    <textarea value={newAudit.observations} rows={3}
                      onChange={(e) => setNewAudit({...newAudit, observations: e.target.value})}
                      placeholder="Constats, non-conformités..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Recommandations</label>
                    <textarea value={newAudit.recommendations} rows={3}
                      onChange={(e) => setNewAudit({...newAudit, recommendations: e.target.value})}
                      placeholder="Actions correctives..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Score de conformité (0-100)</label>
                  <input type="number" min="0" max="100" value={newAudit.score}
                    onChange={(e) => setNewAudit({...newAudit, score: e.target.value})}
                    placeholder="Ex: 85"
                    className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                  <span className="text-xs text-slate-400 ml-2">/ 100</span>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Planification</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Date Prévue</label>
                    <input 
                      type="date"
                      value={newAudit.date}
                      onChange={(e) => setNewAudit({...newAudit, date: e.target.value})}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {auditStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-blue-50 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Contrôle Planifié / Enregistré</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">L'audit a été enregistré dans le registre central et les parties prenantes ont été notifiées.</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => auditStep > 1 ? setAuditStep(1) : setIsAuditModalOpen(false)} className="font-bold h-12 px-6">
                {auditStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              <Button className="px-8 font-bold h-12 shadow-lg shadow-blue-900/20" type="submit" disabled={isSubmittingAudit}>
                {isSubmittingAudit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  auditStep === 2 ? 'Terminer' : (auditStep === 1 ? 'Suivant' : 'Enregistrer')
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Toast Success */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-sm font-bold">Statut mis à jour avec succès !</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ControlKpiCard = ({ title, value, change, isPositive, icon: Icon, color }: any) => {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600'
  };
  return (
    <Card className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl transition-colors", colors[color as keyof typeof colors])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
          isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tighter mt-1">{value}</h3>
    </Card>
  );
};

const ChecklistItem = ({ checklist, onToggleTask, onClick, getProjectName }: any) => {
  const completedCount = checklist.tasks.filter((t: any) => t.completed).length;
  const totalCount = checklist.tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div 
      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
            progress === 100 ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
          )}>
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">{checklist.title}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{(getProjectName ? getProjectName(checklist.projectId) : null) || checklist.chantier || ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-900">{completedCount}/{totalCount}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Tâches</p>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn(
            "h-full transition-all",
            progress === 100 ? "bg-emerald-500" : "bg-[var(--color-primary)]"
          )}
        />
      </div>
    </div>
  );
};

const AuditItem = ({ title, date, auditor, onClick }: any) => (
  <div 
    onClick={onClick}
    className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer group"
  >
    <div className="flex justify-between items-start mb-2">
      <p className="text-sm font-black text-white group-hover:text-blue-200 transition-colors">{title}</p>
      <Calendar className="w-4 h-4 text-blue-300" />
    </div>
    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-blue-200">
      <span>{date}</span>
      <span>{auditor}</span>
    </div>
  </div>
);
