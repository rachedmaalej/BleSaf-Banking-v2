import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, FormField, FormInput, FormSelect } from './FormModal';

export interface TemplateFormData {
  nameFr: string;
  nameAr: string;
  prefix: string;
  icon: string | null;
  priorityWeight: number;
  avgServiceTime: number;
  descriptionFr: string | null;
  descriptionAr: string | null;
  serviceGroup: string | null;
  subServicesFr: string[];
  subServicesAr: string[];
  displayOrder: number;
  showOnKiosk: boolean;
}

export interface TemplateFormModalProps {
  isOpen: boolean;
  template?: (Partial<TemplateFormData> & { id: string }) | null;
  isLoading?: boolean;
  onSubmit: (data: TemplateFormData) => void;
  onClose: () => void;
}

// Material Symbols icons organized by category for banking services
const ICON_OPTIONS = [
  // Money & Banking
  { value: 'payments', label: 'Retrait / Depot' },
  { value: 'local_atm', label: 'Especes' },
  { value: 'currency_exchange', label: 'Change' },
  { value: 'send_money', label: 'Transfert' },
  { value: 'account_balance', label: 'Compte' },
  { value: 'savings', label: 'Epargne' },
  { value: 'toll', label: 'Monnaie' },
  // Cards & Payments
  { value: 'credit_card', label: 'Carte bancaire' },
  { value: 'checkbook', label: 'Cheque' },
  { value: 'receipt_long', label: 'Facture' },
  { value: 'account_balance_wallet', label: 'Portefeuille' },
  // Documents & Admin
  { value: 'description', label: 'Documents' },
  { value: 'assignment', label: 'General' },
  { value: 'article', label: 'Formulaires' },
  { value: 'verified', label: 'Attestation' },
  { value: 'summarize', label: 'Releve' },
  { value: 'request_quote', label: 'Devis' },
  // Services
  { value: 'person', label: 'Accueil' },
  { value: 'groups', label: 'Entreprise' },
  { value: 'home', label: 'Immobilier' },
  { value: 'directions_car', label: 'Auto' },
  { value: 'flight', label: 'Voyage' },
  { value: 'school', label: 'Etudiant' },
  { value: 'business_center', label: 'Professionnel' },
  // Security
  { value: 'lock', label: 'Coffre' },
  { value: 'security', label: 'Securite' },
  { value: 'shield', label: 'Assurance' },
  { value: 'key', label: 'Acces' },
  // Priority
  { value: 'star', label: 'VIP' },
  { value: 'workspace_premium', label: 'Premium' },
  { value: 'bolt', label: 'Express' },
  { value: 'priority_high', label: 'Urgent' },
  // Other
  { value: 'call', label: 'Contact' },
  { value: 'help', label: 'Info' },
  { value: 'feedback', label: 'Reclamation' },
  { value: 'support_agent', label: 'Support' },
  { value: 'category', label: 'Autre' },
];

