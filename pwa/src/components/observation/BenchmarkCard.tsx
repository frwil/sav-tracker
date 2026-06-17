// pwa/src/components/observation/BenchmarkCard.tsx

import React from 'react';
import { useTranslation } from '@/i18n/I18nProvider';

export const BenchmarkCard = ({ benchmark }: { benchmark: any }) => {
    const { t } = useTranslation();
    if (benchmark.weightStatus === 'unknown' || !benchmark.targetWeight) return null;

    const isGood = benchmark.weightStatus === 'good';
    const isWarn = benchmark.weightStatus === 'warning';
    
    // Couleur dynamique
    const colorClass = isGood ? 'bg-green-50 text-green-800 border-green-200' 
        : isWarn ? 'bg-yellow-50 text-yellow-800 border-yellow-200' 
        : 'bg-red-50 text-red-800 border-red-200';

    const icon = isGood ? '✅' : isWarn ? '⚠️' : '🚨';
    const sign = (benchmark.weightGap || 0) > 0 ? '+' : '';

    return (
        <div className={`mt-2 p-3 rounded-lg border text-sm animate-fade-in ${colorClass}`}>
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold flex items-center gap-2">
                    {icon} Standard J+{benchmark.age}
                </span>
                <span className="font-mono text-xs opacity-75">Cible: {benchmark.targetWeight}g</span>
            </div>
            
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold">
                    {sign}{benchmark.weightGap}g
                </span>
                <span className="text-xs font-medium opacity-80">
                    d'écart
                </span>
            </div>
            
            {/* Petit conseil automatique */}
            {!isGood && (
                <p className="mt-2 text-xs border-t border-current pt-1 opacity-90">
                    {isWarn ? t('observation.growth_warning') : t('observation.growth_critical')}
                </p>
            )}
        </div>
    );
};