'use client';

import { useState } from 'react';
import { PriceAudit } from '@/types/sales';
import toast from 'react-hot-toast';

interface PriceAuditFormProps {
    visitId: number;
    visitIri: string;
    existing?: PriceAudit | null; // null = create mode, object = edit mode
    onSaved: () => void;
    onCancel: () => void;
    disabled?: boolean;
    addToQueue?: (task: { url: string; method: string; body: any }) => void;
}

const emptyForm = {
    productCode: '',
    productName: '',
    expectedPrice: '',
    observedPrice: '',
    competitor1Name: '',
    competitor1Price: '',
    competitor2Name: '',
    competitor2Price: '',
    competitor3Name: '',
    competitor3Price: '',
    isPromoActive: false,
    promoPrice: '',
    comment: '',
};

export default function PriceAuditForm({ visitId, visitIri, existing, onSaved, onCancel, disabled, addToQueue }: PriceAuditFormProps) {
    const [form, setForm] = useState(() => {
        if (existing) {
            return {
                productCode: existing.productCode || '',
                productName: existing.productName || '',
                expectedPrice: existing.expectedPrice?.toString() || '',
                observedPrice: existing.observedPrice?.toString() || '',
                competitor1Name: existing.competitor1Name || '',
                competitor1Price: existing.competitor1Price?.toString() || '',
                competitor2Name: existing.competitor2Name || '',
                competitor2Price: existing.competitor2Price?.toString() || '',
                competitor3Name: existing.competitor3Name || '',
                competitor3Price: existing.competitor3Price?.toString() || '',
                isPromoActive: existing.isPromoActive || false,
                promoPrice: existing.promoPrice?.toString() || '',
                comment: existing.comment || '',
            };
        }
        return emptyForm;
    });
    const [saving, setSaving] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    const isEdit = !!existing;
    const url = isEdit ? `${API_URL}/price_audits/${existing!.id}` : `${API_URL}/price_audits`;
    const method = isEdit ? 'PATCH' : 'POST';

    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const buildBody = () => {
        const body: any = {
            productCode: form.productCode.trim(),
            productName: form.productName.trim(),
            observedPrice: parseFloat(form.observedPrice) || 0,
            isPromoActive: form.isPromoActive,
            comment: form.comment.trim() || null,
            visit: visitIri,
        };
        if (form.expectedPrice) body.expectedPrice = parseFloat(form.expectedPrice);
        if (form.competitor1Name) body.competitor1Name = form.competitor1Name;
        if (form.competitor1Price) body.competitor1Price = parseFloat(form.competitor1Price);
        if (form.competitor2Name) body.competitor2Name = form.competitor2Name;
        if (form.competitor2Price) body.competitor2Price = parseFloat(form.competitor2Price);
        if (form.competitor3Name) body.competitor3Name = form.competitor3Name;
        if (form.competitor3Price) body.competitor3Price = parseFloat(form.competitor3Price);
        if (form.isPromoActive && form.promoPrice) body.promoPrice = parseFloat(form.promoPrice);
        return body;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.productCode.trim() || !form.productName.trim()) {
            toast.error('Code produit et nom requis');
            return;
        }
        if (!form.observedPrice) {
            toast.error('Prix observé requis');
            return;
        }

        setSaving(true);
        const body = buildBody();

        if (!navigator.onLine && addToQueue) {
            addToQueue({ url, method, body: JSON.stringify(body) });
            toast.success('Relevé prix ajouté à la file d\'attente');
            setSaving(false);
            onSaved();
            return;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': isEdit ? 'application/merge-patch+json' : 'application/ld+json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err['hydra:description'] || err.detail || 'Erreur');
            }
            toast.success(isEdit ? 'Relevé prix mis à jour' : 'Relevé prix ajouté');
            onSaved();
        } catch (err: any) {
            if (err.message?.includes('Network') && addToQueue) {
                addToQueue({ url, method, body: JSON.stringify(body) });
                toast.success('Relevé prix ajouté à la file d\'attente');
                onSaved();
                return;
            }
            toast.error(err.message || 'Erreur');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existing || !confirm('Supprimer ce relevé prix ?')) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/price_audits/${existing.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur suppression');
            toast.success('Relevé prix supprimé');
            onSaved();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-700">
                    {isEdit ? '✏️ Modifier le relevé prix' : '🏷️ Nouveau relevé prix'}
                </h4>
                <div className="flex gap-2">
                    {isEdit && (
                        <button type="button" onClick={handleDelete} disabled={saving || disabled}
                            className="text-[10px] text-red-600 hover:text-red-800 font-bold">🗑️</button>
                    )}
                    <button type="button" onClick={onCancel}
                        className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-gray-500 block">Code produit *</label>
                    <input type="text" value={form.productCode} onChange={e => handleChange('productCode', e.target.value)}
                        required className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Ex: ALIM-001" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Nom produit *</label>
                    <input type="text" value={form.productName} onChange={e => handleChange('productName', e.target.value)}
                        required className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Ex: Démarrage 50kg" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Prix attendu (RRP)</label>
                    <input type="number" value={form.expectedPrice} onChange={e => handleChange('expectedPrice', e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="FCFA" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Prix observé *</label>
                    <input type="number" value={form.observedPrice} onChange={e => handleChange('observedPrice', e.target.value)}
                        required className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="FCFA" />
                </div>
            </div>

            {/* Concurrents */}
            <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map(i => (
                    <div key={i} className="space-y-1">
                        <label className="text-[10px] text-gray-400 block">Concurrent {i}</label>
                        <input type="text" value={form[`competitor${i}Name`]} onChange={e => handleChange(`competitor${i}Name`, e.target.value)}
                            className="w-full border rounded p-1 text-[10px] bg-white text-gray-900" placeholder="Nom" />
                        <input type="number" value={form[`competitor${i}Price`]} onChange={e => handleChange(`competitor${i}Price`, e.target.value)}
                            className="w-full border rounded p-1 text-[10px] bg-white text-gray-900" placeholder="Prix FCFA" />
                    </div>
                ))}
            </div>

            {/* Promo */}
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-1 text-xs text-gray-700">
                    <input type="checkbox" checked={form.isPromoActive} onChange={e => handleChange('isPromoActive', e.target.checked)}
                        className="rounded" />
                    Promo active
                </label>
                {form.isPromoActive && (
                    <div>
                        <label className="text-[10px] text-gray-500 block">Prix promo</label>
                        <input type="number" value={form.promoPrice} onChange={e => handleChange('promoPrice', e.target.value)}
                            className="w-28 border rounded p-1 text-xs bg-white text-gray-900" placeholder="FCFA" />
                    </div>
                )}
            </div>

            <div>
                <label className="text-[10px] text-gray-500 block">Commentaire</label>
                <input type="text" value={form.comment} onChange={e => handleChange('comment', e.target.value)}
                    className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Observations..." />
            </div>

            <button type="submit" disabled={saving || disabled}
                className={`w-full py-2 rounded-lg text-xs font-bold text-white transition ${
                    saving || disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                {saving ? '⏳...' : isEdit ? '💾 Mettre à jour' : '➕ Ajouter le relevé'}
            </button>
        </form>
    );
}
