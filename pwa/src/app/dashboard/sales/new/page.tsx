'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Link from 'next/link';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useTranslation } from '@/i18n/I18nProvider';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────

interface CustomerOption { value: string; label: string; }
interface CustomerData { '@id': string; id: number; name: string; zone: string; type: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Checklist par défaut pour une visite commerciale
const DEFAULT_ACTIVITIES = [
    { type: 'STOCK_CHECK', label: '📦 Vérification stock', order: 0 },
    { type: 'PRICE_CHECK', label: '🏷️ Relevé des prix', order: 1 },
    { type: 'QUALITY_CHECK', label: '✨ Contrôle qualité', order: 2 },
    { type: 'VISIBILITY_CHECK', label: '👁️ Visibilité marque', order: 3 },
    { type: 'ORDER_TAKING', label: '📝 Prise de commande', order: 4 },
    { type: 'MANAGER_INTERVIEW', label: '💬 Entretien gérant', order: 5 },
    { type: 'MERCHANDISING', label: '📐 Merchandising', order: 6 },
    { type: 'PROMO_CHECK', label: '🎯 Vérification promo', order: 7 },
    { type: 'PHOTO_REPORT', label: '📸 Reportage photo', order: 8 },
];

const selectStyles = {
    control: (b: any) => ({ ...b, borderColor: '#d1d5db', minHeight: '42px', backgroundColor: '#fff' }),
    singleValue: (b: any) => ({ ...b, color: '#111827' }),
    input: (b: any) => ({ ...b, color: '#111827' }),
    placeholder: (b: any) => ({ ...b, color: '#9ca3af' }),
    option: (b: any, s: any) => ({ ...b, color: '#111827', backgroundColor: s.isSelected ? '#e0e7ff' : s.isFocused ? '#f3f4f6' : '#fff' }),
    menu: (b: any) => ({ ...b, backgroundColor: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }),
};

// ─── Composant ────────────────────────────────────────────────

export default function NewSalesVisitPage() {
    const router = useRouter();
    const { t } = useTranslation();

    // Step
    const [step, setStep] = useState(1);

    // Step 1: Customer
    const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    // Step 2: Visit details
    const [objective, setObjective] = useState('');
    const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Geolocation
    const { coordinates: gps, isLoading: isGeolocating, error: gpsError, locate } = useGeolocation({ timeout: 10000 });

    // ── Load feed stores ──
    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        if (!token) { router.push('/'); return; }
        // Vérifier le rôle
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const roles: string[] = payload.roles || [];
            if (!roles.includes('ROLE_SALES_REP') && !roles.includes('ROLE_ADMIN') && !roles.includes('ROLE_SUPER_ADMIN')) {
                router.push('/dashboard'); return;
            }
        } catch { router.push('/'); return; }

