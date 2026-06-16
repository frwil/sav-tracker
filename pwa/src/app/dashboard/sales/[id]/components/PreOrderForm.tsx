'use client';

import { useState } from 'react';
import { PreOrder, ORDER_STATUS_LABELS } from '@/types/sales';
import toast from 'react-hot-toast';

interface PreOrderFormProps {
    visitId: number;
    visitIri: string;
    customerIri: string;
    existing?: PreOrder | null;
    onSaved: () => void;
    onCancel: () => void;
    disabled?: boolean;
    addToQueue?: (task: { url: string; method: string; body: any }) => void;
}

const emptyForm = {
    productCode: '',
    productName: '',
    quantity: '',
    unit: 'SAC',
    unitPrice: '',
    status: 'PREORDER' as const,
    expectedDeliveryAt: '',
    comment: '',
};

export default function PreOrderForm({ visitId, visitIri, customerIri, existing, onSaved, onCancel, disabled, addToQueue }: PreOrderFormProps) {
    const [form, setForm] = useState(() => {
        if (existing) {
            return {
                productCode: existing.productCode || '',
                productName: existing.productName || '',
                quantity: existing.quantity?.toString() || '',
                unit: existing.unit || 'SAC',
                unitPrice: existing.unitPrice?.toString() || '',
                status: existing.status || 'PREORDER',
                expectedDeliveryAt: existing.expectedDeliveryAt?.substring(0, 10) || '',
                comment: existing.comment || '',
            };
        }
        return emptyForm;
    });
    const [saving, setSaving] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    const isEdit = !!existing;
    const url = isEdit ? `${API_URL}/pre_orders/${existing!.id}` : `${API_URL}/pre_orders`;
    const method = isEdit ? 'PATCH' : 'POST';

    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const totalValue = (parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0);

    const buildBody = () => {
        const body: any = {
            productCode: form.productCode.trim(),
            productName: form.productName.trim(),
            quantity: parseFloat(form.quantity) || 0,
            unit: form.unit,
            unitPrice: parseFloat(form.unitPrice) || 0,
            totalValue,
            status: form.status,
            comment: form.comment.trim() || null,
            visit: visitIri,
            customer: customerIri,
        };
        if (form.expectedDeliveryAt) body.expectedDeliveryAt = new Date(form.expectedDeliveryAt).toISOString();
        return body;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.productCode.trim() || !form.productName.trim()) {
            toast.error('Code produit et nom requis');
            return;
        }
        if (!form.quantity || parseFloat(form.quantity) <= 0) {
            toast.error('Quantité requise');
            return;
        }
        if (!form.unitPrice || parseFloat(form.unitPrice) <= 0) {
            toast.error('Prix unitaire requis');
            return;
        }

        setSaving(true);
        const body = buildBody();

        if (!navigator.onLine && addToQueue) {
            addToQueue({ url, method, body: JSON.stringify(body) });
            toast.success('Commande ajoutée à la file d\'attente');
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
            toast.success(isEdit ? 'Commande mise à jour' : 'Commande enregistrée');
            onSaved();
        } catch (err: any) {
            if (err.message?.includes('Network') && addToQueue) {
                addToQueue({ url, method, body: JSON.stringify(body) });
                toast.success('Commande ajoutée à la file d\'attente');
                onSaved();
                return;
            }
            toast.error(err.message || 'Erreur');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existing || !confirm('Supprimer cette commande ?')) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/pre_orders/${existing.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur suppression');
            toast.success('Commande supprimée');
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
                    {isEdit ? '✏️ Modifier la commande' : '📝 Nouvelle commande'}
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
                    <label className="text-[10px] text-gray-500 block">Quantité *</label>
                    <input type="number" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)}
                        required className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Ex: 50" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Unité</label>
                    <select value={form.unit} onChange={e => handleChange('unit', e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900">
                        <option value="SAC">Sac</option>
                        <option value="KG">Kg</option>
                        <option value="TONNE">Tonne</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Prix unitaire * (FCFA)</label>
                    <input type="number" value={form.unitPrice} onChange={e => handleChange('unitPrice', e.target.value)}
                        required className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="FCFA" />
                </div>
                {isEdit && (
                    <div>
                        <label className="text-[10px] text-gray-500 block">Statut</label>
                        <div className="w-full border rounded p-1.5 text-xs bg-gray-100 text-gray-700 font-bold">
                            {ORDER_STATUS_LABELS[form.status] || form.status}
                        </div>
                    </div>
                )}
                <div>
                    <label className="text-[10px] text-gray-500 block">Livraison prévue</label>
                    <input type="date" value={form.expectedDeliveryAt} onChange={e => handleChange('expectedDeliveryAt', e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Total estimé</label>
                    <div className="w-full border rounded p-1.5 text-xs bg-gray-100 text-gray-900 font-bold">
                        {totalValue.toLocaleString()} FCFA
                    </div>
                </div>
            </div>

            <div>
                <label className="text-[10px] text-gray-500 block">Commentaire</label>
                <input type="text" value={form.comment} onChange={e => handleChange('comment', e.target.value)}
                    className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="Délai, conditions particulières..." />
            </div>

            <button type="submit" disabled={saving || disabled}
                className={`w-full py-2 rounded-lg text-xs font-bold text-white transition ${
                    saving || disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                {saving ? '⏳...' : isEdit ? '💾 Mettre à jour' : '📝 Enregistrer la commande'}
            </button>
        </form>
    );
}
