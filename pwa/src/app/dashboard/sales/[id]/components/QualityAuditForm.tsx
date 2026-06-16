'use client';

import { useState } from 'react';
import { QualityAudit } from '@/types/sales';
import toast from 'react-hot-toast';

interface QualityAuditFormProps {
    visitId: number;
    visitIri: string;
    existing?: QualityAudit | null;
    onSaved: () => void;
    onCancel: () => void;
    disabled?: boolean;
    addToQueue?: (task: { url: string; method: string; body: any }) => void;
}

export default function QualityAuditForm({ visitId, visitIri, existing, onSaved, onCancel, disabled, addToQueue }: QualityAuditFormProps) {
    const [form, setForm] = useState(() => ({
        damagedBagsCount: existing?.damagedBagsCount?.toString() || '',
        damagedBagsRate: existing?.damagedBagsRate?.toString() || '',
        storageOnPallets: existing?.storageOnPallets ?? true,
        storageDryArea: existing?.storageDryArea ?? true,
        storageProtected: existing?.storageProtected ?? true,
        pestPresence: existing?.pestPresence || false,
        moldPresence: existing?.moldPresence || false,
        odorIssue: existing?.odorIssue || false,
        cleanlinessScore: existing?.cleanlinessScore?.toString() || '',
        overallQualityScore: existing?.overallQualityScore?.toString() || '',
        comment: existing?.comment || '',
    }));
    const [saving, setSaving] = useState(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    const isEdit = !!existing;
    const url = isEdit ? `${API_URL}/quality_audits/${existing!.id}` : `${API_URL}/quality_audits`;
    const method = isEdit ? 'PATCH' : 'POST';

    const handleChange = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const buildBody = () => {
        const body: any = {
            storageOnPallets: form.storageOnPallets,
            storageDryArea: form.storageDryArea,
            storageProtected: form.storageProtected,
            pestPresence: form.pestPresence,
            moldPresence: form.moldPresence,
            odorIssue: form.odorIssue,
            comment: form.comment.trim() || null,
            visit: visitIri,
        };
        if (form.damagedBagsCount) body.damagedBagsCount = parseInt(form.damagedBagsCount);
        if (form.damagedBagsRate) body.damagedBagsRate = parseFloat(form.damagedBagsRate);
        if (form.cleanlinessScore) body.cleanlinessScore = parseInt(form.cleanlinessScore);
        if (form.overallQualityScore) body.overallQualityScore = parseInt(form.overallQualityScore);
        return body;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const body = buildBody();

        if (!navigator.onLine && addToQueue) {
            addToQueue({ url, method, body: JSON.stringify(body) });
            toast.success('Audit qualité ajouté à la file d\'attente');
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
            toast.success(isEdit ? 'Audit qualité mis à jour' : 'Audit qualité enregistré');
            onSaved();
        } catch (err: any) {
            if (err.message?.includes('Network') && addToQueue) {
                addToQueue({ url, method, body: JSON.stringify(body) });
                toast.success('Audit qualité ajouté à la file d\'attente');
                onSaved();
                return;
            }
            toast.error(err.message || 'Erreur');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existing || !confirm('Supprimer cet audit qualité ?')) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/quality_audits/${existing.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur suppression');
            toast.success('Audit qualité supprimé');
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
                    {isEdit ? '✏️ Modifier l\'audit qualité' : '✨ Audit qualité du point de vente'}
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

            {/* Sacs endommagés */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-gray-500 block">Nb sacs endommagés</label>
                    <input type="number" value={form.damagedBagsCount} onChange={e => handleChange('damagedBagsCount', e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="0" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Taux avaries (%)</label>
                    <input type="number" step="0.1" value={form.damagedBagsRate} onChange={e => handleChange('damagedBagsRate', e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="0" />
                </div>
            </div>

            {/* Conditions de stockage */}
            <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={form.storageOnPallets} onChange={e => handleChange('storageOnPallets', e.target.checked)} className="rounded" />
                    🏗️ Sur palettes
                </label>
                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={form.storageDryArea} onChange={e => handleChange('storageDryArea', e.target.checked)} className="rounded" />
                    ☀️ Zone sèche
                </label>
                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={form.storageProtected} onChange={e => handleChange('storageProtected', e.target.checked)} className="rounded" />
                    🛡️ Protégé (pluie/soleil)
                </label>
            </div>

            {/* Problèmes */}
            <div className="flex flex-wrap gap-3 text-xs">
                <label className={`flex items-center gap-1 ${form.pestPresence ? 'text-red-600 font-bold' : ''}`}>
                    <input type="checkbox" checked={form.pestPresence} onChange={e => handleChange('pestPresence', e.target.checked)} className="rounded" />
                    🐀 Nuisibles
                </label>
                <label className={`flex items-center gap-1 ${form.moldPresence ? 'text-red-600 font-bold' : ''}`}>
                    <input type="checkbox" checked={form.moldPresence} onChange={e => handleChange('moldPresence', e.target.checked)} className="rounded" />
                    🦠 Moisissures
                </label>
                <label className={`flex items-center gap-1 ${form.odorIssue ? 'text-red-600 font-bold' : ''}`}>
                    <input type="checkbox" checked={form.odorIssue} onChange={e => handleChange('odorIssue', e.target.checked)} className="rounded" />
                    👃 Odeur suspecte
                </label>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-gray-500 block">Propreté (1-5)</label>
                    <input type="number" min="1" max="5" value={form.cleanlinessScore} onChange={e => handleChange('cleanlinessScore', e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="1-5" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 block">Score global (1-5)</label>
                    <input type="number" min="1" max="5" value={form.overallQualityScore} onChange={e => handleChange('overallQualityScore', e.target.value)}
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" placeholder="1-5" />
                </div>
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
                {saving ? '⏳...' : isEdit ? '💾 Mettre à jour' : '✅ Enregistrer l\'audit qualité'}
            </button>
        </form>
    );
}
