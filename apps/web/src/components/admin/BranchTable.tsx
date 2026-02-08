import { useState, useMemo } from 'react';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
};

export interface BranchRow {
  branchId: string;
  branchName: string;
  branchCode: string;
  waiting: number;
  served: number;
  slaPercent: number;
  openCounters: number;
  totalCounters: number;
  avgWaitMins: number;
  statusColor: 'green' | 'yellow' | 'red';
}

type SortField = 'branchName' | 'waiting' | 'served' | 'slaPercent' | 'openCounters' | 'avgWaitMins';
type SortDirection = 'asc' | 'desc';

interface BranchTableProps {
  branches: BranchRow[];
  pageSize?: number;
  onBranchClick?: (branchId: string) => void;
}

export function BranchTable({ branches, pageSize = 10, onBranchClick }: BranchTableProps) {
  const [sortField, setSortField] = useState<SortField>('branchName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');

  // Filter branches
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const matchesSearch =
        branch.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.branchCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || branch.statusColor === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [branches, searchQuery, statusFilter]);

  // Sort branches
  const sortedBranches = useMemo(() => {
    return [...filteredBranches].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'branchName':
          comparison = a.branchName.localeCompare(b.branchName);
          break;
        case 'waiting':
          comparison = a.waiting - b.waiting;
          break;
        case 'served':
          comparison = a.served - b.served;
          break;
        case 'slaPercent':
          comparison = a.slaPercent - b.slaPercent;
          break;
        case 'openCounters':
          comparison = a.openCounters - b.openCounters;
          break;
        case 'avgWaitMins':
          comparison = a.avgWaitMins - b.avgWaitMins;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredBranches, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sortedBranches.length / pageSize);
  const paginatedBranches = sortedBranches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '16px' }}>
          unfold_more
        </span>
      );
    }
    return (
      <span className="material-symbols-outlined text-gray-600" style={{ fontSize: '16px' }}>
        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    );
  };

  const getStatusBadge = (color: 'green' | 'yellow' | 'red') => {
    const styles = {
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-amber-100 text-amber-700',
      red: 'bg-red-100 text-red-700',
    };
    const labels = {
      green: 'OK',
      yellow: '!',
      red: '!!',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[color]}`}>
        {labels[color]}
      </span>
    );
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            style={{ fontSize: '20px' }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Rechercher une agence..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="all">Tous les statuts</option>
          <option value="green">OK</option>
          <option value="yellow">Avertissement</option>
          <option value="red">Critique</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-600">
                <button
                  onClick={() => handleSort('branchName')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Agence
                  <SortIcon field="branchName" />
                </button>
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-600">
                <button
                  onClick={() => handleSort('waiting')}
                  className="flex items-center gap-1 hover:text-gray-900 mx-auto"
                >
                  Attente
                  <SortIcon field="waiting" />
                </button>
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-600">
                <button
                  onClick={() => handleSort('served')}
                  className="flex items-center gap-1 hover:text-gray-900 mx-auto"
                >
                  Servis
                  <SortIcon field="served" />
                </button>
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-600">
                <button
                  onClick={() => handleSort('slaPercent')}
                  className="flex items-center gap-1 hover:text-gray-900 mx-auto"
                >
                  SLA %
                  <SortIcon field="slaPercent" />
                </button>
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-600">
                <button
                  onClick={() => handleSort('openCounters')}
                  className="flex items-center gap-1 hover:text-gray-900 mx-auto"
                >
                  Guichets
                  <SortIcon field="openCounters" />
                </button>
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-600">
                <button
                  onClick={() => handleSort('avgWaitMins')}
                  className="flex items-center gap-1 hover:text-gray-900 mx-auto"
                >
                  Moy. Attente
                  <SortIcon field="avgWaitMins" />
                </button>
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-600">Statut</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBranches.map((branch) => (
              <tr
                key={branch.branchId}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  onBranchClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onBranchClick?.(branch.branchId)}
              >
                <td className="py-3 px-2">
                  <div>
                    <div className="font-medium" style={{ color: SG_COLORS.black }}>
                      {branch.branchName}
                    </div>
                    <div className="text-xs text-gray-500">{branch.branchCode}</div>
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  <span
                    className={`font-medium ${branch.waiting > 15 ? 'text-red-600' : ''}`}
                  >
                    {branch.waiting}
                  </span>
                </td>
                <td className="text-center py-3 px-2 text-green-600 font-medium">
                  {branch.served}
                </td>
                <td className="text-center py-3 px-2">
                  <span
                    className={`font-medium ${
                      branch.slaPercent < 75
                        ? 'text-red-600'
                        : branch.slaPercent < 90
                        ? 'text-amber-600'
                        : 'text-green-600'
                    }`}
                  >
                    {branch.slaPercent}%
                  </span>
                </td>
                <td className="text-center py-3 px-2">
                  <span
                    className={`${
                      branch.openCounters < branch.totalCounters ? 'text-amber-600' : ''
                    }`}
                  >
                    {branch.openCounters}/{branch.totalCounters}
                  </span>
                </td>
                <td className="text-center py-3 px-2">
                  <span
                    className={`${branch.avgWaitMins > 20 ? 'text-red-600' : 'text-gray-600'}`}
                  >
                    {branch.avgWaitMins} min
                  </span>
                </td>
                <td className="text-center py-3 px-2">{getStatusBadge(branch.statusColor)}</td>
              </tr>
            ))}
            {paginatedBranches.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  Aucune agence trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {filteredBranches.length} agence{filteredBranches.length > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                chevron_left
              </span>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-sm rounded transition-colors ${
                      currentPage === page
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                chevron_right
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
