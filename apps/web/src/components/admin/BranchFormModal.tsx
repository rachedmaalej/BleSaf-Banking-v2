import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, FormField, FormInput, FormSelect } from './FormModal';
import { TUNISIA_REGIONS } from '@blesaf/shared';

export interface BranchFormData {
  name: string;
  code: string;
  address: string;
  region: string;
  timezone: string;
  notifyAtPosition: number;
  status?: string;
  // Operating hours
  autoQueueEnabled?: boolean;
  openingTime?: string | null;
  closingTime?: string | null;
  closedOnWeekends?: boolean;
}

export interface BranchFormModalProps {
  isOpen: boolean;
  branch?: BranchFormData & { id: string } | null;
  isLoading?: boolean;
  onSubmit: (data: BranchFormData) => void;
  onClose: () => void;
}

export function BranchFormModal({
  isOpen,
  branch,
  isLoading = false,
  onSubmit,
  onClose,
}: BranchFormModalProps) {
  const { t } = useTranslation();
  const isEditing = !!branch;

  const [formData, setFormData] = useState<BranchFormData>({
    name: '',
    code: '',
    address: '',
    region: '',
    timezone: 'Africa/Tunis',
    notifyAtPosition: 2,
    autoQueueEnabled: false,
    openingTime: null,
    closingTime: null,
    closedOnWeekends: true,
  });

  const [showOperatingHours, setShowOperatingHours] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<keyof BranchFormData, string>>>({});

  // Reset form when modal opens/closes or branch changes
  useEffect(() => {
    if (isOpen) {
      if (branch) {
        setFormData({
          name: branch.name,
          code: branch.code,
          address: branch.address || '',
          region: branch.region || '',
          timezone: branch.timezone || 'Africa/Tunis',
          notifyAtPosition: branch.notifyAtPosition || 2,
          autoQueueEnabled: branch.autoQueueEnabled ?? false,
          openingTime: branch.openingTime ?? null,
          closingTime: branch.closingTime ?? null,
          closedOnWeekends: branch.closedOnWeekends ?? true,
        });
        // Expand operating hours section if auto-queue is enabled
        setShowOperatingHours(branch.autoQueueEnabled ?? false);
      } else {
        setFormData({
          name: '',
          code: '',
          address: '',
          region: '',
          timezone: 'Africa/Tunis',
          notifyAtPosition: 2,
          autoQueueEnabled: false,
          openingTime: null,
          closingTime: null,
          closedOnWeekends: true,
        });
        setShowOperatingHours(false);
      }
      setErrors({});
    }
  }, [isOpen, branch]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BranchFormData, string>> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = t('admin.errors.nameRequired');
    }

    if (!formData.code || formData.code.length < 2) {
      newErrors.code = t('admin.errors.codeRequired');
    } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      newErrors.code = t('admin.errors.codeFormat');
    }

    if (formData.notifyAtPosition < 1 || formData.notifyAtPosition > 10) {
      newErrors.notifyAtPosition = t('admin.errors.notifyAtPositionRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleCodeChange = (value: string) => {
    // Auto-uppercase the code
    setFormData({ ...formData, code: value.toUpperCase() });
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={isEditing ? t('admin.editBranch') : t('admin.createBranch')}
      subtitle={isEditing ? branch?.code : undefined}
      isLoading={isLoading}
      submitLabel={isEditing ? t('common.save') : t('common.create')}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {/* Name */}
      <FormField
        label={t('admin.branchName')}
        htmlFor="branch-name"
        required
        error={errors.name}
      >
        <FormInput
          id="branch-name"
          value={formData.name}
          placeholder="Agence Tunis Centre"
          error={!!errors.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
        />
      </FormField>

      {/* Code */}
      <FormField
        label={t('admin.branchCode')}
        htmlFor="branch-code"
        required
        error={errors.code}
      >
        <FormInput
          id="branch-code"
          value={formData.code}
          placeholder="TUN-001"
          error={!!errors.code}
          disabled={isEditing}
          onChange={handleCodeChange}
        />
        {!isEditing && (
          <p className="mt-1 text-xs text-gray-500">
            {t('admin.codeHint')}
          </p>
        )}
      </FormField>

      {/* Address */}
      <FormField
        label={t('admin.address')}
        htmlFor="branch-address"
      >
        <textarea
          id="branch-address"
          value={formData.address}
          placeholder="123 Avenue Habib Bourguiba, Tunis"
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 resize-none"
        />
      </FormField>

      {/* Region */}
      <FormField
        label={t('admin.region')}
        htmlFor="branch-region"
      >
        <FormSelect
          id="branch-region"
          value={formData.region}
          placeholder={t('admin.selectRegion')}
          options={[...TUNISIA_REGIONS]}
          onChange={(value) => setFormData({ ...formData, region: value })}
        />
      </FormField>

      {/* Notify at Position */}
      <FormField
        label={t('admin.notifyAtPosition')}
        htmlFor="branch-notify"
        error={errors.notifyAtPosition}
      >
        <FormInput
          id="branch-notify"
          type="number"
          value={formData.notifyAtPosition}
          error={!!errors.notifyAtPosition}
          onChange={(value) => setFormData({ ...formData, notifyAtPosition: parseInt(value) || 2 })}
        />
        <p className="mt-1 text-xs text-gray-500">
          {t('admin.notifyAtPositionHint')}
        </p>
      </FormField>

      {/* Operating Hours Section */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <button
          type="button"
          onClick={() => setShowOperatingHours(!showOperatingHours)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-500">
              schedule
            </span>
            <span className="font-medium text-gray-900">
              {t('admin.operatingHours', 'Horaires d\'ouverture')}
            </span>
          </div>
          <span className={`material-symbols-outlined text-gray-400 transition-transform ${showOperatingHours ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {showOperatingHours && (
          <div className="mt-4 space-y-4">
            {/* Auto Queue Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="auto-queue" className="font-medium text-gray-700 text-sm">
                  {t('admin.autoQueueManagement', 'Gestion automatique de la file')}
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('admin.autoQueueHint', 'Ouvrir/fermer automatiquement la file selon les horaires')}
                </p>
              </div>
              <button
                id="auto-queue"
                type="button"
                role="switch"
                aria-checked={formData.autoQueueEnabled}
                onClick={() => setFormData({ ...formData, autoQueueEnabled: !formData.autoQueueEnabled })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                  formData.autoQueueEnabled ? 'bg-[#E9041E]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.autoQueueEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Time inputs - only shown when auto queue is enabled */}
            {formData.autoQueueEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Opening Time */}
                  <FormField
                    label={t('admin.openingTime', 'Heure d\'ouverture')}
                    htmlFor="opening-time"
                  >
                    <input
                      id="opening-time"
                      type="time"
                      value={formData.openingTime || ''}
                      onChange={(e) => setFormData({ ...formData, openingTime: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                      placeholder="08:30"
                    />
                  </FormField>

                  {/* Closing Time */}
                  <FormField
                    label={t('admin.closingTime', 'Heure de fermeture')}
                    htmlFor="closing-time"
                  >
                    <input
                      id="closing-time"
                      type="time"
                      value={formData.closingTime || ''}
                      onChange={(e) => setFormData({ ...formData, closingTime: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                      placeholder="16:30"
                    />
                  </FormField>
                </div>

                {/* Closed on Weekends Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="closed-weekends" className="font-medium text-gray-700 text-sm">
                      {t('admin.closedOnWeekends', 'Fermé le weekend')}
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('admin.closedOnWeekendsHint', 'La file reste fermée samedi et dimanche')}
                    </p>
                  </div>
                  <button
                    id="closed-weekends"
                    type="button"
                    role="switch"
                    aria-checked={formData.closedOnWeekends}
                    onClick={() => setFormData({ ...formData, closedOnWeekends: !formData.closedOnWeekends })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                      formData.closedOnWeekends ? 'bg-[#E9041E]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.closedOnWeekends ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Info text about tenant defaults */}
                {!formData.openingTime && !formData.closingTime && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-gray-400 text-base">info</span>
                    <span>
                      {t('admin.tenantDefaultsHint', 'Les horaires non définis utiliseront les valeurs par défaut de la banque')}
                    </span>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </FormModal>
  );
}
