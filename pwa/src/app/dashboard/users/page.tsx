'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
    '@id': string;
    id: number;
    username: string;
    roles: string[];
    activated: boolean;
}

// Mapping des rôles
const ROLE_LABELS: Record<string, string> = {
    'ROLE_SUPER_ADMIN': 'Super Admin',
    'ROLE_ADMIN': 'Administrateur',
    'ROLE_TECHNICIAN': 'Technicien',
    'ROLE_OPERATOR': 'Opérateur Support' // 👈 Changement de libellé
};

const ROLE_OPTIONS = [
    { value: 'ROLE_TECHNICIAN', label: 'Technicien' },
    { value: 'ROLE_OPERATOR', label: 'Opérateur Support' }, // 👈 Positionné avant Admin
    { value: 'ROLE_ADMIN', label: 'Administrateur' },
];

export default function UsersPage() {
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
            const list = data['hydra:member'] || data['member'] || [];
            setUsers(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (user: User) => {
        setEditingId(user.id);
        
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

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ username: '', password: '', role: 'ROLE_TECHNICIAN' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('sav_token');
        
        const payload: any = {
            username: formData.username,
            roles: [formData.role]
        };

        if (formData.password) {
            payload.password = formData.password;
        } else if (!editingId) {
            alert("Le mot de passe est obligatoire pour un nouvel utilisateur.");
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
            } else {
                const res = await fetch('http://localhost/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ ...payload, activated: true })
                });
                if(!res.ok) throw new Error("Erreur création");
            }
            
            loadUsers();
            resetForm();
        } catch (err) { alert("Une erreur est survenue."); }
    };

    const handleArchive = async (user: User) => {
        const token = localStorage.getItem('sav_token');
        const newStatus = !user.activated;
        
        if (!confirm(newStatus ? "Réactiver cet utilisateur ?" : "Désactiver cet utilisateur ?")) return;

        try {
            await fetch(`http://localhost/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/merge-patch+json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ activated: newStatus })
            });
            loadUsers();
        } catch (e) { alert("Erreur lors de l'action"); }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            <div className="bg-white shadow px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600">← Retour</Link>
                        <h1 className="text-2xl font-extrabold text-gray-800">Gestion des Utilisateurs</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4">
                
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full md:w-96">
                        <input 
                            type="text" 
                            placeholder="🔍 Rechercher..." 
                            className="w-full border p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => { resetForm(); setShowForm(!showForm); }}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-indigo-700 transition w-full md:w-auto"
                    >
                        {showForm ? 'Fermer' : '+ Nouvel Utilisateur'}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 mb-8 animate-slide-down">
                        <h3 className="text-lg font-bold mb-4 text-gray-800">{editingId ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Identifiant (Username) *</label>
                                <input type="text" required className="w-full border p-2 rounded-lg" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Mot de passe {editingId && '(Laisser vide pour conserver)'}</label>
                                <input type="password" className="w-full border p-2 rounded-lg" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="********" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Rôle *</label>
                                <select 
                                    className="w-full border p-2 rounded-lg bg-white" 
                                    value={formData.role} 
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    {ROLE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
                            <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Enregistrer</button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Chargement...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map(user => {
                                    const mainRole = user.roles.find(r => ROLE_LABELS[r]) || 'ROLE_USER';
                                    return (
                                        <tr key={user.id} className={!user.activated ? 'bg-gray-50 opacity-75' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${user.activated ? 'bg-indigo-500' : 'bg-gray-400'}`}>
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    mainRole === 'ROLE_ADMIN' ? 'bg-purple-100 text-purple-800' :
                                                    mainRole === 'ROLE_OPERATOR' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {ROLE_LABELS[mainRole] || mainRole}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.activated ? (
                                                    <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">Actif</span>
                                                ) : (
                                                    <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">Désactivé</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 mr-4">Modifier</button>
                                                <button 
                                                    onClick={() => handleArchive(user)} 
                                                    className={user.activated ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"}
                                                >
                                                    {user.activated ? 'Désactiver' : 'Réactiver'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}