// HistoryModal.tsx
"use client";

import { useTranslation } from '@/i18n/I18nProvider';

interface HistoryModalProps {
    history: any;
    onClose: () => void;
}

export const HistoryModal = ({ history, onClose }: HistoryModalProps) => {
    const { t } = useTranslation();
    if (!history) return null;

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-600';
            case 'high':
                return 'bg-orange-500';
            case 'medium':
                return 'bg-yellow-500';
            default:
                return 'bg-green-500';
        }
    };

    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'critical':
                return t('visit.severity_critical');
            case 'high':
                return t('visit.severity_high');
            case 'medium':
                return 'Moyenne';
            default:
                return 'Faible';
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">
                            📅 Visite du {new Date(history.observedAt).toLocaleDateString('fr-FR')}
                        </h3>
                        <p className="text-sm text-gray-600">
                            J{history.data?.age} • {new Date(history.observedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
                    >
                        ×
                    </button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Paramètres vitaux */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <span>📊</span> Paramètres Vitaux
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-600 block text-xs">Âge</span>
                                <span className="font-bold text-blue-900">J{history.data?.age}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-600 block text-xs">Poids moyen</span>
                                <span className="font-bold text-blue-900">{history.data?.poidsMoyen}g</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-600 block text-xs">Consommation</span>
                                <span className="font-bold text-blue-900">{history.data?.consoTete}g/tête</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-600 block text-xs">Mortalité</span>
                                <span className={`font-bold ${history.data?.mortalite > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {history.data?.mortalite} sujets
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Environnement */}
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                        <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                            <span>🌡️</span> Environnement
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between bg-white p-2 rounded">
                                <span className="text-gray-600">Litière</span>
                                <span className="font-medium text-green-900">{history.data?.litiere || "Non renseigné"}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                                <span className="text-gray-600">pH Eau</span>
                                <span className="font-medium text-green-900">{history.data?.phValue || "Non renseigné"}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                                <span className="text-gray-600">Uniformité</span>
                                <span className="font-medium text-green-900">{history.data?.uniformite || "Non renseigné"}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                                <span className="text-gray-600">Coefficient de variation</span>
                                <span className="font-medium text-green-900">{history.data?.cv || "Non renseigné"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Équipement */}
                    {(history.data?.abreuvoirs > 0 || history.data?.mangeoires > 0) && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                                <span>🔧</span> Équipement
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-white p-2 rounded text-center">
                                    <span className="text-gray-600 block text-xs">Abreuvoirs</span>
                                    <span className="font-bold text-orange-900 text-lg">{history.data?.abreuvoirs}</span>
                                </div>
                                <div className="bg-white p-2 rounded text-center">
                                    <span className="text-gray-600 block text-xs">Mangeoires</span>
                                    <span className="font-bold text-orange-900 text-lg">{history.data?.mangeoires}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alimentation */}
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                            <span>🌾</span> Alimentation
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between bg-white p-2 rounded">
                                <span className="text-gray-600">Stratégie</span>
                                <span className="font-medium text-yellow-900">{history.data?.feedStrategy || "Non renseigné"}</span>
                            </div>
                            <div className="flex justify-between bg-white p-2 rounded">
                                <span className="text-gray-600">Marque/Formule</span>
                                <span className="font-medium text-yellow-900">{history.data?.feedBrand || "Non renseigné"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Problèmes détectés */}
                    {history.detectedProblems?.length > 0 && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                            <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                                <span>⚠️</span> Problèmes Détectés ({history.detectedProblems.length})
                            </h4>
                            <ul className="space-y-2">
                                {history.detectedProblems.map((problem: any) => (
                                    <li key={problem.id} className="bg-white p-3 rounded border-l-4 border-red-400">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-3 h-3 rounded-full ${getSeverityColor(problem.severity)}`} />
                                            <span className="font-bold text-gray-800 text-sm">{problem.description}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 ml-5">
                                            <span>Sévérité: {getSeverityLabel(problem.severity)}</span>
                                            <span>Statut: {problem.status === 'open' ? t('visit.status_open') : t('visit.status_resolved')}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommandations */}
                    {history.recommendations && (
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                <span>💡</span> Recommandations
                            </h4>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded leading-relaxed">
                                {history.recommendations}
                            </p>
                        </div>
                    )}

                    {/* Observations */}
                    {history.observation && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <span>📝</span> Observations
                            </h4>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded leading-relaxed">
                                {history.observation}
                            </p>
                        </div>
                    )}

                    {/* Vaccins effectués */}
                    {history.data?.vaccinesDone?.length > 0 && (
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                            <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                <span>💉</span> Vaccins Effectués ({history.data.vaccinesDone.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {history.data.vaccinesDone.map((vaccineId: number) => (
                                    <span key={vaccineId} className="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">
                                        Vaccin #{vaccineId}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Préoccupations */}
                    {history.concerns && (
                        <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                            <h4 className="font-bold text-pink-900 mb-2 flex items-center gap-2">
                                <span>🔍</span> Préoccupations
                            </h4>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded leading-relaxed">
                                {history.concerns}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 transition"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};