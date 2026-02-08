import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { templateApi } from '@/lib/api';

interface ServiceTemplate {
  id: string;
  nameFr: string;
  nameAr: string;
  prefix: string;
  icon: string | null;
  priorityWeight: number;
  avgServiceTime: number;
  isActive: boolean;
}

interface TemplateSelectModalProps {
  isOpen: boolean;
  branchId: string;
  branchName: string;
  onClose: () => void;
  onSuccess: (result: { created: number; skipped: number }) => void;
}

export function TemplateSelectModal({
  isOpen,
  branchId,
  branchName,
  onClose,
  onSuccess,
}: TemplateSelectModalProps) {
  const { t, i18n } = useTranslation();

  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setSelectedIds(new Set()); // Reset selection
      setError(null);
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await templateApi.list(1, 100, true); // Only active templates
      setTemplates(response.data.data);
      // Pre-select all templates by default
      setSelectedIds(new Set(response.data.data.map((t: ServiceTemplate) => t.id)));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (templateId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(templates.map((t) => t.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await templateApi.copyToBranch(branchId, Array.from(selectedIds));
      onSuccess(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la copie des templates');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayName = (template: ServiceTemplate) => {
    return i18n.language === 'ar' ? template.nameAr : template.nameFr;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ajouter des services
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Agence: <span className="font-medium">{branchName}</span>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="material-symbols-outlined mb-2" style={{ fontSize: '48px' }}>
                content_copy
              </span>
              <p className="font-medium">Aucun template disponible</p>
              <p className="text-sm">
                Creez d'abord des templates dans la page Templates
              </p>
            </div>
          ) : (
            <>
              {/* Select All / Deselect All */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">
                  {selectedIds.size} template{selectedIds.size !== 1 ? 's' : ''} selectionne{selectedIds.size !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Tout selectionner
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Tout deselectionner
                  </button>
                </div>
              </div>

              {/* Template List */}
              <div className="space-y-2">
                {templates.map((template) => (
                  <label
                    key={template.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(template.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(template.id)}
                      onChange={() => handleToggle(template.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
                    >
                      <span className="material-symbols-outlined text-gray-700" style={{ fontSize: '24px' }}>
                        {template.icon || 'category'}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {getDisplayName(template)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Prefixe: {template.prefix} • {template.avgServiceTime} min
                      </div>
                    </div>
                    {template.priorityWeight > 5 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        Prioritaire
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Passer cette etape
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: selectedIds.size > 0 ? '#1A1A1A' : '#999' }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Copie en cours...
                </span>
              ) : (
                `Ajouter ${selectedIds.size} service${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
