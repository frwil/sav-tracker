'use client';

import { useState, useRef } from 'react';
import { compressImage } from '@/utils/imageCompressor';
import { PHOTO_CATEGORIES } from '@/types/sales';
import toast from 'react-hot-toast';

interface SalesPhotoUploadProps {
    visitId: number;
    disabled?: boolean;
    onPhotoAdded: () => void; // callback to refresh visit data
    addToQueue?: (task: { url: string; method: string; body: any }) => void;
}

interface PendingPhoto {
    content: string; // base64 data URL
    filename: string;
    category: string;
    caption: string;
}

export default function SalesPhotoUpload({ visitId, disabled, onPhotoAdded, addToQueue }: SalesPhotoUploadProps) {
    const [photos, setPhotos] = useState<PendingPhoto[]>([]);
    const [category, setCategory] = useState('GENERAL');
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('sav_token') : null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of Array.from(files)) {
            try {
                const compressed = await compressImage(file);
                setPhotos(prev => [...prev, {
                    content: compressed,
                    filename: file.name,
                    category,
                    caption: caption.trim(),
                }]);
            } catch {
                toast.error(`Erreur compression: ${file.name}`);
            }
        }
        // Reset input for re-upload of same file
        if (fileRef.current) fileRef.current.value = '';
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const uploadPhotos = async () => {
        if (photos.length === 0) { toast.error('Aucune photo à uploader'); return; }
        setUploading(true);

        const body = {
            newPhotos: photos.map(p => ({
                content: p.content,
                filename: p.filename,
                category: p.category,
                caption: p.caption || null,
            })),
        };

        const url = `${API_URL}/sales_visits/${visitId}`;
        const method = 'PATCH';

        // Offline mode
        if (!navigator.onLine && addToQueue) {
            addToQueue({ url, method, body: JSON.stringify(body) });
            toast.success('Photos ajoutées à la file d\'attente');
            setPhotos([]);
            setUploading(false);
            onPhotoAdded();
            return;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/merge-patch+json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err['hydra:description'] || err.detail || 'Erreur upload');
            }

            toast.success(`${photos.length} photo(s) uploadée(s)`);
            setPhotos([]);
            setCaption('');
            onPhotoAdded();
        } catch (err: any) {
            // Fallback to offline queue on network error
            if (err.message?.includes('Network') && addToQueue) {
                addToQueue({ url, method, body: JSON.stringify(body) });
                toast.success('Photos ajoutées à la file d\'attente');
                setPhotos([]);
                onPhotoAdded();
                return;
            }
            toast.error(err.message || 'Erreur upload');
        } finally {
            setUploading(false);
        }
    };

    if (disabled) return null; // Don't show upload when visit is closed

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-end">
                <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Catégorie</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                        className="border rounded p-1.5 text-xs bg-white text-gray-900">
                        {PHOTO_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] text-gray-500 block mb-1">Légende</label>
                    <input type="text" value={caption} onChange={e => setCaption(e.target.value)}
                        placeholder="Ex: Façade du point de vente"
                        className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" />
                </div>
                <label className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition ${
                    disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}>
                    📷 Choisir
                    <input ref={fileRef} type="file" accept="image/*" capture="environment"
                        onChange={handleFileChange} disabled={disabled} className="hidden" multiple />
                </label>
            </div>

            {/* Preview */}
            {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {photos.map((p, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                            <img src={p.content} alt={p.filename} className="w-full h-full object-cover" />
                            <button onClick={() => removePhoto(i)}
                                className="absolute top-0.5 right-0.5 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                ×
                            </button>
                            <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-black/50 text-white truncate px-1">
                                {p.filename}
                            </span>
                        </div>
                    ))}
                    <button onClick={uploadPhotos} disabled={uploading}
                        className={`self-center px-4 py-2 rounded-lg text-xs font-bold text-white shadow transition ${
                            uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}>
                        {uploading ? '⏳ Upload...' : `⬆️ Uploader (${photos.length})`}
                    </button>
                </div>
            )}
        </div>
    );
}
