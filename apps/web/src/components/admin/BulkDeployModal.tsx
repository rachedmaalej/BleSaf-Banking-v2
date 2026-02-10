import { useState, useEffect, useMemo } from 'react';
import { templateApi, adminApi } from '../../lib/api';
import { useBranchGroupStore } from '../../stores/branchGroupStore';
import type { BulkDeployResult, BulkDeployBranchResult } from '@blesaf/shared';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  green: '#10B981',
  amber: '#F59E0B',
  rose: '#D66874',
};

interface BulkDeployModalProps {
  isOpen: boolean;
  templateIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface BranchItem {
  id: string;
  name: string;
  code: string;
  region: string | null;
}

export function BulkDeployModal({
  isOpen,
  templateIds,
  onClose,
  onSuccess,
}: BulkDeployModalProps) {
  // State
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [deployResults, setDeployResults] = useState<BulkDeployResult | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState<'branches' | 'groups'>('branches');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Branches loaded internally
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Template names loaded internally
  const [templateNames, setTemplateNames] = useState<string[]>([]);

  // Branch groups from store
  const { groups, fetchGroups, isLoading: groupsLoading } = useBranchGroupStore();

  // Fetch branches and groups on open
  useEffect(() => {
    if (isOpen) {
      fetchGroups().catch(() => {});

      setBranchesLoading(true);
      adminApi
        .listBranches(1, 100)
        .then((res) => {
          setBranches(
            (res.data.data || []).map((b: any) => ({
              id: b.id,
              name: b.name,
              code: b.code,
              region: b.region || null,
            }))
          );
        })
        .catch(() => {})
        .finally(() => setBranchesLoading(false));

      // Fetch template names
      templateApi
        .list(1, 100, false)
        .then((res) => {
          const all = res.data.data || [];
          const names = templateIds.map((id) => {
            const tmpl = all.find((t: any) => t.id === id);
            return tmpl ? tmpl.nameFr : id;
          });
          setTemplateNames(names);
        })
        .catch(() => setTemplateNames(templateIds));
    }
  }, [isOpen, templateIds, fetchGroups]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBranchIds([]);
      setSelectedGroupIds([]);
      setDeployResults(null);
      setIsDeploying(false);
      setActiveTab('branches');
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen]);

