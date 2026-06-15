'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────

interface SalesVisitDetail {
    id: number;
    salesRep?: any;
    customer?: any;
    plannedAt?: string;
    visitedAt?: string;
    completedAt?: string;
    gpsCoordinates?: string;
    objective?: string;
    generalComment?: string;
    closed: boolean;
    activated: boolean;
    createdAt?: string;
    priceAudits: PriceAudit[];
    stockAudits: StockAudit[];
    qualityAudit?: QualityAudit | null;
    visibilityAudit?: VisibilityAudit | null;
    preOrders: PreOrder[];
    salesActivities: SalesActivity[];
    photos: SalesPhoto[];
}

interface PriceAudit {
    id: number; productCode: string; productName: string;
    expectedPrice: number; observedPrice: number;
    competitor1Name?: string; competitor1Price?: number;
    competitor2Name?: string; competitor2Price?: number;
    competitor3Name?: string; competitor3Price?: number;
    isPromoActive?: boolean; promoPrice?: number;
    priceCompliance: boolean; comment?: string;
}

interface StockAudit {
    id: number; productCode: string; productName: string;
    isMustStock: boolean; stockQuantity?: number; stockUnit?: string;
    isOutOfStock: boolean; isFifoCompliant: boolean;
    oldestMfgDate?: string; expiryDate?: string;
    freshnessScore?: number; packagingIntact: boolean; comment?: string;
}

interface QualityAudit {
    id: number; damagedBagsCount?: number; damagedBagsRate?: number;
    storageOnPallets: boolean; storageDryArea: boolean; storageProtected: boolean;
    pestPresence: boolean; moldPresence: boolean; odorIssue: boolean;
    cleanlinessScore?: number; overallQualityScore?: number; comment?: string;
}

interface VisibilityAudit {
    id: number; hasPosters: boolean; hasBanners: boolean; hasCalendars: boolean;
    hasBrandedSacs: boolean; signageVisible: boolean;
    brandedItems?: string[]; ourVisibilityPercent?: number;
    overallVisibilityScore?: number; comment?: string;
}

interface PreOrder {
    id: number; productCode: string; productName: string;
    quantity: number; unit: string; unitPrice: number; totalValue: number;
    status: string; expectedDeliveryAt?: string; deliveredAt?: string;
    cancellationReason?: string; comment?: string;
}

interface SalesActivity {
    id: number; activityType: string; isCompleted: boolean;
    completedAt?: string; comment?: string; sortOrder: number;
}

interface SalesPhoto {
    id: number; contentUrl: string; caption?: string;
    category: string; createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const ACTIVITY_LABELS: Record<string, string> = {
    STOCK_CHECK: '📦 Vérification stock', PRICE_CHECK: '🏷️ Relevé des prix',
    QUALITY_CHECK: '✨ Contrôle qualité', VISIBILITY_CHECK: '👁️ Visibilité marque',
    ORDER_TAKING: '📝 Prise de commande', MANAGER_INTERVIEW: '💬 Entretien gérant',
    PHOTO_REPORT: '📸 Reportage photo', MERCHANDISING: '📐 Merchandising',
    PROMO_CHECK: '🎯 Vérification promo',
};

const STATUS_LABELS: Record<string, string> = {
    PREORDER: '📝 Précommande', CONFIRMED: '✅ Confirmée',
    DELIVERED: '🚚 Livrée', CANCELLED: '❌ Annulée',
};

// ─── Composant ────────────────────────────────────────────────

export default function SalesVisitDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [visit, setVisit] = useState<SalesVisitDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [closing, setClosing] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;

