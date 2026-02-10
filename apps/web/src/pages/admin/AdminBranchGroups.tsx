import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchGroupStore } from '../../stores/branchGroupStore';
import { adminApi } from '../../lib/api';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  gray: '#666666',
};

interface Branch {
  id: string;
  name: string;
  code: string;
  region: string | null;
  status: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastIdCounter = 0;

export default function AdminBranchGroups() {
  const { t } = useTranslation();
  const {
    groups,
    isLoading,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    addBranches,
    removeBranch,
  } = useBranchGroupStore();

  // Selected group
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Create form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Inline editing
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editDescriptionValue, setEditDescriptionValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // All tenant branches
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Add branches
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());
  const [isAddingBranches, setIsAddingBranches] = useState(false);
  const [removingBranchId, setRemovingBranchId] = useState<string | null>(null);

  // Search in available branches
  const [branchSearch, setBranchSearch] = useState('');

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  // -- Toast helpers ----------------------------------------------------------

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // -- Data loading -----------------------------------------------------------

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const loadBranches = async () => {
      setBranchesLoading(true);
      try {
        const res = await adminApi.listBranches(1, 100);
        setAllBranches(res.data.data as Branch[]);
      } catch {
        showToast('Erreur lors du chargement des agences', 'error');
      } finally {
        setBranchesLoading(false);
      }
    };
    loadBranches();
  }, [showToast]);

  // -- Available branches (not already in selected group) ---------------------

  const availableBranches = allBranches.filter((b) => {
    if (!selectedGroup) return false;
    const alreadyInGroup = selectedGroup.branches.some((gb) => gb.id === b.id);
    if (alreadyInGroup) return false;
    if (branchSearch.trim()) {
      const q = branchSearch.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.region && b.region.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // -- Handlers ---------------------------------------------------------------

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const created = await createGroup(name, newGroupDescription.trim() || undefined);
      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedGroupId(created.id);
      showToast(`Groupe "${created.name}" cree avec succes`, 'success');
    } catch {
      showToast('Erreur lors de la creation du groupe', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGroup(groupToDelete);
      if (selectedGroupId === groupToDelete) {
        setSelectedGroupId(null);
      }
      showToast('Groupe supprime', 'success');
    } catch {
      showToast('Erreur lors de la suppression du groupe', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const handleStartEditName = () => {
    if (!selectedGroup) return;
    setEditNameValue(selectedGroup.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveEditName = async () => {
    if (!selectedGroup || !editNameValue.trim()) {
      setEditingName(false);
      return;
    }
    if (editNameValue.trim() === selectedGroup.name) {
      setEditingName(false);
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateGroup(selectedGroup.id, { name: editNameValue.trim() });
      showToast('Nom du groupe mis a jour', 'success');
    } catch {
      showToast('Erreur lors de la mise a jour', 'error');
    } finally {
      setIsSavingEdit(false);
      setEditingName(false);
    }
  };

  const handleStartEditDescription = () => {
    if (!selectedGroup) return;
    setEditDescriptionValue(selectedGroup.description ?? '');
    setEditingDescription(true);
    setTimeout(() => descInputRef.current?.focus(), 0);
  };

  const handleSaveEditDescription = async () => {
    if (!selectedGroup) {
      setEditingDescription(false);
      return;
    }
    const newDesc = editDescriptionValue.trim() || null;
    if (newDesc === (selectedGroup.description ?? '')) {
      setEditingDescription(false);
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateGroup(selectedGroup.id, { description: newDesc });
      showToast('Description mise a jour', 'success');
    } catch {
      showToast('Erreur lors de la mise a jour', 'error');
    } finally {
      setIsSavingEdit(false);
      setEditingDescription(false);
    }
  };

  const handleAddBranches = async () => {
    if (!selectedGroup || selectedBranchIds.size === 0) return;
    setIsAddingBranches(true);
    try {
      await addBranches(selectedGroup.id, Array.from(selectedBranchIds));
      showToast(
        `${selectedBranchIds.size} agence(s) ajoutee(s) au groupe`,
        'success'
      );
      setSelectedBranchIds(new Set());
    } catch {
      showToast("Erreur lors de l'ajout des agences", 'error');
    } finally {
      setIsAddingBranches(false);
    }
  };

  const handleRemoveBranch = async (branchId: string) => {
    if (!selectedGroup) return;
    setRemovingBranchId(branchId);
    try {
      await removeBranch(selectedGroup.id, branchId);
      showToast('Agence retiree du groupe', 'success');
    } catch {
      showToast("Erreur lors du retrait de l'agence", 'error');
    } finally {
      setRemovingBranchId(null);
    }
  };

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };

  // Clear branch selection when switching groups
  useEffect(() => {
    setSelectedBranchIds(new Set());
    setBranchSearch('');
    setEditingName(false);
    setEditingDescription(false);
  }, [selectedGroupId]);

  // -- Render -----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right duration-300 ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {toast.message}
            <button
              onClick={() => dismissToast(toast.id)}
              className="ml-2 hover:opacity-80"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                close
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Page header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: SG_COLORS.black }}
            >
              Groupes d'agences
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Organisez vos agences en groupes pour le deploiement de services et la gestion
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              folder_shared
            </span>
            {groups.length} groupe{groups.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Left panel - group list */}
          <div className="w-1/3 flex flex-col gap-4">
            {/* Create group form */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3
                className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: SG_COLORS.black }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add_circle
                </span>
                Creer un groupe
              </h3>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Nom du groupe *"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E9041E] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup();
                  }}
                />
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Description (optionnel)"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E9041E] transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup();
                  }}
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || isCreating}
                  className="w-full px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: SG_COLORS.red }}
                  onMouseOver={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.backgroundColor = '#c9031a';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = SG_COLORS.red;
                  }}
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      add
                    </span>
                  )}
                  {isCreating ? 'Creation...' : 'Ajouter'}
                </button>
              </div>
            </div>

            {/* Group list */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
                  >
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <span
                  className="material-symbols-outlined text-gray-300 mb-3 block"
                  style={{ fontSize: '48px' }}
                >
                  folder_off
                </span>
                <p className="text-sm text-gray-500">Aucun groupe cree</p>
                <p className="text-xs text-gray-400 mt-1">
                  Creez votre premier groupe ci-dessus
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {groups.map((group) => {
                  const isSelected = group.id === selectedGroupId;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-left bg-white rounded-lg border p-4 transition-all hover:shadow-sm ${
                        isSelected
                          ? 'border-l-4 border-l-[#E9041E] border-gray-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4
                            className="text-sm font-semibold truncate"
                            style={{ color: SG_COLORS.black }}
                          >
                            {group.name}
                          </h4>
                          {group.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '14px' }}
                            >
                              apartment
                            </span>
                            {group.memberCount}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupToDelete(group.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Supprimer le groupe"
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '18px' }}
                            >
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel - group detail */}
          <div className="w-2/3">
            {!selectedGroup ? (
              <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                <span
                  className="material-symbols-outlined text-gray-300 mb-4 block"
                  style={{ fontSize: '56px' }}
                >
                  touch_app
                </span>
                <p className="text-gray-500 font-medium">
                  Selectionnez un groupe pour gerer ses membres
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Cliquez sur un groupe dans la liste de gauche
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Group header */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Name */}
                      <div className="flex items-center gap-2 mb-1">
                        {editingName ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              ref={nameInputRef}
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="text-lg font-bold px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E9041E] flex-1"
                              style={{ color: SG_COLORS.black }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditName();
                                if (e.key === 'Escape') setEditingName(false);
                              }}
                              disabled={isSavingEdit}
                            />
                            <button
                              onClick={handleSaveEditName}
                              disabled={isSavingEdit || !editNameValue.trim()}
                              className="p-1 rounded hover:bg-green-50 text-green-600 disabled:opacity-50"
                              title="Enregistrer"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px' }}
                              >
                                check
                              </span>
                            </button>
                            <button
                              onClick={() => setEditingName(false)}
                              disabled={isSavingEdit}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                              title="Annuler"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px' }}
                              >
                                close
                              </span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <h2
                              className="text-lg font-bold"
                              style={{ color: SG_COLORS.black }}
                            >
                              {selectedGroup.name}
                            </h2>
                            <button
                              onClick={handleStartEditName}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Modifier le nom"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px' }}
                              >
                                edit
                              </span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex items-center gap-2">
                        {editingDescription ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              ref={descInputRef}
                              type="text"
                              value={editDescriptionValue}
                              onChange={(e) =>
                                setEditDescriptionValue(e.target.value)
                              }
                              placeholder="Ajouter une description..."
                              className="text-sm px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E9041E] flex-1 text-gray-600"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  handleSaveEditDescription();
                                if (e.key === 'Escape')
                                  setEditingDescription(false);
                              }}
                              disabled={isSavingEdit}
                            />
                            <button
                              onClick={handleSaveEditDescription}
                              disabled={isSavingEdit}
                              className="p-1 rounded hover:bg-green-50 text-green-600 disabled:opacity-50"
                              title="Enregistrer"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px' }}
                              >
                                check
                              </span>
                            </button>
                            <button
                              onClick={() => setEditingDescription(false)}
                              disabled={isSavingEdit}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                              title="Annuler"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px' }}
                              >
                                close
                              </span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500">
                              {selectedGroup.description || (
                                <span className="italic text-gray-400">
                                  Pas de description
                                </span>
                              )}
                            </p>
                            <button
                              onClick={handleStartEditDescription}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Modifier la description"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                              >
                                edit
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Member count badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                      <span
                        className="material-symbols-outlined text-gray-500"
                        style={{ fontSize: '20px' }}
                      >
                        apartment
                      </span>
                      <span className="text-sm font-semibold" style={{ color: SG_COLORS.black }}>
                        {selectedGroup.memberCount}
                      </span>
                      <span className="text-sm text-gray-500">
                        membre{selectedGroup.memberCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Members section */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: SG_COLORS.black }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '18px' }}
                    >
                      apartment
                    </span>
                    Membres du groupe
                  </h3>

                  {selectedGroup.branches.length === 0 ? (
                    <div className="py-8 text-center">
                      <span
                        className="material-symbols-outlined text-gray-300 mb-2 block"
                        style={{ fontSize: '40px' }}
                      >
                        domain_disabled
                      </span>
                      <p className="text-sm text-gray-500">
                        Aucune agence dans ce groupe
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Ajoutez des agences depuis la section ci-dessous
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedGroup.branches.map((branch) => (
                        <div
                          key={branch.id}
                          className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="material-symbols-outlined text-gray-400"
                              style={{ fontSize: '20px' }}
                            >
                              store
                            </span>
                            <div className="min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: SG_COLORS.black }}
                              >
                                {branch.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{branch.code}</span>
                                {branch.region && (
                                  <>
                                    <span>-</span>
                                    <span>{branch.region}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveBranch(branch.id)}
                            disabled={removingBranchId === branch.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Retirer du groupe"
                          >
                            {removingBranchId === branch.id ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                            ) : (
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px' }}
                              >
                                close
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add branches section */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: SG_COLORS.black }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '18px' }}
                    >
                      add_business
                    </span>
                    Ajouter des agences
                  </h3>

                  {/* Search */}
                  <div className="relative mb-3">
                    <span
                      className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      style={{ fontSize: '18px' }}
                    >
                      search
                    </span>
                    <input
                      type="text"
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      placeholder="Rechercher une agence..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E9041E] transition-colors"
                    />
                  </div>

                  {branchesLoading ? (
                    <div className="py-6 text-center">
                      <div className="w-6 h-6 border-2 border-gray-200 border-t-[#E9041E] rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Chargement des agences...
                      </p>
                    </div>
                  ) : availableBranches.length === 0 ? (
                    <div className="py-6 text-center">
                      <span
                        className="material-symbols-outlined text-gray-300 mb-2 block"
                        style={{ fontSize: '36px' }}
                      >
                        {branchSearch.trim()
                          ? 'search_off'
                          : 'check_circle'}
                      </span>
                      <p className="text-sm text-gray-500">
                        {branchSearch.trim()
                          ? 'Aucune agence correspondante'
                          : 'Toutes les agences sont deja dans ce groupe'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto flex flex-col gap-1 mb-3 border border-gray-100 rounded-lg p-2">
                        {availableBranches.map((branch) => {
                          const isChecked = selectedBranchIds.has(branch.id);
                          return (
                            <label
                              key={branch.id}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-red-50 border border-red-100'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  toggleBranchSelection(branch.id)
                                }
                                className="w-4 h-4 rounded border-gray-300 text-[#E9041E] focus:ring-[#E9041E]"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: SG_COLORS.black }}
                                >
                                  {branch.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{branch.code}</span>
                                  {branch.region && (
                                    <>
                                      <span>-</span>
                                      <span>{branch.region}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  branch.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {branch.status === 'active'
                                  ? 'Actif'
                                  : 'Inactif'}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Add button */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {selectedBranchIds.size > 0
                            ? `${selectedBranchIds.size} agence(s) selectionnee(s)`
                            : `${availableBranches.length} agence(s) disponible(s)`}
                        </p>
                        <button
                          onClick={handleAddBranches}
                          disabled={
                            selectedBranchIds.size === 0 || isAddingBranches
                          }
                          className="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          style={{ backgroundColor: SG_COLORS.red }}
                          onMouseOver={(e) => {
                            if (!e.currentTarget.disabled)
                              e.currentTarget.style.backgroundColor =
                                '#c9031a';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor =
                              SG_COLORS.red;
                          }}
                        >
                          {isAddingBranches ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '18px' }}
                            >
                              group_add
                            </span>
                          )}
                          Ajouter la selection
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Supprimer le groupe"
        message="Etes-vous sur de vouloir supprimer ce groupe ? Les agences ne seront pas supprimees, seulement leur association au groupe."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteGroup}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setGroupToDelete(null);
        }}
      />
    </div>
  );
}
