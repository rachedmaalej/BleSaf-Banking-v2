import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FormModal, FormField, FormInput, FormSelect } from './FormModal';

export interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId: string | null;
  status?: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface UserFormModalProps {
  isOpen: boolean;
  user?: (Partial<UserFormData> & { id: string }) | null;
  branches: Branch[];
  isLoading?: boolean;
  onSubmit: (data: UserFormData) => void;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'bank_admin', label: 'Admin Banque' },
  { value: 'branch_manager', label: 'Directeur d\'agence' },
  { value: 'teller', label: 'Agent' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
];

export function UserFormModal({
  isOpen,
  user,
  branches,
  isLoading = false,
  onSubmit,
  onClose,
}: UserFormModalProps) {
  const { t } = useTranslation();
  const isEditing = !!user;

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'teller',
    branchId: null,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          password: '', // Don't populate password for security
          role: user.role || 'teller',
          branchId: user.branchId || null,
          status: user.status,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'teller',
          branchId: null,
        });
      }
      setErrors({});
    }
  }, [isOpen, user]);

  // Check if role requires a branch
  const roleRequiresBranch = formData.role === 'teller' || formData.role === 'branch_manager';

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caracteres';
    }

    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!isEditing && !formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caracteres';
    }

    if (!formData.role) {
      newErrors.role = 'Le role est requis';
    }

    if (roleRequiresBranch && !formData.branchId) {
      newErrors.branchId = 'L\'agence est requise pour ce role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      // Don't send empty password on update
      const submitData = { ...formData };
      if (isEditing && !submitData.password) {
        delete (submitData as any).password;
      }
      onSubmit(submitData);
    }
  };

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.code})`,
  }));

  return (
    <FormModal
      isOpen={isOpen}
      title={isEditing ? 'Modifier l\'utilisateur' : 'Creer un utilisateur'}
      subtitle={isEditing ? user?.email : undefined}
      isLoading={isLoading}
      submitLabel={isEditing ? t('common.save') : t('common.create')}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {/* Name */}
      <FormField
        label="Nom complet"
        htmlFor="user-name"
        required
        error={errors.name}
      >
        <FormInput
          id="user-name"
          value={formData.name}
          placeholder="Mohamed Ben Ali"
          error={!!errors.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
        />
      </FormField>

      {/* Email */}
      <FormField
        label="Email"
        htmlFor="user-email"
        required
        error={errors.email}
      >
        <FormInput
          id="user-email"
          type="email"
          value={formData.email}
          placeholder="mohamed@banque.tn"
          error={!!errors.email}
          onChange={(value) => setFormData({ ...formData, email: value })}
        />
      </FormField>

      {/* Password */}
      <FormField
        label={isEditing ? 'Nouveau mot de passe' : 'Mot de passe'}
        htmlFor="user-password"
        required={!isEditing}
        error={errors.password}
      >
        <FormInput
          id="user-password"
          type="password"
          value={formData.password}
          placeholder={isEditing ? 'Laisser vide pour ne pas changer' : '••••••••'}
          error={!!errors.password}
          onChange={(value) => setFormData({ ...formData, password: value })}
        />
        {!isEditing && (
          <p className="mt-1 text-xs text-gray-500">
            Minimum 8 caracteres
          </p>
        )}
      </FormField>

      {/* Role */}
      <FormField
        label="Role"
        htmlFor="user-role"
        required
        error={errors.role}
      >
        <FormSelect
          id="user-role"
          value={formData.role}
          options={ROLE_OPTIONS}
          onChange={(value) => {
            setFormData({
              ...formData,
              role: value,
              // Clear branch if switching to bank_admin
              branchId: value === 'bank_admin' ? null : formData.branchId,
            });
          }}
        />
      </FormField>

      {/* Branch - Only show if role requires it */}
      {roleRequiresBranch && (
        <FormField
          label="Agence"
          htmlFor="user-branch"
          required
          error={errors.branchId}
        >
          <FormSelect
            id="user-branch"
            value={formData.branchId || ''}
            placeholder="Selectionner une agence"
            options={branchOptions}
            error={!!errors.branchId}
            onChange={(value) => setFormData({ ...formData, branchId: value || null })}
          />
        </FormField>
      )}

      {/* Status - Only show when editing */}
      {isEditing && (
        <FormField
          label="Statut"
          htmlFor="user-status"
        >
          <FormSelect
            id="user-status"
            value={formData.status || 'active'}
            options={STATUS_OPTIONS}
            onChange={(value) => setFormData({ ...formData, status: value })}
          />
        </FormField>
      )}
    </FormModal>
  );
}
