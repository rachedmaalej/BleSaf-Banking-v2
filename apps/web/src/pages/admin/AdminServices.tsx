import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import {
  SearchInput,
  FilterDropdown,
  ServiceFormModal,
  ConfirmDialog,
  TemplateSelectModal,
  type ServiceFormData,
} from '@/components/admin';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
};

interface Service {
  id: string;
  branchId: string;
  nameFr: string;
  nameAr: string;
  prefix: string;
  icon: string | null;
  priorityWeight: number;
  avgServiceTime: number;
  useAutomaticServiceTime: boolean;
  isActive: boolean;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export default function AdminServices() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  // URL params for pre-selecting branch
  const urlBranchId = searchParams.get('branchId');

  // Data state
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state - initialize from URL param if present
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState(urlBranchId || '');
  const [statusFilter, setStatusFilter] = useState('');


  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch services
  const fetchServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.listServices(branchFilter || undefined);
      setServices(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des services');
      console.error('Failed to fetch services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch branches for dropdown
  const fetchBranches = async () => {
    try {
      const response = await adminApi.listBranches(1, 100);
      setBranches(response.data.data);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchBranches();
  }, []);

  // Re-fetch when branch filter changes
  useEffect(() => {
    fetchServices();
  }, [branchFilter]);

  // Filter services by search and status (client-side)
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          service.nameFr.toLowerCase().includes(query) ||
          service.nameAr.toLowerCase().includes(query) ||
          service.prefix.toLowerCase().includes(query) ||
          service.branch?.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter === 'active' && !service.isActive) return false;
      if (statusFilter === 'inactive' && service.isActive) return false;

      return true;
    });
  }, [services, searchQuery, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredServices.length / pageSize);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, branchFilter, statusFilter]);

  // Toast helpers
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Handler functions
  const handleAddFromTemplates = () => {
    // Require a branch to be selected first
    if (!branchFilter) {
      showToast('error', 'Veuillez d\'abord selectionner une agence');
      return;
    }
    setIsTemplateModalOpen(true);
  };

  const handleTemplateSuccess = (result: { created: number; reactivated?: number; skipped: number }) => {
    setIsTemplateModalOpen(false);
    const parts = [];
    if (result.created > 0) {
      parts.push(`${result.created} cree${result.created !== 1 ? 's' : ''}`);
    }
    if (result.reactivated && result.reactivated > 0) {
      parts.push(`${result.reactivated} reactive${result.reactivated !== 1 ? 's' : ''}`);
    }
    if (result.skipped > 0) {
      parts.push(`${result.skipped} deja actif${result.skipped !== 1 ? 's' : ''}`);
    }
    const message = parts.length > 0 ? parts.join(', ') : 'Aucun changement';
    showToast('success', message);
    fetchServices();
  };

  const handleEditClick = (service: Service) => {
    setSelectedService(service);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (service: Service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: ServiceFormData) => {
    if (!selectedService) return; // Edit only mode

    setIsSubmitting(true);
    try {
      // Update existing service - only editable fields
      await adminApi.updateService(selectedService.id, {
        priorityWeight: data.priorityWeight,
        avgServiceTime: data.avgServiceTime,
        useAutomaticServiceTime: data.useAutomaticServiceTime,
        isActive: data.isActive,
      });
      showToast('success', 'Service modifie avec succes');
      setIsFormModalOpen(false);
      fetchServices();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      const response = await adminApi.deleteService(selectedService.id);
      const softDeleted = response.data?.softDeleted;
      showToast(
        'success',
        softDeleted
          ? 'Service desactive (historique de tickets conserve)'
          : 'Service supprime avec succes'
      );
      setIsDeleteDialogOpen(false);
      fetchServices();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status badge styling
  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className="px-2 py-0.5 text-xs font-medium rounded-full"
        style={{
          backgroundColor: isActive ? '#DCFCE7' : '#F3F4F6',
          color: isActive ? '#166534' : SG_COLORS.gray,
        }}
      >
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  // Priority badge styling
  const getPriorityBadge = (priority: number) => {
    const isHigh = priority >= 7;
    const isMedium = priority >= 4 && priority < 7;
    return (
      <span
        className="px-2 py-0.5 text-xs font-medium rounded-full"
        style={{
          backgroundColor: isHigh ? '#FEE2E2' : isMedium ? '#FEF3C7' : '#F3F4F6',
          color: isHigh ? SG_COLORS.red : isMedium ? '#B45309' : SG_COLORS.gray,
        }}
      >
        P{priority}
      </span>
    );
  };

  // Filter options
  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const statusOptions = [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right ${
            toast.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: SG_COLORS.black }}>
            {t('admin.services')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleAddFromTemplates}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium transition-colors"
          style={{ backgroundColor: SG_COLORS.black }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            content_copy
          </span>
          Ajouter depuis les templates
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            value={searchQuery}
            placeholder="Rechercher par nom, prefixe..."
            onChange={setSearchQuery}
          />
        </div>
        <FilterDropdown
          label="Agence"
          value={branchFilter}
          options={branchOptions}
          onChange={setBranchFilter}
        />
        <FilterDropdown
          label="Statut"
          value={statusFilter}
          options={statusOptions}
          onChange={setStatusFilter}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600">error</span>
          <span className="text-red-800">{error}</span>
          <button
            onClick={() => fetchServices()}
            className="ml-auto text-red-600 hover:text-red-800 font-medium"
          >
            Reessayer
          </button>
        </div>
      )}

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
                  >
                    <span className="material-symbols-outlined text-gray-700" style={{ fontSize: '28px' }}>
                      {service.icon || 'category'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 text-xs font-bold rounded"
                        style={{ backgroundColor: '#F3F4F6', color: SG_COLORS.black }}
                      >
                        {service.prefix}
                      </span>
                      {getStatusBadge(service.isActive)}
                      {getPriorityBadge(service.priorityWeight)}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {i18n.language === 'ar' ? service.nameAr : service.nameFr}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {i18n.language === 'ar' ? service.nameFr : service.nameAr}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Service Time */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Temps moyen:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{service.avgServiceTime} min</span>
                    {service.useAutomaticServiceTime && (
                      <span
                        className="px-1.5 py-0.5 text-xs rounded"
                        style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
                      >
                        Auto
                      </span>
                    )}
                  </div>
                </div>

                {/* Branch */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Agence:</span>
                  <span className="font-medium text-gray-700">{service.branch?.name || '-'}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-1">
                <button
                  onClick={() => handleEditClick(service)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    edit
                  </span>
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleDeleteClick(service)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
                  style={{ color: SG_COLORS.rose }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    delete
                  </span>
                  Supprimer
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {filteredServices.length === 0 && !isLoading && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="material-symbols-outlined mb-2" style={{ fontSize: '48px' }}>
                category
              </span>
              <p className="font-medium">Aucun service trouve</p>
              <p className="text-sm">
                {searchQuery || statusFilter
                  ? 'Ajustez vos filtres'
                  : branchFilter
                    ? 'Ajoutez des services depuis les templates'
                    : 'Selectionnez une agence pour gerer ses services'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-lg border border-gray-200 px-6 py-4">
          <span className="text-sm text-gray-500">
            Page {currentPage} sur {totalPages} ({filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''})
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              {t('common.back')}
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}

      {/* Service Form Modal - Edit only */}
      {selectedService && (
        <ServiceFormModal
          isOpen={isFormModalOpen}
          service={selectedService}
          branches={[]}
          isLoading={isSubmitting}
          onSubmit={handleFormSubmit}
          onClose={() => setIsFormModalOpen(false)}
        />
      )}

      {/* Template Select Modal - For adding services from templates */}
      {branchFilter && (
        <TemplateSelectModal
          isOpen={isTemplateModalOpen}
          branchId={branchFilter}
          branchName={branches.find(b => b.id === branchFilter)?.name || ''}
          onClose={() => setIsTemplateModalOpen(false)}
          onSuccess={handleTemplateSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Supprimer le service"
        message={`Etes-vous sur de vouloir supprimer "${selectedService?.nameFr}"? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