const PRIORITY_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${i === 0 ? ' (Normal)' : i === 9 ? ' (Urgent)' : ''}`,
}));

export function TemplateFormModal({
  isOpen,
  template,
  isLoading = false,
  onSubmit,
  onClose,
}: TemplateFormModalProps) {
  const { t } = useTranslation();
  const isEditing = !!template;

  const [formData, setFormData] = useState<TemplateFormData>({
    nameFr: '',
    nameAr: '',
    prefix: '',
    icon: 'category',
    priorityWeight: 1,
    avgServiceTime: 10,
    descriptionFr: null,
    descriptionAr: null,
    serviceGroup: null,
    subServicesFr: [],
    subServicesAr: [],
    displayOrder: 0,
    showOnKiosk: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TemplateFormData, string>>>({});
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset form when modal opens/closes or template changes
  useEffect(() => {
    if (isOpen) {
      if (template) {
        const tpl = template as Record<string, unknown>;
        setFormData({
          nameFr: template.nameFr || '',
          nameAr: template.nameAr || '',
          prefix: template.prefix || '',
          icon: template.icon || 'category',
          priorityWeight: template.priorityWeight || 1,
          avgServiceTime: template.avgServiceTime || 10,
          descriptionFr: (tpl.descriptionFr as string) || null,
          descriptionAr: (tpl.descriptionAr as string) || null,
          serviceGroup: (tpl.serviceGroup as string) || null,
          subServicesFr: (tpl.subServicesFr as string[]) || [],
          subServicesAr: (tpl.subServicesAr as string[]) || [],
          displayOrder: (tpl.displayOrder as number) || 0,
          showOnKiosk: tpl.showOnKiosk !== false,
        });
        // Show advanced section if any advanced fields are set
        const hasSubServices = ((tpl.subServicesFr as string[]) || []).length > 0 || ((tpl.subServicesAr as string[]) || []).length > 0;
        if (tpl.descriptionFr || tpl.descriptionAr || tpl.serviceGroup || hasSubServices || (tpl.displayOrder as number) > 0 || tpl.showOnKiosk === false) {
          setShowAdvanced(true);
        }
      } else {
        setFormData({
          nameFr: '',
          nameAr: '',
          prefix: '',
          icon: 'category',
          priorityWeight: 1,
          avgServiceTime: 10,
          descriptionFr: null,
          descriptionAr: null,
          serviceGroup: null,
          subServicesFr: [],
          subServicesAr: [],
          displayOrder: 0,
          showOnKiosk: true,
        });
        setShowAdvanced(false);
      }
      setErrors({});
      setShowIconPicker(false);
    }
  }, [isOpen, template]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TemplateFormData, string>> = {};

    if (!formData.nameFr || formData.nameFr.length < 2) {
      newErrors.nameFr = 'Le nom doit contenir au moins 2 caracteres';
    }

    if (!formData.nameAr || formData.nameAr.length < 2) {
      newErrors.nameAr = 'Le nom arabe doit contenir au moins 2 caracteres';
    }

    if (!formData.prefix) {
      newErrors.prefix = 'Le prefixe est requis';
    } else if (!/^[A-Z]$/.test(formData.prefix)) {
      newErrors.prefix = 'Le prefixe doit etre une seule lettre majuscule (A-Z)';
    }

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

  return (
    <FormModal
      isOpen={isOpen}
      title={isEditing ? 'Modifier le template' : 'Creer un template'}
      subtitle={isEditing ? formData.nameFr : undefined}
      isLoading={isLoading}
      submitLabel={isEditing ? t('common.save') : t('common.create')}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {/* Names - French and Arabic side by side */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Nom (Francais)"
          htmlFor="template-name-fr"
          required
          error={errors.nameFr}
        >
          <FormInput
            id="template-name-fr"
            value={formData.nameFr}
            placeholder="Retrait"
            error={!!errors.nameFr}
            onChange={(value) => setFormData({ ...formData, nameFr: value })}
          />
        </FormField>

        <FormField
          label="Nom (Arabe)"
          htmlFor="template-name-ar"
          required
          error={errors.nameAr}
        >
          <FormInput
            id="template-name-ar"
            value={formData.nameAr}
            placeholder="سحب"
            error={!!errors.nameAr}
            onChange={(value) => setFormData({ ...formData, nameAr: value })}
          />
        </FormField>
      </div>

      {/* Prefix and Icon side by side */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Prefixe ticket"
          htmlFor="template-prefix"
          required
          error={errors.prefix}
        >
          <FormInput
            id="template-prefix"
            value={formData.prefix}
            placeholder="R"
            error={!!errors.prefix}
            onChange={(value) => setFormData({ ...formData, prefix: value.toUpperCase().slice(0, 1) })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Lettre unique pour les tickets (ex: R pour R001)
          </p>
        </FormField>

        <FormField
          label="Icone"
          htmlFor="template-icon"
        >
          <div className="relative">
            {/* Selected icon button */}
            <button
              type="button"
              id="template-icon"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-gray-700" style={{ fontSize: '24px' }}>
                {formData.icon || 'category'}
              </span>
              <span className="flex-1 text-start text-gray-700">
                {ICON_OPTIONS.find(opt => opt.value === formData.icon)?.label || 'Selectionner'}
              </span>
              <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
                {showIconPicker ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Icon picker dropdown */}
            {showIconPicker && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-6 gap-1">
                  {ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      onClick={() => {
                        setFormData({ ...formData, icon: opt.value });
                        setShowIconPicker(false);
                      }}
                      className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                        formData.icon === opt.value
                          ? 'bg-gray-800 text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                        {opt.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormField>
      </div>

      {/* Priority and Service Time */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Priorite"
          htmlFor="template-priority"
          error={errors.priorityWeight}
        >
          <FormSelect
            id="template-priority"
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
          htmlFor="template-avg-time"
          error={errors.avgServiceTime}
        >
          <FormInput
            id="template-avg-time"
            type="number"
            value={formData.avgServiceTime}
            error={!!errors.avgServiceTime}
            onChange={(value) => setFormData({ ...formData, avgServiceTime: parseInt(value) || 10 })}
          />
        </FormField>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {showAdvanced ? 'expand_less' : 'expand_more'}
        </span>
        Parametres kiosk avances
      </button>

      {showAdvanced && (
        <>
          {/* Descriptions */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Description kiosk (FR)" htmlFor="template-desc-fr">
              <FormInput
                id="template-desc-fr"
                value={formData.descriptionFr || ''}
                placeholder="Retrait d'especes au guichet"
                onChange={(value) => setFormData({ ...formData, descriptionFr: value || null })}
              />
            </FormField>

            <FormField label="Description kiosk (AR)" htmlFor="template-desc-ar">
              <FormInput
                id="template-desc-ar"
                value={formData.descriptionAr || ''}
                placeholder="سحب الأموال من الشباك"
                onChange={(value) => setFormData({ ...formData, descriptionAr: value || null })}
              />
            </FormField>
          </div>

          {/* Sub-services (comma-separated) */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sous-services (FR)" htmlFor="template-sub-fr">
              <FormInput
                id="template-sub-fr"
                value={formData.subServicesFr.join(', ')}
                placeholder="Retrait d'especes, Depot d'especes"
                onChange={(value) => setFormData({
                  ...formData,
                  subServicesFr: value ? value.split(',').map(s => s.trim()).filter(Boolean) : [],
                })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Separes par des virgules (affiches sur la borne)
              </p>
            </FormField>

            <FormField label="Sous-services (AR)" htmlFor="template-sub-ar">
              <FormInput
                id="template-sub-ar"
                value={formData.subServicesAr.join(', ')}
                placeholder="سحب نقدي, إيداع نقدي"
                onChange={(value) => setFormData({
                  ...formData,
                  subServicesAr: value ? value.split(',').map(s => s.trim()).filter(Boolean) : [],
                })}
              />
              <p className="mt-1 text-xs text-gray-500">
                مفصولة بفواصل (تُعرض على الكشك)
              </p>
            </FormField>
          </div>

          {/* Service Group, Display Order, ShowOnKiosk */}
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Groupe service" htmlFor="template-group">
              <FormInput
                id="template-group"
                value={formData.serviceGroup || ''}
                placeholder="Transactions courantes"
                onChange={(value) => setFormData({ ...formData, serviceGroup: value || null })}
              />
            </FormField>

            <FormField label="Ordre affichage" htmlFor="template-order">
              <FormInput
                id="template-order"
                type="number"
                value={formData.displayOrder}
                onChange={(value) => setFormData({ ...formData, displayOrder: parseInt(value) || 0 })}
              />
            </FormField>

            <FormField label="Visible sur kiosk" htmlFor="template-kiosk">
              <button
                type="button"
                id="template-kiosk"
                onClick={() => setFormData({ ...formData, showOnKiosk: !formData.showOnKiosk })}
                className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  formData.showOnKiosk
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {formData.showOnKiosk ? 'visibility' : 'visibility_off'}
                </span>
                {formData.showOnKiosk ? 'Visible' : 'Masque'}
              </button>
            </FormField>
          </div>
        </>
      )}
    </FormModal>
  );
}