    // ── Charger la visite ──
    const fetchVisit = useCallback(async () => {
        if (!token || !id) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/sales_visits/${id}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/ld+json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setVisit(data);
        } catch (err: any) {
            setError(err.message);
            toast.error('Impossible de charger la visite');
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => { fetchVisit(); }, [fetchVisit]);

    // ── Toggle activité ──
    const toggleActivity = async (act: SalesActivity) => {
        const newCompleted = !act.isCompleted;
        // Optimistic update
        setVisit(prev => prev ? {
            ...prev,
            salesActivities: prev.salesActivities.map(a =>
                a.id === act.id ? { ...a, isCompleted: newCompleted, completedAt: newCompleted ? new Date().toISOString() : undefined } : a
            )
        } : null);

        try {
            const res = await fetch(`${API_URL}/sales_activities/${act.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isCompleted: newCompleted, ...(newCompleted ? { completedAt: new Date().toISOString() } : {}) }),
            });
            if (!res.ok) throw new Error('Échec');
        } catch {
            toast.error('Erreur mise à jour');
            fetchVisit(); // rollback
        }
    };

    // ── Clôturer ──
    const handleClose = async () => {
        if (!confirm('Clôturer définitivement cette visite ?')) return;
        setClosing(true);
        try {
            const res = await fetch(`${API_URL}/sales-visits/${id}/close`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur');
            }
            toast.success('Visite clôturée ✅');
            fetchVisit();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setClosing(false);
        }
    };

    // ── Rendu ──
    if (loading) return <div className="max-w-4xl mx-auto p-6 text-center text-gray-500 animate-pulse">Chargement...</div>;
    if (error || !visit) return <div className="max-w-4xl mx-auto p-6 text-center text-red-500">{error || 'Visite introuvable'}</div>;

    const isOpen = !visit.closed;
    const completedActs = visit.salesActivities.filter(a => a.isCompleted).length;
    const totalActs = visit.salesActivities.length;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <Link href="/dashboard/sales" className="text-sm text-gray-500 hover:text-gray-700">&larr; Performance commerciale</Link>

            {/* ── HEADER ── */}
            <div className={`p-6 rounded-xl shadow-sm border ${visit.closed ? 'bg-gray-50 border-gray-200' : 'bg-white border-emerald-200'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            🏪 Visite commerciale
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${visit.closed ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                {visit.closed ? '🔒 Clôturée' : '🟢 En cours'}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {visit.customer?.name || 'N/A'} • {visit.customer?.zone || ''}
                        </p>
                        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                            {visit.plannedAt && <p>📅 Prévue : {new Date(visit.plannedAt).toLocaleString('fr-FR')}</p>}
                            {visit.visitedAt && <p>🚀 Visitée : {new Date(visit.visitedAt).toLocaleString('fr-FR')}</p>}
                            {visit.completedAt && <p>✅ Terminée : {new Date(visit.completedAt).toLocaleString('fr-FR')}</p>}
                            {visit.gpsCoordinates && <p>📍 {visit.gpsCoordinates}</p>}
                        </div>
                    </div>
                    {isOpen && (
                        <button onClick={handleClose} disabled={closing}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                            {closing ? '...' : '🔒 Clôturer'}
                        </button>
                    )}
                </div>
                {visit.objective && <p className="mt-3 text-sm text-gray-700 italic">🎯 {visit.objective}</p>}
                {visit.generalComment && <p className="mt-1 text-xs text-gray-500">💬 {visit.generalComment}</p>}
            </div>

            {/* ── ACTIVITIES CHECKLIST ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex justify-between">
                    📋 Check-list
                    <span className="text-xs text-gray-400 font-normal">{completedActs}/{totalActs} faites</span>
                </h2>
                <div className="space-y-1">
                    {visit.salesActivities.sort((a, b) => a.sortOrder - b.sortOrder).map(act => (
                        <label key={act.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition text-sm ${
                                act.isCompleted ? 'bg-green-50 line-through text-gray-400' : 'hover:bg-gray-50 text-gray-700'
                            } ${!isOpen ? 'pointer-events-none' : ''}`}>
                            <input type="checkbox" checked={act.isCompleted} onChange={() => toggleActivity(act)}
                                disabled={!isOpen} className="w-4 h-4 text-emerald-600 rounded" />
                            {ACTIVITY_LABELS[act.activityType] || act.activityType}
                            {act.completedAt && <span className="text-[10px] text-gray-400 ml-auto">{new Date(act.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </label>
                    ))}
                </div>
            </div>

            {/* ── PRICE AUDITS ── */}
            {visit.priceAudits.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">🏷️ Relevés Prix ({visit.priceAudits.length})</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">Produit</th><th className="pb-2">Attendu</th><th className="pb-2">Observé</th>
                                <th className="pb-2">Écart</th><th className="pb-2">Conforme</th><th className="pb-2">Concurrents</th>
                            </tr></thead>
                            <tbody>
                                {visit.priceAudits.map(pa => {
                                    const ecart = pa.observedPrice - pa.expectedPrice;
                                    const concurrents = [pa.competitor1Name, pa.competitor2Name, pa.competitor3Name].filter(Boolean);
                                    return (
                                        <tr key={pa.id} className="border-b last:border-0">
                                            <td className="py-2 font-medium">{pa.productName}</td>
                                            <td className="py-2">{pa.expectedPrice?.toLocaleString()}</td>
                                            <td className="py-2">{pa.observedPrice?.toLocaleString()}</td>
                                            <td className={`py-2 ${ecart > 0 ? 'text-red-600' : ecart < 0 ? 'text-green-600' : ''}`}>
                                                {ecart > 0 ? '+' : ''}{ecart.toLocaleString()}
                                            </td>
                                            <td className="py-2">{pa.priceCompliance ? '✅' : '❌'}</td>
                                            <td className="py-2 text-gray-500">{concurrents.join(', ') || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── STOCK AUDITS ── */}
            {visit.stockAudits.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">📦 Contrôles Stock ({visit.stockAudits.length})</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">Produit</th><th className="pb-2">Qté</th><th className="pb-2">Must</th>
                                <th className="pb-2">Rupture</th><th className="pb-2">FIFO</th><th className="pb-2">Fraîcheur</th>
                                <th className="pb-2">Emballage</th>
                            </tr></thead>
                            <tbody>
                                {visit.stockAudits.map(sa => (
                                    <tr key={sa.id} className="border-b last:border-0">
                                        <td className="py-2 font-medium">{sa.productName}</td>
                                        <td className="py-2">{sa.stockQuantity ?? '-'} {sa.stockUnit}</td>
                                        <td className="py-2">{sa.isMustStock ? '⭐' : '-'}</td>
                                        <td className={`py-2 ${sa.isOutOfStock ? 'text-red-600 font-bold' : ''}`}>{sa.isOutOfStock ? '🚫 OUI' : 'Non'}</td>
                                        <td className="py-2">{sa.isFifoCompliant ? '✅' : '⚠️'}</td>
                                        <td className="py-2">{sa.freshnessScore ? '⭐'.repeat(sa.freshnessScore) : '-'}</td>
                                        <td className="py-2">{sa.packagingIntact ? '✅' : '📦⚠️'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── QUALITY + VISIBILITY ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visit.qualityAudit && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-700 mb-3">✨ Qualité PDV</h2>
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between"><span>Sacs endommagés</span> <span className="font-bold">{visit.qualityAudit.damagedBagsCount ?? 0} ({visit.qualityAudit.damagedBagsRate ?? 0}%)</span></div>
                            <div className="flex justify-between"><span>Sur palettes</span> <span>{visit.qualityAudit.storageOnPallets ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Zone sèche</span> <span>{visit.qualityAudit.storageDryArea ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Stock protégé</span> <span>{visit.qualityAudit.storageProtected ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Nuisibles</span> <span className={visit.qualityAudit.pestPresence ? 'text-red-600 font-bold' : ''}>{visit.qualityAudit.pestPresence ? '🐀 OUI' : '✅'}</span></div>
                            <div className="flex justify-between"><span>Moisissures</span> <span className={visit.qualityAudit.moldPresence ? 'text-red-600 font-bold' : ''}>{visit.qualityAudit.moldPresence ? '⚠️ OUI' : '✅'}</span></div>
                            <div className="flex justify-between"><span>Propreté</span> <span className="font-bold">{visit.qualityAudit.cleanlinessScore}/5</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold">Score global</span> <span className="font-bold text-lg">{visit.qualityAudit.overallQualityScore}/5</span></div>
                        </div>
                    </div>
                )}

                {visit.visibilityAudit && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-700 mb-3">👁️ Visibilité Marque</h2>
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between"><span>Affiches</span> <span>{visit.visibilityAudit.hasPosters ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Banderoles</span> <span>{visit.visibilityAudit.hasBanners ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Calendriers</span> <span>{visit.visibilityAudit.hasCalendars ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Sacs brandés</span> <span>{visit.visibilityAudit.hasBrandedSacs ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Enseigne visible</span> <span>{visit.visibilityAudit.signageVisible ? '✅' : '❌'}</span></div>
                            {visit.visibilityAudit.brandedItems?.length ? <div className="flex justify-between"><span>Goodies</span> <span>{visit.visibilityAudit.brandedItems.join(', ')}</span></div> : null}
                            <div className="flex justify-between"><span>Part visibilité</span> <span className="font-bold">{visit.visibilityAudit.ourVisibilityPercent}%</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold">Score global</span> <span className="font-bold text-lg">{visit.visibilityAudit.overallVisibilityScore}/5</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── PRE-ORDERS ── */}
            {visit.preOrders.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">📝 Commandes ({visit.preOrders.length})</h2>
                    <div className="space-y-2">
                        {visit.preOrders.map(po => (
                            <div key={po.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                <div>
                                    <span className="font-medium">{po.productName}</span>
                                    <span className="text-gray-500 ml-2">{po.quantity} {po.unit} × {po.unitPrice?.toLocaleString()} FCFA</span>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                        po.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                        po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                        po.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {STATUS_LABELS[po.status] || po.status}
                                    </span>
                                    <div className="text-xs font-bold text-gray-900 mt-0.5">{po.totalValue?.toLocaleString()} FCFA</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── PHOTOS ── */}
            {visit.photos.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">📸 Photos ({visit.photos.length})</h2>
                    <div className="flex flex-wrap gap-2">
                        {visit.photos.map(photo => (
                            <div key={photo.id} className="bg-gray-100 rounded-lg p-2 text-xs text-gray-500">
                                <span className="block">{photo.category}</span>
                                {photo.caption && <span className="text-gray-400">{photo.caption}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
