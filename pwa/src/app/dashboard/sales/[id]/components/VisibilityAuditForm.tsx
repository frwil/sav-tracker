'use client';

import { useState } from 'react';
import { VisibilityAudit } from '@/types/sales';
import { useTranslation } from '@/i18n/I18nProvider';
import toast from 'react-hot-toast';

interface VisibilityAuditFormProps {
    visitId: number; visitIri: string;
    existing?: VisibilityAudit | null; onSaved: () => void; onCancel: () => void;
    disabled?: boolean; addToQueue?: (task: { url: string; method: string; body: any }) => void;
}

const GOODIES_KEYS = ['TENUES', 'CASQUETTES', 'TABLIERS', 'AFFICHES', 'BANDEROLES', 'CALENDRIERS', 'AUTRES'] as const;

export default function VisibilityAuditForm({ visitId, visitIri, existing, onSaved, onCancel, disabled, addToQueue }: VisibilityAuditFormProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState(() => ({
        hasPosters: existing?.hasPosters || false, hasBanners: existing?.hasBanners || false, hasCalendars: existing?.hasCalendars || false,
        hasBrandedSacs: existing?.hasBrandedSacs || false, signageVisible: existing?.signageVisible || false,
        brandedItems: (existing?.brandedItems || []) as string[],
        ourVisibilityPercent: existing?.ourVisibilityPercent?.toString() || '', overallVisibilityScore: existing?.overallVisibilityScore?.toString() || '', comment: existing?.comment || '',
    }));
    const [saving, setSaving] = useState(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
    const isEdit = !!existing;
    const url = isEdit ? `${API_URL}/visibility_audits/${existing!.id}` : `${API_URL}/visibility_audits`;
    const method = isEdit ? 'PATCH' : 'POST';
    const handleChange = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
    const toggleGoodie = (item: string) => setForm(prev => ({ ...prev, brandedItems: prev.brandedItems.includes(item) ? prev.brandedItems.filter(i => i !== item) : [...prev.brandedItems, item] }));

    const buildBody = () => {
        const body: any = { hasPosters: form.hasPosters, hasBanners: form.hasBanners, hasCalendars: form.hasCalendars, hasBrandedSacs: form.hasBrandedSacs, signageVisible: form.signageVisible, brandedItems: form.brandedItems, comment: form.comment.trim() || null, visit: visitIri };
        if (form.ourVisibilityPercent) body.ourVisibilityPercent = parseInt(form.ourVisibilityPercent);
        if (form.overallVisibilityScore) body.overallVisibilityScore = parseInt(form.overallVisibilityScore);
        return body;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); const body = buildBody();
        if (!navigator.onLine && addToQueue) { addToQueue({ url, method, body: JSON.stringify(body) }); toast.success(t('visibility.queued')); setSaving(false); onSaved(); return; }
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': isEdit ? 'application/merge-patch+json' : 'application/ld+json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err['hydra:description'] || err.detail || 'Erreur'); }
            toast.success(isEdit ? t('visibility.updated') : t('visibility.created')); onSaved();
        } catch (err: any) {
            if (err.message?.includes('Network') && addToQueue) { addToQueue({ url, method, body: JSON.stringify(body) }); toast.success(t('visibility.queued')); onSaved(); return; }
            toast.error(err.message || t('error.generic'));
        } finally { setSaving(false); }
    };

    const handleDelete = async () => { if (!existing || !confirm(t('visibility.delete_confirm'))) return; setSaving(true);
        try { const res = await fetch(`${API_URL}/visibility_audits/${existing.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error('Erreur suppression'); toast.success(t('visibility.deleted')); onSaved(); } catch (err: any) { toast.error(err.message); } finally { setSaving(false); } };

    const goodieLabel = (item: string) => t(`visibility.goodie_${item.toLowerCase()}` as any) || item;

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-700">{isEdit ? t('visibility.edit_title') : t('visibility.new_title')}</h4>
                <div className="flex gap-2">{isEdit && <button type="button" onClick={handleDelete} disabled={saving || disabled} className="text-[10px] text-red-600 hover:text-red-800 font-bold">{t('delete')}</button>}<button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">{t('cancel')}</button></div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.hasPosters} onChange={e => handleChange('hasPosters', e.target.checked)} className="rounded" />🖼️ {t('visibility.posters')}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.hasBanners} onChange={e => handleChange('hasBanners', e.target.checked)} className="rounded" />🏳️ {t('visibility.banners')}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.hasCalendars} onChange={e => handleChange('hasCalendars', e.target.checked)} className="rounded" />📅 {t('visibility.calendars')}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.hasBrandedSacs} onChange={e => handleChange('hasBrandedSacs', e.target.checked)} className="rounded" />🛍️ {t('visibility.branded_sacs')}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.signageVisible} onChange={e => handleChange('signageVisible', e.target.checked)} className="rounded" />🏪 {t('visibility.signage')}</label>
            </div>
            <div>
                <label className="text-[10px] text-gray-500 block mb-1">{t('visibility.goodies')}</label>
                <div className="flex flex-wrap gap-1">{GOODIES_KEYS.map(item => (
                    <button key={item} type="button" onClick={() => toggleGoodie(item)}
                        className={`text-[10px] px-2 py-1 rounded-full border transition ${form.brandedItems.includes(item) ? 'bg-purple-100 border-purple-300 text-purple-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}>
                        {goodieLabel(item)}
                    </button>
                ))}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-gray-500 block">{t('visibility.share_pct')}</label><input type="number" min="0" max="100" value={form.ourVisibilityPercent} onChange={e => handleChange('ourVisibilityPercent', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="0-100" /></div>
                <div><label className="text-[10px] text-gray-500 block">{t('quality.overall_score')} (1-5)</label><input type="number" min="1" max="5" value={form.overallVisibilityScore} onChange={e => handleChange('overallVisibilityScore', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="1-5" /></div>
            </div>
            <div><label className="text-[10px] text-gray-500 block">{t('price.comment')}</label><input type="text" value={form.comment} onChange={e => handleChange('comment', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Observations..." /></div>
            <button type="submit" disabled={saving || disabled} className={`w-full py-2 rounded-lg text-xs font-bold text-white transition ${saving || disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{saving ? t('saving') : isEdit ? t('visibility.save') : t('visibility.create')}</button>
        </form>
    );
}