  // Filtered branches based on search
  const filteredBranches = useMemo(() => {
    if (!searchTerm.trim()) return branches;
    const term = searchTerm.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        (b.region && b.region.toLowerCase().includes(term))
    );
  }, [branches, searchTerm]);

  // Check if all filtered branches are selected
  const allFilteredSelected =
    filteredBranches.length > 0 &&
    filteredBranches.every((b) => selectedBranchIds.includes(b.id));

  // Total unique selected branches (from direct selection + group membership)
  const totalSelectedBranches = useMemo(() => {
    const ids = new Set(selectedBranchIds);
    for (const groupId of selectedGroupIds) {
      const group = groups.find((g) => g.id === groupId);
      if (group && group.branches) {
        for (const branch of group.branches) {
          ids.add(branch.id);
        }
      }
    }
    return ids.size;
  }, [selectedBranchIds, selectedGroupIds, groups]);

  // Toggle single branch
  const toggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  // Toggle select all (filtered)
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredBranches.map((b) => b.id));
      setSelectedBranchIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredBranches.map((b) => b.id);
      setSelectedBranchIds((prev) => {
        const existing = new Set(prev);
        for (const id of filteredIds) {
          existing.add(id);
        }
        return Array.from(existing);
      });
    }
  };

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // Deploy handler
  const handleDeploy = async () => {
    if (totalSelectedBranches === 0) return;

    setIsDeploying(true);
    setError(null);

    try {
      const res = await templateApi.bulkDeploy(
        templateIds,
        selectedBranchIds.length > 0 ? selectedBranchIds : undefined,
        selectedGroupIds.length > 0 ? selectedGroupIds : undefined
      );
      setDeployResults(res.data.data);
      onSuccess();
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Une erreur est survenue lors du deploiement';
      setError(message);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isOpen) return null;

  const showResults = deployResults !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: SG_COLORS.black }}>
                {showResults ? 'Resultats du deploiement' : 'Deployer les templates'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {showResults
                  ? 'Voici le detail par agence'
                  : 'Selectionnez les agences cibles'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Template chips */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {templateNames.length === 1 ? 'Template selectionne' : 'Templates selectionnes'}
            </p>
            <div className="flex flex-wrap gap-2">
              {templateNames.map((name, idx) => (
                <span
                  key={templateIds[idx] || idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: SG_COLORS.red }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    description
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Results panel */}
          {showResults && (
            <div className="space-y-4">
              {/* Totals summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: SG_COLORS.green }}>
                    {deployResults.totals.created}
                  </div>
                  <p className="text-sm text-green-700 mt-1">Crees</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {deployResults.totals.reactivated}
                  </div>
                  <p className="text-sm text-blue-700 mt-1">Reactives</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: SG_COLORS.amber }}>
                    {deployResults.totals.skipped}
                  </div>
                  <p className="text-sm text-amber-700 mt-1">Ignores</p>
                </div>
              </div>

              {/* Per-branch results */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Detail par agence</h4>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {deployResults.results.map((result: BulkDeployBranchResult) => {
                    const hasSkips = result.skipped > 0;
                    const hasSuccess = result.created > 0 || result.reactivated > 0;

                    return (
                      <div key={result.branchId} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {hasSuccess && !hasSkips && (
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px', color: SG_COLORS.green }}
                              >
                                check_circle
                              </span>
                            )}
                            {hasSkips && (
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px', color: SG_COLORS.amber }}
                              >
                                warning
                              </span>
                            )}
                            {!hasSuccess && !hasSkips && (
                              <span
                                className="material-symbols-outlined text-gray-400"
                                style={{ fontSize: '20px' }}
                              >
                                remove_circle_outline
                              </span>
                            )}
                            <span className="font-medium text-gray-900">{result.branchName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            {result.created > 0 && (
                              <span style={{ color: SG_COLORS.green }}>
                                +{result.created} cree{result.created > 1 ? 's' : ''}
                              </span>
                            )}
                            {result.reactivated > 0 && (
                              <span className="text-blue-600">
                                {result.reactivated} reactive{result.reactivated > 1 ? 's' : ''}
                              </span>
                            )}
                            {result.skipped > 0 && (
                              <span style={{ color: SG_COLORS.amber }}>
                                {result.skipped} ignore{result.skipped > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Skip reasons */}
                        {result.skipReasons && result.skipReasons.length > 0 && (
                          <div className="mt-2 ml-7 space-y-1">
                            {result.skipReasons.map((reason, idx) => (
                              <p key={idx} className="text-xs text-amber-700">
                                <span className="font-medium">{reason.prefix}</span> : deja
                                present comme &quot;{reason.existingServiceName}&quot;
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Selection form (hidden when showing results) */}
          {!showResults && (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('branches')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'branches'
                      ? 'border-current text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTab === 'branches' ? { borderColor: SG_COLORS.red, color: SG_COLORS.red } : undefined}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      store
                    </span>
                    Agences
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'groups'
                      ? 'border-current text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTab === 'groups' ? { borderColor: SG_COLORS.red, color: SG_COLORS.red } : undefined}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      workspaces
                    </span>
                    Groupes
                  </span>
                </button>
              </div>

              {/* Branches tab */}
              {activeTab === 'branches' && (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      style={{ fontSize: '20px' }}
                    >
                      search
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher une agence..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    />
                  </div>

                  {branchesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800" />
                    </div>
                  ) : (
                    <>
                      {/* Select all */}
                      <label className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-gray-200"
                          style={{ accentColor: SG_COLORS.red }}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Tout selectionner
                          {searchTerm.trim() && (
                            <span className="text-gray-400 font-normal ml-1">
                              ({filteredBranches.length} resultats)
                            </span>
                          )}
                        </span>
                      </label>

                      {/* Branch list */}
                      <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                        {filteredBranches.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">
                            Aucune agence trouvee
                          </div>
                        ) : (
                          filteredBranches.map((branch) => (
                            <label
                              key={branch.id}
                              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedBranchIds.includes(branch.id)}
                                onChange={() => toggleBranch(branch.id)}
                                className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-gray-200"
                                style={{ accentColor: SG_COLORS.red }}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900">{branch.name}</span>
                                <span className="text-xs text-gray-400 ml-2">{branch.code}</span>
                              </div>
                              {branch.region && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {branch.region}
                                </span>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Groups tab */}
              {activeTab === 'groups' && (
                <div className="space-y-2">
                  {groupsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800" />
                      <span className="ml-3 text-sm text-gray-500">Chargement des groupes...</span>
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="text-center py-8">
                      <span
                        className="material-symbols-outlined text-gray-300 mb-2"
                        style={{ fontSize: '40px' }}
                      >
                        workspaces
                      </span>
                      <p className="text-sm text-gray-500">Aucun groupe cree</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Creez des groupes depuis la page Groupes d'agences
                      </p>
                    </div>
                  ) : (
                    groups.map((group) => {
                      const isSelected = selectedGroupIds.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          onClick={() => toggleGroup(group.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-red-100' : 'bg-gray-100'
                                }`}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{
                                    fontSize: '18px',
                                    color: isSelected ? SG_COLORS.red : '#9CA3AF',
                                  }}
                                >
                                  {isSelected ? 'check' : 'workspaces'}
                                </span>
                              </div>
                              <div>
                                <p
                                  className="font-medium text-sm"
                                  style={{ color: isSelected ? SG_COLORS.red : SG_COLORS.black }}
                                >
                                  {group.name}
                                </p>
                                {group.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {group.memberCount ?? 0} agence{(group.memberCount ?? 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Selection summary */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg">
                <span
                  className="material-symbols-outlined text-gray-500"
                  style={{ fontSize: '18px' }}
                >
                  info
                </span>
                <span className="text-sm text-gray-600">
                  <span className="font-semibold" style={{ color: SG_COLORS.black }}>
                    {totalSelectedBranches}
                  </span>{' '}
                  agence{totalSelectedBranches !== 1 ? 's' : ''} selectionnee{totalSelectedBranches !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                error
              </span>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          {showResults ? (
            <>
              <div />
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-colors"
                style={{ backgroundColor: SG_COLORS.black }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#333')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = SG_COLORS.black)}
              >
                Fermer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isDeploying}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeploy}
                disabled={isDeploying || totalSelectedBranches === 0}
                className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: SG_COLORS.red }}
                onMouseOver={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#C70318';
                  }
                }}
                onMouseOut={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = SG_COLORS.red;
                  }
                }}
              >
                {isDeploying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deploiement...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      rocket_launch
                    </span>
                    Deployer
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
