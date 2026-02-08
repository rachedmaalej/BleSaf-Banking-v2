import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { templateApi } from '@/lib/api';
import {
  SearchInput,
  FilterDropdown,
  ConfirmDialog,
} from '@/components/admin';
import { TemplateFormModal, type TemplateFormData } from '@/components/admin/TemplateFormModal';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
};

interface ServiceTemplate {
  id: string;
  nameFr: string;
  nameAr: string;
  prefix: string;
  icon: string | null;
  priorityWeight: number;
  avgServiceTime: number;
  isActive: boolean;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
];

export default function AdminTemplates() {
  const { t, i18n } = useTranslation();

  // Data state
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all templates (active and inactive) for management
      const response = await templateApi.list(1, 100, false);
      setTemplates(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des templates');
      console.error('Failed to fetch templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Filter templates by search and status (client-side)
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          template.nameFr.toLowerCase().includes(query) ||
          template.nameAr.toLowerCase().includes(query) ||
          template.prefix.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter === 'active' && !template.isActive) return false;
      if (statusFilter === 'inactive' && template.isActive) return false;

      return true;
    });
  }, [templates, searchQuery, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTemplates.length / pageSize);
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Toast helpers
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Handler functions
  const handleCreateClick = () => {
    setSelectedTemplate(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (template: ServiceTemplate) => {
    setSelectedTemplate(template);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (template: ServiceTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedTemplate) {
        // Update existing template
        await templateApi.update(selectedTemplate.id, data);
        showToast('success', 'Template modifie avec succes');
      } else {
        // Create new template
        await templateApi.create(data);
        showToast('success', 'Template cree avec succes');
      }
      setIsFormModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;
    setIsSubmitting(true);
    try {
      await templateApi.delete(selectedTemplate.id);
      showToast('success', 'Template desactive avec succes');
      setIsDeleteDialogOpen(false);
      fetchTemplates();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get display name based on language
  const getDisplayName = (template: ServiceTemplate) => {
    return i18n.language === 'ar' ? template.nameAr : template.nameFr;
  };

  // Get priority badge
  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
          Urgent ({priority})
        </span>
      );
    }
    if (priority >= 5) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
          Eleve ({priority})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
        Normal ({priority})
      </span>
    );
  };

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
            Templates de services
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium transition-colors"
          style={{ backgroundColor: SG_COLORS.black }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            add
          </span>
          Creer un template
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-600" style={{ fontSize: '24px' }}>
          info
        </span>
        <div>
          <p className="text-sm text-blue-800">
            Les templates definissent les services types de votre banque. Lors de la creation d'une nouvelle agence,
            vous pourrez selectionner les templates a copier pour creer automatiquement les services.
          </p>
        </div>
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
          label="Statut"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600">error</span>
          <span className="text-red-800">{error}</span>
          <button
            onClick={fetchTemplates}
            className="ml-auto text-red-600 hover:text-red-800 font-medium"
          >
            Reessayer
          </button>
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTemplates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${
                template.isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
                  >
                    <span className="material-symbols-outlined text-gray-700" style={{ fontSize: '28px' }}>
                      {template.icon || 'category'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {getDisplayName(template)}
                      </h3>
                      {!template.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Prefixe: <span className="font-mono font-semibold">{template.prefix}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Priorite</span>
                  {getPriorityBadge(template.priorityWeight)}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Temps moyen</span>
                  <span className="font-medium">{template.avgServiceTime} min</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => handleEditClick(template)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    edit
                  </span>
                  {t('common.edit')}
                </button>
                {template.isActive && (
                  <button
                    onClick={() => handleDeleteClick(template)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors"
                    style={{ color: SG_COLORS.rose }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      delete
                    </span>
                    Desactiver
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {filteredTemplates.length === 0 && !isLoading && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="material-symbols-outlined mb-2" style={{ fontSize: '48px' }}>
                content_copy
              </span>
              <p className="font-medium">Aucun template trouve</p>
              <p className="text-sm">
                {searchQuery || statusFilter
                  ? 'Ajustez vos filtres'
                  : 'Creez votre premier template de service'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-lg border border-gray-200 px-6 py-4">
          <span className="text-sm text-gray-500">
            Page {currentPage} sur {totalPages} ({filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''})
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

      {/* Template Form Modal */}
      <TemplateFormModal
        isOpen={isFormModalOpen}
        template={selectedTemplate}
        isLoading={isSubmitting}
        onSubmit={handleFormSubmit}
        onClose={() => setIsFormModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Desactiver le template"
        message={`Etes-vous sur de vouloir desactiver le template "${selectedTemplate?.nameFr}"? Il ne sera plus disponible lors de la creation de nouvelles agences.`}
        confirmLabel="Desactiver"
        variant="danger"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
