'use client';

import { useState } from 'react';
import { StockAudit } from '@/types/sales';
import { useTranslation } from '@/i18n/I18nProvider';
import toast from 'react-hot-toast';

interface StockAuditFormProps {
    visitId: number; visitIri: string;
    existing?: StockAudit | null; onSaved: () => void; onCancel: () => void;
    disabled?: boolean; addToQueue?: (task: { url: string; method: string; body: any }) => void;
}

export default function StockAuditForm({ visitId, visitIri, existing, onSaved, onCancel, disabled, addToQueue }: StockAuditFormProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState(() => existing ? {
        productCode: existing.productCode || '', productName: existing.productName || '',
        isMustStock: existing.isMustStock || false, stockQuantity: existing.stockQuantity?.toString() || '',
        stockUnit: existing.stockUnit || 'SAC', isOutOfStock: existing.isOutOfStock || false,
        isFifoCompliant: existing.isFifoCompliant ?? true, oldestMfgDate: existing.oldestMfgDate?.substring(0, 10) || '',
        expiryDate: existing.expiryDate?.substring(0, 10) || '', freshnessScore: existing.freshnessScore?.toString() || '',
        packagingIntact: existing.packagingIntact ?? true, comment: existing.comment || '',
    } : { productCode: '', productName: '', isMustStock: false, stockQuantity: '', stockUnit: 'SAC', isOutOfStock: false, isFifoCompliant: true, oldestMfgDate: '', expiryDate: '', freshnessScore: '', packagingIntact: true, comment: '' });
    const [saving, setSaving] = useState(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
    const isEdit = !!existing;
    const url = isEdit ? `${API_URL}/stock_audits/${existing!.id}` : `${API_URL}/stock_audits`;
    const method = isEdit ? 'PATCH' : 'POST';
    const handleChange = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

    const buildBody = () => {
        const body: any = { productCode: form.productCode.trim(), productName: form.productName.trim(), isMustStock: form.isMustStock, stockUnit: form.stockUnit, isOutOfStock: form.isOutOfStock, isFifoCompliant: form.isFifoCompliant, packagingIntact: form.packagingIntact, comment: form.comment.trim() || null, visit: visitIri };
        if (form.stockQuantity) body.stockQuantity = parseFloat(form.stockQuantity);
        if (form.oldestMfgDate) body.oldestMfgDate = new Date(form.oldestMfgDate).toISOString();
        if (form.expiryDate) body.expiryDate = new Date(form.expiryDate).toISOString();
        if (form.freshnessScore) body.freshnessScore = parseInt(form.freshnessScore);
        return body;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.productCode.trim() || !form.productName.trim()) { toast.error(t('price.code_required')); return; }
        setSaving(true); const body = buildBody();
        if (!navigator.onLine && addToQueue) { addToQueue({ url, method, body: JSON.stringify(body) }); toast.success(t('stock.queued')); setSaving(false); onSaved(); return; }
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': isEdit ? 'application/merge-patch+json' : 'application/ld+json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err['hydra:description'] || err.detail || 'Erreur'); }
            toast.success(isEdit ? t('stock.updated') : t('stock.created')); onSaved();
        } catch (err: any) {
            if (err.message?.includes('Network') && addToQueue) { addToQueue({ url, method, body: JSON.stringify(body) }); toast.success(t('stock.queued')); onSaved(); return; }
            toast.error(err.message || t('error.generic'));
        } finally { setSaving(false); }
    };

    const handleDelete = async () => { if (!existing || !confirm(t('stock.delete_confirm'))) return; setSaving(true);
        try { const res = await fetch(`${API_URL}/stock_audits/${existing.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error('Erreur suppression'); toast.success(t('stock.deleted')); onSaved(); } catch (err: any) { toast.error(err.message); } finally { setSaving(false); } };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-700">{isEdit ? t('stock.edit_title') : t('stock.new_title')}</h4>
                <div className="flex gap-2">{isEdit && <button type="button" onClick={handleDelete} disabled={saving || disabled} className="text-[10px] text-red-600 hover:text-red-800 font-bold">{t('delete')}</button>}<button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">{t('cancel')}</button></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-gray-500 block">{t('stock.product_code')}</label><input type="text" value={form.productCode} onChange={e => handleChange('productCode', e.target.value)} required className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Ex: ALIM-001" /></div>
                <div><label className="text-[10px] text-gray-500 block">{t('stock.product_name')}</label><input type="text" value={form.productName} onChange={e => handleChange('productName', e.target.value)} required className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Ex: Démarrage 50kg" /></div>
                <div><label className="text-[10px] text-gray-500 block">{t('stock.quantity')}</label><input type="number" value={form.stockQuantity} onChange={e => handleChange('stockQuantity', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Ex: 150" /></div>
                <div><label className="text-[10px] text-gray-500 block">{t('stock.unit')}</label><select value={form.stockUnit} onChange={e => handleChange('stockUnit', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900"><option value="SAC">{t('stock.unit_sac')}</option><option value="KG">{t('stock.unit_kg')}</option><option value="TONNE">{t('stock.unit_tonne')}</option><option value="PALETTE">{t('stock.unit_palette')}</option></select></div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.isMustStock} onChange={e => handleChange('isMustStock', e.target.checked)} className="rounded" />{t('stock.must_stock')}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.isOutOfStock} onChange={e => handleChange('isOutOfStock', e.target.checked)} className="rounded" />{t('stock.out_of_stock')}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.isFifoCompliant} onChange={e => handleChange('isFifoCompliant', e.target.checked)} className="rounded" />{t('stock.fifo')}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={form.packagingIntact} onChange={e => handleChange('packagingIntact', e.target.checked)} className="rounded" />{t('stock.packaging')}</label>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div><label className="text-[10px] text-gray-500 block">{t('stock.mfg_date')}</label><input type="date" value={form.oldestMfgDate} onChange={e => handleChange('oldestMfgDate', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" /></div>
                <div><label className="text-[10px] text-gray-500 block">{t('stock.expiry')}</label><input type="date" value={form.expiryDate} onChange={e => handleChange('expiryDate', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" /></div>
                <div><label className="text-[10px] text-gray-500 block">{t('stock.freshness_score')}</label><input type="number" min="1" max="5" value={form.freshnessScore} onChange={e => handleChange('freshnessScore', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="1-5" /></div>
            </div>
            <div><label className="text-[10px] text-gray-500 block">{t('stock.comment_ph')}</label><input type="text" value={form.comment} onChange={e => handleChange('comment', e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Observations..." /></div>
            <button type="submit" disabled={saving || disabled} className={`w-full py-2 rounded-lg text-xs font-bold text-white transition ${saving || disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{saving ? t('saving') : isEdit ? t('stock.save') : t('stock.create')}</button>
        </form>
    );
}
