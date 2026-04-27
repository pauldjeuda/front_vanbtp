import React, { useState } from 'react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import { 
  FileText, 
  Folder, 
  Search, 
  Upload, 
  MoreVertical, 
  Download, 
  Share2,
  Users,
  LifeBuoy,
  MessageSquare,
  BookOpen,
  Settings,
  Shield,
  Database,
  ChevronRight,
  ArrowLeft,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSearch,
  HardHat,
  Truck,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProjectNameById } from '../../lib/project.utils';
import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { documentService } from '../../services/document.service';

export const SupportPage = () => {
  const { can } = usePermissions();
  const { role } = useUser();
  const { projects, tickets, addTicket, documents, addDocument } = useData();
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'ged' | 'tickets' | 'referentials'>('ged');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketStep, setTicketStep] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isForumModalOpen, setIsForumModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<number | null>(null);
  const [selectedReferential, setSelectedReferential] = useState<any>(null);
  const [docSearch, setDocSearch] = useState('');

  const [newTicket, setNewTicket] = useState({
    title: '',
    module: 'Tableau de bord',
    priority: 'Basse',
    description: ''
  });

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketStep < 2) {
      try {
        await addTicket({
          title: newTicket.title,
          module: newTicket.module,
          priority: newTicket.priority,
          description: newTicket.description,
        });
        notify(`Ticket "${newTicket.title}" créé avec succès.`, 'success', '/support');
        setTicketStep(ticketStep + 1);
      } catch (err: any) {
        notify(err.message || 'Erreur lors de la création du ticket.', 'error', '/support');
      }
    } else {
      setIsTicketModalOpen(false);
      setTicketStep(1);
      setNewTicket({
        title: '',
        module: 'Tableau de bord',
        priority: 'Basse',
        description: ''
      });
    }
  };

  const handleDownload = (doc: any) => {
    const url = documentService.downloadUrl(doc.id);
    window.open(url, '_blank', 'noopener,noreferrer');
    notify(`Téléchargement de "${doc.name}" lancé.`, 'info', '/support');
  };

  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'PDF',
    projectId: 0,
    folder: 'Plans & Techniques',
    description: '',
    size: '0 KB',
    file: null as File | null
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadStep === 1) {
      if (!newDocument.file) {
        notify("Veuillez sélectionner un fichier.", 'error', '/support');
        return;
      }
      if (!newDocument.name) {
        notify("Veuillez donner un nom au document.", 'error', '/support');
        return;
      }
      try {
        await addDocument({
          ...newDocument,
          type: newDocument.folder === 'Plans & Techniques' ? 'Plan'
              : newDocument.folder === 'Rapports' ? 'Rapport'
              : newDocument.folder === 'Contrats' ? 'Contrat'
              : newDocument.folder === 'Factures' ? 'Facture'
              : 'Autre',
        });
        setUploadStep(2);
      } catch (err: any) {
        notify(err?.message || 'Erreur lors de l\'upload du document', 'error', '/support');
      }
    } else {
      setIsUploadModalOpen(false);
      setUploadStep(1);
      setNewDocument({
        name: '',
        type: 'PDF',
        projectId: 0,
        folder: 'Plans & Techniques',
        description: '',
        size: '0 KB',
        file: null
      });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <LifeBuoy className="w-4 h-4" />
            <span>Support & GED</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Centre de Ressources</h1>
          <p className="text-slate-500 font-medium mt-1">Gestion documentaire, support technique et référentiels métiers</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsTicketModalOpen(true)} className="bg-white border-slate-200 h-12 px-6 font-bold">
            <MessageSquare className="w-5 h-5 mr-2" />
            Ouvrir un Ticket Support
          </Button>
          {(role === 'dg' || role === 'chef' || role === 'rh') && (
            <Button onClick={() => setIsUploadModalOpen(true)} className="shadow-lg shadow-blue-900/20 h-12 px-6 font-bold bg-[var(--color-primary)]">
              <Upload className="w-5 h-5 mr-2" />
              Uploader un Document
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <TabButton 
          active={activeTab === 'ged'} 
          onClick={() => setActiveTab('ged')} 
          icon={Folder} 
          label="Gestion Documentaire (GED)" 
        />
        <TabButton 
          active={activeTab === 'tickets'} 
          onClick={() => setActiveTab('tickets')} 
          icon={MessageSquare} 
          label="Support Technique" 
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ged' && (
          <motion.div 
            key="ged"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Folder Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FolderCard title="Plans & Techniques" count="124 fichiers" color="blue" />
              <FolderCard title="Contrats & Marchés" count="42 fichiers" color="emerald" />
              <FolderCard title="Factures & Devis" count="256 fichiers" color="orange" />
              <FolderCard title="Photos Chantier" count="1,024 fichiers" color="purple" />
            </div>

            {/* Recent Documents Table */}
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Derniers Documents Partagés</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Rechercher un fichier..." 
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-64" 
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-6 py-4 text-left">Nom du fichier</th>
                      <th className="px-6 py-4 text-left">Type</th>
                      <th className="px-6 py-4 text-left">Chantier</th>
                      <th className="px-6 py-4 text-left">Date</th>
                      <th className="px-6 py-4 text-left">Taille</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {documents
                      .filter(doc => doc.name.toLowerCase().includes(docSearch.toLowerCase()) || getProjectNameById(projects, doc.projectId || 0).toLowerCase().includes(docSearch.toLowerCase()))
                      .map((doc, i) => (
                        <tr 
                          key={`doc-${i}`} 
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                doc.type === 'PDF' ? "bg-red-50 text-red-600" : 
                                doc.type === 'Excel' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                              )}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-black text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.type}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{getProjectNameById(projects, doc.projectId)}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{doc.date}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{doc.size}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[var(--color-primary)]"><Download className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[var(--color-primary)]"><Share2 className="w-4 h-4" /></button>
                              <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen(isMoreMenuOpen === i ? null : i); }} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-[var(--color-primary)]"><MoreVertical className="w-4 h-4" /></button>
                                {isMoreMenuOpen === i && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2">
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Renommer</button>
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Déplacer</button>
                                    {(role === 'dg' || role === 'chef' || role === 'rh') && (
                                      <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Archiver</button>
                                    )}
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg">Supprimer</button>
                                    <button className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg">Voir historique</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'tickets' && (
          <motion.div 
            key="tickets"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Mes Tickets Support</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-wider">2 En cours</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <TicketRow 
                      key={ticket.id}
                      id={ticket.id} 
                      title={ticket.title} 
                      status={ticket.status} 
                      priority={ticket.priority} 
                      date={ticket.date} 
                    />
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-none shadow-lg shadow-slate-200/50 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                  <BookOpen className="w-8 h-8 text-blue-400 mb-4" />
                  <h4 className="text-lg font-black tracking-tight mb-2">Base de Connaissances</h4>
                  <p className="text-sm text-slate-400 font-medium mb-6">Accédez aux guides d'utilisation et aux tutoriels vidéos de VAN BTP ERP.</p>
                  <Button onClick={() => setIsHelpModalOpen(true)} className="w-full bg-white text-slate-900 hover:bg-blue-50 font-bold border-none">Consulter l'Aide</Button>
                </Card>
                <Card className="p-6 border-none shadow-lg shadow-slate-200/50 bg-white">
                  <Users className="w-8 h-8 text-[var(--color-primary)] mb-4" />
                  <h4 className="text-lg font-black tracking-tight mb-2">Communauté & Feedback</h4>
                  <p className="text-sm text-slate-500 font-medium mb-6">Partagez vos suggestions d'amélioration et échangez avec les autres utilisateurs.</p>
                  <Button onClick={() => setIsForumModalOpen(true)} variant="outline" className="w-full border-slate-200 text-slate-600 font-bold">Rejoindre le Forum</Button>
                </Card>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
                <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6">Contact Support</h3>
                <div className="space-y-6">
                  <ContactItem icon={Clock} label="Temps de réponse moyen" value="< 4 heures" />
                  <ContactItem icon={Shield} label="Disponibilité" value="24/7 (Urgence)" />
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ligne Directe</p>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <LifeBuoy className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">+237 6XX XX XX XX</p>
                        <p className="text-[10px] text-slate-500 font-bold">Support VAN BTP Douala / Yaoundé</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        title="Archivage Documentaire Sécurisé"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                uploadStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-6">
            {uploadStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Dossier Destination</label>
                    <select 
                      value={newDocument.folder}
                      onChange={(e) => setNewDocument({...newDocument, folder: e.target.value})}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option>Plans & Techniques</option>
                      <option>Contrats & Marchés</option>
                      <option>Factures & Devis</option>
                      <option>Photos Chantier</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Chantier rattaché</label>
                    <select 
                      value={newDocument.projectId}
                      onChange={(e) => setNewDocument({...newDocument, projectId: Number(e.target.value)})}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value={0}>Aucun (Document général)</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Nom du Document</label>
                  <Input 
                    placeholder="Ex: Plan de masse" 
                    value={newDocument.name}
                    onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Description / Note</label>
                  <textarea 
                    className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Ajoutez une description pour faciliter la recherche..."
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Sélectionner le Document</label>
                  <div 
                    className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-[var(--color-primary)] transition-all cursor-pointer bg-slate-50/50 group relative"
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                  >
                    <input 
                      id="file-upload-input"
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                          const extension = file.name.split('.').pop()?.toUpperCase() || 'DOC';
                          setNewDocument({
                            ...newDocument,
                            name: file.name,
                            size: `${sizeMB} MB`,
                            type: extension,
                            file
                          });
                        }
                      }}
                    />
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 group-hover:text-[var(--color-primary)] transition-colors shadow-sm">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {newDocument.name || "Sélectionner un fichier"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">PDF, Excel, Images (max 20MB)</p>
                  </div>
                </div>
              </div>
            )}

            {uploadStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Document Archivé</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">Le document a été indexé et rattaché au projet sélectionné avec succès.</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => uploadStep > 1 ? setUploadStep(1) : setIsUploadModalOpen(false)} className="font-bold">
                {uploadStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20">
                {uploadStep === 2 ? 'Fermer' : 'Lancer l\'Upload'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Ticket Modal (Workflow) */}
      <Modal 
        isOpen={isTicketModalOpen} 
        onClose={() => setIsTicketModalOpen(false)} 
        title="Ouvrir un Ticket Support Technique"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                ticketStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleTicketSubmit} className="space-y-6">
            {ticketStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Sujet de la demande</label>
                  <Input 
                    placeholder="Ex: Bug affichage planning" 
                    required 
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Module concerné</label>
                    <select 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newTicket.module}
                      onChange={(e) => setNewTicket({...newTicket, module: e.target.value})}
                    >
                      <option>Tableau de bord</option>
                      <option>Chantiers</option>
                      <option>Finances</option>
                      <option>Ressources</option>
                      <option>Contrôle</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Priorité</label>
                    <select 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    >
                      <option>Basse</option>
                      <option>Moyenne</option>
                      <option>Haute</option>
                      <option>Bloquante</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Description détaillée</label>
                  <textarea 
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder="Décrivez précisément votre problème ou votre besoin..."
                    required
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  ></textarea>
                </div>
              </div>
            )}

            {ticketStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Ticket Envoyé !</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">Votre demande a été enregistrée. Un technicien VAN BTP vous contactera sous 2 heures ouvrables.</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => ticketStep > 1 ? setTicketStep(1) : setIsTicketModalOpen(false)} className="font-bold">
                {ticketStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20">
                {ticketStep === 2 ? 'Fermer' : 'Envoyer le Ticket'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Document Detail Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <Modal 
            isOpen={!!selectedDoc} 
            onClose={() => setSelectedDoc(null)}
            title={`Détail Document: ${selectedDoc.name}`}
          >
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400">
                  <FileText className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedDoc.name}</h3>
                  <p className="text-sm font-bold text-slate-500">{getProjectNameById(projects, selectedDoc.projectId)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-black text-slate-900">{selectedDoc.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taille</p>
                  <p className="text-sm font-black text-slate-900">{selectedDoc.size}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dernière Modif</p>
                  <p className="text-sm font-black text-slate-900">{selectedDoc.date}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut Visa</p>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase">Validé</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Historique des Versions</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">v2.0 - Version Finale Signée</span>
                    <span className="text-slate-400">12/04/2024</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">v1.0 - Brouillon Initial</span>
                    <span className="text-slate-400">05/04/2024</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedDoc(null)} className="font-bold">Fermer</Button>
                <Button onClick={() => setIsViewerModalOpen(true)} className="font-bold shadow-lg shadow-blue-900/20">Visualiser / Annoter</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      {/* Forum Modal */}
      <Modal isOpen={isForumModalOpen} onClose={() => setIsForumModalOpen(false)} title="Forum Communauté VAN BTP" size="lg">
        <div className="space-y-6">
          <p className="text-sm text-slate-600">Bienvenue sur le forum d'entraide. Discutez avec vos pairs et partagez vos bonnes pratiques.</p>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">Astuces pour la gestion des chantiers</h4>
              <p className="text-xs text-slate-500">12 discussions • Dernière réponse il y a 1h</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">Questions techniques ERP</h4>
              <p className="text-xs text-slate-500">45 discussions • Dernière réponse il y a 3h</p>
            </div>
          </div>
          <Button className="w-full font-bold">Accéder au Forum complet</Button>
        </div>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal isOpen={isViewerModalOpen} onClose={() => setIsViewerModalOpen(false)} title="Visionneuse Document" size="full">
        <div className="h-[80vh] flex flex-col">
          <div className="flex-1 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black">
            Aperçu du document (Visionneuse plein écran)
          </div>
          <div className="flex justify-center gap-4 p-4 border-t border-slate-100">
            <Button variant="outline">Zoom -</Button>
            <Button variant="outline">Zoom +</Button>
            <Button variant="outline">Page Précédente</Button>
            <Button variant="outline">Page Suivante</Button>
            <Button>Ajouter Annotation</Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Partager le document" size="sm">
        <div className="space-y-6">
          <Input label="Destinataire (Email)" placeholder="email@exemple.com" />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Message</label>
            <textarea className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Message optionnel..."></textarea>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 font-bold" onClick={() => { setIsShareModalOpen(false); notify("Lien de partage envoyé par email.", 'success', '/support'); }}>Envoyer</Button>
            <Button variant="outline" className="font-bold" onClick={() => { setIsShareModalOpen(false); notify("Lien copié dans le presse-papier.", 'success', '/support'); }}>Copier le lien</Button>
          </div>
        </div>
      </Modal>

      {/* Help Center Modal */}
      <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title="Centre d'Aide" size="lg">
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher dans l'aide..." className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">FAQ</h4>
              <p className="text-xs text-slate-500">Questions fréquentes</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 cursor-pointer">
              <h4 className="font-black text-slate-900">Guides</h4>
              <p className="text-xs text-slate-500">Tutoriels pas-à-pas</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-6 py-4 border-b-2 transition-all whitespace-nowrap",
      active 
        ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5" 
        : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-[var(--color-primary)]" : "text-slate-400")} />
    <span className="text-sm font-black tracking-tight">{label}</span>
  </button>
);

const FolderCard = ({ title, count, color }: any) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600'
  };
  return (
    <Card className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all cursor-pointer group">
      <div className={cn("p-3 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform", colors[color as keyof typeof colors])}>
        <Folder className="w-6 h-6" />
      </div>
      <h4 className="font-black text-slate-900 tracking-tight">{title}</h4>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{count}</p>
    </Card>
  );
};

const TicketRow = ({ id, title, status, priority, date }: any) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-400 tracking-widest">{id}</span>
        <h4 className="text-sm font-black text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">{title}</h4>
      </div>
      <span className={cn(
        "text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
        priority === 'Haute' ? "bg-red-100 text-red-700" : 
        priority === 'Moyenne' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
      )}>
        {priority}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {date}</span>
        <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> Support Technique</span>
      </div>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-wider",
        status === 'Résolu' ? "text-emerald-600" : "text-blue-600"
      )}>
        {status}
      </span>
    </div>
  </div>
);

const ReferentialCard = ({ title, desc, icon: Icon, count, onClick }: any) => (
  <Card 
    onClick={onClick}
    className="p-8 border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all group cursor-pointer hover:-translate-y-1 active:scale-[0.98]"
  >
    <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl w-fit mb-6 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all group-hover:rotate-6">
      <Icon className="w-8 h-8" />
    </div>
    <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">{title}</h4>
    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">{desc}</p>
    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{count}</span>
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  </Card>
);

const ContactItem = ({ icon: Icon, label, value }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
    <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  </div>
);
