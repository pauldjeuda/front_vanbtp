import React, { useState } from 'react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import {
  ShoppingCart,
  Clock,
  Package,
  Truck,
  Users,
  Handshake,
  Plus,
  Minus,
  ArrowRightLeft,
  History,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  HardHat,
  MapPin,
  UserPlus,
  ClipboardCheck,
  Settings2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { exportToCSV } from '../../lib/exportUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useHistory } from '../../context/HistoryContext';
import { useData } from '../../context/DataContext';
import { attendanceService } from '../../services/attendance.service';
import { useNotification } from '../../context/NotificationContext';

export const ResourcesPage = () => {
  const { can } = usePermissions();
  const today = new Date().toISOString().split('T')[0];
  const { role, profile } = useUser();
  const name = profile?.name;
  const { addLog } = useHistory();
  const {
    projects,
    updateProject,
    employees,
    updateEmployee,
    addEmployee,
    deleteEmployee,
    equipmentList,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    stockMovements,
    addStockMovement,
    purchases,
    addPurchase,
    updatePurchase,
    subcontracts,
    addSubcontract,
    updateSubcontract,
    deleteSubcontract
  } = useData();

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'stock' | 'equipment' | 'hr' | 'subcontracting' | 'pointage'>(
    (role === 'dg' || role === 'chef') ? 'purchases' : (role === 'rh' ? 'hr' : 'stock')
  );
  // Pointage
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceProjectId, setAttendanceProjectId] = useState<number>(0);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState(1);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockStep, setStockStep] = useState(1);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [hrSearchQuery, setHrSearchQuery] = useState('');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('Magasin Central');
  const [isStockMovementModalOpen, setIsStockMovementModalOpen] = useState(false);
  const [stockMovementStep, setStockMovementStep] = useState(1);
  const [stockMovementType, setStockMovementType] = useState<'entry' | 'exit' | 'transfer'>('entry');
  const [isLogbookModalOpen, setIsLogbookModalOpen] = useState(false);
  const [isSubcontractModalOpen, setIsSubcontractModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = useState(false);
  const [assigningEquipment, setAssigningEquipment] = useState<any>(null);
  const [isAllOrdersModalOpen, setIsAllOrdersModalOpen] = useState(false);
  const [isContractDetailsModalOpen, setIsContractDetailsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isManageContractModalOpen, setIsManageContractModalOpen] = useState(false);
  const [isFullLogbookModalOpen, setIsFullLogbookModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState('all');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [purchaseToUpdate, setPurchaseToUpdate] = useState<any>(null);
  const [selectedStockProject, setSelectedStockProject] = useState<number | null>(null);
  const [selectedEquipmentProject, setSelectedEquipmentProject] = useState<number | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);

  const getProjectNameById = (projectId?: number) => projects.find(p => p.id === projectId)?.name || 'Chantier inconnu';
  const getProjectIdByName = (name?: string) => projects.find(p => p.name === name)?.id || 0;
  const { notify } = useNotification();

  const handleAssign = async (emp: any, projectValue: string | number) => {
    const projectId = typeof projectValue === 'number' ? projectValue : getProjectIdByName(projectValue);
    const projectName = getProjectNameById(projectId);
    try {
      await updateEmployee(emp.id, { projectId });
      setIsAssignEmployeeModalOpen(false);
      notify(`L'employé ${emp.name} a été affecté au chantier ${projectName}.`, 'success', '/resources');
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de l\'affectation', 'error', '/resources');
    }
  };

  const handleRemoveAssignment = (emp: any) => {
    setEmployeeToDelete(emp);
    setIsConfirmDeleteModalOpen(true);
  };

  const [selectedProjectForAdd, setSelectedProjectForAdd] = useState<number>(0);

  const handleSubmitAttendance = async () => {
    if (!attendanceProjectId) { notify('Sélectionnez un chantier', 'error'); return; }
    setIsSubmittingAttendance(true);
    try {
      await attendanceService.bulkCreate({
        projectId: attendanceProjectId,
        date: attendanceDate,
        records: attendanceRecords
      });
      notify(`Pointage du ${attendanceDate} enregistré (${attendanceRecords.length} employé(s))`, 'success');
      loadAttendance();
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmittingAttendance(false); }
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
      await deleteEmployee(employeeToDelete.id);
      notify(`L'employé ${employeeToDelete.name} a été supprimé du registre.`, 'info', '/resources');
      setIsConfirmDeleteModalOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const loadAttendance = async () => {
    setIsLoadingAttendance(true);
    try {
      let history;
      if (role === 'technicien') {
        const me = employees.find(e => e.matricule === profile?.matricule) ||
          employees.find(e => e.name === profile?.name);
        if (me?.id) {
          const res = await attendanceService.getHistory(me.id);
          history = Array.isArray(res) ? res : res.data;
        }
      } else if (attendanceProjectId) {
        const res = await attendanceService.getAll({ projectId: attendanceProjectId });
        history = Array.isArray(res) ? res : res.data;
      }

      if (history) {
        setAttendanceHistory(history);

        // Update records for today (compatibility)
        const todayStr = new Date().toISOString().split('T')[0];
        const projectEmployees = employees.filter(e => Number(e.projectId) === attendanceProjectId);
        const todayRecords = projectEmployees.map(emp => {
          const existing = history.find((h: any) => Number(h.employeeId) === Number(emp.id) && h.date === todayStr);
          return {
            employeeId: emp.id,
            name: emp.name,
            matricule: emp.matricule,
            role: emp.role,
            arrivalTime: existing?.arrivalTime || '07:30',
            departureTime: existing?.departureTime || '17:00',
            status: existing?.status || 'Présent',
            note: existing?.note || ''
          };
        });
        setAttendanceRecords(todayRecords);
      }
    } catch (err) {
      setAttendanceHistory([]);
      setAttendanceRecords([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'pointage') {
      loadAttendance();
    }
  }, [activeTab, attendanceProjectId]);

  const stockItems = React.useMemo(() => [
    { name: 'Ciment CPJ 35', unit: 'Sacs', icon: Package, color: 'blue' },
    { name: 'Sable de Sanaga', unit: 'm3', icon: Package, color: 'emerald' },
    { name: 'Gazole Chantier', unit: 'L', icon: Package, color: 'amber' },
    { name: 'Fer à béton 12mm', unit: 'Barres', icon: Package, color: 'red' },
  ], []);

  const calculatedStock = React.useMemo(() => {
    if (projects.length === 0) return [];

    return stockItems.map(item => {
      const movements = stockMovements.filter(m =>
        m.item === item.name &&
        (selectedStockProject === null ? true : Number(m.projectId) === Number(selectedStockProject))
      );

      const total = movements.reduce((acc, m) => {
        const qty = parseFloat(m.qty) || 0;
        if (m.type === 'Entrée' || m.type === 'Entrée (Transfert)') return acc + qty;
        if (m.type === 'Sortie' || m.type === 'Sortie (Transfert)') return acc - qty;
        return acc;
      }, 0);

      return {
        title: item.name,
        qty: `${total.toLocaleString()} ${item.unit}`,
        status: total === 0 ? 'Vide' : total > 100 ? 'Normal' : total > 20 ? 'Bas' : 'Critique',
        icon: item.icon,
        color: item.color
      };
    });
  }, [stockMovements, selectedStockProject, projects, stockItems]);

  const [newPurchase, setNewPurchase] = useState({
    item: 'Ciment CPJ 35',
    qty: '',
    unit: 'Tonnes',
    unitPrice: '',
    provider: '',
    priority: 'Normale',
    projectId: projects[0]?.id || 0,
    chantier: projects[0]?.name || '',
    deliveryDate: new Date().toISOString().split('T')[0]
  });

  const [newStockMovement, setNewStockMovement] = useState({
    item: 'Ciment CPJ 35',
    qty: '',
    unit: 'Tonnes',
    fromProjectId: projects[0]?.id || 0,
    toProjectId: projects[0]?.id || 0,
    chantier: projects[0]?.name || '',
    fromChantier: projects[0]?.name || '',
    toChantier: projects[0]?.name || '',
    receiver: '',
    docRef: ''
  });


  const itemUnits: Record<string, string> = {
    'Ciment CPJ 35': 'Tonnes',
    'Acier / Fer à béton': 'Tonnes',
    'Pelles': 'Unités',
    'Casques': 'Unités',
    'Sable de Sanaga': 'm3',
    'Gravier': 'm3',
    'Gazole Chantier': 'L',
    'EPI (Casques/Gilets)': 'Kits',
    'Fer à béton 12mm': 'Barres',
    'Brouettes': 'Unités',
    'Gilets de sécurité': 'Unités',
    'Bottes de chantier': 'Paires',
    'Bitume': 'Tonnes',
    'Adjuvant béton': 'L'
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseStep < 2) {
      try {
        // Validation côté client avant envoi
        if (!newPurchase.projectId) {
          notify('Veuillez sélectionner un chantier.', 'error', '/resources');
          return;
        }
        if (!newPurchase.qty || Number(newPurchase.qty) <= 0) {
          notify('La quantité doit être supérieure à 0.', 'error', '/resources');
          return;
        }

        // Attendre la création effective en base avant d'afficher la notification
        await addPurchase(newPurchase);

        addLog({
          module: 'Ressources',
          action: `Nouvelle DA: ${newPurchase.item} (${newPurchase.qty} ${newPurchase.unit}) pour ${getProjectNameById(newPurchase.projectId)}`,
          user: name || 'Utilisateur',
          type: 'info'
        });
        notify(`Demande d'achat pour ${newPurchase.qty} ${newPurchase.unit} de ${newPurchase.item} créée avec succès.`, 'success', '/resources');
        setPurchaseStep(purchaseStep + 1);
      } catch (err: any) {
        notify(err?.message || 'Erreur lors de la création de la demande d\'achat.', 'error', '/resources');
      }
    } else {
      setIsPurchaseModalOpen(false);
      setPurchaseStep(1);
      setNewPurchase({
        item: 'Ciment CPJ 35',
        qty: '',
        unit: 'Tonnes',
        unitPrice: '',
        provider: '',
        priority: 'Normale',
        projectId: projects[0]?.id || 0,
        chantier: projects[0]?.name || '',
        deliveryDate: new Date().toISOString().split('T')[0]
      });
    }
  };

  const availableEquipment = [
    { name: 'Bulldozer CAT D6', type: 'Bulldozer', ref_prefix: 'BULL' },
    { name: 'Compacteur BOMAG BW213', type: 'Compacteur', ref_prefix: 'COMP' },
    { name: 'Chargeuse VOLVO L120', type: 'Chargeuse', ref_prefix: 'CHAR' },
    { name: 'Pelle Hydraulique CAT 336', type: 'Pelle Hydraulique', ref_prefix: 'ENG' },
    { name: 'Camion Citerne Gazole', type: 'Camion', ref_prefix: 'CIT' },
    { name: 'Groupe Électrogène 500kVA', type: 'Énergie', ref_prefix: 'GRP' },
  ];

  const [availableEmployees, setAvailableEmployees] = useState([
    { name: 'Paul Abena', role: 'DG', project: 'Disponible', contract: 'CDI', niu: 'VMAT0001', matricule: 'VMAT0001', phone: '690 00 00 01' },
    { name: 'Jean Nkomo', role: 'Chef de Chantier', project: 'Disponible', contract: 'CDI', niu: 'VMAT0002', matricule: 'VMAT0002', phone: '691 00 00 02' },
    { name: 'Eric Mvondo', role: 'Technicien', project: 'Disponible', contract: 'CDI', niu: 'VMAT0003', matricule: 'VMAT0003', phone: '692 00 00 03' },
  ]);

  // État pour protéger contre les clics multiples
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  // État pour gérer l'affectation du technicien actuel
  const [technicianAssignment, setTechnicianAssignment] = useState({
    projectId: projects[0]?.id || 0,
    assignmentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [editingContract, setEditingContract] = useState<any>(null);
  const [newSubcontractTask, setNewSubcontractTask] = useState('');

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: 'Chef de Chantier',
    project: 'Route Douala-Yaoundé',
    contract: 'CDI',
    niu: '',
    cnps: '',
    birthDate: '',
    residence: '',
    cni: '',
    salary: ''
  });

  const [newEquipment, setNewEquipment] = useState({
    name: '',
    ref: '',
    serial: '',
    type: 'Pelle Hydraulique',
    location: 'Section Edéa'
  });

  const [newSubcontract, setNewSubcontract] = useState({
    company: '',
    niu: '',
    projectId: projects[0]?.id || 0,
    task: '',
    amount: '',
    startDate: '',
    endDate: '',
    tasks: [] as string[],
    // Gestion par lots
    lots: [] as { lotNumber: number; lotName: string; tasks: string[] }[]
  });
  const [useLots, setUseLots] = useState(false);
  const [newLotName, setNewLotName] = useState('');
  const [newLotTask, setNewLotTask] = useState<Record<number, string>>({});

  const addLot = () => {
    const lotNumber = newSubcontract.lots.length + 1;
    setNewSubcontract(prev => ({
      ...prev,
      lots: [...prev.lots, { lotNumber, lotName: newLotName || `Lot ${lotNumber}`, tasks: [] }]
    }));
    setNewLotName('');
  };

  const removeLot = (lotIndex: number) => {
    setNewSubcontract(prev => ({
      ...prev,
      lots: prev.lots.filter((_, i) => i !== lotIndex).map((l, i) => ({ ...l, lotNumber: i + 1 }))
    }));
  };

  const addTaskToLot = (lotIndex: number) => {
    const task = newLotTask[lotIndex]?.trim();
    if (!task) return;
    setNewSubcontract(prev => {
      const lots = [...prev.lots];
      lots[lotIndex] = { ...lots[lotIndex], tasks: [...lots[lotIndex].tasks, task] };
      return { ...prev, lots };
    });
    setNewLotTask(prev => ({ ...prev, [lotIndex]: '' }));
  };

  const removeTaskFromLot = (lotIndex: number, taskIndex: number) => {
    setNewSubcontract(prev => {
      const lots = [...prev.lots];
      lots[lotIndex] = { ...lots[lotIndex], tasks: lots[lotIndex].tasks.filter((_, i) => i !== taskIndex) };
      return { ...prev, lots };
    });
  };

  const filteredEmployees = employees.filter(emp =>
    (emp.name.toLowerCase().includes(hrSearchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(hrSearchQuery.toLowerCase()) ||
      emp.niu.toLowerCase().includes(hrSearchQuery.toLowerCase())) &&
    (selectedProjectFilter === null || emp.projectId === selectedProjectFilter)
  );

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stockStep < 2) {
      setStockStep(stockStep + 1);
    } else {
      // Validation de la quantité
      const qty = Number(newStockMovement.qty);
      if (!qty || qty <= 0) {
        notify('La quantité doit être supérieure à 0 pour une sortie de stock.', 'error', '/resources');
        return;
      }

      // Vérification du solde pour une Sortie
      const mvtType = stockMovementType === 'entry' ? 'Entrée' : stockMovementType === 'exit' ? 'Sortie' : 'Transfert';
      if (mvtType === 'Sortie' || mvtType === 'Transfert') {
        // Pour une sortie, on vérifie le stock dans le projet d'origine
        const projectId = stockMovementType === 'exit' ? newStockMovement.fromProjectId : newStockMovement.fromProjectId;
        const itemMvts = stockMovements.filter(
          (m: any) => m.item === newStockMovement.item && Number(m.projectId) === Number(projectId)
        );
        const totalE = itemMvts.filter((m: any) => m.type === 'Entrée').reduce((s: number, m: any) => s + Number(m.qty || m.quantity || 0), 0);
        const totalS = itemMvts.filter((m: any) => m.type === 'Sortie' || m.type === 'Sortie (Transfert)').reduce((s: number, m: any) => s + Number(m.qty || m.quantity || 0), 0);
        const soldeDispo = totalE - totalS;
        if (qty > soldeDispo) {
          notify(
            `Stock insuffisant pour "${newStockMovement.item}" dans ${getProjectNameById(projectId)} : ${Math.max(0, soldeDispo)} disponible(s), ${qty} demandé(s).`,
            'error', '/resources'
          );
          return;
        }
      }

      addStockMovement({
        date: new Date().toLocaleString('fr-FR'),
        type: 'Sortie',
        item: newStockMovement.item,
        qty: newStockMovement.qty,
        unit: newStockMovement.unit,
        projectId: newStockMovement.toProjectId,
        user: name || 'Utilisateur'
      });
      addLog({
        module: 'Ressources',
        action: `Sortie de stock: ${newStockMovement.item} (${newStockMovement.qty}) vers ${projects.find(p => p.id === newStockMovement.toProjectId)?.name || 'Chantier inconnu'}`,
        user: name || 'Utilisateur',
        type: 'warning'
      });
      setIsStockModalOpen(false);
      setStockStep(1);
      setNewStockMovement({
        item: 'Ciment CPJ 35',
        qty: '',
        unit: 'Tonnes',
        fromProjectId: projects[0]?.id || 0,
        toProjectId: projects[0]?.id || 0,
        chantier: projects[0]?.name || '',
        fromChantier: projects[0]?.name || '',
        toChantier: projects[0]?.name || '',
        receiver: '',
        docRef: ''
      });
    }
  };


  const handleAddEmployee = async (emp: any) => {
    try {
      await addEmployee({
        name: emp.name,
        role: emp.role,
        projectId: emp.projectId || projects[0]?.id || 0,
        contract: emp.contract,
        niu: emp.niu,
        matricule: emp.matricule
      });
      addLog({
        module: 'Ressources',
        action: `Ajout d'un collaborateur: ${emp.name} (${emp.role})`,
        user: name || 'Utilisateur',
        type: 'success'
      });
      notify(`Collaborateur ${emp.name} ajouté avec succès.`, 'success', '/resources');
      setIsEmployeeModalOpen(false);
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de l\'ajout du collaborateur', 'error', '/resources');
    }
  };

  const handleAddEquipment = async (item: any, projectId: number) => {
    const projectName = getProjectNameById(projectId);
    try {
      await addEquipment({
        name: item.name,
        ref: `${item.ref_prefix || 'ENG'}-${Math.floor(Math.random() * 9000) + 1000}`,
        // ENUM DB: Disponible / En mission / En maintenance / En panne / Hors service
        status: 'Disponible',
        projectId
      });
      addLog({
        module: 'Ressources',
        action: `Ajout d'engin: ${item.name} pour ${projectName}`,
        user: name || 'Utilisateur',
        type: 'info'
      });
      notify(`Engin ${item.name} ajouté pour le chantier ${projectName}.`, 'success', '/resources');
      setIsEquipmentModalOpen(false);
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de l\'ajout de l\'engin', 'error', '/resources');
    }
  };


  const [isSubmittingSubcontract, setIsSubmittingSubcontract] = useState(false);
  const [stockMovementError, setStockMovementError] = useState<string | null>(null);

  // États pour les filtres du journal complet
  const [logbookFilters, setLogbookFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    projectId: 'all',
    type: 'all'
  });

  // État pour gérer les données d'inventaire
  const [inventoryData, setInventoryData] = useState<any[]>([]);

  // Fonction pour calculer le stock théorique réel par article
  const getTheoreticalStock = () => {
    const stockByItem: Record<string, { total: number; unit: string; items: string[] }> = {};

    // Calculer le stock pour chaque article en fonction des mouvements
    const items = Array.from(new Set(stockMovements.map((m: any) => m.item))).filter(Boolean);

    items.forEach(item => {
      const itemMovements = stockMovements.filter((m: any) => m.item === item);
      const totalEntries = itemMovements
        .filter((m: any) => m.type === 'Entrée')
        .reduce((sum: number, m: any) => sum + Number(m.qty || m.quantity || 0), 0);
      const totalExits = itemMovements
        .filter((m: any) => m.type === 'Sortie')
        .reduce((sum: number, m: any) => sum + Number(m.qty || m.quantity || 0), 0);

      const unit = itemMovements[0]?.unit || 'unités';
      stockByItem[item] = {
        total: totalEntries - totalExits,
        unit: unit,
        items: [item]
      };
    });

    return stockByItem;
  };

  // Fonction pour initialiser les données d'inventaire
  const initializeInventoryData = () => {
    const theoreticalStock = getTheoreticalStock();
    const data = Object.entries(theoreticalStock).map(([item, data]) => ({
      item,
      theoretical: Math.max(0, data.total),
      observed: Math.max(0, data.total),
      unit: data.unit,
      variance: 0,
      justification: ''
    }));
    setInventoryData(data);
  };

  // Initialiser les données d'inventaire quand la modale s'ouvre
  React.useEffect(() => {
    if (isInventoryModalOpen) {
      initializeInventoryData();
    }
  }, [isInventoryModalOpen, stockMovements]);

  // Fonction pour filtrer les mouvements selon les filtres
  const getFilteredLogbook = () => {
    let filtered = stockMovements;

    // Filtrer par date
    if (logbookFilters.date) {
      filtered = filtered.filter((log: any) =>
        log.date && log.date.includes(logbookFilters.date)
      );
    }

    // Filtrer par projet
    if (logbookFilters.projectId !== 'all') {
      filtered = filtered.filter((log: any) =>
        Number(log.projectId) === Number(logbookFilters.projectId)
      );
    }

    // Filtrer par type
    if (logbookFilters.type !== 'all') {
      const typeMap: Record<string, string[]> = {
        'entries': ['Entrée', 'Entrées (Réceptions)'],
        'exits': ['Sortie', 'Sorties (Consommations)']
      };
      filtered = filtered.filter((log: any) =>
        typeMap[logbookFilters.type]?.includes(log.type)
      );
    }

    return filtered;
  };

  const handleSubcontractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Protection contre les soumissions multiples
    if (isSubmittingSubcontract) {
      return;
    }

    // Validation frontend avant envoi au backend
    if (!newSubcontract.company?.trim()) {
      notify('Le nom de l\'entreprise est obligatoire', 'error', '/resources');
      return;
    }

    if (!newSubcontract.amount || Number(newSubcontract.amount) <= 0) {
      notify('Le montant doit être supérieur à 0', 'error', '/resources');
      return;
    }

    if (!newSubcontract.projectId || newSubcontract.projectId === 0) {
      notify('Veuillez sélectionner un projet', 'error', '/resources');
      return;
    }


    try {
      setIsSubmittingSubcontract(true);

      if (editingContract) {
        const tasksPayload = useLots
          ? newSubcontract.lots.flatMap(lot =>
            lot.tasks.map(t => ({ title: t, lotNumber: lot.lotNumber, lotName: lot.lotName }))
          )
          : newSubcontract.tasks.map((t) => ({ title: t, lotNumber: 1, lotName: 'Lot 1' }));

        const updates = {
          entreprise: newSubcontract.company,
          objet: newSubcontract.task,
          projectId: newSubcontract.projectId,
          montant: Math.round(Number(newSubcontract.amount) || 0),
          tasks: tasksPayload
        };
        await updateSubcontract(editingContract.id, updates);
        notify(`Contrat de ${newSubcontract.company} mis à jour.`, 'success', '/resources');
      } else {
        // Construire la liste des tâches depuis les lots ou la liste simple
        const tasksPayload = useLots
          ? newSubcontract.lots.flatMap(lot =>
            lot.tasks.map(t => ({ title: t, lotNumber: lot.lotNumber, lotName: lot.lotName }))
          )
          : newSubcontract.tasks.map((t) => ({ title: t, lotNumber: 1, lotName: 'Lot 1' }));

        await addSubcontract({
          entreprise: newSubcontract.company,
          objet: newSubcontract.task,
          projectId: newSubcontract.projectId,
          montant: Math.round(Number(newSubcontract.amount) || 0),
          progress: 0,
          startDate: newSubcontract.startDate || undefined,
          tasks: tasksPayload
        });
        addLog({
          module: 'Ressources',
          action: `Nouveau contrat ST: ${newSubcontract.company} — ${newSubcontract.task}`,
          user: name || 'Utilisateur',
          type: 'success'
        });
        notify(`Contrat de ${newSubcontract.company} créé avec succès.`, 'success', '/resources');
      }
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de la sauvegarde du contrat', 'error', '/resources');
      return;
    } finally {
      setIsSubmittingSubcontract(false);
    }

    setIsSubcontractModalOpen(false);
    setEditingContract(null);
    setNewSubcontract({
      company: '',
      niu: '',
      projectId: projects[0]?.id || 0,
      task: '',
      amount: '',
      startDate: '',
      endDate: '',
      tasks: [],
      lots: []
    });
    setUseLots(false);
  };

  const toggleSubcontractTask = (contractId: number, taskId: string) => {
    const contract = subcontracts.find(c => c.id === contractId);
    if (!contract) return;

    const updatedTasks = contract.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;

    updateSubcontract(contractId, { tasks: updatedTasks, progress });

    // Update selectedContract if it's the one being toggled
    if (selectedContract && selectedContract.id === contractId) {
      setSelectedContract({ ...contract, tasks: updatedTasks, progress });
    }
  };

  const handleStockMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockMovementError(null); // Réinitialiser l'erreur

    // Toujours traiter le formulaire à l'étape 1
    if (stockMovementStep === 1) {
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString('fr-FR')} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      let projectLabel = '';

      // Validation de la quantité
      const qty = Number(newStockMovement.qty);
      if (!qty || qty <= 0) {
        notify('La quantité doit être supérieure à 0.', 'error', '/resources');
        return;
      }

      // Validation de l'article
      if (!newStockMovement.item || newStockMovement.item.trim() === '') {
        notify('Veuillez sélectionner un article.', 'error', '/resources');
        return;
      }

      if (stockMovementType === 'transfer') {
        // Validation des projets pour les transferts
        if (!newStockMovement.fromProjectId || Number(newStockMovement.fromProjectId) === 0) {
          notify('Veuillez sélectionner un projet source valide pour le transfert.', 'error', '/resources');
          return;
        }
        if (!newStockMovement.toProjectId || Number(newStockMovement.toProjectId) === 0) {
          notify('Veuillez sélectionner un projet destination valide pour le transfert.', 'error', '/resources');
          return;
        }
        if (newStockMovement.fromProjectId === newStockMovement.toProjectId) {
          notify('Les projets source et destination doivent être différents.', 'error', '/resources');
          return;
        }

        projectLabel = `${getProjectNameById(newStockMovement.fromProjectId)} -> ${getProjectNameById(newStockMovement.toProjectId)}`;
        // Sortie du projet source
        await addStockMovement({
          movementDate: new Date().toISOString().split('T')[0],
          type: 'Sortie',
          item: newStockMovement.item,
          quantity: Number(newStockMovement.qty || 0),
          unit: newStockMovement.unit,
          projectId: newStockMovement.fromProjectId,
          note: `Transfert vers ${getProjectNameById(newStockMovement.toProjectId)}`
        });
        // Entrée dans le projet destination
        await addStockMovement({
          movementDate: new Date().toISOString().split('T')[0],
          type: 'Entrée',
          item: newStockMovement.item,
          quantity: Number(newStockMovement.qty || 0),
          unit: newStockMovement.unit,
          projectId: newStockMovement.toProjectId,
          note: `Transfert depuis ${getProjectNameById(newStockMovement.fromProjectId)}`
        });
      } else {
        const typeLabel = stockMovementType === 'entry' ? 'Entrée' : 'Sortie';
        projectLabel = stockMovementType === 'entry'
          ? (Number(newStockMovement.toProjectId) === 0 ? "Magasin Central" : getProjectNameById(newStockMovement.toProjectId))
          : (Number(newStockMovement.fromProjectId) === 0 ? "Magasin Central" : getProjectNameById(newStockMovement.fromProjectId));

        const effectiveProjectId = stockMovementType === 'entry' ? newStockMovement.toProjectId : newStockMovement.fromProjectId;

        // Validation des champs obligatoires
        if (!effectiveProjectId || Number(effectiveProjectId) === 0) {
          notify('Veuillez sélectionner un projet valide pour le mouvement de stock.', 'error', '/resources');
          return;
        }

        try {
          await addStockMovement({
            movementDate: new Date().toISOString().split('T')[0],
            type: typeLabel,
            item: newStockMovement.item,
            quantity: Number(newStockMovement.qty || 0),
            unit: newStockMovement.unit,
            projectId: Number(effectiveProjectId)
          });
        } catch (err: any) {
          // Gérer les erreurs de stock insuffisant
          if (err?.message?.includes('Stock insuffisant') || err?.message?.includes('insufficient stock')) {
            setStockMovementError(err.message);
            setStockMovementStep(2); // Afficher l'étape d'erreur
            return;
          }
          // Gérer les autres erreurs
          notify(err?.message || 'Erreur lors de l\'enregistrement du mouvement de stock', 'error', '/resources');
          return;
        }
      }

      const labelForLog = stockMovementType === 'entry' ? 'Entrée' : stockMovementType === 'exit' ? 'Sortie' : 'Transfert';

      addLog({
        module: 'Ressources',
        action: `Mouvement de stock (${labelForLog}): ${newStockMovement.item} (${newStockMovement.qty} ${newStockMovement.unit}) - ${projectLabel}`,
        user: name || 'Utilisateur',
        type: stockMovementType === 'exit' ? 'warning' : 'info'
      });
      notify(`Mouvement de stock (${labelForLog}) enregistré.`, 'success', '/resources');

      // Passer à l'étape 2 pour afficher le message de succès
      setStockMovementStep(2);
      return;
    }

    // Si on est à l'étape 2, fermer la modale
    if (stockMovementStep === 2) {
      setIsStockMovementModalOpen(false);
      setStockMovementStep(1);
      setStockMovementError(null); // Réinitialiser l'erreur
      setNewStockMovement({
        item: 'Ciment CPJ 35',
        qty: '',
        unit: 'Tonnes',
        fromProjectId: projects[0]?.id || 0,
        toProjectId: projects[0]?.id || 0,
        chantier: projects[0]?.name || '',
        fromChantier: projects[0]?.name || '',
        toChantier: projects[0]?.name || '',
        receiver: '',
        docRef: ''
      });
    }
  };

  React.useEffect(() => {
    const handleOpenLogbook = () => setIsFullLogbookModalOpen(true);
    const handleOpenInventory = () => setIsInventoryModalOpen(true);

    window.addEventListener('open-logbook', handleOpenLogbook);
    window.addEventListener('open-inventory', handleOpenInventory);

    return () => {
      window.removeEventListener('open-logbook', handleOpenLogbook);
      window.removeEventListener('open-inventory', handleOpenInventory);
    };
  }, []);
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <Package className="w-4 h-4" />
            <span>{role === 'rh' ? 'Personnel & RH' : 'Ressources & Logistique'}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{role === 'rh' ? 'Personnel & RH' : 'Gestion des Moyens'}</h1>
          <p className="text-slate-500 font-medium mt-1">Optimisation des achats localisés, stocks, matériel et main-d'œuvre au Cameroun</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {role === 'chef' && (
            <Button variant="outline" onClick={() => {
              setNewPurchase({
                item: 'Ciment CPJ 35',
                qty: '',
                unit: 'Tonnes',
                unitPrice: '',
                provider: '',
                priority: 'Normale',
                projectId: projects[0]?.id || 0,
                chantier: projects[0]?.name || '',
                deliveryDate: new Date().toISOString().split('T')[0]
              });
              setIsPurchaseModalOpen(true);
            }} className="bg-white border-slate-200 font-bold">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Demande d'Achat (DA)
            </Button>
          )}

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar w-full sm:w-fit">
        {[
          { id: 'purchases', label: 'Achats & Fournisseurs', icon: ShoppingCart, roles: ['dg', 'chef'] },
          { id: 'stock', label: 'Stocks Chantiers', icon: Package, roles: ['dg', 'chef', 'technicien'] },
          { id: 'equipment', label: 'Parc Engins', icon: Truck, roles: ['dg', 'chef', 'technicien'] },
          { id: 'hr', label: 'Personnel & RH', icon: Users, roles: ['dg', 'chef', 'rh'] },
          { id: 'subcontracting', label: 'Sous-traitance', icon: Handshake, roles: ['dg', 'chef'] },
          { id: 'pointage', label: 'Pointage & Heures', icon: Clock, roles: ['dg', 'chef', 'technicien', 'rh'] },
        ].filter(tab => tab.roles.includes(role || '')).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0",
              activeTab === tab.id ? "bg-white shadow-md text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">
              {tab.id === 'purchases' ? 'Achats' :
                tab.id === 'stock' ? 'Stocks' :
                  tab.id === 'equipment' ? 'Engins' :
                    tab.id === 'hr' ? 'RH' :
                      tab.id === 'subcontracting' ? 'ST' :
                        tab.id === 'pointage' ? 'Points' : tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'purchases' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Historique des Achats (FCFA)</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Dernières transactions validées</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 font-bold"
                        onClick={() => {
                          const dataToExport = purchases.map(p => ({
                            ID: `BC-${p.id}`,
                            Désignation: p.item,
                            Fournisseur: p.provider || 'N/A',
                            Quantité: p.quantity || p.qty || 0,
                            'Prix Unitaire': p.unitPrice || 0,
                            'Montant TTC': p.total || (Number(p.quantity || p.qty || 0) * Number(p.unitPrice || 0)),
                            'Date Livraison': p.deliveryDate || p.date,
                            Statut: p.status
                          }));
                          exportToCSV(dataToExport, `historique_achats_${new Date().toISOString().split('T')[0]}.csv`);
                        }}
                      >
                        Exporter
                      </Button>
                      <Button variant="outline" size="sm" className="h-9 px-4 font-bold">Filtres</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                          <th className="px-6 py-4">Réf BC</th>
                          <th className="px-6 py-4">Désignation</th>
                          <th className="px-6 py-4">Fournisseur</th>
                          <th className="px-6 py-4 text-right">Quantité</th>
                          <th className="px-6 py-4 text-right">Prix Unitaire (FCFA)</th>
                          <th className="px-6 py-4 text-right">Montant TTC (FCFA)</th>
                          <th className="px-6 py-4">Date Livraison</th>
                          <th className="px-6 py-4">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {purchases.sort((a, b) => new Date(b.deliveryDate || b.date || 0).getTime() - new Date(a.deliveryDate || a.date || 0).getTime()).map(p => (
                          <tr
                            key={`history-${p.id}`}
                            className={cn("hover:bg-slate-50/80 transition-colors", p.status === 'Validé' ? "cursor-pointer" : "")}
                            onClick={() => {
                              if (p.status === 'Validé') {
                                setPurchaseToUpdate(p);
                                setIsConfirmModalOpen(true);
                              }
                            }}
                          >
                            <td className="px-6 py-4 text-xs font-black text-slate-900">BC-{p.id}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-700">{p.item}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{p.provider || 'N/A'}</td>
                            <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">{p.quantity || p.qty || 0}</td>
                            <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">{(p.unitPrice || 0).toLocaleString('fr-FR')}</td>
                            <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">{(p.total || (Number(p.quantity || p.qty || 0) * Number(p.unitPrice || 0))).toLocaleString('fr-FR')}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{p.deliveryDate || p.date}</td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                                  p.status === 'Livré' ? "bg-slate-100 text-slate-700" :
                                    p.status === 'Validé' ? "bg-emerald-100 text-emerald-700" :
                                      "bg-amber-100 text-amber-700"
                                )}
                              >
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Stocks Chantiers & Logistique</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Suivi du matériel et consommables chantiers</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <select
                      value={selectedStockProject ?? ''}
                      onChange={(e) => setSelectedStockProject(e.target.value ? Number(e.target.value) : null)}
                      className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-transparent outline-none cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                    >
                      <option value="">Tous les chantiers</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtrer un article..."
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-xl text-xs outline-none focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                    />
                  </div>
                  <Button onClick={() => {
                    setStockMovementStep(1);
                    setIsStockMovementModalOpen(true);
                  }} className="font-bold whitespace-nowrap shadow-lg shadow-blue-900/20">
                    <ArrowRightLeft className="w-4 h-4 mr-2" /> Mouvement
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {calculatedStock.length > 0 ? (
                  calculatedStock.filter(item => item.title.toLowerCase().includes(stockSearchQuery.toLowerCase()))
                    .map((item, i) => (
                      <StockCard key={`stock-${i}`} {...item} />
                    ))
                ) : (
                  <div className="lg:col-span-4 py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">Aucun chantier actif. Le stock est vide.</p>
                  </div>
                )}
              </div>

              <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Mouvements de Stock Récents</h3>
                  <Button variant="outline" size="sm" className="font-bold" onClick={() => setIsFullLogbookModalOpen(true)}>Journal Complet</Button>
                </div>
                <div className="space-y-4">
                  {stockMovements
                    .filter(m => selectedStockProject === null || m.projectId === selectedStockProject)
                    .slice(0, 5).map((movement, i) => (
                      <div key={`movement-${i}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            movement.type === 'Sortie' ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                          )}>
                            {movement.type === 'Sortie' ? <ArrowRightLeft className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{movement.type} Stock - {movement.item}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getProjectNameById(movement.projectId)} • Par: {movement.user}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-sm font-black", movement.type === 'Sortie' ? "text-red-600" : "text-emerald-600")}>
                            {movement.type === 'Sortie' ? '-' : '+'}{movement.qty} {movement.unit}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400">{movement.date}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Parc Engins & Matériel Roulant</h3>
                  {projects.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <select
                        value={selectedEquipmentProject ?? ''}
                        onChange={(e) => setSelectedEquipmentProject(e.target.value ? Number(e.target.value) : null)}
                        className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-transparent outline-none cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                      >
                        <option value="">Tous les chantiers</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {role === 'chef' && (
                  <Button onClick={() => setIsEquipmentModalOpen(true)} className="font-bold shadow-lg shadow-blue-900/10">
                    <Plus className="w-4 h-4 mr-2" /> Demander un engin
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {equipmentList
                  .filter(item => selectedEquipmentProject === null || item.projectId === selectedEquipmentProject)
                  .map((item, i) => (
                    <Card
                      key={`equipment-${i}`}
                      className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-2xl transition-all group cursor-pointer"
                      onClick={() => setSelectedResource({ ...item, type: 'equipment' })}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                          <Truck className="w-6 h-6" />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                          item.status === 'En service' ? "bg-emerald-100 text-emerald-700" :
                            item.status === 'En cours' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {item.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mb-1">{item.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{item.ref}</p>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-xs font-bold text-slate-600">
                          <MapPin className="w-3 h-3 mr-2 text-slate-400" /> {item.location.startsWith('Demande') ? item.location : `Localisation: ${item.location}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {item.status === 'En cours' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50 font-bold"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteEquipment(item.id);
                              notify(`Demande pour ${item.name} annulée.`, 'info', '/resources');
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Annuler la demande
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'hr' && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Personnel & Main-d'œuvre</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestion des effectifs et affectations</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    onChange={(e) => setSelectedProjectFilter(e.target.value ? Number(e.target.value) : null)}
                    value={selectedProjectFilter ?? ''}
                  >
                    <option value="">Tous les chantiers</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {(role === 'chef' || role === 'rh') && (
                    <Button onClick={() => setIsEmployeeModalOpen(true)} className="font-bold shadow-lg shadow-blue-900/10">
                      <UserPlus className="w-4 h-4 mr-2" /> Ajouter
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Effectif</p>
                    <p className="text-2xl font-black text-slate-900">{filteredEmployees.length}</p>
                  </div>
                </Card>
                <Card className="p-6 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <HardHat className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sur Chantiers</p>
                    <p className="text-2xl font-black text-slate-900">{filteredEmployees.filter(e => e.projectId && e.projectId !== 0).length}</p>
                  </div>
                </Card>
                <Card className="p-6 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Congés / Absences</p>
                    <p className="text-2xl font-black text-slate-900">0</p>
                  </div>
                </Card>
              </div>

              <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Registre du Personnel</h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={hrSearchQuery}
                      onChange={(e) => setHrSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                        <th className="px-6 py-4">Employé</th>
                        <th className="px-6 py-4">Matricule</th>
                        <th className="px-6 py-4">Poste / Qualification</th>
                        <th className="px-6 py-4">Affectation</th>
                        <th className="px-6 py-4">Type Contrat</th>
                        <th className="px-6 py-4">NIU / CNPS</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredEmployees.map((emp, i) => (
                        <tr
                          key={`employee-${i}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                {emp.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-xs font-black text-slate-900">{emp.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{emp.matricule}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">{emp.role}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{getProjectNameById(emp.projectId) || emp.project}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-900">{emp.contract}</td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{emp.niu}</td>
                          <td className="px-6 py-4">
                            {(getProjectNameById(emp.projectId) || emp.project) && (getProjectNameById(emp.projectId) || emp.project) !== 'Non assigné' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[var(--color-primary)]">{getProjectNameById(emp.projectId) || emp.project}</span>
                                <button onClick={(e) => { e.stopPropagation(); setSelectedResource({ ...emp, type: 'hr' }); setIsAssignEmployeeModalOpen(true); }} className="text-slate-500 hover:text-[var(--color-primary)]">
                                  <Settings2 className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(emp); }} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 px-3 text-[10px] font-black uppercase tracking-widest"
                                onClick={(e) => { e.stopPropagation(); setSelectedResource({ ...emp, type: 'hr' }); setIsAssignEmployeeModalOpen(true); }}
                              >
                                Affecter
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'subcontracting' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Gestion de la Sous-traitance</h3>
                <Button onClick={() => {
                  setEditingContract(null);
                  setNewSubcontract({
                    company: '',
                    niu: '',
                    projectId: projects[0]?.id || 0,
                    task: '',
                    amount: '',
                    startDate: '',
                    endDate: '',
                    tasks: [],
                    lots: []
                  });
                  setIsSubcontractModalOpen(true);
                }} className="font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Nouveau Contrat ST
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {subcontracts.map((st, i) => (
                  <Card key={`subcontract-${i}`} className="p-6 border-none shadow-lg shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                        <Handshake className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900">{st.entreprise}</h4>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{st.objet} • {getProjectNameById(st.projectId)}</p>
                      </div>
                    </div>
                    <div className="flex-1 max-w-xs">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1">
                        <span>Avancement ST</span>
                        <span>{st.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${st.progress}%` }}></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Montant Contrat</p>
                      <p className="text-lg font-black text-slate-900">{st.montant.toLocaleString()} FCFA</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="font-bold" onClick={() => {
                        setSelectedContract(st);
                        setIsContractDetailsModalOpen(true);
                      }}>Détails</Button>
                      <Button variant="ghost" size="sm" className="font-bold text-blue-600 hover:bg-blue-50" onClick={() => {
                        const reconstructedLots: { lotNumber: number; lotName: string; tasks: string[] }[] = [];
                        (st.tasks || []).forEach((t: any) => {
                          const lotNum = t.lotNumber || 1;
                          let lot = reconstructedLots.find(l => l.lotNumber === lotNum);
                          if (!lot) {
                            lot = { lotNumber: lotNum, lotName: t.lotName || `Lot ${lotNum}`, tasks: [] };
                            reconstructedLots.push(lot);
                          }
                          lot.tasks.push(t.title);
                        });

                        setEditingContract(st);
                        setNewSubcontract({
                          company: st.entreprise,
                          niu: 'M098765432109',
                          projectId: st.projectId,
                          task: st.objet,
                          amount: st.montant.toString(),
                          startDate: st.startDate || '',
                          endDate: st.endDate || '',
                          tasks: st.tasks.map((t: any) => t.title),
                          lots: reconstructedLots
                        });
                        setUseLots(reconstructedLots.length > 1 || st.tasks.some((t: any) => t.lotNumber > 1 || (t.lotName && t.lotName !== 'Lot 1')));
                        setIsSubcontractModalOpen(true);
                      }}>Modifier</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmer la livraison"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-600">Êtes-vous sûr de vouloir changer le statut de la commande {purchaseToUpdate?.item} en "Livré" ? Cette action est irréversible.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Annuler</Button>
            <Button onClick={() => {
              updatePurchase(purchaseToUpdate.id, { status: 'Livré' });
              setIsConfirmModalOpen(false);
              notify(`Commande ${purchaseToUpdate.item} marquée comme livrée.`, 'success', '/resources');
            }}>Confirmer</Button>
          </div>
        </div>
      </Modal>

      {/* Purchase Modal (Workflow) */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="Nouvelle Demande d'Achat (DA) "
        size="lg"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                purchaseStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handlePurchaseSubmit} className="space-y-8">
            {purchaseStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Article & Quantité</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Désignation de l'article</label>
                    <select
                      value={newPurchase.item}
                      onChange={(e) => {
                        const newItem = e.target.value;
                        setNewPurchase({ ...newPurchase, item: newItem, unit: itemUnits[newItem] || '' });
                      }}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {Object.keys(itemUnits).map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Quantité"
                      type="number"
                      placeholder="0"
                      required
                      value={newPurchase.qty}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value > 0) {
                          setNewPurchase({ ...newPurchase, qty: value });
                        }
                      }}
                      min="1"
                      step="1"
                    />
                    <Input
                      label="Unité"
                      placeholder="Sacs, m3, Tonnes..."
                      required
                      value={newPurchase.unit}
                      onChange={(e) => setNewPurchase({ ...newPurchase, unit: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Priorité d'Achat</label>
                    <div className="flex gap-2">
                      {['Basse', 'Normale', 'Urgente'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewPurchase({ ...newPurchase, priority: p })}
                          className={cn(
                            "flex-1 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                            newPurchase.priority === p
                              ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Logistique & Destination</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Chantier de destination</label>
                    <select
                      value={newPurchase.projectId}
                      onChange={(e) => { const projectId = Number(e.target.value); setNewPurchase({ ...newPurchase, projectId, chantier: getProjectNameById(projectId) }); }}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Prix unitaire estimé (FCFA)"
                    type="number"
                    placeholder="0"
                    value={newPurchase.unitPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value >= 0) {
                        setNewPurchase({ ...newPurchase, unitPrice: value });
                      }
                    }}
                    min="0"
                    step="1"
                  />
                  <Input
                    label="Fournisseur souhaité (optionnel)"
                    type="text"
                    placeholder="Ex: FOKOU, QUIFEUROU..."
                    value={newPurchase.provider}
                    onChange={(e) => setNewPurchase({ ...newPurchase, provider: e.target.value })}
                  />
                  <Input
                    label="Date de livraison souhaitée"
                    type="date"
                    min={today}
                    value={newPurchase.deliveryDate}
                    onChange={(e) => setNewPurchase({ ...newPurchase, deliveryDate: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Notes / Spécifications</label>
                    <textarea className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Précisez les détails..."></textarea>
                  </div>
                </div>
              </div>
            )}

            {purchaseStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Demande d'Achat Créée</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">La DA a été transmise au service Achats pour consultation des fournisseurs (FOKOU, QUIFEUROU, etc.).</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => {
                if (purchaseStep > 1) {
                  setPurchaseStep(1);
                } else {
                  setIsPurchaseModalOpen(false);
                  setPurchaseStep(1);
                }
              }} className="font-bold">
                {purchaseStep === 1 ? 'Annuler' : 'Fermer'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20">
                {purchaseStep === 2 ? 'Fermer' : 'Valider la Demande'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Stock Modal (Workflow) */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title="Bon de Sortie Magasin (BSM)"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                stockStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleStockSubmit} className="space-y-6">
            {stockStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Article à sortir</label>
                  <select
                    value={newStockMovement.item}
                    onChange={(e) => setNewStockMovement({ ...newStockMovement, item: e.target.value })}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option>Ciment CPJ 35 (Stock: 850 sacs)</option>
                    <option>Gazole (Stock: 5,000 L)</option>
                    <option>EPI (Stock: 120 kits)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quantité Sortie"
                    type="number" min="0"
                    placeholder="0"
                    required
                    value={newStockMovement.qty}
                    onChange={(e) => setNewStockMovement({ ...newStockMovement, qty: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Chantier Affecté</label>
                    <select
                      value={newStockMovement.toProjectId}
                      onChange={(e) => { const toProjectId = Number(e.target.value); setNewStockMovement({ ...newStockMovement, toProjectId, chantier: getProjectNameById(toProjectId), toChantier: getProjectNameById(toProjectId) }); }}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input
                  label="Nom du Réceptionnaire"
                  placeholder="Ex: Jean Ebollo"
                  required
                  value={newStockMovement.receiver}
                  onChange={(e) => setNewStockMovement({ ...newStockMovement, receiver: e.target.value })}
                />
              </div>
            )}

            {stockStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Bon de Sortie Validé</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">Le stock a été décompté et le bon de sortie a été généré pour signature.</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => {
                if (stockStep > 1) {
                  setStockStep(1);
                } else {
                  setIsStockModalOpen(false);
                  setStockStep(1);
                }
              }} className="font-bold">
                {stockStep === 1 ? 'Annuler' : 'Fermer'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20">
                {stockStep === 2 ? 'Fermer' : 'Générer le BSM'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Employee Modal (Workflow) */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title="Ajouter un Collaborateur"
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <label className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em] mb-2 block">Affecter au Chantier d'accueil</label>
              <select
                value={selectedProjectForAdd}
                onChange={(e) => setSelectedProjectForAdd(Number(e.target.value))}
                className="w-full h-11 px-4 bg-white border border-blue-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value={0}>— Sélectionner le chantier —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-4">Employé</th>
                    <th className="px-6 py-4">Poste</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {availableEmployees.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs font-black text-slate-900">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{emp.role}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant={selectedProjectForAdd === 0 ? "outline" : "default"}
                          className="h-8 px-4 text-[10px] font-black uppercase tracking-widest"
                          disabled={isAddingEmployee || selectedProjectForAdd === 0}
                          onClick={async () => {
                            setIsAddingEmployee(true);
                            try {
                              await addEmployee({
                                ...emp,
                                projectId: selectedProjectForAdd
                              });
                              // Si c'est un chef de chantier, on l'assigne au projet
                              if (emp.role === 'Chef de Chantier') {
                                await updateProject(selectedProjectForAdd, { manager: emp.name });
                              }
                              setAvailableEmployees(prev => prev.filter(e => e.matricule !== emp.matricule));
                              notify(`Collaborateur ${emp.name} affecté avec succès au chantier ${getProjectNameById(selectedProjectForAdd)}.`, 'success', '/resources');
                              setIsEmployeeModalOpen(false);
                            } catch (err: any) {
                              notify(err?.message || 'Erreur lors de l\'ajout', 'error', '/resources');
                            } finally {
                              setIsAddingEmployee(false);
                            }
                          }}
                        >
                          Affecter
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={() => setIsEmployeeModalOpen(false)} className="font-bold">
              Fermer
            </Button>
          </div>
        </div>
      </Modal>


      {/* Equipment Request Modal */}
      <Modal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        title="Demander un Engin pour un Chantier"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">1. Sélectionner l'Engin</h4>
              <div className="grid grid-cols-1 gap-3">
                {availableEquipment.map((item) => {
                  const existingCount = equipmentList.filter(e => e.name === item.name).length;
                  const inServiceCount = equipmentList.filter(e => e.name === item.name && e.status === 'En service').length;

                  return (
                    <button
                      key={item.name}
                      disabled={inServiceCount === 0}
                      onClick={() => setNewEquipment({ ...newEquipment, name: item.name, type: item.type })}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                        newEquipment.name === item.name ? "border-[var(--color-primary)] bg-blue-50" : "border-slate-100 hover:border-slate-200",
                        inServiceCount === 0 && "opacity-50 cursor-not-allowed grayscale"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <Truck className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{item.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Disponibilité</p>
                        <p className={cn("text-xs font-bold", inServiceCount > 0 ? "text-emerald-600" : "text-red-600")}>
                          {inServiceCount} / {existingCount || 1} dispos
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">2. Détails de la Demande</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Chantier Demandeur</label>
                  <select
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={newEquipment.location}
                    onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3 text-blue-700 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">Information</span>
                  </div>
                  <p className="text-[11px] text-blue-600 leading-relaxed">
                    La demande sera envoyée au responsable logistique. Le statut par défaut sera <span className="font-black">"En cours"</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEquipmentModalOpen(false)}>Annuler</Button>
            <Button
              disabled={!newEquipment.name}
              onClick={() => {
                const item = availableEquipment.find(e => e.name === newEquipment.name);
                if (item) handleAddEquipment(item, newEquipment.location);
              }}
              className="px-8 font-bold shadow-lg shadow-blue-900/20"
            >
              Envoyer la Demande
            </Button>
          </div>
        </div>
      </Modal>

      {/* Simplified Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Affectation d'Engin"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[var(--color-primary)]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{assigningEquipment?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{assigningEquipment?.ref}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Choisir le Chantier de Destination</label>
            <div className="grid grid-cols-1 gap-2">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await updateEquipment(assigningEquipment.id, { location: p.name, status: 'En mission' });
                    setIsAssignModalOpen(false);
                    notify(`L'engin ${assigningEquipment.name} a été affecté à ${p.name}.`, 'success', '/resources');
                  }}
                  className="w-full p-4 text-left rounded-xl border border-slate-100 hover:border-[var(--color-primary)] hover:bg-blue-50 transition-all flex items-center justify-between group"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-[var(--color-primary)]">{p.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--color-primary)]" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Annuler</Button>
          </div>
        </div>
      </Modal>
      {/* Stock Movement Modal */}
      <Modal
        isOpen={isStockMovementModalOpen}
        onClose={() => setIsStockMovementModalOpen(false)}
        title="Nouveau Mouvement de Stock"
        size="lg"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                stockMovementStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleStockMovementSubmit}>
            {stockMovementStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Type de Mouvement</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setStockMovementType('entry')}
                      className={cn(
                        "p-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all",
                        stockMovementType === 'entry' ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <Plus className="w-5 h-5" /> Entrée
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockMovementType('exit')}
                      className={cn(
                        "p-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all",
                        stockMovementType === 'exit' ? "bg-red-50 border-red-500 text-red-700 shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <Minus className="w-5 h-5" /> Sortie
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockMovementType('transfer')}
                      className={cn(
                        "p-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-2 transition-all",
                        stockMovementType === 'transfer' ? "bg-blue-50 border-blue-500 text-blue-700 shadow-md" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <Truck className="w-5 h-5" /> Transfert
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Article</label>
                      <select
                        value={newStockMovement.item}
                        onChange={(e) => {
                          const item = e.target.value;
                          setNewStockMovement({
                            ...newStockMovement,
                            item,
                            unit: itemUnits[item] || 'Unités'
                          });
                        }}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option>Ciment CPJ 35</option>
                        <option>Sable de Sanaga</option>
                        <option>Gazole Chantier</option>
                        <option>EPI (Casques/Gilets)</option>
                        <option>Fer à béton 12mm</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Quantité"
                        type="number" min="0"
                        placeholder="0"
                        required
                        value={newStockMovement.qty}
                        onChange={(e) => setNewStockMovement({ ...newStockMovement, qty: e.target.value })}
                      />
                      <Input label="Unité" value={newStockMovement.unit} disabled />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(stockMovementType === 'exit' || stockMovementType === 'transfer') && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Chantier d'Origine</label>
                        <select
                          value={newStockMovement.fromProjectId}
                          onChange={(e) => { const fromProjectId = Number(e.target.value); setNewStockMovement({ ...newStockMovement, fromProjectId, fromChantier: getProjectNameById(fromProjectId) }); }}
                          className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          required
                        >
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                    {(stockMovementType === 'entry' || stockMovementType === 'transfer') && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Chantier de Destination</label>
                        <select
                          value={newStockMovement.toProjectId}
                          onChange={(e) => { const toProjectId = Number(e.target.value); setNewStockMovement({ ...newStockMovement, toProjectId, chantier: getProjectNameById(toProjectId), toChantier: getProjectNameById(toProjectId) }); }}
                          className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          required
                        >
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Commentaires / Observations</label>
                  <textarea className="w-full h-20 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Précisez les détails du mouvement..."></textarea>
                </div>
              </div>
            )}

            {stockMovementStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                {stockMovementError ? (
                  // Affichage de l'alerte d'erreur de stock
                  <div className="space-y-6">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-50">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h4 className="text-2xl font-black text-red-900 tracking-tight">
                      Stock Insuffisant
                    </h4>
                    <div className="max-w-md mx-auto">
                      <p className="text-red-700 font-medium mb-4">
                        {stockMovementError}
                      </p>
                      <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-sm text-red-600">
                          Veuillez vérifier le stock disponible et ajuster la quantité demandée.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Affichage normal de succès
                  <div className="space-y-6">
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                      stockMovementType === 'entry' ? "bg-emerald-50 text-emerald-500" :
                        stockMovementType === 'exit' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                    )}>
                      {stockMovementType === 'entry' ? <Plus className="w-10 h-10" /> :
                        stockMovementType === 'exit' ? <ArrowRightLeft className="w-10 h-10" /> : <Truck className="w-10 h-10" />}
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                      {stockMovementType === 'entry' ? 'Entrée de Stock Validée' :
                        stockMovementType === 'exit' ? 'Sortie de Stock Validée' : 'Transfert Inter-Chantier Validé'}
                    </h4>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto">
                      Le mouvement a été enregistré avec succès. Le stock théorique a été mis à jour et le document justificatif a été archivé.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => stockMovementStep > 1 ? setStockMovementStep(1) : setIsStockMovementModalOpen(false)} className="font-bold">
                {stockMovementStep === 1 ? 'Annuler' : 'Précédent'}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20">
                {stockMovementStep === 2 ? 'Fermer' : 'Confirmer le Mouvement'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Assign Equipment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Affecter l'Engin: ${assigningEquipment?.name}`}
      >
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsAssignModalOpen(false); }}>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-6">
            <p className="text-xs font-bold text-blue-700">L'engin est actuellement à: <span className="font-black">{assigningEquipment?.location}</span></p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Chantier de Destination</label>
            <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Conducteur Assigné</label>
            <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              <option>Paul Abena</option>
              <option>Jean Ebollo</option>
              <option>Ahmed Bello</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date Début" type="date" min={today} required />
            <Input label="Date Fin Prévue" type="date" min={today} required />
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsAssignModalOpen(false)}>Annuler</Button>
            <Button type="submit" className="font-bold shadow-lg shadow-blue-900/20" onClick={() => notify(`Engin ${assigningEquipment?.name} affecté avec succès.`, 'success', '/resources')}>Confirmer l'Affectation</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Employee Modal */}
      <Modal
        isOpen={isAssignEmployeeModalOpen}
        onClose={() => setIsAssignEmployeeModalOpen(false)}
        title={`Affecter l'Employé: ${selectedResource?.name}`}
      >
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleAssign(selectedResource, Number((e.currentTarget as any).project.value)); }}>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Chantier de Destination</label>
            <select name="project" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsAssignEmployeeModalOpen(false)}>Annuler</Button>
            <Button type="submit" className="font-bold shadow-lg shadow-blue-900/20">Confirmer l'Affectation</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Employee Modal */}
      <Modal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        title="Confirmer la Suppression"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-900">Action Irréversible</p>
              <p className="text-xs text-red-700">Êtes-vous sûr de vouloir supprimer définitivement <strong>{employeeToDelete?.name}</strong> du registre ?</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsConfirmDeleteModalOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/20" onClick={confirmDelete}>Supprimer Définitivement</Button>
          </div>
        </div>
      </Modal>

      {/* Logbook Modal */}
      <Modal
        isOpen={isLogbookModalOpen}
        onClose={() => setIsLogbookModalOpen(false)}
        title="Carnet de Bord Engin"
        size="lg"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Heures Moteur</p>
              <p className="text-xl font-black text-slate-900">1,245 h</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conso. Moyenne</p>
              <p className="text-xl font-black text-slate-900">12.5 L/h</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponibilité</p>
              <p className="text-xl font-black text-emerald-600">98%</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Historique des Événements</h4>
            <div className="space-y-3">
              {[
                { date: '12/04/2024', type: 'Plein Gazole', detail: '250 Litres - Station Chantier PK 45', author: 'Jean Chauffeur' },
                { date: '10/04/2024', type: 'Entretien', detail: 'Vidange moteur + Changement filtres', author: 'Garage Central' },
                { date: '08/04/2024', type: 'Affectation', detail: 'Transfert Section Edéa -> Section Boumnyebel', author: 'Logistique' },
              ].map((event, i) => (
                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{event.type}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.detail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{event.date}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{event.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsLogbookModalOpen(false)} className="font-bold">Fermer</Button>
          </div>
        </div>
      </Modal>

      {/* Subcontract Modal */}
      <Modal
        isOpen={isSubcontractModalOpen}
        onClose={() => {
          setIsSubcontractModalOpen(false);
          setEditingContract(null);
          setNewSubcontract({
            company: '',
            niu: '',
            projectId: projects[0]?.id || 0,
            task: '',
            amount: '',
            startDate: '',
            endDate: '',
            tasks: [],
            lots: []
          });
          setUseLots(false);
          setNewLotName('');
          setNewLotTask({});
        }}
        title={editingContract ? "Modifier le Contrat ST" : "Nouveau Contrat de Sous-traitance"}
        size="lg"
      >
        <form className="space-y-6" onSubmit={handleSubcontractSubmit}>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informations ST</h4>
              <Input
                label="Nom de l'Entreprise ST"
                placeholder="Ex: ETS BTP SERVICES"
                required
                value={newSubcontract.company}
                onChange={(e) => setNewSubcontract({ ...newSubcontract, company: e.target.value })}
              />
              <Input
                label="NIU de l'Entreprise"
                placeholder="Numéro Identifiant Unique"
                required
                value={newSubcontract.niu}
                onChange={(e) => setNewSubcontract({ ...newSubcontract, niu: e.target.value })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Chantier d'Affectation</label>
                <select
                  value={newSubcontract.projectId}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, projectId: Number(e.target.value) })}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Détails du Marché ST</h4>
              <Input
                label="Objet Principal"
                placeholder="Ex: Terrassement, Électricité..."
                required
                value={newSubcontract.task}
                onChange={(e) => setNewSubcontract({ ...newSubcontract, task: e.target.value })}
              />
              <Input
                label="Montant du Contrat (FCFA)"
                type="number" min="0"
                placeholder="0"
                required
                value={newSubcontract.amount}
                onChange={(e) => setNewSubcontract({ ...newSubcontract, amount: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date Début"
                  type="date" min={today}
                  required
                  value={newSubcontract.startDate}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, startDate: e.target.value })}
                />
                <Input
                  label="Date Fin"
                  type="date" min={today}
                  required
                  value={newSubcontract.endDate}
                  onChange={(e) => setNewSubcontract({ ...newSubcontract, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tâches / Lots</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Mode lots</span>
                    <button type="button" onClick={() => setUseLots(!useLots)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${useLots ? 'bg-[var(--color-primary)]' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${useLots ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {!useLots ? (
                  /* Mode liste simple */
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubcontractTask}
                        onChange={e => setNewSubcontractTask(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newSubcontractTask.trim()) { setNewSubcontract({ ...newSubcontract, tasks: [...newSubcontract.tasks, newSubcontractTask.trim()] }); setNewSubcontractTask(''); } } }}
                        placeholder="Ajouter une tâche..."
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50"
                      />
                      <button type="button" onClick={() => { if (newSubcontractTask.trim()) { setNewSubcontract({ ...newSubcontract, tasks: [...newSubcontract.tasks, newSubcontractTask.trim()] }); setNewSubcontractTask(''); } }}
                        className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {newSubcontract.tasks.map((task, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">{task}</span>
                          <button type="button" onClick={() => setNewSubcontract({ ...newSubcontract, tasks: newSubcontract.tasks.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                      {newSubcontract.tasks.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Aucune tâche ajoutée</p>}
                    </div>
                  </div>
                ) : (
                  /* Mode lots */
                  <div className="space-y-3">
                    {(newSubcontract.lots || []).map((lot, lotIdx) => (
                      <div key={lotIdx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                          <span className="text-sm font-black text-slate-700"> {lot.lotName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{lot.tasks.length} tâche(s)</span>
                            <button type="button" onClick={() => removeLot(lotIdx)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {lot.tasks.map((task, taskIdx) => (
                            <div key={taskIdx} className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-slate-100">
                              <span className="text-xs text-slate-700">{task}</span>
                              <button type="button" onClick={() => removeTaskFromLot(lotIdx, taskIdx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input type="text" value={newLotTask[lotIdx] || ''} placeholder="Nouvelle tâche dans ce lot..."
                              onChange={e => setNewLotTask(prev => ({ ...prev, [lotIdx]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTaskToLot(lotIdx); } }}
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                            <button type="button" onClick={() => addTaskToLot(lotIdx)}
                              className="px-2 py-1.5 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-800">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Ajouter un lot */}
                    <div className="flex gap-2">
                      <input type="text" value={newLotName} placeholder="Nom du nouveau lot (ex: Lot Fondations)..."
                        onChange={e => setNewLotName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLot(); } }}
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                      <button type="button" onClick={addLot}
                        className="flex items-center gap-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold hover:opacity-90">
                        <Plus className="w-4 h-4" /> Lot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-between">
            {editingContract ? (
              <Button
                type="button"
                onClick={() => {
                  deleteSubcontract(editingContract.id);
                  setIsSubcontractModalOpen(false);
                  setEditingContract(null);
                  notify(`Contrat supprimé avec succès.`, 'info', '/resources');
                }}
                className="font-bold text-red-600 bg-red-50 hover:bg-red-100 border-none"
              >
                Supprimer le contrat
              </Button>
            ) : <div />}
            <div className="flex gap-3">
              <Button variant="outline" type="button" onClick={() => {
                setIsSubcontractModalOpen(false);
                setEditingContract(null);
              }}>Annuler</Button>
              <Button type="submit" disabled={isSubmittingSubcontract} className="font-bold shadow-lg shadow-blue-900/20">
                {isSubmittingSubcontract ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {editingContract ? "Modification en cours..." : "Création en cours..."}
                  </span>
                ) : (
                  editingContract ? "Enregistrer les modifications" : "Créer le Contrat ST"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      {/* All Orders Modal */}
      <Modal
        isOpen={isAllOrdersModalOpen}
        onClose={() => setIsAllOrdersModalOpen(false)}
        title="Toutes les Commandes"
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une commande..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={orderFilterStatus}
                onChange={(e) => setOrderFilterStatus(e.target.value)}
                className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">Tous les statuts</option>
                <option value="En cours">En cours</option>
                <option value="Validé">Validé</option>
                <option value="Livré">Livré</option>
              </select>
            </div>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {purchases
              .filter(order => {
                const matchesSearch = order.item.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                  (getProjectNameById(order.projectId) || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                  (order.id && order.id.toString().includes(orderSearchQuery));
                const matchesFilter = orderFilterStatus === 'all' || order.status === orderFilterStatus;
                return matchesSearch && matchesFilter;
              })
              .map((order, i) => (
                <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 flex justify-between items-center hover:shadow-md transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-900">CMD-{order.id || i}</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                        order.status === 'En cours' ? "bg-blue-100 text-blue-700" :
                          order.status === 'Livré' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{order.item} ({order.qty} {order.unit})</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {getProjectNameById(order.projectId)} • {order.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{order.priority}</p>
                  </div>
                </div>
              ))}
            {purchases.filter(order => {
              const matchesSearch = order.item.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                (getProjectNameById(order.projectId) || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                (order.id && order.id.toString().includes(orderSearchQuery));
              const matchesFilter = orderFilterStatus === 'all' || order.status === orderFilterStatus;
              return matchesSearch && matchesFilter;
            }).length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-slate-400 font-bold">Aucune commande trouvée</p>
                </div>
              )}
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={() => setIsAllOrdersModalOpen(false)}>Fermer</Button>
          </div>
        </div>
      </Modal>

      {/* Contract Details Modal */}
      <Modal
        isOpen={isContractDetailsModalOpen}
        onClose={() => setIsContractDetailsModalOpen(false)}
        title="Détails du Contrat Sous-traitant"
      >
        {selectedContract && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedContract.company}</h3>
                <p className="text-sm font-bold text-slate-500">NIU: M098765432109</p>
              </div>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Actif
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lot / Tâche</p>
                <p className="text-sm font-black text-slate-900">{selectedContract.objet}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chantier</p>
                <p className="text-sm font-black text-slate-900">{getProjectNameById(selectedContract.projectId)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Montant Total</p>
                <p className="text-sm font-black text-slate-900">{selectedContract.montant.toLocaleString()} FCFA</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Période</p>
                <p className="text-sm font-black text-slate-900">{selectedContract.date}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Suivi des Tâches</h4>
                <span className="text-xs font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-lg">
                  {selectedContract.progress}% complété
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedContract.progress}%` }}
                  className="h-full bg-[var(--color-primary)]"
                />
              </div>
              {(() => {
                const tasks = selectedContract.tasks || [];
                if (tasks.length === 0) return (
                  <p className="text-sm text-slate-400 italic text-center py-4">Aucune tâche définie pour ce contrat</p>
                );
                // Vérifier si le contrat a des lots (lotNumber défini)
                const hasLots = tasks.some((t: any) => t.lotNumber);
                if (hasLots) {
                  // Grouper par lot
                  const lots: Record<string, { lotName: string; tasks: any[] }> = {};
                  tasks.forEach((t: any) => {
                    const key = String(t.lotNumber || 1);
                    if (!lots[key]) lots[key] = { lotName: t.lotName || `Lot ${key}`, tasks: [] };
                    lots[key].tasks.push(t);
                  });
                  return (
                    <div className="space-y-3">
                      {Object.entries(lots).map(([lotNum, lot]) => {
                        const doneCount = lot.tasks.filter((t: any) => t.completed).length;
                        const lotPct = Math.round((doneCount / lot.tasks.length) * 100);
                        return (
                          <div key={lotNum} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                              <span className="text-sm font-bold text-slate-700"> {lot.lotName}</span>
                              <span className="text-xs font-bold text-[var(--color-primary)]">{doneCount}/{lot.tasks.length} — {lotPct}%</span>
                            </div>
                            <div className="p-2 space-y-1">
                              {lot.tasks.map((task: any) => (
                                <div key={task.id}
                                  onClick={() => toggleSubcontractTask(selectedContract.id, task.id)}
                                  className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer",
                                    task.completed ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100 hover:border-[var(--color-primary)]")}>
                                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0",
                                    task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white")}>
                                    {task.completed && <ClipboardCheck className="w-2.5 h-2.5" />}
                                  </div>
                                  <span className={cn("text-sm", task.completed ? "line-through text-slate-400" : "text-slate-700")}>{task.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                // Mode liste simple
                return (
                  <div className="space-y-1.5">
                    {tasks.map((task: any) => (
                      <div key={task.id}
                        onClick={() => toggleSubcontractTask(selectedContract.id, task.id)}
                        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer",
                          task.completed ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100 hover:border-[var(--color-primary)]")}>
                        <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                          task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white")}>
                          {task.completed && <ClipboardCheck className="w-3.5 h-3.5" />}
                        </div>
                        <span className={cn("text-sm font-medium", task.completed ? "line-through text-slate-400" : "text-slate-700")}>{task.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsContractDetailsModalOpen(false)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manage HR Contract Modal */}
      <Modal
        isOpen={isManageContractModalOpen}
        onClose={() => setIsManageContractModalOpen(false)}
        title="Gestion du Contrat Employé"
      >
        {selectedResource && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 bg-[var(--color-primary)] text-white rounded-xl flex items-center justify-center font-black text-xl">
                {selectedResource.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedResource.name}</h3>
                <p className="text-sm font-bold text-slate-500">{selectedResource.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type de Contrat</p>
                <p className="text-sm font-black text-slate-900">{selectedResource.contract || 'CDD'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Statut</p>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Actif</span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date de Début</p>
                <p className="text-sm font-black text-slate-900">15/01/2023</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date de Fin</p>
                <p className="text-sm font-black text-slate-900">{selectedResource.contract === 'CDI' ? 'Indéterminée' : '31/12/2024'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coût Mensuel</p>
                <p className="text-sm font-black text-slate-900">350,000 FCFA</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Affectation Actuelle</p>
                <p className="text-sm font-black text-slate-900">{getProjectNameById(selectedResource?.projectId) || selectedResource?.project}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-3 gap-3">
              <Button variant="outline" className="font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { notify("Fonctionnalité à venir", "info"); setIsManageContractModalOpen(false); }}>Renouveler</Button>
              <Button variant="outline" className="font-bold text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => { notify("Fonctionnalité à venir", "info"); setIsManageContractModalOpen(false); }}>Suspendre</Button>
              <Button variant="outline" className="font-bold text-slate-600 border-slate-200 hover:bg-slate-50" onClick={() => { notify("Fonctionnalité à venir", "info"); setIsManageContractModalOpen(false); }}>Modifier</Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setIsManageContractModalOpen(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Full Logbook Modal */}
      <Modal
        isOpen={isFullLogbookModalOpen}
        onClose={() => setIsFullLogbookModalOpen(false)}
        title="Journal Complet des Mouvements"
        size="lg"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date du mouvement</label>
              <Input
                type="date"
                min={today}
                value={logbookFilters.date}
                onChange={(e) => setLogbookFilters({ ...logbookFilters, date: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chantier concerné</label>
                <select
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={logbookFilters.projectId}
                  onChange={(e) => setLogbookFilters({ ...logbookFilters, projectId: e.target.value })}
                >
                  <option value="all">Tous les chantiers</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type de mouvement</label>
                <select
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={logbookFilters.type}
                  onChange={(e) => setLogbookFilters({ ...logbookFilters, type: e.target.value })}
                >
                  <option value="all">Tous les types</option>
                  <option value="entries">Entrées (Réceptions)</option>
                  <option value="exits">Sorties (Consommations)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {getFilteredLogbook().map((log, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    log.type === 'Sortie' ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                  )}>
                    {log.type === 'Sortie' ? <ArrowRightLeft className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{log.item}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {log.date} • {log.user}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black",
                    log.type === 'Sortie' ? "text-red-600" : "text-emerald-600"
                  )}>
                    {log.type === 'Sortie' ? '-' : '+'}{log.qty} {log.unit}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{log.project}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsFullLogbookModalOpen(false)}>Fermer</Button>
            <Button
              className="font-bold"
              onClick={() => {
                const dataToExport = stockMovements.map(m => ({
                  ID: m.id,
                  Type: m.type,
                  Article: m.item,
                  Quantite: m.quantity,
                  Unite: m.unit,
                  Chantier: m.chantier,
                  Utilisateur: m.user,
                  Date: m.date
                }));
                exportToCSV(dataToExport, `mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`);
              }}
            >
              Exporter (CSV)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inventory Modal */}
      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title="Inventaire Physique"
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm font-medium">
            Saisissez les quantités physiquement constatées en magasin. Les écarts seront automatiquement calculés.
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {inventoryData.map((item, i) => {
              const variance = item.observed - item.theoretical;
              const hasVariance = variance !== 0;

              return (
                <div key={i} className={cn(
                  "p-4 border rounded-xl space-y-3",
                  hasVariance ? "border-amber-200 bg-amber-50" : "border-slate-100"
                )}>
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-900">{item.item}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">Théorique: {item.theoretical} {item.unit}</span>
                      {hasVariance && (
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-full",
                          variance > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {variance > 0 ? '+' : ''}{variance} {item.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Quantité Constatée</label>
                      <input
                        type="number"
                        min="0"
                        value={item.observed}
                        onChange={(e) => {
                          const newData = [...inventoryData];
                          newData[i].observed = Number(e.target.value) || 0;
                          newData[i].variance = newData[i].observed - newData[i].theoretical;
                          setInventoryData(newData);
                        }}
                        className={cn(
                          "w-full h-10 px-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
                          hasVariance ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                        )}
                      />
                    </div>
                    <div>
                      <label className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1 block",
                        hasVariance ? "text-amber-600" : "text-slate-400"
                      )}>
                        Justification {hasVariance ? "(obligatoire)" : "(si écart)"}
                      </label>
                      <input
                        type="text"
                        value={item.justification}
                        onChange={(e) => {
                          const newData = [...inventoryData];
                          newData[i].justification = e.target.value;
                          setInventoryData(newData);
                        }}
                        placeholder={hasVariance ? "Veuillez justifier l'écart..." : "Raison de l'écart..."}
                        className={cn(
                          "w-full h-10 px-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
                          hasVariance ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                        )}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsInventoryModalOpen(false)}>Annuler</Button>
            <Button
              className="font-bold shadow-lg shadow-blue-900/20"
              onClick={() => {
                // Valider qu'il y a des justifications pour tous les écarts
                const itemsWithVariance = inventoryData.filter(item => item.variance !== 0);
                const unjustifiedItems = itemsWithVariance.filter(item => !item.justification || item.justification.trim() === '');

                if (unjustifiedItems.length > 0) {
                  notify(`Veuillez justifier les écarts pour: ${unjustifiedItems.map(item => item.item).join(', ')}`, 'error', '/resources');
                  return;
                }

                // Enregistrer l'inventaire
                const inventoryRecord = {
                  date: new Date().toISOString().split('T')[0],
                  items: inventoryData.map(item => ({
                    item: item.item,
                    theoretical: item.theoretical,
                    observed: item.observed,
                    variance: item.variance,
                    justification: item.justification,
                    unit: item.unit
                  })),
                  user: name || 'Utilisateur'
                };

                // Ajouter un log pour l'inventaire
                addLog({
                  module: 'Ressources',
                  action: `Inventaire physique réalisé - ${inventoryData.length} articles contrôlés`,
                  user: name || 'Utilisateur',
                  type: 'info'
                });

                notify("Inventaire enregistré avec succès", "success", '/resources');
                setIsInventoryModalOpen(false);
              }}
            >
              Valider l'Inventaire
            </Button>
          </div>
        </div>
      </Modal>

      {/* === TAB POINTAGE === */}
      {/* === TAB POINTAGE (Historique) === */}
      {activeTab === 'pointage' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Historique des Présences</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                {role === 'technicien' ? "Mon journal de présence individuel" : "Suivi des présences par chantier"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {role !== 'technicien' && (
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <select
                    value={attendanceProjectId}
                    onChange={(e) => setAttendanceProjectId(Number(e.target.value))}
                    className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-transparent outline-none cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                  >
                    <option value={0}>— Sélectionner un chantier —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadAttendance}
                className="font-bold"
              >
                <History className="w-4 h-4 mr-2" /> Actualiser
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-6 py-4">Date</th>
                    {role !== 'technicien' && <th className="px-6 py-4">Employé</th>}
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Arrivée</th>
                    <th className="px-6 py-4">Départ</th>
                    <th className="px-6 py-4">Retard</th>
                    <th className="px-6 py-4">Chantier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoadingAttendance ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto" />
                      </td>
                    </tr>
                  ) : attendanceHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                        Choisissez un chantier
                      </td>
                    </tr>
                  ) : (
                    attendanceHistory
                      .filter(rec => {
                        if (role === 'technicien') {
                          const me = employees.find(e => e.matricule === profile?.matricule) ||
                            employees.find(e => e.name === profile?.name);
                          return Number(rec.employeeId) === Number(me?.id);
                        }
                        return true;
                      })
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 text-xs font-black text-slate-900">
                            {new Date(rec.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          {role !== 'technicien' && (
                            <td className="px-6 py-4">
                              <p className="text-xs font-bold text-slate-900">{rec.employee?.name || `ID: ${rec.employeeId}`}</p>
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                              rec.status === 'Présent' ? "bg-emerald-100 text-emerald-700" :
                                rec.status === 'Retard' ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                            )}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono font-bold text-slate-600">{rec.arrivalTime || '—'}</td>
                          <td className="px-6 py-4 text-xs font-mono font-bold text-slate-600">{rec.departureTime || '—'}</td>
                          <td className="px-6 py-4 text-xs">
                            {rec.lateMinutes > 0 ? (
                              <span className="font-bold text-amber-600">+{rec.lateMinutes} min</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">
                            {getProjectNameById(rec.projectId)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* === ONGLET POINTAGE === */}

    </div>
  );
};

const ResourceKpiCard = ({ title, value, icon: Icon, color }: any) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  return (
    <Card className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group">
      <div className="flex items-center gap-4">
        <div className={cn("p-4 rounded-2xl transition-colors", colors[color as keyof typeof colors])}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter mt-1">{value}</h3>
        </div>
      </div>
    </Card>
  );
};

const StockCard = ({ title, qty, status, icon: Icon, color }: any) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600'
  };
  const qtyNum = typeof qty === 'string' ? parseFloat(qty.replace(/[^0-9.-]/g, '')) : (qty || 0);
  const isEmpty = qtyNum <= 0;
  const isLow = !isEmpty && status === 'Bas';
  return (
    <Card className={cn("p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group", isEmpty && "border-2 border-red-200")}>

      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-2xl transition-colors", isEmpty ? 'bg-red-100 text-red-600' : colors[color as keyof typeof colors])}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={cn(
          "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
          isEmpty ? "bg-red-50 text-red-700" :
            status === 'Normal' ? "bg-emerald-50 text-emerald-700" :
              status === 'Bas' ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
        )}>
          {isEmpty ? 'Vide' : status}
        </span>
      </div>
      <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h4>
      <p className={cn("text-2xl font-black tracking-tighter", isEmpty ? "text-red-600" : "text-slate-900")}>{qty}</p>
      <div className="mt-6 flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-bold h-8 bg-slate-50 hover:bg-white" onClick={() => window.dispatchEvent(new CustomEvent('open-logbook'))}>Historique</Button>
        <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-bold h-8 bg-slate-50 hover:bg-white" onClick={() => window.dispatchEvent(new CustomEvent('open-inventory'))}>Inventaire</Button>
      </div>
    </Card>
  );
};
