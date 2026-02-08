import { useState, useRef } from 'react';
import { adminApi } from '@/lib/api';

// SG Brand Colors
const SG_COLORS = {
  red: '#E9041E',
  black: '#1A1A1A',
  rose: '#D66874',
  gray: '#666666',
};

interface BatchBranchRow {
  name: string;
  code: string;
  address?: string;
  region?: string;
  profile?: string;
  counterCount?: number;
  services?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidatedRow extends BatchBranchRow {
  rowNumber: number;
  templateIds: string[];
  resolvedCounterCount: number;
}

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { created: number; skipped: number }) => void;
}

type ImportStep = 'upload' | 'validate' | 'import' | 'done';

export function BatchImportModal({
  isOpen,
  onClose,
  onSuccess,
}: BatchImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<BatchBranchRow[]>([]);
  const [validRows, setValidRows] = useState<ValidatedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [skipErrors, setSkipErrors] = useState(true);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);

  // Reset state when modal opens/closes
  const resetState = () => {
    setStep('upload');
    setIsLoading(false);
    setError(null);
    setFileName(null);
    setParsedRows([]);
    setValidRows([]);
    setValidationErrors([]);
    setSkipErrors(true);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const response = await adminApi.downloadBatchTemplate();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'branches_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError('Erreur lors du telechargement du template');
    }
  };

  // Parse CSV file
  const parseCSV = (text: string): BatchBranchRow[] => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: BatchBranchRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: BatchBranchRow = {
        name: '',
        code: '',
      };

      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        switch (header.toLowerCase()) {
          case 'name':
            row.name = value;
            break;
          case 'code':
            row.code = value;
            break;
          case 'address':
            row.address = value;
            break;
          case 'region':
            row.region = value;
            break;
          case 'profile':
            row.profile = value;
            break;
          case 'countercount':
            row.counterCount = value ? parseInt(value) : undefined;
            break;
          case 'services':
            row.services = value;
            break;
        }
      });

      // Only add if name or code is present
      if (row.name || row.code) {
        rows.push(row);
      }
    }

    return rows;
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setError('Le fichier ne contient aucune donnee valide');
        return;
      }

      setParsedRows(rows);
      setStep('validate');

      // Auto-validate
      await validateRows(rows);
    } catch (err: any) {
      setError('Erreur lors de la lecture du fichier');
    }
  };

  // Validate rows with backend
  const validateRows = async (rows: BatchBranchRow[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminApi.validateBatchImport(rows);
      const data = response.data.data;

      setValidRows(data.valid);
      setValidationErrors(data.errors);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la validation');
    } finally {
      setIsLoading(false);
    }
  };

  // Import branches
  const handleImport = async () => {
    if (validRows.length === 0) return;

    setIsLoading(true);
    setError(null);
    setStep('import');

    try {
      const response = await adminApi.importBranches(parsedRows, skipErrors);
      const data = response.data.data;

      setImportResult({ created: data.created, skipped: data.skipped });
      setStep('done');
      onSuccess({ created: data.created, skipped: data.skipped });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'import');
      setStep('validate');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Import en masse
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Importez plusieurs agences depuis un fichier CSV
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Download template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600" style={{ fontSize: '24px' }}>
                    download
                  </span>
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">1. Telecharger le template</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Telechargez le fichier CSV modele et remplissez-le avec vos donnees.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Telecharger le template CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload file */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <span className="material-symbols-outlined text-gray-400 mb-2" style={{ fontSize: '48px' }}>
                  upload_file
                </span>
                <h3 className="font-medium text-gray-900">2. Importer votre fichier</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Glissez votre fichier CSV ici ou cliquez pour le selectionner
                </p>
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    folder_open
                  </span>
                  Parcourir
                </label>
              </div>

              {/* Format help */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Format du fichier</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><span className="font-medium">name</span> - Nom de l'agence (requis)</li>
                  <li><span className="font-medium">code</span> - Code unique (requis, ex: LM01)</li>
                  <li><span className="font-medium">address</span> - Adresse complete</li>
                  <li><span className="font-medium">region</span> - Region (Tunis, Sousse, etc.)</li>
                  <li><span className="font-medium">profile</span> - small (2), medium (4), large (8), ou custom</li>
                  <li><span className="font-medium">counterCount</span> - Nombre de guichets (si profile=custom)</li>
                  <li><span className="font-medium">services</span> - Prefixes des services separes par virgule (ex: R,C,X)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step: Validate */}
          {step === 'validate' && (
            <div className="space-y-6">
              {/* File info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="material-symbols-outlined text-gray-600" style={{ fontSize: '24px' }}>
                  description
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{fileName}</p>
                  <p className="text-sm text-gray-500">{parsedRows.length} lignes detectees</p>
                </div>
                <button
                  onClick={resetState}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Changer de fichier
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
                  <span className="ml-3 text-gray-600">Validation en cours...</span>
                </div>
              ) : (
                <>
                  {/* Validation summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600" style={{ fontSize: '24px' }}>
                          check_circle
                        </span>
                        <span className="text-2xl font-bold text-green-700">{validRows.length}</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">agences valides</p>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-600" style={{ fontSize: '24px' }}>
                          error
                        </span>
                        <span className="text-2xl font-bold text-red-700">{validationErrors.length}</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">erreurs detectees</p>
                    </div>
                  </div>

                  {/* Errors list */}
                  {validationErrors.length > 0 && (
                    <div className="border border-red-200 rounded-lg overflow-hidden">
                      <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                        <h4 className="font-medium text-red-800">Erreurs de validation</h4>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-600">Ligne</th>
                              <th className="px-4 py-2 text-left text-gray-600">Champ</th>
                              <th className="px-4 py-2 text-left text-gray-600">Erreur</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {validationErrors.map((err, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 text-gray-900">{err.row}</td>
                                <td className="px-4 py-2 text-gray-600">{err.field}</td>
                                <td className="px-4 py-2 text-red-600">{err.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Skip errors option */}
                  {validationErrors.length > 0 && validRows.length > 0 && (
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipErrors}
                        onChange={(e) => setSkipErrors(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Ignorer les erreurs</p>
                        <p className="text-sm text-gray-500">
                          Importer uniquement les {validRows.length} agences valides
                        </p>
                      </div>
                    </label>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step: Import */}
          {step === 'import' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mb-4" />
              <p className="font-medium text-gray-900">Import en cours...</p>
              <p className="text-sm text-gray-500 mt-1">
                Creation de {validRows.length} agences
              </p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && importResult && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600" style={{ fontSize: '32px' }}>
                  check_circle
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Import termine!</h3>
              <p className="text-gray-600 mt-2">
                <span className="font-medium text-green-600">{importResult.created}</span> agences creees
                {importResult.skipped > 0 && (
                  <>, <span className="font-medium text-yellow-600">{importResult.skipped}</span> ignorees</>
                )}
              </p>
            </div>
          )}

          {/* Error display */}
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
          {step === 'done' ? (
            <>
              <div />
              <button
                onClick={handleClose}
                className="px-6 py-2 text-sm text-white rounded-lg font-medium transition-colors"
                style={{ backgroundColor: SG_COLORS.black }}
              >
                Fermer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={step === 'validate' ? resetState : handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                {step === 'validate' ? 'Retour' : 'Annuler'}
              </button>

              {step === 'validate' && (
                <button
                  onClick={handleImport}
                  disabled={isLoading || validRows.length === 0}
                  className="px-6 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ backgroundColor: SG_COLORS.black }}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Import...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        upload
                      </span>
                      Importer {validRows.length} agences
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
