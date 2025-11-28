import React, { useState, useEffect } from 'react';
import { fetchWeightProfiles, createWeightProfile, updateWeightProfile, deleteWeightProfile } from '../api';

const SIZES = ['6mm', '8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm'];

function WeightProfileManager() {
    const [profiles, setProfiles] = useState([]);
    const [editingProfile, setEditingProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        console.log('loadProfiles called');
        try {
            const data = await fetchWeightProfiles();
            console.log('Fetched profiles:', data);
            setProfiles(data);
            console.log('Profiles state updated');
        } catch (err) {
            console.error('Error loading profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (profile) => {
        try {
            if (profile._id) {
                await updateWeightProfile(profile._id, profile);
            } else {
                await createWeightProfile(profile);
            }
            setEditingProfile(null);
            loadProfiles();
        } catch (err) {
            alert('Error saving profile: ' + err.message);
        }
    };

    const handleLoadDefaults = async () => {
        console.log('Load Defaults clicked');
        if (!window.confirm('Create standard ISI weight profile with default values?')) {
            console.log('User cancelled');
            return;
        }
        try {
            console.log('Creating default profile...');
            const newProfile = await createWeightProfile({
                name: 'Standard ISI Weights',
                rodWeights: {
                    '6mm': 0.222,
                    '8mm': 0.395,
                    '10mm': 0.617,
                    '12mm': 0.888,
                    '16mm': 1.58,
                    '20mm': 2.47,
                    '25mm': 3.85,
                    '32mm': 6.31
                },
                rodsPerBundle: {
                    '6mm': 12,
                    '8mm': 10,
                    '10mm': 7,
                    '12mm': 5,
                    '16mm': 3,
                    '20mm': 2,
                    '25mm': 1,
                    '32mm': 1
                }
            });
            console.log('Profile created successfully:', newProfile);
            loadProfiles();
        } catch (err) {
            console.error('Error in handleLoadDefaults:', err);
            alert('Error creating defaults: ' + err.message);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) {
            alert('Please select profiles to delete');
            return;
        }
        if (!window.confirm(`Delete ${selectedIds.length} selected profile(s)?`)) return;
        try {
            await Promise.all(selectedIds.map(id => deleteWeightProfile(id)));
            setSelectedIds([]);
            loadProfiles();
        } catch (err) {
            alert('Error deleting profiles');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(profiles.map(p => p._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Weight Masters</h2>
                <div className="space-x-2">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={handleLoadDefaults}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Load Defaults
                    </button>
                    <button
                        onClick={() => setEditingProfile({ name: '', rodWeights: {}, rodsPerBundle: {} })}
                        className="btn-primary"
                    >
                        Add Weight Profile
                    </button>
                </div>
            </div>

            {editingProfile ? (
                <ProfileForm
                    profile={editingProfile}
                    onSave={handleSave}
                    onCancel={() => setEditingProfile(null)}
                />
            ) : (
                <div className="space-y-2">
                    {profiles.length > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === profiles.length && profiles.length > 0}
                                onChange={handleSelectAll}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm font-medium text-gray-600">Select All</span>
                        </div>
                    )}
                    <div className="max-h-96 overflow-y-auto space-y-2 border rounded p-2">
                        {(() => {
                            console.log('Rendering profiles list. Count:', profiles.length, profiles);
                            return profiles.map(profile => (
                                <div key={profile._id} className="card p-4 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(profile._id)}
                                        onChange={() => handleSelectOne(profile._id)}
                                        className="rounded border-gray-300"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{profile.name}</h3>
                                        <p className="text-sm text-gray-600">Rod Weights & Bundle Counts</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingProfile(profile)}
                                        className="text-blue-600 hover:underline px-3 py-1"
                                    >
                                        Edit
                                    </button>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

function ProfileForm({ profile, onSave, onCancel }) {
    const [formData, setFormData] = useState(profile);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleValueChange = (mapName, size, value) => {
        setFormData(prev => ({
            ...prev,
            [mapName]: { ...prev[mapName], [size]: value }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700">Profile Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    className="input-field mt-1 block w-full p-2"
                    required
                    placeholder="e.g. Standard ISI Weights"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rod Wt (Kg)</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rods/Bundle</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bundle Wt (Kg)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {SIZES.map(size => {
                            const rodWt = formData.rodWeights?.[size] || 0;
                            const rodsPerBundle = formData.rodsPerBundle?.[size] || 0;
                            const bundleWt = rodWt && rodsPerBundle ? (rodWt * rodsPerBundle).toFixed(2) : '-';

                            return (
                                <tr key={size}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{size}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={formData.rodWeights?.[size] || ''}
                                            onChange={e => handleValueChange('rodWeights', size, Number(e.target.value))}
                                            className="w-24 text-sm border-gray-300 rounded border p-1"
                                            placeholder="0.000"
                                        />
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <input
                                            type="number"
                                            step="1"
                                            value={formData.rodsPerBundle?.[size] || ''}
                                            onChange={e => handleValueChange('rodsPerBundle', size, Number(e.target.value))}
                                            className="w-24 text-sm border-gray-300 rounded border p-1"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-blue-800 bg-blue-50">
                                        {bundleWt}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn-primary"
                >
                    Save Profile
                </button>
            </div>
        </form>
    );
}

export default WeightProfileManager;
