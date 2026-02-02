import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AdminServices() {
  const { t, i18n } = useTranslation();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempAvgTime, setTempAvgTime] = useState<number>(10);

  const fetchServices = async () => {
    try {
      const response = await adminApi.listServices();
      setServices(response.data.data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleToggleAutomaticTime = async (serviceId: string, currentValue: boolean) => {
    setUpdatingServiceId(serviceId);
    try {
      await adminApi.updateService(serviceId, {
        useAutomaticServiceTime: !currentValue,
      });
      fetchServices();
    } catch (error) {
      console.error('Failed to update service:', error);
    } finally {
      setUpdatingServiceId(null);
    }
  };

  const handleStartEditTime = (serviceId: string, currentTime: number) => {
    setEditingTimeId(serviceId);
    setTempAvgTime(currentTime);
  };

  const handleSaveAvgTime = async (serviceId: string) => {
    setUpdatingServiceId(serviceId);
    try {
      await adminApi.updateService(serviceId, {
        avgServiceTime: tempAvgTime,
      });
      fetchServices();
      setEditingTimeId(null);
    } catch (error) {
      console.error('Failed to update service:', error);
    } finally {
      setUpdatingServiceId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.services')}</h1>
        <Button variant="primary">{t('admin.createService')}</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const isUpdating = updatingServiceId === service.id;
            const isEditingTime = editingTimeId === service.id;

            return (
              <Card key={service.id} className={isUpdating ? 'opacity-50' : ''}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{service.icon || '📋'}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-primary-600">
                        {service.prefix}
                      </span>
                      <Badge variant={service.isActive ? 'success' : 'gray'}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {i18n.language === 'ar' ? service.nameAr : service.nameFr}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {i18n.language === 'ar' ? service.nameFr : service.nameAr}
                    </p>
                  </div>
                </div>

                {/* Service Time Settings */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {t('admin.serviceTimeSettings')}
                    </span>
                  </div>

                  {/* Toggle for automatic vs manual */}
                  <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm text-gray-600">
                        {t('admin.autoCalculateTime')}
                      </span>
                      <p className="text-xs text-gray-400">
                        {t('admin.autoCalculateTimeDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleAutomaticTime(service.id, service.useAutomaticServiceTime)}
                      disabled={isUpdating}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        service.useAutomaticServiceTime ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          service.useAutomaticServiceTime ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Manual time setting */}
                  {!service.useAutomaticServiceTime && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{t('admin.manualAvgTime')}:</span>
                      {isEditingTime ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={tempAvgTime}
                            onChange={(e) => setTempAvgTime(parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 text-sm border rounded"
                          />
                          <span className="text-sm text-gray-500">min</span>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveAvgTime(service.id)}
                            disabled={isUpdating}
                          >
                            {t('common.save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingTimeId(null)}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.avgServiceTime} min</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditTime(service.id, service.avgServiceTime)}
                          >
                            {t('common.edit')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {service.useAutomaticServiceTime && (
                    <div className="text-sm text-gray-500">
                      <span>{t('admin.calculatedTime')}:</span>{' '}
                      <span className="font-medium text-primary-600">{service.avgServiceTime} min</span>
                      <span className="text-xs text-gray-400 ml-1">({t('admin.basedOnLast24h')})</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('admin.priority')}:</span>{' '}
                    <span className="font-medium">{service.priorityWeight}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  {service.branch?.name}
                </div>
              </Card>
            );
          })}

          {services.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-8">
              {t('display.noTickets')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
