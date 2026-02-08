import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, templateApi } from '@/lib/api';
import { TUNISIA_REGIONS } from '@blesaf/shared';

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
}

interface BranchCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: {
    branch: { id: string; name: string; code: string };
    services: { id: string; nameFr: string }[];
    counters: { id: string; number: number }[];
  }) => void;
}

type WizardStep = 'details' | 'services' | 'counters' | 'review';

const STEP_ORDER: WizardStep[] = ['details', 'services', 'counters', 'review'];

// Branch profiles - combined presets for counters and typical branch size
const BRANCH_PROFILES = [
  {
    id: 'small',
    label: 'Petite',
    counterCount: 2,
    description: 'Agence de quartier',
    icon: 'storefront',
    color: '#059669', // Green
  },
  {
    id: 'medium',
    label: 'Moyenne',
    counterCount: 4,
    description: 'Agence standard',
    icon: 'business',
    color: '#2563EB', // Blue
  },
  {
    id: 'large',
    label: 'Grande',
    counterCount: 8,
    description: 'Agence principale',
    icon: 'domain',
    color: '#7C3AED', // Purple
  },
];

export function BranchCreationWizard({
  isOpen,
  onClose,
  onSuccess,
}: BranchCreationWizardProps) {
  const { i18n } = useTranslation();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [branchDetails, setBranchDetails] = useState({
    name: '',
    code: '',
    address: '',
    region: '',
  });
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [counterCount, setCounterCount] = useState(4);
  const [selectedProfile, setSelectedProfile] = useState<string | null>('medium');

  // Templates data
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Code generation state
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);

  // Validation errors
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('details');
      setBranchDetails({ name: '', code: '', address: '', region: '' });
      setSelectedTemplateIds(new Set());
      setCounterCount(4);
      setSelectedProfile('medium');
      setIsCodeManuallyEdited(false);
      setCodeAvailable(null);
      setError(null);
      setDetailsErrors({});
      fetchTemplates();
    }
  }, [isOpen]);

  // Auto-generate code from name using API (debounced)
  useEffect(() => {
    if (!branchDetails.name || isCodeManuallyEdited || branchDetails.name.trim().length < 2) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsGeneratingCode(true);
        const response = await adminApi.suggestBranchCode(branchDetails.name);
        const suggestedCode = response.data.data.suggestedCode;
        setBranchDetails((prev) => ({ ...prev, code: suggestedCode }));
        setCodeAvailable(true);
      } catch (err) {
        console.error('Failed to generate code:', err);
        // Fallback to local generation
        const words = branchDetails.name
          .replace(/^agence\s+/i, '')
          .split(/\s+/)
          .filter(Boolean);
        const code = words
          .map((w) => w[0]?.toUpperCase())
          .join('')
          .slice(0, 2);
        if (code.length >= 2) {
          setBranchDetails((prev) => ({ ...prev, code: `${code}01` }));
        }
      } finally {
        setIsGeneratingCode(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [branchDetails.name, isCodeManuallyEdited]);

  // Check code availability when manually edited
  useEffect(() => {
    if (!isCodeManuallyEdited || !branchDetails.code || branchDetails.code.length < 2) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await adminApi.checkBranchCode(branchDetails.code);
        setCodeAvailable(response.data.data.available);
      } catch (err) {
        console.error('Failed to check code:', err);
        setCodeAvailable(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [branchDetails.code, isCodeManuallyEdited]);

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const response = await templateApi.list(1, 100, true);
      const data = response.data.data as ServiceTemplate[];
      setTemplates(data);
      // Pre-select all templates by default
      setSelectedTemplateIds(new Set(data.map((t) => t.id)));
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {};

    if (!branchDetails.name || branchDetails.name.length < 2) {
      errors.name = 'Le nom doit contenir au moins 2 caracteres';
    }

    if (!branchDetails.code) {
      errors.code = 'Le code est requis';
    } else if (!/^[A-Z0-9-]+$/.test(branchDetails.code)) {
      errors.code = 'Le code doit contenir uniquement des majuscules, chiffres et tirets';
    } else if (codeAvailable === false) {
      errors.code = 'Ce code est deja utilise';
    }

    setDetailsErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);

    if (currentStep === 'details' && !validateDetails()) {
      return;
    }

    if (currentStep === 'services' && selectedTemplateIds.size === 0) {
      setError('Selectionnez au moins un service');
      return;
    }

    setError(null);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    setError(null);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (selectedTemplateIds.size === 0) {
      setError('Selectionnez au moins un service');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await adminApi.createBranchComplete({
        name: branchDetails.name,
        code: branchDetails.code.toUpperCase(),
        address: branchDetails.address || null,
        region: branchDetails.region || null,
        templateIds: Array.from(selectedTemplateIds),
        counterCount,
      });

      onSuccess(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la creation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTemplate = (templateId: string) => {
    const newSelected = new Set(selectedTemplateIds);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplateIds(newSelected);
    if (newSelected.size > 0) {
      setError(null);
    }
  };

  const handleSelectAll = () => {
    setSelectedTemplateIds(new Set(templates.map((t) => t.id)));
    setError(null);
  };

  const handleDeselectAll = () => {
    setSelectedTemplateIds(new Set());
  };

  const getDisplayName = (template: ServiceTemplate) => {
    return i18n.language === 'ar' ? template.nameAr : template.nameFr;
  };

  const getSelectedTemplates = () => {
    return templates.filter((t) => selectedTemplateIds.has(t.id));
  };

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  if (!isOpen) return null;

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
              <h2 className="text-lg font-semibold text-gray-900">
                Creer une nouvelle agence
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Etape {currentStepIndex + 1} sur {STEP_ORDER.length}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {STEP_ORDER.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  style={index === currentStepIndex ? { backgroundColor: SG_COLORS.black } : undefined}
                >
                  {index < currentStepIndex ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      check
                    </span>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEP_ORDER.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Branch Details */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'agence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={branchDetails.name}
                  onChange={(e) =>
                    setBranchDetails({ ...branchDetails, name: e.target.value })
                  }
                  placeholder="Agence La Marsa"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                    detailsErrors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {detailsErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{detailsErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={branchDetails.code}
                    onChange={(e) => {
                      setIsCodeManuallyEdited(true);
                      setCodeAvailable(null);
                      setBranchDetails({ ...branchDetails, code: e.target.value.toUpperCase() });
                    }}
                    placeholder="LM01"
                    className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 font-mono ${
                      detailsErrors.code ? 'border-red-300' : codeAvailable === false ? 'border-red-300' : codeAvailable === true ? 'border-green-300' : 'border-gray-200'
                    }`}
                  />
                  {/* Status indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isGeneratingCode ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 inline-block" />
                    ) : codeAvailable === true ? (
                      <span className="material-symbols-outlined text-green-500" style={{ fontSize: '18px' }}>check_circle</span>
                    ) : codeAvailable === false ? (
                      <span className="material-symbols-outlined text-red-500" style={{ fontSize: '18px' }}>cancel</span>
                    ) : null}
                  </div>
                </div>
                {detailsErrors.code && (
                  <p className="text-xs text-red-500 mt-1">{detailsErrors.code}</p>
                )}
                {codeAvailable === false && !detailsErrors.code && (
                  <p className="text-xs text-red-500 mt-1">Ce code est deja utilise</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Code unique pour identifier l'agence (auto-genere depuis le nom)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={branchDetails.address}
                  onChange={(e) =>
                    setBranchDetails({ ...branchDetails, address: e.target.value })
                  }
                  placeholder="45 Rue Habib Bourguiba, La Marsa"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={branchDetails.region}
                  onChange={(e) =>
                    setBranchDetails({ ...branchDetails, region: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="">Selectionner une region</option>
                  {TUNISIA_REGIONS.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Service Selection */}
          {currentStep === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Selectionner les services
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedTemplateIds.size} service{selectedTemplateIds.size !== 1 ? 's' : ''} selectionne{selectedTemplateIds.size !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Tout selectionner
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Tout deselectionner
                  </button>
                </div>
              </div>

              {isLoadingTemplates ? (
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
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {templates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplateIds.has(template.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTemplateIds.has(template.id)}
                        onChange={() => handleToggleTemplate(template.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(26, 26, 26, 0.08)' }}
                      >
                        <span
                          className="material-symbols-outlined text-gray-700"
                          style={{ fontSize: '24px' }}
                        >
                          {template.icon || 'category'}
                        </span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {getDisplayName(template)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Prefixe: {template.prefix} - {template.avgServiceTime} min
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
              )}
            </div>
          )}

          {/* Step 3: Counter Configuration */}
          {currentStep === 'counters' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Profile de l'agence
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Selectionnez un profile selon la taille de l'agence
                </p>

                {/* Profile Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {BRANCH_PROFILES.map((profile) => {
                    const isSelected = selectedProfile === profile.id;
                    return (
                      <button
                        key={profile.id}
                        onClick={() => {
                          setSelectedProfile(profile.id);
                          setCounterCount(profile.counterCount);
                        }}
                        className={`p-4 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'border-2 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        style={isSelected ? { borderColor: profile.color, backgroundColor: `${profile.color}10` } : undefined}
                      >
                        <span
                          className="material-symbols-outlined mb-2"
                          style={{ fontSize: '32px', color: isSelected ? profile.color : '#666' }}
                        >
                          {profile.icon}
                        </span>
                        <div className="text-2xl font-bold text-gray-900">{profile.counterCount}</div>
                        <div className="text-sm font-medium" style={{ color: isSelected ? profile.color : '#374151' }}>
                          {profile.label}
                        </div>
                        <div className="text-xs text-gray-500">{profile.description}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Ou personnaliser:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={counterCount}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                      setCounterCount(val);
                      // Clear profile selection if custom value
                      const matchingProfile = BRANCH_PROFILES.find((p) => p.counterCount === val);
                      setSelectedProfile(matchingProfile?.id || null);
                    }}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 text-center font-medium"
                  />
                  <span className="text-sm text-gray-500">guichets</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
                    info
                  </span>
                  <p className="text-sm text-gray-600">
                    Tous les guichets seront configures pour servir tous les services selectionnes.
                    Le responsable d'agence pourra personnaliser l'affectation des services par guichet plus tard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              {/* Branch Details Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Details de l'agence
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Nom</dt>
                    <dd className="font-medium text-gray-900">{branchDetails.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Code</dt>
                    <dd className="font-mono font-medium text-gray-900">{branchDetails.code}</dd>
                  </div>
                  {branchDetails.address && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Adresse</dt>
                      <dd className="font-medium text-gray-900 text-end max-w-[60%]">
                        {branchDetails.address}
                      </dd>
                    </div>
                  )}
                  {branchDetails.region && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Region</dt>
                      <dd className="font-medium text-gray-900">{branchDetails.region}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Services Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Services ({selectedTemplateIds.size})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getSelectedTemplates().map((template) => (
                    <span
                      key={template.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-sm"
                    >
                      <span
                        className="material-symbols-outlined text-gray-600"
                        style={{ fontSize: '16px' }}
                      >
                        {template.icon || 'category'}
                      </span>
                      {getDisplayName(template)}
                      <span className="text-gray-400 font-mono">({template.prefix})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Counters Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Guichets
                </h3>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{counterCount}</span> guichet{counterCount > 1 ? 's' : ''} seront crees,
                  tous configures pour servir les {selectedTemplateIds.size} services selectionnes.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
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
          <button
            onClick={currentStep === 'details' ? onClose : handleBack}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            {currentStep === 'details' ? 'Annuler' : 'Retour'}
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedTemplateIds.size === 0}
              className="px-6 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: SG_COLORS.black }}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Creation en cours...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    check
                  </span>
                  Creer l'agence
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 'services' && selectedTemplateIds.size === 0) ||
                (currentStep === 'services' && isLoadingTemplates)
              }
              className="px-6 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: SG_COLORS.black }}
            >
              Suivant
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                arrow_forward
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