        // Charger les provenderies (type = FEED_STORE ou BOTH)
        fetch(`${API_URL}/customers?type=FEED_STORE&activated=true&itemsPerPage=50`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/ld+json' }
        })
        .then(r => r.json())
        .then(d => {
            const members: CustomerData[] = d.member || [];
            const opts = members.map(c => ({ value: `/api/customers/${c.id}`, label: `${c.name} (${c.zone})` }));
            setCustomerOptions(opts);
        })
        .catch(() => toast.error(t('error.load_stats')))
        .finally(() => setLoadingCustomers(false));

        // Charger aussi les BOTH
        fetch(`${API_URL}/customers?type=BOTH&activated=true&itemsPerPage=20`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/ld+json' }
        })
        .then(r => r.json())
        .then(d => {
            const members: CustomerData[] = d.member || [];
            const opts = members.map(c => ({ value: `/api/customers/${c.id}`, label: `${c.name} (${c.zone}) 🏪🐔` }));
            setCustomerOptions(prev => [...prev, ...opts]);
        })
        .catch(() => {});
    }, [router]);

    // ── Geolocate on step 3 ──
    useEffect(() => {
        if (step === 2 && !gps && !isGeolocating) locate();
    }, [step]);

    // ── Submit ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedCustomer) { setError(t('new_visit.select_first')); return; }
        if (!objective.trim()) { setError(t('new_visit.objective_required')); return; }

        setIsSubmitting(true);
        const token = localStorage.getItem('sav_token');

        const payload = {
            customer: selectedCustomer.value,
            objective: objective.trim(),
            plannedAt: new Date(plannedDate + 'T08:00:00').toISOString(),
            gpsCoordinates: gps || null,
            activated: true,
            closed: false,
        };

        try {
            // 1. Créer la visite
            const res = await fetch(`${API_URL}/sales_visits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/ld+json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err['hydra:description'] || err.detail || t('new_visit.error'));
            }

            const visit = await res.json();
            const visitId = visit.id;

            // 2. Créer les activités de la check-list
            const actPromises = DEFAULT_ACTIVITIES.map(act =>
                fetch(`${API_URL}/sales_activities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/ld+json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        visit: `/api/sales_visits/${visitId}`,
                        activityType: act.type,
                        sortOrder: act.order,
                        isCompleted: false,
                    }),
                })
            );

            await Promise.all(actPromises);
            toast.success(t('new_visit.created', { count: DEFAULT_ACTIVITIES.length }));
            router.push(`/dashboard/sales`);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <Link href="/dashboard/sales" className="text-sm text-gray-500 hover:text-gray-700">&larr; {t('new_visit.back')}</Link>
            <h1 className="text-2xl font-bold text-gray-900">{t('new_visit.title')}</h1>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-6">
                <div className={`h-2 flex-1 rounded transition-colors ${step >= 1 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                <div className={`h-2 flex-1 rounded transition-colors ${step >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            </div>

            {/* ── STEP 1: Customer ── */}
            {step === 1 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('new_visit.step1_label')}</label>
                    <Select
                        options={customerOptions}
                        isLoading={loadingCustomers}
                        value={selectedCustomer}
                        onChange={(v) => setSelectedCustomer(v as CustomerOption)}
                        placeholder={t('new_visit.search_placeholder')}
                        styles={selectStyles}
                        className="text-sm"
                        noOptionsMessage={() => t('new_visit.no_customer')}
                    />
                    <button
                        onClick={() => { if (selectedCustomer) setStep(2); else toast.error(t('new_visit.select_first')); }}
                        disabled={!selectedCustomer}
                        className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition ${
                            !selectedCustomer ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                    >
                        {t('new_visit.next')}
                    </button>
                </div>
            )}

            {/* ── STEP 2: Visit Form ── */}
            {step === 2 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        {t('new_visit.step2_title')}
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{selectedCustomer?.label}</span>
                    </h2>

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('new_visit.planned_date')}</label>
                            <input type="date" value={plannedDate}
                                onChange={e => setPlannedDate(e.target.value)}
                                className="w-full border p-2 rounded-lg text-sm text-gray-900 bg-white" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('new_visit.objective_label')}</label>
                            <textarea required rows={3}
                                className="w-full rounded-lg border p-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder={t('new_visit.objective_placeholder')}
                                value={objective} onChange={e => setObjective(e.target.value)} />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('new_visit.gps_label')}</label>
                            <div className="relative">
                                <input type="text" readOnly
                                    className={`w-full rounded-lg border border-gray-300 bg-gray-100 p-2 text-sm pr-10 ${
                                        isGeolocating ? 'text-blue-600 italic' : gpsError ? 'text-red-500' : gps ? 'text-green-700 font-bold' : ''
                                    }`}
                                    value={isGeolocating ? t('new_visit.gps_acquiring') : gps || gpsError || t('new_visit.gps_pending')} />
                                <div className="absolute right-3 top-2">
                                    {isGeolocating ? <span className="animate-spin">⏳</span>
                                    : gps ? <span title="Position obtenue">✅</span>
                                    : gpsError ? <button type="button" onClick={locate} title="Réessayer" className="text-orange-500 font-bold">🔄</button>
                                    : <span>📍</span>}
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                                {gpsError ? `⚠️ ${gpsError}` : t('new_visit.gps_hint')}
                            </p>
                        </div>

                        {/* ── Checklist prévisionnelle ── */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {t('new_visit.checklist_label')}
                                <span className="text-gray-400 font-normal ml-1">{t('new_visit.checklist_auto')}</span>
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-1">
                                {DEFAULT_ACTIVITIES.map(act => (
                                    <div key={act.type} className="flex items-center gap-2 text-xs text-gray-600 py-1">
                                        <span className="text-gray-400">⬜</span> {act.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setStep(1)}
                                className="text-gray-500 font-medium text-sm px-4 py-2 hover:text-gray-700">{t('new_visit.back_btn')}</button>
                            <button type="submit" disabled={isSubmitting}
                                className={`px-8 py-3 rounded-lg font-bold text-white shadow-lg transition ${
                                    isSubmitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}>
                                {isSubmitting ? t('new_visit.creating') : t('new_visit.create_btn')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
