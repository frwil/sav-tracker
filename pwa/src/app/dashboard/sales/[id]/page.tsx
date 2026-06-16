'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useSync } from '@/providers/SyncProvider';
import { useTranslation } from '@/i18n/I18nProvider';
import {
    SalesVisit, PriceAudit, StockAudit, QualityAudit, VisibilityAudit,
    PreOrder, SalesActivity, SalesPhoto,
    ACTIVITY_LABELS, ORDER_STATUS_LABELS,
} from '@/types/sales';
import PriceAuditForm from './components/PriceAuditForm';
import StockAuditForm from './components/StockAuditForm';
import QualityAuditForm from './components/QualityAuditForm';
import VisibilityAuditForm from './components/VisibilityAuditForm';
import PreOrderForm from './components/PreOrderForm';
import SalesPhotoUpload from './components/SalesPhotoUpload';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// ─── Composant ────────────────────────────────────────────────

export default function SalesVisitDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { addToQueue } = useSync();
    const { t } = useTranslation();

    const [visit, setVisit] = useState<SalesVisit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [closing, setClosing] = useState(false);

    // Form visibility toggles
    const [showPriceForm, setShowPriceForm] = useState(false);
    const [showStockForm, setShowStockForm] = useState(false);
    const [showQualityForm, setShowQualityForm] = useState(false);
    const [showVisibilityForm, setShowVisibilityForm] = useState(false);
    const [showOrderForm, setShowOrderForm] = useState(false);

    // Edit states
    const [editingPrice, setEditingPrice] = useState<PriceAudit | null>(null);
    const [editingStock, setEditingStock] = useState<StockAudit | null>(null);
    const [editingOrder, setEditingOrder] = useState<PreOrder | null>(null);

    // Lightbox
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');

    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;
    // Vérifier le rôle
    useEffect(() => {
        if (!token) { router.push('/'); return; }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const roles: string[] = payload.roles || [];
            if (!roles.includes('ROLE_SALES_REP') && !roles.includes('ROLE_ADMIN') && !roles.includes('ROLE_SUPER_ADMIN')) {
                router.push('/dashboard');
            }
        } catch { router.push('/'); }
    }, [token, router]);
    const visitIri = `/api/sales_visits/${id}`;
    const customerIri = visit?.customer?.['@id'] || '';

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
        setVisit(prev => prev ? {
            ...prev,
            salesActivities: prev.salesActivities.map(a =>
                a.id === act.id ? { ...a, isCompleted: newCompleted, completedAt: newCompleted ? new Date().toISOString() : undefined } : a
            )
        } : null);

        const body = { isCompleted: newCompleted, ...(newCompleted ? { completedAt: new Date().toISOString() } : {}) };
        const url = `${API_URL}/sales_activities/${act.id}`;

        if (!navigator.onLine) {
            addToQueue({ url, method: 'PATCH', body: JSON.stringify(body) });
            return;
        }

        try {
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Échec');
        } catch {
            toast.error(t('error.save'));
            fetchVisit();
        }
    };

    // ── Clôturer ──
    const handleClose = async () => {
        if (!confirm(t('detail.close_confirm'))) return;
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
            toast.success(t('detail.closed_ok'));
            fetchVisit();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setClosing(false);
        }
    };

    // ── Delete audit ──
    const deletePriceAudit = async (pa: PriceAudit) => {
        if (!confirm(t('price.delete_confirm'))) return;
        try {
            const res = await fetch(`${API_URL}/price_audits/${pa.id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erreur');
            toast.success(t('price.deleted'));
            fetchVisit();
        } catch (err: any) { toast.error(err.message); }
    };

    const deleteStockAudit = async (sa: StockAudit) => {
        if (!confirm(t('stock.delete_confirm'))) return;
        try {
            const res = await fetch(`${API_URL}/stock_audits/${sa.id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erreur');
            toast.success(t('stock.deleted'));
            fetchVisit();
        } catch (err: any) { toast.error(err.message); }
    };

    const deletePreOrder = async (po: PreOrder) => {
        if (!confirm(t('order.delete_confirm'))) return;
        try {
            const res = await fetch(`${API_URL}/pre_orders/${po.id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erreur');
            toast.success(t('order.deleted'));
            fetchVisit();
        } catch (err: any) { toast.error(err.message); }
    };

    // ── Order workflow ──
    const handleOrderAction = async (po: PreOrder, action: 'confirm' | 'deliver' | 'cancel') => {
        const confirmKeys = {
            confirm: 'order.confirm_confirm' as const,
            deliver: 'order.deliver_confirm' as const,
            cancel: 'order.cancel_confirm' as const,
        };
        const okKeys = {
            confirm: 'order.confirmed_ok' as const,
            deliver: 'order.delivered_ok' as const,
            cancel: 'order.cancelled_ok' as const,
        };
        if (!confirm(t(confirmKeys[action]))) return;
        try {
            let url = `${API_URL}/pre-orders/${po.id}/${action}`;
            const body: any = {};
            if (action === 'cancel') {
                const reason = prompt(t('order.cancel_reason'));
                if (reason) body.cancellationReason = reason;
            }
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur');
            }
            toast.success(t(okKeys[action]));
            fetchVisit();
        } catch (err: any) { toast.error(err.message); }
    };

    // ── Delete photo ──
    const deletePhoto = async (photo: SalesPhoto) => {
        if (!confirm(t('photo.delete_confirm'))) return;
        try {
            const res = await fetch(`${API_URL}/sales_photos/${photo.id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erreur');
            toast.success(t('photo.deleted'));
            fetchVisit();
        } catch (err: any) { toast.error(err.message); }
    };

    // ── Démarrage visite ──
    const handleStart = async () => {
        if (!confirm(t('detail.start_confirm'))) return;
        setClosing(true);
        try {
            const res = await fetch(`${API_URL}/sales-visits/${id}/start`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur');
            }
            toast.success(t('detail.started'));
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
            <Link href="/dashboard/sales/visits" className="text-sm text-gray-500 hover:text-gray-700">&larr; {t('detail.back')}</Link>

            {/* ── HEADER ── */}
            <div className={`p-6 rounded-xl shadow-sm border ${visit.closed ? 'bg-gray-50 border-gray-200' : 'bg-white border-emerald-200'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {t('detail.title')}
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                visit.closed ? 'bg-gray-200 text-gray-600' :
                                visit.visitedAt ? 'bg-emerald-100 text-emerald-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {visit.closed ? t('detail.closed') : visit.visitedAt ? t('detail.in_progress') : t('detail.planned')}
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
                    {isOpen && !visit.visitedAt && (
                        <button onClick={handleStart} disabled={closing}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                            {closing ? t('saving') : t('detail.start_btn')}
                        </button>
                    )}
                    {isOpen && visit.visitedAt && (
                        <button onClick={handleClose} disabled={closing}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                            {closing ? t('saving') : t('detail.close_btn')}
                        </button>
                    )}
                </div>
                {visit.objective && <p className="mt-3 text-sm text-gray-700 italic">🎯 {visit.objective}</p>}
                {visit.generalComment && <p className="mt-1 text-xs text-gray-500">💬 {visit.generalComment}</p>}
            </div>

            {/* ── ACTIVITIES CHECKLIST ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex justify-between">
                    {t('checklist.title')}
                    <span className="text-xs text-gray-400 font-normal">{t('checklist.progress', { done: completedActs, total: totalActs })}</span>
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm font-bold text-gray-700">{t('price.title')} ({visit.priceAudits.length})</h2>
                    {isOpen && !showPriceForm && !editingPrice && (
                        <button onClick={() => setShowPriceForm(true)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                            {t('price.add')}
                        </button>
                    )}
                </div>

                {showPriceForm && (
                    <PriceAuditForm visitId={visit.id} visitIri={visitIri}
                        onSaved={() => { setShowPriceForm(false); fetchVisit(); }}
                        onCancel={() => setShowPriceForm(false)}
                        disabled={!isOpen} addToQueue={addToQueue} />
                )}

                {editingPrice && (
                    <PriceAuditForm visitId={visit.id} visitIri={visitIri} existing={editingPrice}
                        onSaved={() => { setEditingPrice(null); fetchVisit(); }}
                        onCancel={() => setEditingPrice(null)}
                        disabled={!isOpen} addToQueue={addToQueue} />
                )}

                {visit.priceAudits.length > 0 && (
                    <div className="overflow-x-auto mt-3">
                        <table className="w-full text-xs">
                            <thead><tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">Produit</th><th className="pb-2">Attendu</th><th className="pb-2">Observé</th>
                                <th className="pb-2">Écart</th><th className="pb-2">Conforme</th><th className="pb-2">Concurrents</th>
                                {isOpen && <th className="pb-2 w-8"></th>}
                            </tr></thead>
                            <tbody>
                                {visit.priceAudits.map(pa => {
                                    const ecart = pa.observedPrice - (pa.expectedPrice || 0);
                                    const concurrents = [pa.competitor1Name, pa.competitor2Name, pa.competitor3Name].filter(Boolean);
                                    return (
                                        <tr key={pa.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="py-2 font-medium">{pa.productName}</td>
                                            <td className="py-2">{pa.expectedPrice?.toLocaleString() || '-'}</td>
                                            <td className="py-2">{pa.observedPrice?.toLocaleString()}</td>
                                            <td className={`py-2 ${ecart > 0 ? 'text-red-600' : ecart < 0 ? 'text-green-600' : ''}`}>
                                                {ecart > 0 ? '+' : ''}{ecart.toLocaleString()}
                                            </td>
                                            <td className="py-2">{pa.priceCompliance ? '✅' : '❌'}</td>
                                            <td className="py-2 text-gray-500">{concurrents.join(', ') || '-'}</td>
                                            {isOpen && (
                                                <td className="py-2">
                                                    <button onClick={() => setEditingPrice(pa)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs">✏️</button>
                                                    <button onClick={() => deletePriceAudit(pa)}
                                                        className="text-red-600 hover:text-red-800 text-xs ml-1">🗑️</button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── STOCK AUDITS ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm font-bold text-gray-700">{t('stock.title')} ({visit.stockAudits.length})</h2>
                    {isOpen && !showStockForm && !editingStock && (
                        <button onClick={() => setShowStockForm(true)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                            {t('stock.add')}
                        </button>
                    )}
                </div>

                {showStockForm && (
                    <StockAuditForm visitId={visit.id} visitIri={visitIri}
                        onSaved={() => { setShowStockForm(false); fetchVisit(); }}
                        onCancel={() => setShowStockForm(false)}
                        disabled={!isOpen} addToQueue={addToQueue} />
                )}

                {editingStock && (
                    <StockAuditForm visitId={visit.id} visitIri={visitIri} existing={editingStock}
                        onSaved={() => { setEditingStock(null); fetchVisit(); }}
                        onCancel={() => setEditingStock(null)}
                        disabled={!isOpen} addToQueue={addToQueue} />
                )}

                {visit.stockAudits.length > 0 && (
                    <div className="overflow-x-auto mt-3">
                        <table className="w-full text-xs">
                            <thead><tr className="text-left text-gray-500 border-b">
                                <th className="pb-2">Produit</th><th className="pb-2">Qté</th><th className="pb-2">Must</th>
                                <th className="pb-2">Rupture</th><th className="pb-2">FIFO</th><th className="pb-2">Fraîcheur</th>
                                <th className="pb-2">Emballage</th>
                                {isOpen && <th className="pb-2 w-8"></th>}
                            </tr></thead>
                            <tbody>
                                {visit.stockAudits.map(sa => (
                                    <tr key={sa.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-2 font-medium">{sa.productName}</td>
                                        <td className="py-2">{sa.stockQuantity ?? '-'} {sa.stockUnit}</td>
                                        <td className="py-2">{sa.isMustStock ? '⭐' : '-'}</td>
                                        <td className={`py-2 ${sa.isOutOfStock ? 'text-red-600 font-bold' : ''}`}>{sa.isOutOfStock ? '🚫 OUI' : 'Non'}</td>
                                        <td className="py-2">{sa.isFifoCompliant ? '✅' : '⚠️'}</td>
                                        <td className="py-2">{sa.freshnessScore ? '⭐'.repeat(sa.freshnessScore) : '-'}</td>
                                        <td className="py-2">{sa.packagingIntact ? '✅' : '📦⚠️'}</td>
                                        {isOpen && (
                                            <td className="py-2">
                                                <button onClick={() => setEditingStock(sa)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs">✏️</button>
                                                <button onClick={() => deleteStockAudit(sa)}
                                                    className="text-red-600 hover:text-red-800 text-xs ml-1">🗑️</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── QUALITY + VISIBILITY ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QUALITY */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">{t('quality.title')}</h2>
                    {visit.qualityAudit ? (
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between"><span>Sacs endommagés</span> <span className="font-bold">{visit.qualityAudit.damagedBagsCount ?? 0} ({visit.qualityAudit.damagedBagsRate ?? 0}%)</span></div>
                            <div className="flex justify-between"><span>Sur palettes</span> <span>{visit.qualityAudit.storageOnPallets ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Zone sèche</span> <span>{visit.qualityAudit.storageDryArea ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Stock protégé</span> <span>{visit.qualityAudit.storageProtected ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Nuisibles</span> <span className={visit.qualityAudit.pestPresence ? 'text-red-600 font-bold' : ''}>{visit.qualityAudit.pestPresence ? '🐀 OUI' : '✅'}</span></div>
                            <div className="flex justify-between"><span>Moisissures</span> <span className={visit.qualityAudit.moldPresence ? 'text-red-600 font-bold' : ''}>{visit.qualityAudit.moldPresence ? '⚠️ OUI' : '✅'}</span></div>
                            <div className="flex justify-between"><span>Propreté</span> <span className="font-bold">{visit.qualityAudit.cleanlinessScore}/5</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold">Score global</span> <span className="font-bold text-lg">{visit.qualityAudit.overallQualityScore}/5</span></div>
                            {isOpen && (
                                <button onClick={() => setShowQualityForm(true)}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-bold">✏️ Modifier</button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-gray-400 mb-2">Aucun audit qualité enregistré</p>
                            {isOpen && !showQualityForm && (
                                <button onClick={() => setShowQualityForm(true)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                                    + Audit qualité
                                </button>
                            )}
                        </div>
                    )}
                    {showQualityForm && (
                        <div className="mt-3">
                            <QualityAuditForm visitId={visit.id} visitIri={visitIri} existing={visit.qualityAudit}
                                onSaved={() => { setShowQualityForm(false); fetchVisit(); }}
                                onCancel={() => setShowQualityForm(false)}
                                disabled={!isOpen} addToQueue={addToQueue} />
                        </div>
                    )}
                </div>

                {/* VISIBILITY */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">{t('visibility.title')}</h2>
                    {visit.visibilityAudit ? (
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between"><span>Affiches</span> <span>{visit.visibilityAudit.hasPosters ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Banderoles</span> <span>{visit.visibilityAudit.hasBanners ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Calendriers</span> <span>{visit.visibilityAudit.hasCalendars ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Sacs brandés</span> <span>{visit.visibilityAudit.hasBrandedSacs ? '✅' : '❌'}</span></div>
                            <div className="flex justify-between"><span>Enseigne visible</span> <span>{visit.visibilityAudit.signageVisible ? '✅' : '❌'}</span></div>
                            {visit.visibilityAudit.brandedItems?.length ? <div className="flex justify-between"><span>Goodies</span> <span>{visit.visibilityAudit.brandedItems.join(', ')}</span></div> : null}
                            <div className="flex justify-between"><span>Part visibilité</span> <span className="font-bold">{visit.visibilityAudit.ourVisibilityPercent}%</span></div>
                            <div className="flex justify-between border-t pt-1 mt-1"><span className="font-bold">Score global</span> <span className="font-bold text-lg">{visit.visibilityAudit.overallVisibilityScore}/5</span></div>
                            {isOpen && (
                                <button onClick={() => setShowVisibilityForm(true)}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-bold">✏️ Modifier</button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-gray-400 mb-2">Aucun audit visibilité enregistré</p>
                            {isOpen && !showVisibilityForm && (
                                <button onClick={() => setShowVisibilityForm(true)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                                    + Audit visibilité
                                </button>
                            )}
                        </div>
                    )}
                    {showVisibilityForm && (
                        <div className="mt-3">
                            <VisibilityAuditForm visitId={visit.id} visitIri={visitIri} existing={visit.visibilityAudit}
                                onSaved={() => { setShowVisibilityForm(false); fetchVisit(); }}
                                onCancel={() => setShowVisibilityForm(false)}
                                disabled={!isOpen} addToQueue={addToQueue} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── PRE-ORDERS ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm font-bold text-gray-700">{t('order.title')} ({visit.preOrders.length})</h2>
                    {isOpen && !showOrderForm && !editingOrder && (
                        <button onClick={() => setShowOrderForm(true)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                            {t('order.add')}
                        </button>
                    )}
                </div>

                {showOrderForm && (
                    <PreOrderForm visitId={visit.id} visitIri={visitIri} customerIri={customerIri}
                        onSaved={() => { setShowOrderForm(false); fetchVisit(); }}
                        onCancel={() => setShowOrderForm(false)}
                        disabled={!isOpen} addToQueue={addToQueue} />
                )}

                {editingOrder && (
                    <PreOrderForm visitId={visit.id} visitIri={visitIri} customerIri={customerIri} existing={editingOrder}
                        onSaved={() => { setEditingOrder(null); fetchVisit(); }}
                        onCancel={() => setEditingOrder(null)}
                        disabled={!isOpen} addToQueue={addToQueue} />
                )}

                {visit.preOrders.length > 0 && (
                    <div className="space-y-2 mt-3">
                        {visit.preOrders.map(po => (
                            <div key={po.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                <div>
                                    <span className="font-medium">{po.productName}</span>
                                    <span className="text-gray-500 ml-2">{po.quantity} {po.unit} × {po.unitPrice?.toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                            po.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                            po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                            po.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {ORDER_STATUS_LABELS[po.status] || po.status}
                                        </span>
                                        <div className="text-xs font-bold text-gray-900 mt-0.5">{po.totalValue?.toLocaleString()} FCFA</div>
                                    </div>
                                    {isOpen && (
                                        <div className="flex gap-1 flex-wrap">
                                            {po.status === 'PREORDER' && (
                                                <>
                                                    <button onClick={() => handleOrderAction(po, 'confirm')}
                                                        className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold hover:bg-blue-200">
                                                        ✅ Confirmer
                                                    </button>
                                                    <button onClick={() => handleOrderAction(po, 'cancel')}
                                                        className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold hover:bg-red-200">
                                                        ❌ Annuler
                                                    </button>
                                                </>
                                            )}
                                            {po.status === 'CONFIRMED' && (
                                                <>
                                                    <button onClick={() => handleOrderAction(po, 'deliver')}
                                                        className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold hover:bg-emerald-200">
                                                        🚚 Livrer
                                                    </button>
                                                    <button onClick={() => handleOrderAction(po, 'cancel')}
                                                        className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold hover:bg-red-200">
                                                        ❌ Annuler
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => setEditingOrder(po)}
                                                className="text-blue-600 hover:text-blue-800 text-xs" title="Modifier">✏️</button>
                                            <button onClick={() => deletePreOrder(po)}
                                                className="text-red-600 hover:text-red-800 text-xs" title="Supprimer">🗑️</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── PHOTOS ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-sm font-bold text-gray-700 mb-3">{t('photo.title')} ({visit.photos.length})</h2>

                <SalesPhotoUpload visitId={visit.id} onPhotoAdded={fetchVisit}
                    disabled={!isOpen} addToQueue={addToQueue} />

                {visit.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {visit.photos.map(photo => (
                            <div key={photo.id} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 relative group cursor-pointer"
                                onClick={() => setLightboxUrl(`${BASE_URL}${photo.contentUrl}`)}>
                                <img src={`${BASE_URL}${photo.contentUrl}`} alt={photo.caption || 'Photo'}
                                    className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] p-0.5 truncate">
                                    {photo.category} {photo.caption ? `• ${photo.caption}` : ''}
                                </div>
                                {isOpen && (
                                    <button onClick={(e) => { e.stopPropagation(); deletePhoto(photo); }}
                                        className="absolute top-0.5 right-0.5 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                        title="Supprimer">
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── LIGHTBOX ── */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}>
                    <button onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 z-50">
                        ✕
                    </button>
                    <img src={lightboxUrl} alt="Photo"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
