import { useState, Fragment } from 'react';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import { breaksApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  amber: '#F59E0B',
};

// Break reason options
const BREAK_REASONS = [
  { value: 'lunch', label: 'Déjeuner', defaultMins: 30, icon: '🍽️' },
  { value: 'prayer', label: 'Prière', defaultMins: 15, icon: '🕌' },
  { value: 'personal', label: 'Personnel', defaultMins: 15, icon: '👤' },
  { value: 'urgent', label: 'Urgent', defaultMins: 15, icon: '⚡' },
] as const;

type BreakReason = typeof BREAK_REASONS[number]['value'];

interface BreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  counter: {
    id: string;
    number: number;
    assignedUserName?: string;
  };
  onBreakStarted: () => void;
}

export function BreakModal({ isOpen, onClose, counter, onBreakStarted }: BreakModalProps) {
  const [selectedReason, setSelectedReason] = useState<BreakReason>('lunch');
  const [duration, setDuration] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update duration when reason changes
  const handleReasonChange = (reason: BreakReason) => {
    setSelectedReason(reason);
    const reasonConfig = BREAK_REASONS.find((r) => r.value === reason);
    if (reasonConfig) {
      setDuration(reasonConfig.defaultMins);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await breaksApi.startBreak({
        counterId: counter.id,
        reason: selectedReason,
        durationMins: duration,
      });
      onBreakStarted();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du démarrage de la pause');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                {/* Header */}
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
                  <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                    <span>☕</span>
                    <span>Pause - G{counter.number}</span>
                    {counter.assignedUserName && (
                      <span className="text-gray-500 font-normal">
                        ({counter.assignedUserName})
                      </span>
                    )}
                  </Dialog.Title>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                  {/* Reason Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Raison
                    </label>
                    <RadioGroup value={selectedReason} onChange={handleReasonChange}>
                      <div className="space-y-2">
                        {BREAK_REASONS.map((reason) => (
                          <RadioGroup.Option
                            key={reason.value}
                            value={reason.value}
                            className={({ checked }) =>
                              `relative flex cursor-pointer rounded-lg px-4 py-3 border-2 transition-colors ${
                                checked
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`
                            }
                          >
                            {({ checked }) => (
                              <div className="flex w-full items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{reason.icon}</span>
                                  <div>
                                    <RadioGroup.Label
                                      as="p"
                                      className={`font-medium ${
                                        checked ? 'text-amber-900' : 'text-gray-900'
                                      }`}
                                    >
                                      {reason.label}
                                    </RadioGroup.Label>
                                    <RadioGroup.Description
                                      as="span"
                                      className="text-sm text-gray-500"
                                    >
                                      {reason.defaultMins} min par défaut
                                    </RadioGroup.Description>
                                  </div>
                                </div>
                                {checked && (
                                  <div className="shrink-0 text-amber-600">
                                    <CheckIcon className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            )}
                          </RadioGroup.Option>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Duration Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durée
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 heure</option>
                    </select>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-amber-600">⚠️</span>
                    <p className="text-sm text-amber-800">
                      Le guichet sera marqué "en pause" et ne recevra pas de clients
                      pendant cette période.
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">{error}</p>
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
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                    style={{ backgroundColor: SG_COLORS.amber }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>En cours...</span>
                      </>
                    ) : (
                      <>
                        <span>☕</span>
                        <span>Démarrer la pause</span>
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx={12} cy={12} r={12} fill="currentColor" opacity="0.2" />
      <path
        d="M7 13l3 3 7-7"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
