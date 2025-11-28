import React, { useState, useEffect } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../api';

function InventoryManager() {
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await fetchProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct._id) {
                await updateProduct(editingProduct._id, editingProduct);
            } else {
                await createProduct(editingProduct);
            }
            setEditingProduct(null);
            loadData();
        } catch (err) {
            alert('Error saving product: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await deleteProduct(id);
            loadData();
        } catch (err) {
            alert('Error deleting product');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Inventory Master</h2>
                <button
                    onClick={() => setEditingProduct({
                        name: '',
                        unit: 'nos',
                        pricePerUnit: 0,
                        unitWeightKg: 0
                    })}
                    className="btn-primary"
                >
                    Add Item
                </button>
            </div>

            {editingProduct ? (
                <div className="card p-6">
                    <h3 className="text-lg font-bold mb-4">
                        {editingProduct._id ? 'Edit Item' : 'New Item'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                                <input
                                    type="text"
                                    value={editingProduct.name}
                                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    className="input-field mt-1 block w-full p-2"
                                    required
                                    placeholder="e.g. Binding Wire, Nails"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Unit</label>
                                <select
                                    value={editingProduct.unit}
                                    onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                                    className="input-field mt-1 block w-full p-2"
                                >
                                    <option value="nos">Nos (Pieces)</option>
                                    <option value="kg">Kg</option>
                                    <option value="bag">Bag</option>
                                    <option value="box">Box</option>
                                    <option value="bundle">Bundle</option>
                                    <option value="roll">Roll</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Price Per Unit (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingProduct.pricePerUnit}
                                    onChange={e => setEditingProduct({ ...editingProduct, pricePerUnit: Number(e.target.value) })}
                                    className="input-field mt-1 block w-full p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Weight per Unit (Kg) - Optional</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={editingProduct.unitWeightKg || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, unitWeightKg: Number(e.target.value) })}
                                    className="input-field mt-1 block w-full p-2"
                                    placeholder="Useful for transport calculation"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setEditingProduct(null)}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                Save Item
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.map(product => (
                        <div key={product._id} className="card p-4 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{product.name}</h3>
                                <div className="text-sm text-gray-600 mt-1">
                                    <p>Price: ₹{product.pricePerUnit} / {product.unit}</p>
                                    {product.unitWeightKg > 0 && (
                                        <p>Weight: {product.unitWeightKg} kg/{product.unit}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setEditingProduct(product)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(product._id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {products.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No items in inventory. Add items like Binding Wire, Nails, etc.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default InventoryManager;
