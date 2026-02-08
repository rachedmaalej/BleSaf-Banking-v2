import { useState } from 'react';
import { announcementApi } from '@/lib/api';

interface AnnouncementModalProps {
  branchId: string;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export function AnnouncementModal({
  branchId,
  isOpen,
  onClose,
  onSent,
}: AnnouncementModalProps) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLength = 200;
  const remainingChars = maxLength - message.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await announcementApi.create({
        branchId,
        message: message.trim(),
        priority,
        enableTts: false,
        displayDuration: duration,
      });

      // Reset form
      setMessage('');
      setPriority('normal');
      setDuration(30);

      onSent();
      onClose();
    } catch (err) {
      console.error('Failed to send announcement:', err);
      setError('Erreur lors de l\'envoi de l\'annonce');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#E9041E]">campaign</span>
            <h2 className="text-lg font-semibold text-gray-900">Envoyer une annonce</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Message input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
              placeholder="Votre message apparaîtra sur les écrans TV..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E9041E] focus:border-transparent resize-none"
              rows={3}
              autoFocus
            />
            <div className={`text-xs mt-1 text-right ${remainingChars < 20 ? 'text-red-500' : 'text-gray-400'}`}>
              {remainingChars} caractères restants
            </div>
          </div>

          {/* Priority toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorité
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  priority === 'normal'
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                  priority === 'urgent'
                    ? 'border-[#E9041E] bg-[#E9041E] text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                Urgent
              </button>
            </div>
          </div>

          {/* Duration selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée d'affichage
            </label>
            <div className="flex gap-2">
              {[15, 30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm transition-colors ${
                    duration === d
                      ? 'border-[#E9041E] bg-[#E9041E]/10 text-[#E9041E]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full py-3 px-4 bg-[#E9041E] text-white font-semibold rounded-lg hover:bg-[#c7031a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">send</span>
                Envoyer l'annonce
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AnnouncementModal;
