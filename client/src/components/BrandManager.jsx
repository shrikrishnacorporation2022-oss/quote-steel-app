import React, { useState, useEffect } from 'react';
import { fetchBrands, createBrand, updateBrand, deleteBrand, fetchWeightProfiles } from '../api';

const SIZES = ['6mm', '8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm'];

function BrandManager() {
    const [brands, setBrands] = useState([]);
    const [weightProfiles, setWeightProfiles] = useState([]);
    const [editingBrand, setEditingBrand] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [brandsData, profilesData] = await Promise.all([
                fetchBrands(),
                fetchWeightProfiles()
            ]);
            setBrands(brandsData);
            setWeightProfiles(profilesData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (brand) => {
        try {
            // Ensure all sizes have a formula entry (default to add+0 if not set)
            const SIZES = ['6mm', '8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm'];
            const completedFormulas = {};

            SIZES.forEach(size => {
                if (brand.sizeFormulas && brand.sizeFormulas[size]) {
                    completedFormulas[size] = brand.sizeFormulas[size];
                } else {
                    // Default formula: add +0 (same as base price)
                    completedFormulas[size] = { formulaType: 'add', modifier: 0 };
                }
            });

            const brandToSave = {
                ...brand,
                sizeFormulas: completedFormulas
            };

            console.log('Saving brand with completed formulas:', completedFormulas);

            if (brandToSave._id) {
                await updateBrand(brandToSave._id, brandToSave);
            } else {
                await createBrand(brandToSave);
            }
            setEditingBrand(null);
            loadData();
        } catch (err) {
            alert('Error saving brand: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await deleteBrand(id);
            loadData();
        } catch (err) {
            alert('Error deleting brand');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Brand Master</h2>
                <button
                    onClick={() => setEditingBrand({
                        name: '', basePrice: 0, sellsInNos: false,
                        sizeFormulas: {},
                        weightProfile: '',
                        sizePricing: {}
                    })}
                    className="btn-primary"
                >
                    Add Brand
                </button>
            </div>

            {editingBrand ? (
                <BrandForm
                    brand={editingBrand}
                    weightProfiles={weightProfiles}
                    onSave={handleSave}
                    onCancel={() => setEditingBrand(null)}
                />
            ) : (
                <div className="grid gap-4">
                    {brands.map(brand => (
                        <div key={brand._id} className="card p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{brand.name}</h3>
                                <p className="text-sm text-gray-600">Base: {brand.basePrice} | {brand.sellsInNos ? 'Sells in Nos' : 'Sells in Kg'}</p>
                            </div>
                            <div className="space-x-2">
                                <button
                                    onClick={() => {
                                        // Fix: Flatten populated weightProfile object to ID for the form
                                        const brandToEdit = { ...brand };
                                        if (brandToEdit.weightProfile && typeof brandToEdit.weightProfile === 'object') {
                                            brandToEdit.weightProfile = brandToEdit.weightProfile._id;
                                        }
                                        console.log('Editing brand:', brandToEdit);
                                        setEditingBrand(brandToEdit);
                                    }}
                                    className="text-blue-600 hover:underline"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(brand._id)}
                                    className="text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function BrandForm({ brand, weightProfiles, onSave, onCancel }) {
    const [formData, setFormData] = useState(brand);

    // Debug: Log formData to see structure
    console.log('BrandForm formData:', formData);
    console.log('BrandForm sizeFormulas:', formData.sizeFormulas);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleMapChange = (mapName, key, field, value) => {
        setFormData(prev => {
            const currentMap = prev[mapName] || {};
            const currentItem = currentMap[key] || { formulaType: 'add', modifier: 0 };

            // Create new item with updated field
            const newItem = field
                ? { ...currentItem, [field]: value }
                : value;

            return {
                ...prev,
                [mapName]: {
                    ...currentMap,
                    [key]: newItem
                }
            };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Clean up the data before saving
        const cleanedData = { ...formData };

        // Convert empty weightProfile to null
        if (!cleanedData.weightProfile || cleanedData.weightProfile === '') {
            delete cleanedData.weightProfile;
        }

        // Include all sizeFormulas that have formulaType set (modifier can be 0 or any number)
        const cleanedFormulas = {};
        if (cleanedData.sizeFormulas) {
            Object.keys(cleanedData.sizeFormulas).forEach(size => {
                const formula = cleanedData.sizeFormulas[size];
                if (formula && formula.formulaType) {
                    cleanedFormulas[size] = {
                        formulaType: formula.formulaType,
                        modifier: formula.modifier !== undefined ? formula.modifier : 0
                    };
                }
            });
        }
        cleanedData.sizeFormulas = cleanedFormulas;

        console.log('Saving brand with formulas:', cleanedFormulas);
        onSave(cleanedData);
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Brand Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                        className="input-field mt-1 block w-full p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Base Price</label>
                    <input
                        type="number"
                        value={formData.basePrice}
                        onChange={e => handleChange('basePrice', Number(e.target.value))}
                        className="input-field mt-1 block w-full p-2"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Weight Profile</label>
                <select
                    value={formData.weightProfile || ''}
                    onChange={e => handleChange('weightProfile', e.target.value)}
                    className="input-field mt-1 block w-full p-2"
                >
                    <option value="">-- Select Weight Profile --</option>
                    {weightProfiles.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={formData.sellsInNos}
                        onChange={e => handleChange('sellsInNos', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm"
                    />
                    <span className="text-sm font-medium text-gray-700">Sells in Nos (e.g. TATA)</span>
                </label>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">Formula</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rods/Bundle</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rod Wt (Kg)</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bundle Wt (Kg)</th>
                            {formData.sellsInNos && (
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Rod</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {SIZES.map(size => {
                            const profile = weightProfiles.find(p => p._id === formData.weightProfile);
                            const rodsPerBundle = profile?.rodsPerBundle?.[size] || 0;
                            const rodWt = profile?.rodWeights?.[size] || 0;
                            const bundleWt = (rodsPerBundle && rodWt) ? (rodsPerBundle * rodWt).toFixed(2) : '-';

                            return (
                                <tr key={size}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{size}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <select
                                            value={formData.sizeFormulas?.[size]?.formulaType || 'add'}
                                            onChange={e => handleMapChange('sizeFormulas', size, 'formulaType', e.target.value)}
                                            className="text-sm border-gray-300 rounded border p-1"
                                        >
                                            <option value="add">Add</option>
                                            <option value="mul">Mul</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.sizeFormulas?.[size]?.modifier || 0}
                                            onChange={e => handleMapChange('sizeFormulas', size, 'modifier', Number(e.target.value))}
                                            className="w-20 text-sm border-gray-300 rounded border p-1"
                                        />
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 bg-gray-50">
                                        {rodsPerBundle}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 bg-gray-50">
                                        {rodWt}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-blue-800 bg-blue-50">
                                        {bundleWt}
                                    </td>
                                    {formData.sellsInNos && (
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <input
                                                type="number"
                                                value={formData.sizePricing?.[size] || ''}
                                                onChange={e => handleMapChange('sizePricing', size, null, Number(e.target.value))}
                                                className="w-24 text-sm border-gray-300 rounded border p-1"
                                                placeholder="Price/Rod"
                                            />
                                        </td>
                                    )}
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
                    Save Brand
                </button>
            </div>
        </form>
    );
}

export default BrandManager;
