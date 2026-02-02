import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { adminApi } from '@/lib/api';

// SG Brand Colors - V1 Monochrome
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
  blackBg: 'rgba(26, 26, 26, 0.05)',
};

interface Teller {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface TellerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  teller: Teller | null; // null = create mode, object = edit mode
  onSuccess: () => void;
}

export function TellerFormModal({
  isOpen,
  onClose,
  branchId,
  teller,
  onSuccess,
}: TellerFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isEditMode = !!teller;

  // Reset form when modal opens/closes or teller changes
  useEffect(() => {
    if (isOpen) {
      if (teller) {
        setFormData({
          name: teller.name,
          email: teller.email,
          password: '',
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
        });
      }
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen, teller]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        // Edit mode - only send changed fields
        const updateData: { name?: string; email?: string; password?: string } = {};
        if (formData.name !== teller.name) updateData.name = formData.name;
        if (formData.email !== teller.email) updateData.email = formData.email;
        if (formData.password) updateData.password = formData.password;

        if (Object.keys(updateData).length === 0) {
          onSuccess();
          return;
        }

        await adminApi.updateTeller(teller.id, updateData);
      } else {
        // Create mode
        if (!formData.password) {
          setError('Le mot de passe est requis');
          setIsSubmitting(false);
          return;
        }
        await adminApi.createTeller({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          branchId,
        });
      }
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error;
      if (message?.includes('Email already in use')) {
        setError('Cette adresse email est déjà utilisée');
      } else if (message?.includes('password')) {
        setError('Le mot de passe doit contenir au moins 8 caractères');
      } else {
        setError(message || 'Une erreur est survenue');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[55]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                <form onSubmit={handleSubmit}>
                  {/* Header */}
                  <div
                    className="px-6 py-4 border-b"
                    style={{ backgroundColor: SG_COLORS.blackBg }}
                  >
                    <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                      <span
                        className="material-symbols-outlined"
                        style={{ color: SG_COLORS.black }}
                      >
                        {isEditMode ? 'edit' : 'person_add'}
                      </span>
                      <span style={{ color: SG_COLORS.black }}>
                        {isEditMode ? 'Modifier le guichetier' : 'Ajouter un guichetier'}
                      </span>
                    </Dialog.Title>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 space-y-4">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                        minLength={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        placeholder="Ex: Ahmed Ben Ali"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        placeholder="ahmed@example.com"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Mot de passe {!isEditMode && '*'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, password: e.target.value }))
                          }
                          required={!isEditMode}
                          minLength={8}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 pr-20"
                          placeholder={
                            isEditMode
                              ? 'Laisser vide pour ne pas changer'
                              : 'Min. 8 caractères'
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="text-sm flex items-center gap-1 hover:underline"
                          style={{ color: SG_COLORS.gray }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            password
                          </span>
                          Générer un mot de passe
                        </button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Info for edit mode */}
                    {isEditMode && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-600">
                          Seuls les champs modifiés seront mis à jour.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                      style={{ backgroundColor: SG_COLORS.black }}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                            progress_activity
                          </span>
                          <span>En cours...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            {isEditMode ? 'save' : 'person_add'}
                          </span>
                          <span>{isEditMode ? 'Enregistrer' : 'Ajouter'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
