import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, FormField, FormInput, FormSelect } from './FormModal';

export interface ServiceFormData {
  branchId: string;
  nameFr: string;
  nameAr: string;
  prefix: string;
  icon: string | null;
  priorityWeight: number;
  avgServiceTime: number;
  useAutomaticServiceTime: boolean;
  isActive?: boolean;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface ServiceFormModalProps {
  isOpen: boolean;
  service?: (Partial<ServiceFormData> & { id: string }) | null;
  branches: Branch[];
  defaultBranchId?: string;
  isLoading?: boolean;
  onSubmit: (data: ServiceFormData) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${i === 0 ? ' (Normal)' : i === 9 ? ' (Urgent)' : ''}`,
}));

/**
 * Service Form Modal - Edit only mode
 * Services are created from templates, this modal is only for editing branch-specific settings
 */
export function ServiceFormModal({
  isOpen,
  service,
  isLoading = false,
  onSubmit,
  onClose,
}: ServiceFormModalProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<ServiceFormData>({
    branchId: '',
    nameFr: '',
    nameAr: '',
    prefix: '',
    icon: 'category',
    priorityWeight: 1,
    avgServiceTime: 10,
    useAutomaticServiceTime: false,
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});

  // Reset form when modal opens/closes or service changes
  useEffect(() => {
    if (isOpen && service) {
      setFormData({
        branchId: service.branchId || '',
        nameFr: service.nameFr || '',
        nameAr: service.nameAr || '',
        prefix: service.prefix || '',
        icon: service.icon || 'category',
        priorityWeight: service.priorityWeight || 1,
        avgServiceTime: service.avgServiceTime || 10,
        useAutomaticServiceTime: service.useAutomaticServiceTime || false,
        isActive: service.isActive ?? true,
      });
      setErrors({});
    }
  }, [isOpen, service]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    if (formData.priorityWeight < 1 || formData.priorityWeight > 10) {
      newErrors.priorityWeight = 'La priorite doit etre entre 1 et 10';
    }

    if (formData.avgServiceTime < 1 || formData.avgServiceTime > 120) {
      newErrors.avgServiceTime = 'Le temps moyen doit etre entre 1 et 120 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Don't render if no service (edit-only mode)
  if (!service) return null;

  return (
    <FormModal
      isOpen={isOpen}
      title="Modifier le service"
      subtitle={formData.nameFr}
      isLoading={isLoading}
      submitLabel={t('common.save')}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {/* Service Info - Read-only from template */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(26, 26, 26, 0.12)' }}
          >
            <span className="material-symbols-outlined text-gray-700" style={{ fontSize: '28px' }}>
              {formData.icon || 'category'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-200 text-gray-700">
                {formData.prefix}
              </span>
              <span className="font-semibold text-gray-900">{formData.nameFr}</span>
            </div>
            <p className="text-sm text-gray-500">{formData.nameAr}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
          Le nom, le prefixe et l'icone sont definis par le template et ne peuvent pas etre modifies
        </p>
      </div>

      {/* Priority and Service Time */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Priorite"
          htmlFor="service-priority"
          error={errors.priorityWeight}
        >
          <FormSelect
            id="service-priority"
            value={String(formData.priorityWeight)}
            options={PRIORITY_OPTIONS}
            onChange={(value) => setFormData({ ...formData, priorityWeight: parseInt(value) || 1 })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Les priorites elevees sont servies en premier
          </p>
        </FormField>

        <FormField
          label="Temps moyen (min)"
          htmlFor="service-avg-time"
          error={errors.avgServiceTime}
        >
          <FormInput
            id="service-avg-time"
            type="number"
            value={formData.avgServiceTime}
            error={!!errors.avgServiceTime}
            onChange={(value) => setFormData({ ...formData, avgServiceTime: parseInt(value) || 10 })}
          />
        </FormField>
      </div>

      {/* Automatic Service Time Toggle */}
      <div className="mb-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1 pr-4">
            <span className="text-sm font-medium text-gray-700">
              Calcul automatique du temps
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Utiliser les donnees des 24 dernieres heures pour estimer le temps de service
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, useAutomaticServiceTime: !formData.useAutomaticServiceTime })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.useAutomaticServiceTime ? 'bg-gray-800' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.useAutomaticServiceTime ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1 pr-4">
            <span className="text-sm font-medium text-gray-700">
              Service actif
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Desactiver pour masquer ce service de la borne
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.isActive ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </FormModal>
  );
}
