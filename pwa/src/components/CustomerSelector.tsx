'use client';

import { useEffect, useState } from 'react';

interface Customer {
    '@id': string;
    id: number;
    name: string;
    zone: string;
}

export default function CustomerSelector({ onSelect }: { onSelect: (customer: Customer | null) => void }) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');

    useEffect(() => {
        const token = localStorage.getItem('sav_token');
        fetch('http://localhost/api/customers', {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/ld+json' }
        })
        .then(res => res.json())
        .then(data => {
            const list = data['hydra:member'] || [];
            setCustomers(list);
        })
        .catch(err => console.error(err));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedId(id);
        const customer = customers.find(c => c['@id'] === id) || null;
        onSelect(customer);
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 animate-fade-in">
            <label className="block text-sm font-bold text-gray-700 mb-2">📂 Sélectionner un Client</label>
            <select 
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={selectedId}
                onChange={handleChange}
            >
                <option value="">-- Choisir un client pour gérer ses données --</option>
                {customers.map(c => (
                    <option key={c.id} value={c['@id']}>{c.name} ({c.zone})</option>
                ))}
            </select>
        </div>
    );
}