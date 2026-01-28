'use client';
import { calculateBenchmark, generateExpertInsights, getFieldFeedback, estimateTotalFeedConsumption, BenchmarkCard, Visit } from '../shared';

interface Props {
    obs: any;
    flock: any;
    building: any;
    visit: Visit;
    onEdit?: () => void;
    onClose: () => void;
    isModal?: boolean;
}

export const ObservationDetails = ({ obs, flock, building, visit, onEdit, onClose, isModal = false }: Props) => {
    // 1. CALCULS
    const totalMortalite = flock.observations.reduce((acc: number, curr: any) => acc + (curr.data?.mortalite || 0), 0);
    const sujetsRestants = flock.subjectCount - totalMortalite;
    const pourcentMortalite = ((totalMortalite / flock.subjectCount) * 100).toFixed(1);
    
    const surface = building.surface || 0;
    const density = surface > 0 ? parseFloat((sujetsRestants / surface).toFixed(1)) : 0;
    
    const benchmark = calculateBenchmark(obs.data.age, obs.data.poidsMoyen, obs.data.consoTete, flock.standard?.curveData || []);
    const totalFeedConsumed = estimateTotalFeedConsumption(flock);

    const ratioAbr = obs.data.abreuvoirs > 0 ? (sujetsRestants / obs.data.abreuvoirs).toFixed(0) : '?';
    const ratioMang = obs.data.mangeoires > 0 ? (sujetsRestants / obs.data.mangeoires).toFixed(0) : '?';

    const litiereStatus = getFieldFeedback('litiere', obs.data.litiere);
    const phStatus = getFieldFeedback('phValue', obs.data.phValue);
    const unifStatus = getFieldFeedback('uniformite', obs.data.uniformite);
    const cvStatus = getFieldFeedback('cv', obs.data.cv);

    const insights = generateExpertInsights(obs, flock, benchmark, density, totalMortalite, []);

    const technicianName = visit.technician?.fullname || 'Technicien';
    const speculationName = flock.speculation?.name || 'Inconnue';
    const clientName = visit.customer.name;
    const clientZone = visit.customer.zone;
    
    const feedStrategyLabel = obs.data.feedStrategy === 'SELF_MIX' ? '🏭 FABRIQUÉ (Mélange)' : (obs.data.feedStrategy === 'THIRD_PARTY' ? '🛒 VRAC / AUTRE' : '🏭 INDUSTRIEL (Complet)');
    const feedBrand = obs.data.feedBrand || (obs.data.feedStrategy === 'SELF_MIX' ? 'Formule Perso' : 'Standard');

    // --- WHATSAPP ---
    const shareWhatsApp = () => {
        let text = `*🩺 RAPPORT DE VISITE SAV - ${clientName.toUpperCase()}*\n`;
        text += `📅 Date : ${new Date(obs.observedAt).toLocaleDateString()} (J${obs.data.age})\n`;
        text += `📍 Zone : ${clientZone}\n`;
        text += `👨‍🔧 Tech : @${technicianName}\n`;
        text += `🐣 Lot : ${flock.name} (${speculationName})\n\n`;

        text += `*📊 PERFORMANCES*\n`;
        text += `• Stock : ${sujetsRestants} / ${flock.subjectCount}\n`;
        text += `• Morts : ${obs.data.mortalite} (Total: ${totalMortalite} - ${pourcentMortalite}%)\n`;
        text += `• Poids : ${obs.data.poidsMoyen}g ${benchmark ? `(Ecart: ${benchmark.weightGap > 0 ? '+' : ''}${benchmark.weightGap.toFixed(0)}g)` : ''}\n`;
        
        text += `\n*🥣 ALIMENTATION*\n`;
        text += `• Type : ${feedStrategyLabel}\n`;
        text += `• Marque : ${feedBrand}\n`;
        text += `• Conso/j : ${obs.data.consoTete}g/tête ${benchmark?.feedGap ? `(Obj: ${benchmark.targetFeed}g)` : ''}\n`;
        text += `• Cumul Est. : ~${totalFeedConsumed} kg consommés\n`;
        
        text += `\n*⚙️ MATÉRIEL & AMBIANCE*\n`;
        text += `• Densité : ${density} suj/m² (${surface}m²) ${density > 20 ? '⚠️' : '✅'}\n`;
        text += `• Mangeoires : 1/${ratioMang} ${parseInt(ratioMang) > 50 ? '⚠️' : '✅'}\n`;
        text += `• Abreuvoirs : 1/${ratioAbr} ${parseInt(ratioAbr) > 70 ? '⚠️' : '✅'}\n`;
        text += `• Litière : ${obs.data.litiere || '?'} ${litiereStatus.message ? '⚠️' : ''}\n`;
        text += `• Eau (pH) : ${obs.data.phValue || '?'} - Conso : ${obs.data.waterConsumptionIncrease === 'no' ? '↘️ BAISSE ALARMANTE' : '✅'}\n`;
        text += `• Homogénéité : Unif ${obs.data.uniformite || '?'} / CV ${obs.data.cv || '?'}\n`;

        if (insights.length > 0) { 
            text += `\n*⚠️ ALERTES EXPERT*\n`; 
            insights.forEach((i:any) => text += `${i.type === 'danger' ? '🚨' : '🔸'} ${i.text}\n`); 
        }
        
        if (obs.recommendations) {
            text += `\n*💡 RECOMMANDATIONS*\n${obs.recommendations}\n`;
        }
        
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    // --- SMS ---
    const shareSMS = () => {
        let text = `SAV ${clientName} J${obs.data.age}. Lot:${flock.name}. `;
        text += `Stock:${sujetsRestants} Morts:${obs.data.mortalite}. `;
        text += `Poids:${obs.data.poidsMoyen}g. `;
        text += `Dens:${density}/m². `;
        
        if (parseInt(ratioMang) > 50) text += `MANQUE MANGEOIRES. `;
        if (cvStatus.style.includes('red')) text += `CV > 12. `;
        
        if (insights.length > 0) text += `⚠️ ${insights.length} Alertes. `;
        if (obs.recommendations) text += `Rec: ${obs.recommendations.substring(0, 30)}...`;
        
        const phone = visit.customer.phoneNumber || '';
        const separator = navigator.userAgent.toLowerCase().includes("iphone") ? "&" : "?";
        window.open(`sms:${phone}${separator}body=${encodeURIComponent(text)}`, '_self');
    };

    const handlePrint = () => window.print();
    const containerClass = isModal ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" : "bg-white border rounded-xl shadow-lg my-4";

    return (
        <div className={containerClass}>
            {/* CSS PRINT CORRIGÉ */}
            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 0; 
                        size: auto; 
                    }
                    body * { 
                        visibility: hidden; 
                        margin: 0;
                        padding: 0;
                        width: 100%;
                    }
                    #printable-report, #printable-report * { 
                        visibility: visible; 
                    }
                    nav{ display: none; }
                    #printable-report { 
                        position: absolute; /* Utiliser fixed pour coller en haut */
                        left: 0; 
                        top: -70%; 
                        width: 100%; 
                        height: 95vh;
                        margin: 0 !important; 
                        padding: 20px !important; 
                        background: white; 
                        color: black; 
                        z-index: 9999;
                    }
                    .no-print { 
                        display: none !important; 
                    } 
                }
            `}</style>
            
            <div id="printable-report" className={`bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${isModal ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
                {/* En-tête Rapport */}
                <div className="bg-gray-800 text-white p-4 flex justify-between items-center sticky top-0 z-10 print:bg-white print:text-black print:border-b-2">
                    <div>
                        {isModal && <span className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase mr-2 align-middle no-print">Historique</span>}
                        <span className="font-bold text-lg align-middle">RAPPORT VISITE - {visit.customer.name}</span> 
                        <span className="text-sm opacity-70 ml-2">| J{obs.data.age}</span>
                        <div className="text-xs text-gray-300 mt-1 print:text-gray-600 flex gap-3">
                            <span>👨‍🔧 Tech: <strong className="text-white print:text-black">@{technicianName}</strong></span>
                            <span>🐣 Lot: {flock.name} ({speculationName})</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/20 p-1 rounded-full hover:bg-white/30 transition no-print">✕</button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Indicateurs Clés */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Stock Vif</p>
                            <p className="text-2xl font-black text-blue-900">{sujetsRestants}</p>
                            <p className="text-[10px] text-blue-600">sur {flock.subjectCount}</p>
                        </div>
                        <div className={`p-3 border rounded-lg text-center ${benchmark?.weightStatus === 'danger' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <p className="text-[10px] font-bold uppercase opacity-60">Poids Moyen</p>
                            <p className="text-2xl font-black">{obs.data.poidsMoyen}<span className="text-sm font-normal text-gray-500">g</span></p>
                            <BenchmarkCard benchmark={benchmark} type="weight" />
                        </div>
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-center">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mortalité</p>
                            <div className="flex justify-center items-baseline gap-1">
                                <p className="text-2xl font-black text-gray-800">{obs.data.mortalite}</p>
                                <span className="text-xs text-gray-500">aujourd'hui</span>
                            </div>
                            <p className="text-[10px] font-black text-gray-600 mt-1">Total : {totalMortalite} ({pourcentMortalite}%)</p>
                        </div>
                    </div>

                    {/* Section Alimentation */}
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <h5 className="text-xs font-bold text-orange-800 uppercase mb-3 flex items-center gap-2">🥣 Alimentation & Consommation</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase block">Stratégie</span>
                                <strong className="text-gray-800">{feedStrategyLabel}</strong>
                                <p className="text-xs text-gray-500 italic">{feedBrand}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase block">Conso / Tête</span>
                                <div className="flex items-center gap-2">
                                    <strong className="text-xl text-gray-800">{obs.data.consoTete}g</strong>
                                    <BenchmarkCard benchmark={benchmark} type="feed" />
                                </div>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-orange-200 mt-1">
                                <span className="text-xs font-bold text-gray-500 uppercase block">Estimation Cumulée (Lot)</span>
                                <p className="text-sm font-bold text-orange-900">~ {totalFeedConsumed} kg consommés depuis J0</p>
                            </div>
                        </div>
                    </div>

                    {/* Matériel & Ambiance */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">⚙️ Matériel & Ambiance</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className={`p-2 rounded bg-white shadow-sm border ${density > 20 ? 'border-red-300' : 'border-gray-100'}`}>
                                <span className="text-xs font-bold text-gray-400 uppercase">Densité</span>
                                <div className="flex justify-between items-end">
                                    <strong className={`${density > 20 ? 'text-red-600' : 'text-gray-800'}`}>{density}</strong>
                                    <span className="text-xs text-gray-500">suj/m²</span>
                                </div>
                                <span className="text-[9px] text-gray-400">Surf: {surface}m²</span>
                            </div>
                            <div className="p-2 bg-white rounded shadow-sm border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase">Mangeoires</span>
                                <div className="flex justify-between items-end">
                                    <strong>{obs.data.mangeoires}</strong>
                                    <span className={`text-xs font-bold ${parseInt(ratioMang) > 50 ? 'text-red-500' : 'text-green-500'}`}>1/{ratioMang} suj.</span>
                                </div>
                            </div>
                            <div className="p-2 bg-white rounded shadow-sm border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase">Abreuvoirs</span>
                                <div className="flex justify-between items-end">
                                    <strong>{obs.data.abreuvoirs}</strong>
                                    <span className={`text-xs font-bold ${parseInt(ratioAbr) > 70 ? 'text-red-500' : 'text-green-500'}`}>1/{ratioAbr} suj.</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded border-l-4 ${litiereStatus.style.replace('border ', '').replace('w-full', '')} bg-white shadow-sm col-span-2`}>
                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">Litière</span><strong>{obs.data.litiere || '-'}</strong></div>
                                {litiereStatus.message && <p className="text-[10px] mt-1 italic opacity-80">{litiereStatus.message}</p>}
                            </div>
                            <div className={`p-2 rounded border-l-4 ${phStatus.style.replace('border ', '').replace('w-full', '')} bg-white shadow-sm`}>
                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">pH Eau</span><strong>{obs.data.phValue || '-'}</strong></div>
                                {phStatus.message && <p className="text-[10px] mt-1 italic opacity-80">{phStatus.message}</p>}
                            </div>
                            <div className={`p-2 rounded border-l-4 ${unifStatus.style.replace('border ', '').replace('w-full', '')} bg-white shadow-sm`}>
                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">Uniformité</span><strong>{obs.data.uniformite || '-'}</strong></div>
                                {unifStatus.message && <p className="text-[10px] mt-1 italic opacity-80">{unifStatus.message}</p>}
                            </div>
                            <div className={`p-2 rounded border-l-4 ${cvStatus.style.replace('border ', '').replace('w-full', '')} bg-white shadow-sm`}>
                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">CV</span><strong>{obs.data.cv || '-'}</strong></div>
                                {cvStatus.message && <p className="text-[10px] mt-1 italic opacity-80">{cvStatus.message}</p>}
                            </div>
                            <div className={`p-2 rounded border-l-4 bg-white shadow-sm ${obs.data.waterConsumptionIncrease === 'no' ? 'border-red-500' : 'border-green-500'}`}>
                                <div className="flex justify-between mb-1"><span className="text-xs font-bold text-gray-500 uppercase">Conso Eau</span><strong>{obs.data.waterConsumptionIncrease === 'no' ? '↘️ BAISSE !' : '✅ Stable'}</strong></div>
                            </div>
                        </div>
                    </div>

                    {/* Alertes Automatiques */}
                    {insights.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-xs font-bold text-red-400 uppercase">⚠️ Points de vigilance</h5>
                            {insights.map((i:any, idx:number) => (
                                <div key={idx} className={`p-3 text-sm border-l-4 rounded flex gap-3 ${i.type === 'danger' ? 'border-red-500 bg-red-50 text-red-900' : 'border-orange-500 bg-orange-50 text-orange-900'}`}>
                                    <span className="text-lg">{i.type === 'danger' ? '🚨' : '🔸'}</span>
                                    <span className="font-medium">{i.text}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Textes Libres */}
                    {(obs.observation || obs.recommendations || obs.problems) && (
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                            {obs.problems && <div className="p-3 bg-red-100 text-red-900 rounded text-sm"><strong>⛔ PROBLÈMES :</strong> <p className="whitespace-pre-wrap">{obs.problems}</p></div>}
                            {obs.recommendations && <div className="p-3 bg-green-100 text-green-900 rounded text-sm"><strong>💡 RECOMMANDATION :</strong> <p className="whitespace-pre-wrap">{obs.recommendations}</p></div>}
                            {obs.observation && (
                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <strong className="text-xs text-gray-500 uppercase block mb-1">Note Générale</strong>
                                    <p className="text-sm italic text-gray-700">"{obs.observation}"</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Boutons Actions */}
                    {!isModal && (
                        <div className="flex gap-2 pt-4 border-t mt-4 no-print overflow-x-auto">
                            <button onClick={shareWhatsApp} className="flex-1 py-3 px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold text-xs flex justify-center items-center gap-1 min-w-[90px] shadow-sm active:scale-95 transition"><span>📱</span> WhatsApp</button>
                            <button onClick={shareSMS} className="flex-1 py-3 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-xs flex justify-center items-center gap-1 min-w-[90px] shadow-sm active:scale-95 transition"><span>💬</span> SMS</button>
                            <button onClick={handlePrint} className="flex-1 py-3 px-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold text-xs flex justify-center items-center gap-1 min-w-[90px] shadow-sm active:scale-95 transition"><span>🖨️</span> Imprimer</button>
                            {onEdit && <button onClick={onEdit} className="py-3 px-4 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-bold text-xs flex items-center gap-1 border border-gray-200 shadow-sm active:scale-95 transition"><span>✏️</span> Éditer</button>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};