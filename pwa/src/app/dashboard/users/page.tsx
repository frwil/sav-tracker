'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select'; 
import { useAuth } from '@/hooks/useAuth'; // On récupère l'info de l'utilisateur connecté

interface User {
    '@id': string;
    id: number;
    username: string;
    roles: string[];
    activated: boolean;
    // On ajoute customer pour l'affichage si besoin, mais ici on gère les droits
}

const ROLE_LABELS: Record<string, string> = {
    'ROLE_SUPER_ADMIN': 'Super Admin',
    'ROLE_ADMIN': 'Administrateur',
    'ROLE_TECHNICIAN': 'Technicien',
    'ROLE_OPERATOR': 'Opérateur Support'
};

const BASE_ROLE_OPTIONS = [
    { value: 'ROLE_TECHNICIAN', label: 'Technicien' },
    { value: 'ROLE_OPERATOR', label: 'Opérateur Support' },
    { value: 'ROLE_ADMIN', label: 'Administrateur' },
];

export default function UsersPage() {
    // 1. Infos utilisateur courant (via notre hook)
    const { user: currentUser } = useAuth();
    const isCurrentUserSuperAdmin = currentUser?.roles.includes('ROLE_SUPER_ADMIN') || false;

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Formulaire
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'ROLE_TECHNICIAN'
    });

    // --- OPTIONS DE RÔLE ---
    // Règle : Le rôle SuperAdmin n'est visible QUE par un SuperAdmin
    const roleOptions = isCurrentUserSuperAdmin 
        ? [{ value: 'ROLE_SUPER_ADMIN', label: 'Super Admin' }, ...BASE_ROLE_OPTIONS]
        : BASE_ROLE_OPTIONS;

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const token = localStorage.getItem('sav_token');
        if (!token) return;

        try {
            const res = await fetch('http://localhost/api/users', {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
            });
            const data = await res.json();
            setUsers(data['hydra:member'] || data['member'] || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIQUE DE PERMISSION (HELPER) ---
    const canInteractWith = (targetUser: User) => {
        // Règle : Un Admin ne peut RIEN faire sur un SuperAdmin
        if (!isCurrentUserSuperAdmin && targetUser.roles.includes('ROLE_SUPER_ADMIN')) {
            return false;
        }
        return true;
    };

    const handleEdit = (user: User) => {
        if (!canInteractWith(user)) {
            alert("Vous n'avez pas les droits pour modifier cet utilisateur.");
            return;
        }

        setEditingId(user.id);
        
        // Détermination du rôle principal pour le select
        let mainRole = 'ROLE_TECHNICIAN';
        if (user.roles.includes('ROLE_SUPER_ADMIN')) mainRole = 'ROLE_SUPER_ADMIN';
        else if (user.roles.includes('ROLE_ADMIN')) mainRole = 'ROLE_ADMIN';
        else if (user.roles.includes('ROLE_OPERATOR')) mainRole = 'ROLE_OPERATOR';

        setFormData({
            username: user.username,
            password: '', 
            role: mainRole
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('sav_token');
        
        // Règle : L'utilisateur courant ne peut modifier QUE son mot de passe
        // On ne doit pas envoyer 'roles' ou 'username' s'il s'édite lui-même, sauf s'il est SuperAdmin (et encore)
        // Pour simplifier selon la demande : "L'utilisateur en cours ne peut modifier que son mot de passe"
        const isSelf = currentUser?.id === editingId;

        const payload: any = {};

        if (formData.password) {
            payload.password = formData.password;
        } else if (!editingId) {
            alert("Mot de passe obligatoire pour la création.");
            return;
        }

        // Si ce n'est PAS soi-même, on peut modifier le reste (Rôle, Username...)
        if (!isSelf) {
            payload.username = formData.username;
            payload.roles = [formData.role];
        }

        // Si c'est soi-même et qu'on n'a pas mis de mot de passe -> rien à faire
        if (isSelf && !formData.password) {
            alert("Aucune modification détectée (vous ne pouvez modifier que votre mot de passe).");
            return;
        }

        try {
            if (editingId) {
                const res = await fetch(`http://localhost/api/users/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                if(!res.ok) throw new Error("Erreur modification");
                alert(isSelf ? "Mot de passe modifié !" : "Utilisateur modifié !");
            } else {
                // Création
                const res = await fetch('http://localhost/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ ...payload, username: formData.username, roles: [formData.role], activated: true })
                });
                if(!res.ok) throw new Error("Erreur création");
            }
            
            loadUsers();
            setShowForm(false);
            setEditingId(null);
            setFormData({ username: '', password: '', role: 'ROLE_TECHNICIAN' });

        } catch (err) { alert("Une erreur est survenue."); }
    };

    // --- ARCHIVAGE / ACTIVATION ---
    const handleArchive = async (user: User) => {
        // Règle : Pas d'action sur SuperAdmin si on est simple Admin
        if (!canInteractWith(user)) return;

        // Règle : L'utilisateur en cours ne peut pas se désactiver
        if (currentUser?.id === user.id) {
            alert("Vous ne pouvez pas désactiver votre propre compte.");
            return;
        }

        const token = localStorage.getItem('sav_token');
        const newStatus = !user.activated;
        
        if (!confirm(newStatus ? "Réactiver cet utilisateur ?" : "Archiver cet utilisateur ? Il n'aura plus accès à l'application.")) return;

        try {
            await fetch(`http://localhost/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ activated: newStatus })
            });
            loadUsers();
        } catch (e) { alert("Erreur lors de l'action"); }
    };

    // --- SUPPRESSION ---
    const handleDelete = async (id: number) => {
        // Note: On ne passe que l'ID ici, donc on doit retrouver l'user pour vérifier les droits SuperAdmin
        const userToDelete = users.find(u => u.id === id);
        if (userToDelete && !canInteractWith(userToDelete)) {
            alert("Action non autorisée sur ce niveau hiérarchique.");
            return;
        }

        if (!confirm("Tentative de suppression définitive...")) return;
        const token = localStorage.getItem('sav_token');

        try {
            const res = await fetch(`http://localhost/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== id));
            } else {
                // Règle : Un technicien avec des visites ne peut être supprimé (FK Constraint)
                // L'API renverra une erreur 500 ou 400 (Violation d'intégrité)
                alert("Impossible de supprimer cet utilisateur (il a probablement des données liées comme des visites).\n\n -> Il a été automatiquement basculé vers l'ARCHIVAGE.");
                
                // Fallback automatique vers l'archivage
                await fetch(`http://localhost/api/users/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ activated: false })
                });
                loadUsers();
            }
        } catch (e) { alert("Erreur technique lors de la suppression."); }
    };

    // Détermine si le formulaire est en mode "Self Edit"
    const isSelfEdit = editingId === currentUser?.id;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <div className="bg-white shadow px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-800">Gestion des Utilisateurs</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                
                {/* Bouton Création */}
                <div className="flex justify-end mb-6">
                    <button 
                        onClick={() => { setEditingId(null); setFormData({ username: '', password: '', role: 'ROLE_TECHNICIAN' }); setShowForm(!showForm); }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-indigo-700 transition"
                    >
                        {showForm ? 'Fermer' : '+ Nouvel Utilisateur'}
                    </button>
                </div>

                {/* FORMULAIRE */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 mb-8 animate-slide-down">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">
                            {editingId ? (isSelfEdit ? 'Modifier mon mot de passe' : 'Modifier l\'utilisateur') : 'Créer un utilisateur'}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Identifiant</label>
                                <input 
                                    type="text" 
                                    required 
                                    className={`w-full border p-2 rounded-lg ${isSelfEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    value={formData.username} 
                                    onChange={e => setFormData({...formData, username: e.target.value})} 
                                    disabled={isSelfEdit} // Règle : On ne change pas son propre username ici
                                />
                                {isSelfEdit && <p className="text-xs text-gray-500 mt-1">Vous ne pouvez pas modifier votre identifiant.</p>}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mot de passe {editingId && '(Laisser vide pour conserver)'}</label>
                                <input type="password" className="w-full border p-2 rounded-lg" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="********" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Rôle</label>
                                <select 
                                    className={`w-full border p-2 rounded-lg bg-white ${isSelfEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    value={formData.role} 
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                    disabled={isSelfEdit} // Règle : On ne change pas ses propres droits
                                >
                                    {roleOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {isSelfEdit && <p className="text-xs text-gray-500 mt-1">Contactez un administrateur pour changer de rôle.</p>}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
                            <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Enregistrer</button>
                        </div>
                    </form>
                )}

                {/* LISTE */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => {
                                const mainRole = user.roles.find(r => ROLE_LABELS[r]) || 'ROLE_USER';
                                const isTargetSuperAdmin = user.roles.includes('ROLE_SUPER_ADMIN');
                                const isSelf = currentUser?.id === user.id;
                                
                                // On désactive les boutons si : 
                                // 1. C'est un SuperAdmin et je ne le suis pas
                                const isDisabled = !canInteractWith(user);

                                return (
                                    <tr key={user.id} className={!user.activated ? 'bg-gray-50 opacity-75' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.username} {isSelf && '(Moi)'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                isTargetSuperAdmin ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                                mainRole === 'ROLE_ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {ROLE_LABELS[mainRole] || mainRole}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.activated ? <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Actif</span> : <span className="text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded">Archivé</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {!isDisabled && (
                                                <>
                                                    <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 mr-3 font-bold">
                                                        {isSelf ? 'Changer MDP' : 'Modifier'}
                                                    </button>
                                                    
                                                    {/* Règle : Pas de désactivation pour soi-même */}
                                                    {!isSelf && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleArchive(user)} 
                                                                className={`mr-3 font-bold ${user.activated ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"}`}
                                                            >
                                                                {user.activated ? 'Archiver' : 'Activer'}
                                                            </button>
                                                            <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 font-bold opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                            {isDisabled && <span className="text-gray-400 text-xs italic">Restreint</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}