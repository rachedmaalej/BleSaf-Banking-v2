import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import {
  SearchInput,
  FilterDropdown,
  UserFormModal,
  ConfirmDialog,
  type UserFormData,
} from '@/components/admin';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  branchId: string | null;
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

export default function AdminUsers() {
  const { t } = useTranslation();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0,
  });

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch users
  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.listUsers(page, pagination.pageSize, branchFilter || undefined, roleFilter || undefined);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des utilisateurs');
      console.error('Failed to fetch users:', err);
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
    fetchUsers();
    fetchBranches();
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter, branchFilter]);

  // Filter users by search and status (client-side for search)
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.branch?.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter && user.status !== statusFilter) return false;

      return true;
    });
  }, [users, searchQuery, statusFilter]);

  // Toast helpers
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Handler functions
  const handleCreateClick = () => {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedUser) {
        // Update existing user
        await adminApi.updateUser(selectedUser.id, data);
        showToast('success', 'Utilisateur modifie avec succes');
      } else {
        // Create new user
        await adminApi.createUser(data);
        showToast('success', 'Utilisateur cree avec succes');
      }
      setIsFormModalOpen(false);
      fetchUsers(pagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteUser(selectedUser.id);
      showToast('success', 'Utilisateur desactive avec succes');
      setIsDeleteDialogOpen(false);
      fetchUsers(pagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateUser = async (user: User) => {
    setIsSubmitting(true);
    try {
      await adminApi.updateUser(user.id, { status: 'active' });
      showToast('success', 'Utilisateur reactive avec succes');
      fetchUsers(pagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la reactivation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role badge styling
  const getRoleBadge = (role: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      super_admin: { bg: '#FEE2E2', text: SG_COLORS.red, label: 'Super Admin' },
      bank_admin: { bg: '#FEF3C7', text: '#B45309', label: 'Admin Banque' },
      branch_manager: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Directeur' },
      teller: { bg: '#F3F4F6', text: SG_COLORS.gray, label: 'Agent' },
    };
    const style = styles[role] || styles.teller;
    return (
      <span
        className="px-2 py-0.5 text-xs font-medium rounded-full"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {style.label}
      </span>
    );
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const isActive = status === 'active';
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

  // Filter options
  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'bank_admin', label: 'Admin Banque' },
    { value: 'branch_manager', label: 'Directeur' },
    { value: 'teller', label: 'Agent' },
  ];

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
            {t('admin.users')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium transition-colors"
          style={{ backgroundColor: SG_COLORS.black }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            person_add
          </span>
          {t('admin.createUser')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            value={searchQuery}
            placeholder="Rechercher par nom, email..."
            onChange={setSearchQuery}
          />
        </div>
        <FilterDropdown
          label="Role"
          value={roleFilter}
          options={roleOptions}
          onChange={setRoleFilter}
        />
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
            onClick={() => fetchUsers()}
            className="ml-auto text-red-600 hover:text-red-800 font-medium"
          >
            Reessayer
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm"
                          style={{ backgroundColor: SG_COLORS.black }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.branch?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            edit
                          </span>
                          {t('common.edit')}
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
                            style={{ color: SG_COLORS.rose }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              person_off
                            </span>
                            Desactiver
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateUser(user)}
                            disabled={isSubmitting}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors disabled:opacity-50"
                            style={{ color: '#166534' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              person_check
                            </span>
                            Activer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredUsers.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="material-symbols-outlined mb-2" style={{ fontSize: '48px' }}>
                  person_search
                </span>
                <p className="font-medium">Aucun utilisateur trouve</p>
                <p className="text-sm">
                  {searchQuery || roleFilter || branchFilter || statusFilter
                    ? 'Ajustez vos filtres'
                    : 'Creez votre premier utilisateur'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50">
            <span className="text-sm text-gray-500">
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                {t('common.back')}
              </button>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        user={selectedUser}
        branches={branches}
        isLoading={isSubmitting}
        onSubmit={handleFormSubmit}
        onClose={() => setIsFormModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Desactiver l'utilisateur"
        message={`Etes-vous sur de vouloir desactiver "${selectedUser?.name}"? L'utilisateur ne pourra plus se connecter.`}
        confirmLabel="Desactiver"
        variant="danger"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
