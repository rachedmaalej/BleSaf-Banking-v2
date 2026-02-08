import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import {
  SearchInput,
  FilterDropdown,
  BranchFormModal,
  ConfirmDialog,
  BranchCreationWizard,
  BatchImportModal,
  type BranchFormData,
} from '@/components/admin';
import { CounterConfigModal } from '@/components/manager/CounterConfigModal';
import { TUNISIA_REGIONS } from '@blesaf/shared';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
};

// Branch type with proper typing
interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  region: string | null;
  timezone: string;
  notifyAtPosition: number;
  status: 'active' | 'inactive';
  createdAt: string;
  _count?: {
    counters: number;
    services: number;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
];

export default function AdminBranches() {
  const { t } = useTranslation();

  // Data state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Counter config modal state
  const [isCounterConfigOpen, setIsCounterConfigOpen] = useState(false);
  const [branchForConfig, setBranchForConfig] = useState<Branch | null>(null);

  // Branch creation wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Batch import modal state
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
    action?: { label: string; onClick: () => void };
  } | null>(null);

  // Fetch branches
  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminApi.listBranches(currentPage, pageSize);
      setBranches(response.data.data);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || t('common.error'));
      console.error('Failed to fetch branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [currentPage]);

  // Client-side filtering
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const matchesSearch =
        searchQuery === '' ||
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = regionFilter === '' || branch.region === regionFilter;
      const matchesStatus = statusFilter === '' || branch.status === statusFilter;
      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [branches, searchQuery, regionFilter, statusFilter]);

  // Show toast notification
  const showToast = (
    type: 'success' | 'error',
    message: string,
    action?: { label: string; onClick: () => void }
  ) => {
    setToast({ type, message, action });
    // Keep toast longer if it has an action
    setTimeout(() => setToast(null), action ? 8000 : 4000);
  };

  // Handle create - open the wizard
  const handleCreate = () => {
    setIsWizardOpen(true);
  };

  // Handle edit
  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsFormModalOpen(true);
  };

  // Handle delete initiation
  const handleDeleteClick = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDeleteDialogOpen(true);
  };

  // Handle form submit (update only - creation is handled by wizard)
  const handleFormSubmit = async (data: BranchFormData) => {
    if (!selectedBranch) return;

    try {
      setIsSubmitting(true);
      await adminApi.updateBranch(selectedBranch.id, data);
      showToast('success', t('admin.branchUpdated'));
      setIsFormModalOpen(false);
      fetchBranches();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle wizard success
  const handleWizardSuccess = (result: {
    branch: { id: string; name: string; code: string };
    services: { id: string; nameFr: string }[];
    counters: { id: string; number: number }[];
  }) => {
    setIsWizardOpen(false);
    fetchBranches();
    showToast(
      'success',
      `Agence "${result.branch.name}" creee avec ${result.services.length} services et ${result.counters.length} guichets`
    );
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedBranch) return;

    try {
      setIsSubmitting(true);
      await adminApi.deleteBranch(selectedBranch.id);
      showToast('success', t('admin.branchDeleted'));
      setIsDeleteDialogOpen(false);
      fetchBranches();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (branch: Branch) => {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    try {
      await adminApi.updateBranch(branch.id, { status: newStatus });
      // Update local state immediately for responsiveness
      setBranches(prev => prev.map(b =>
        b.id === branch.id ? { ...b, status: newStatus } : b
      ));
      showToast('success', newStatus === 'active' ? 'Agence activée' : 'Agence désactivée');
    } catch (err: any) {
      showToast('error', err.response?.data?.error || t('common.error'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="ml-2 px-3 py-1 text-sm font-medium bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>
            {t('admin.branches')}
          </h1>
          <p className="text-gray-500">
            {pagination?.totalItems || branches.length} {t('admin.branchesCount')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBatchImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-gray-700 font-medium transition-colors border border-gray-200 hover:bg-gray-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              upload_file
            </span>
            Importer
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium transition-colors"
            style={{ backgroundColor: SG_COLORS.black }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#333')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = SG_COLORS.black)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              add
            </span>
            {t('admin.createBranch')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchInput
            value={searchQuery}
            placeholder={t('admin.searchBranches')}
            onChange={setSearchQuery}
            className="flex-1"
          />
          <FilterDropdown
            value={regionFilter}
            options={[...TUNISIA_REGIONS]}
            allLabel={t('admin.allRegions')}
            onChange={(value) => {
              setRegionFilter(value);
              setCurrentPage(1);
            }}
          />
          <FilterDropdown
            value={statusFilter}
            options={STATUS_OPTIONS}
            allLabel={t('admin.allStatuses')}
            onChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600" style={{ fontSize: '24px' }}>
            error
          </span>
          <div>
            <p className="font-medium text-red-800">{t('common.error')}</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchBranches}
            className="ml-auto px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
        </div>
      ) : (
        <>
          {/* Branch Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBranches.map((branch) => (
              <div
                key={branch.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" style={{ color: SG_COLORS.black }}>
                        {branch.name}
                      </h3>
                      <span className="text-sm text-gray-500">{branch.code}</span>
                    </div>
                    {/* Status Toggle */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${branch.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                        {branch.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                      <button
                        onClick={() => handleStatusToggle(branch)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          branch.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={branch.status === 'active' ? 'Cliquez pour désactiver' : 'Cliquez pour activer'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                            branch.status === 'active' ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                          style={{ transform: branch.status === 'active' ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Address */}
                  {branch.address && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{branch.address}</p>
                  )}

                  {/* Region badge */}
                  {branch.region && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          location_on
                        </span>
                        {branch.region}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        desktop_windows
                      </span>
                      {branch._count?.counters || 0} guichets
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        category
                      </span>
                      {branch._count?.services || 0} services
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1 pt-3 mt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setBranchForConfig(branch);
                      setIsCounterConfigOpen(true);
                    }}
                    disabled={!branch._count?.services}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                      branch._count?.services
                        ? 'text-gray-600 hover:bg-gray-100'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    title={!branch._count?.services ? 'Créez des services avant de configurer les guichets' : undefined}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      tune
                    </span>
                    Guichets
                  </button>
                  <button
                    onClick={() => handleEdit(branch)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      edit
                    </span>
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(branch)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
                    style={{ color: SG_COLORS.rose }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(233, 4, 30, 0.1)')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      delete
                    </span>
                    {t('common.delete')}
                  </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {filteredBranches.length === 0 && !isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="material-symbols-outlined mb-2" style={{ fontSize: '48px' }}>
                  business
                </span>
                <p className="font-medium">{t('admin.noBranches')}</p>
                <p className="text-sm">{searchQuery || regionFilter || statusFilter ? t('admin.adjustFilters') : t('admin.createFirstBranch')}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Page {pagination.page} sur {pagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    chevron_left
                  </span>
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let page: number;
                  if (pagination.totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    page = pagination.totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 text-sm rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      <BranchFormModal
        isOpen={isFormModalOpen}
        branch={selectedBranch ? {
          id: selectedBranch.id,
          name: selectedBranch.name,
          code: selectedBranch.code,
          address: selectedBranch.address || '',
          region: selectedBranch.region || '',
          timezone: selectedBranch.timezone,
          notifyAtPosition: selectedBranch.notifyAtPosition,
          status: selectedBranch.status,
        } : null}
        isLoading={isSubmitting}
        onSubmit={handleFormSubmit}
        onClose={() => setIsFormModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={t('admin.deleteBranch')}
        message={`${t('admin.deleteBranchConfirm')} "${selectedBranch?.name}"? ${t('admin.deleteBranchWarning')}`}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {/* Counter Config Modal */}
      {branchForConfig && (
        <CounterConfigModal
          branchId={branchForConfig.id}
          isOpen={isCounterConfigOpen}
          onClose={() => {
            setIsCounterConfigOpen(false);
            setBranchForConfig(null);
          }}
          onSaved={() => {
            fetchBranches();
            showToast('success', 'Guichets configures');
          }}
          currentCount={branchForConfig._count?.counters || 0}
          openCounters={0}
        />
      )}

      {/* Branch Creation Wizard */}
      <BranchCreationWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={handleWizardSuccess}
      />

      {/* Batch Import Modal */}
      <BatchImportModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        onSuccess={(result) => {
          setIsBatchImportOpen(false);
          fetchBranches();
          showToast(
            'success',
            `${result.created} agences importees${result.skipped > 0 ? ` (${result.skipped} ignorees)` : ''}`
          );
        }}
      />
    </div>
  );
}
