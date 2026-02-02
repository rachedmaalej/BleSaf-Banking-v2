import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AdminBranches() {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await adminApi.listBranches();
        setBranches(response.data.data);
      } catch (error) {
        console.error('Failed to fetch branches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.branches')}</h1>
        <Button variant="primary">{t('admin.createBranch')}</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {branch.name}
                  </h3>
                  <span className="text-sm text-gray-500">{branch.code}</span>
                </div>
                <Badge variant={branch.status === 'active' ? 'success' : 'gray'}>
                  {branch.status}
                </Badge>
              </div>

              {branch.address && (
                <p className="text-sm text-gray-600 mb-4">{branch.address}</p>
              )}

              <div className="flex gap-4 text-sm text-gray-500">
                <span>🖥️ {branch._count?.counters || 0} guichets</span>
                <span>📋 {branch._count?.services || 0} services</span>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-end">
                <Button variant="ghost" size="sm">
                  {t('common.edit')}
                </Button>
              </div>
            </Card>
          ))}

          {branches.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-8">
              {t('display.noTickets')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
