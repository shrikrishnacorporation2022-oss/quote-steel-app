import React, { useState, useEffect } from 'react';
import { fetchBrands, fetchProducts, createQuote, updateQuote, exportQuotePDF } from '../api';
import { calculateItem } from '../utils/calculations';
import { ChevronDown, ChevronUp, Plus, Trash2, Save, FileText, User, Phone, Mail, MapPin, Building2, Box } from 'lucide-react';
import html2canvas from 'html2canvas';
import QuoteImageTemplate from './QuoteImageTemplate';
import VendorExtraction from './VendorExtraction';

const SIZES = ['8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm'];

function QuoteCalculator({ initialData, onSaveComplete }) {
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [items, setItems] = useState({});
  const [quoteProducts, setQuoteProducts] = useState([]); // Array of inventory items
  const [customerDetails, setCustomerDetails] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerCompany: ''
  });
  const [showCustomerForm, setShowCustomerForm] = useState(true);
  const [notes, setNotes] = useState('');
  const [globalPrice, setGlobalPrice] = useState('');
  const [onlineDiscountPercent, setOnlineDiscountPercent] = useState(0);
  const [offlineDiscountPercent, setOfflineDiscountPercent] = useState(0);
  const [transportCharges, setTransportCharges] = useState(0);
  const [loadingUnloadingCharges, setLoadingUnloadingCharges] = useState(0);
  const [loadingRate, setLoadingRate] = useState(''); // Rate per kg for loading
  const [saving, setSaving] = useState(false);
  const [quoteForImage, setQuoteForImage] = useState(null);
  const imageTemplateRef = React.useRef(null);
  const [globalUnit, setGlobalUnit] = useState('kg'); // Global unit for kg-selling brands
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' or 'vendor'
  const [vendorMetadata, setVendorMetadata] = useState(null);

  useEffect(() => {
    loadData();
    // Only load from local storage if NOT editing/duplicating
    if (!initialData) {
      const saved = localStorage.getItem('customerDetails');
      if (saved) {
        setCustomerDetails(JSON.parse(saved));
      }
    }
  }, []);

  // Populate form when initialData changes
  useEffect(() => {
    if (initialData && brands.length > 0) {
      // 1. Customer Details
      setCustomerDetails({
        customerName: initialData.customerName || '',
        customerPhone: initialData.customerPhone || '',
        customerEmail: initialData.customerEmail || '',
        customerAddress: initialData.customerAddress || '',
        customerCompany: initialData.customerCompany || ''
      });

      // 2. Notes & Discounts
      setNotes(initialData.notes || '');
      setOnlineDiscountPercent(initialData.onlineDiscountPercent || 0);
      setOfflineDiscountPercent(initialData.offlineDiscountPercent || 0);
      setTransportCharges(initialData.transportCharges || 0);
      setLoadingUnloadingCharges(initialData.loadingUnloadingCharges || 0);
      setLoadingRate(initialData.loadingRate || '');
      if (initialData.extractedData) {
        setVendorMetadata(initialData.extractedData);
      }

      // 3. Steel Items (Convert Array -> Object)
      const steelItems = {};
      let brandIdToSelect = '';

      // Find the brand ID from the name in the first item (assuming single brand per quote for steel)
      const firstSteelItem = initialData.items.find(i => i.brand !== 'Other');
      if (firstSteelItem) {
        const brand = brands.find(b => b.name === firstSteelItem.brand);
        if (brand) brandIdToSelect = brand._id;

        // Set globalUnit from the first steel item's unit
        if (firstSteelItem.inputUnit && !brand?.sellsInNos) {
          setGlobalUnit(firstSteelItem.inputUnit);
        }
      }

      if (brandIdToSelect) {
        setSelectedBrandId(brandIdToSelect);
      } else if (!selectedBrandId && brands.length > 0) {
        setSelectedBrandId(brands[0]._id);
      }

      initialData.items.forEach(item => {
        if (item.brand !== 'Other') {
          steelItems[item.size] = {
            size: item.size,
            inputUnit: item.inputUnit,
            inputQty: item.inputQty,
            convertedKg: item.convertedKg,
            convertedNos: item.convertedNos,
            convertedBundles: item.convertedBundles,
            pricePerKg: item.pricePerKg,
            pricePerRod: item.pricePerRod,
            amount: item.amount
          };
        }
      });
      setItems(steelItems);

      // 4. Inventory Items
      const inventoryItems = initialData.items
        .filter(i => i.brand === 'Other')
        .map(i => ({
          _id: i.productId, // Assuming we stored productId, or we need to match by name if not
          name: i.product,
          unit: i.inputUnit,
          inputQty: i.inputQty,
          pricePerUnit: i.pricePerRod, // We stored unit price in pricePerRod for inventory
          amount: i.amount
        }));
      setQuoteProducts(inventoryItems);

      setShowCustomerForm(true);
    }
  }, [initialData, brands]);

  useEffect(() => {
    localStorage.setItem('customerDetails', JSON.stringify(customerDetails));
  }, [customerDetails]);

  const loadData = async () => {
    const [brandsData, productsData] = await Promise.all([
      fetchBrands(),
      fetchProducts()
    ]);
    setBrands(brandsData);
    setProducts(productsData);
    if (!initialData && brandsData.length > 0) setSelectedBrandId(brandsData[0]._id);
  };

  const selectedBrand = brands.find(b => b._id === selectedBrandId);

  const handleItemChange = (size, field, value) => {
    setItems(prev => {
      const defaultUnit = selectedBrand?.sellsInNos ? 'nos' : globalUnit;
      const currentItem = prev[size] || { size, inputUnit: defaultUnit, inputQty: 0 };
      const updatedItem = { ...currentItem, [field]: value, inputUnit: defaultUnit };

      if (selectedBrand) {
        const calculated = calculateItem(updatedItem, selectedBrand);
        return { ...prev, [size]: { ...updatedItem, ...calculated } };
      }
      return { ...prev, [size]: updatedItem };
    });
  };

  useEffect(() => {
    // Only recalculate if we are NOT in the middle of loading initial data
    // (This is a bit tricky, but checking if items are empty might help, or just letting it run)
    if (selectedBrand) {
      setItems(prev => {
        const updatedItems = {};
        Object.keys(prev).forEach(size => {
          const item = prev[size];
          let newUnit = item.inputUnit;
          if (selectedBrand.sellsInNos) {
            newUnit = 'nos';
          } else {
            // For kg-selling brands, use globalUnit
            newUnit = globalUnit;
          }
          const itemWithNewUnit = { ...item, inputUnit: newUnit };
          const calculated = calculateItem(itemWithNewUnit, {
            ...selectedBrand,
            basePrice: globalPrice ? parseFloat(globalPrice) : selectedBrand.basePrice
          });
          updatedItems[size] = { ...itemWithNewUnit, ...calculated };
        });
        return updatedItems;
      });
    }
  }, [selectedBrandId, globalPrice, globalUnit]);

  const handleRemoveItem = (size) => {
    setItems(prev => {
      const updated = { ...prev };
      delete updated[size];
      return updated;
    });
  };

  const handleAddProduct = (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    setQuoteProducts(prev => [
      ...prev,
      { ...product, productId: product._id, inputQty: 1, amount: product.pricePerUnit }
    ]);
  };

  const handleProductChange = (index, field, value) => {
    setQuoteProducts(prev => {
      const newProducts = [...prev];
      const item = { ...newProducts[index], [field]: value };
      if (field === 'inputQty' || field === 'pricePerUnit') {
        item.amount = (parseFloat(item.inputQty) || 0) * (parseFloat(item.pricePerUnit) || 0);
      }
      newProducts[index] = item;
      return newProducts;
    });
  };

  const handleRemoveProduct = (index) => {
    setQuoteProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleVendorImport = (payload) => {
    const { items: importedItems, vendor, date, vendorBillUrl } = payload;

    // Store metadata for saving
    setVendorMetadata({
      vendor,
      date,
      vendorBillUrl,
      importedAt: new Date().toISOString()
    });

    // Process imported items
    const newInventory = [...quoteProducts];

    importedItems.forEach(item => {
      // 1. Try to match with steel sizes (e.g., "8mm", "10mm")
      const matchedSize = SIZES.find(s => item.description.toLowerCase().includes(s.toLowerCase()));

      if (matchedSize) {
        // Update steel items
        handleItemChange(matchedSize, 'inputQty', item.qty);
      } else {
        // 2. Add as a generic product
        newInventory.push({
          name: item.description,
          unit: item.unit,
          inputQty: item.qty,
          pricePerUnit: parseFloat(item.rate),
          amount: item.qty * item.rate
        });
      }
    });

    setQuoteProducts(newInventory);
    setEntryMode('manual'); // Switch back to calculator
  };

  const handleReset = () => {
    if (window.confirm('Reset all items?')) {
      setItems({});
      setQuoteProducts([]);
      setGlobalPrice('');
      setOnlineDiscountPercent(0);
      setOfflineDiscountPercent(0);
      if (onSaveComplete) onSaveComplete(); // Exit edit mode on reset if desired
    }
  };

  const handleCancel = () => {
    if (onSaveComplete) {
      onSaveComplete(); // Return to saved quotes without saving
    }
  };

  const calculateTotalWeight = () => {
    const steelWeight = Object.values(items).reduce((sum, item) => sum + (item.convertedKg || 0), 0);
    const inventoryWeight = quoteProducts.reduce((sum, item) => {
      // Only include inventory items if unit is explicitly 'kg'
      if (item.unit === 'kg') {
        return sum + (parseFloat(item.inputQty) || 0);
      }
      return sum;
    }, 0);
    return steelWeight + inventoryWeight;
  };

  const totalWeight = calculateTotalWeight();

  // Auto-calculate loading charges when rate or weight changes
  useEffect(() => {
    if (loadingRate && totalWeight > 0) {
      const rate = parseFloat(loadingRate);
      if (!isNaN(rate)) {
        setLoadingUnloadingCharges(Math.round(totalWeight * rate));
      }
    }
  }, [loadingRate, totalWeight]);

  const calculateTotals = () => {
    const steelTotal = Object.values(items).reduce((sum, item) => sum + (item.amount || 0), 0);
    const productTotal = quoteProducts.reduce((sum, item) => sum + (item.amount || 0), 0);

    const onlineDiscountAmount = (steelTotal * onlineDiscountPercent) / 100;
    const offlineDiscountAmount = (steelTotal * offlineDiscountPercent) / 100;
    const totalDiscount = onlineDiscountAmount + offlineDiscountAmount;

    const subtotal = steelTotal + productTotal;
    const total = subtotal - totalDiscount + (parseFloat(transportCharges) || 0) + (parseFloat(loadingUnloadingCharges) || 0);

    return {
      steelTotal,
      productTotal,
      subtotal,
      onlineDiscountAmount,
      offlineDiscountAmount,
      total
    };
  };

  const { steelTotal, productTotal, subtotal, onlineDiscountAmount, offlineDiscountAmount, total } = calculateTotals();

  const handleSave = async () => {
    if (!customerDetails.customerName.trim()) {
      alert('Please enter customer name');
      setShowCustomerForm(true);
      return;
    }

    const steelItems = Object.values(items).filter(item => item.inputQty > 0);
    if (steelItems.length === 0 && quoteProducts.length === 0) {
      alert('Please add at least one item (Steel or Inventory)');
      return;
    }

    const quoteData = {
      quoteNo: (initialData && initialData.mode === 'edit') ? initialData.quoteNo : `Q${Date.now()}`,
      ...customerDetails,
      items: [
        ...steelItems.map(item => ({
          brand: selectedBrand?.name || '',
          product: 'TMT Bar',
          size: item.size,
          inputUnit: item.inputUnit,
          inputQty: item.inputQty,
          convertedKg: item.convertedKg,
          convertedNos: item.convertedNos,
          convertedBundles: item.convertedBundles,
          pricePerKg: item.pricePerKg,
          pricePerRod: item.pricePerRod,
          sellsInNos: selectedBrand?.sellsInNos || false, // Add flag to identify pricing method
          amount: item.amount
        })),
        ...quoteProducts.map(item => ({
          brand: 'Other',
          product: item.name,
          productId: item.productId,
          inputUnit: item.unit,
          inputQty: item.inputQty,
          pricePerRod: item.pricePerUnit, // Storing unit price here
          amount: item.amount
        }))
      ],
      steelSubtotal: steelTotal,
      onlineDiscountPercent,
      onlineDiscountAmount,
      offlineDiscountPercent,
      offlineDiscountAmount,
      transportCharges: parseFloat(transportCharges) || 0,
      loadingUnloadingCharges: parseFloat(loadingUnloadingCharges) || 0,
      subtotal,
      total,
      notes,
      loadingRate, // Save loading rate to restore it later
      extractedData: vendorMetadata, // Save vendor metadata
      vendorBillUrl: vendorMetadata?.vendorBillUrl // Explicitly save link for quick access
    };

    setSaving(true);
    try {
      if (initialData && initialData.mode === 'edit') {
        await updateQuote(initialData._id, quoteData);
        alert('Quote updated successfully!');
      } else {
        await createQuote(quoteData);
        alert('Quote saved successfully!');
      }

      // Reset logic
      setItems({});
      setQuoteProducts([]);
      setNotes('');
      setVendorMetadata(null);
      setOnlineDiscountPercent(0);
      setOfflineDiscountPercent(0);
      setLoadingRate(''); // Reset loading rate
      setLoadingUnloadingCharges(0);
      setTransportCharges(0);

      if (onSaveComplete) {
        onSaveComplete(quoteData.quoteNo); // Pass quote number for scroll/highlight
      }
    } catch (error) {
      alert('Error saving quote: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ... (rest of component)

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="card-glass p-6">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text">
          {initialData && initialData.mode === 'edit' ? 'Edit Quote' : 'Create Quote'}
        </h1>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
          <p className="text-slate-600">Build your quotation with ease</p>

          <div className="flex flex-wrap items-center gap-2">
            {vendorMetadata && (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 animate-fade-in shadow-sm">
                <div className="flex items-center gap-1.5 border-r border-emerald-200 pr-3">
                  <FileText className="w-4 h-4" />
                  Import: {vendorMetadata.vendor || 'Vendor Bill'}
                </div>
                {vendorMetadata.vendorBillUrl && (
                  <a
                    href={vendorMetadata.vendorBillUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-emerald-900 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>View Bill</span>
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setEntryMode('manual')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${entryMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Manual entry
            </button>
            <button
              onClick={() => setEntryMode('vendor')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${entryMode === 'vendor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vendor Import
            </button>
          </div>
        </div>
      </div>

      {entryMode === 'vendor' ? (
        <VendorExtraction onImport={handleVendorImport} />
      ) : (
        <>
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowCustomerForm(!showCustomerForm)}
              className="w-full section-header flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span>Customer Details</span>
              </div>
              {showCustomerForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showCustomerForm && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={customerDetails.customerName}
                      onChange={e => setCustomerDetails(prev => ({ ...prev, customerName: e.target.value }))}
                      className="input-field pl-10"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={customerDetails.customerPhone}
                      onChange={e => setCustomerDetails(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="input-field pl-10"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={customerDetails.customerEmail}
                      onChange={e => setCustomerDetails(prev => ({ ...prev, customerEmail: e.target.value }))}
                      className="input-field pl-10"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={customerDetails.customerCompany}
                      onChange={e => setCustomerDetails(prev => ({ ...prev, customerCompany: e.target.value }))}
                      className="input-field pl-10"
                      placeholder="ABC Construction"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                      value={customerDetails.customerAddress}
                      onChange={e => setCustomerDetails(prev => ({ ...prev, customerAddress: e.target.value }))}
                      className="input-field pl-10 min-h-20"
                      placeholder="123 Main Street, City, State - 123456"
                      rows="2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Brand Selection & Global Price */}
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Brand</label>
                <select
                  value={selectedBrandId}
                  onChange={e => setSelectedBrandId(e.target.value)}
                  className="input-field"
                >
                  {brands.map(brand => (
                    <option key={brand._id} value={brand._id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              {selectedBrand && !selectedBrand.sellsInNos && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Unit for All Items</label>
                  <select
                    value={globalUnit}
                    onChange={e => setGlobalUnit(e.target.value)}
                    className="input-field"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="nos">Numbers (nos)</option>
                    <option value="bundle">Bundles</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Global Price Override (₹/Kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={globalPrice}
                  onChange={e => setGlobalPrice(e.target.value)}
                  className="input-field"
                  placeholder={`Default: ₹${selectedBrand?.basePrice || 0}`}
                />
              </div>
            </div>
          </div>

          {/* Steel Items Table */}
          <div className="card overflow-hidden">
            <div className="section-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span>Steel Items</span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-white/90 hover:text-white text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-header">Size</th>
                    <th className="table-header">Unit</th>
                    <th className="table-header">Quantity</th>
                    <th className="table-header hidden md:table-cell">Kg</th>
                    <th className="table-header hidden md:table-cell">Nos</th>
                    <th className="table-header">Amount (₹)</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {SIZES.map(size => {
                    const item = items[size];
                    const hasQty = item && item.inputQty > 0;

                    return (
                      <tr key={size} className={`table-row ${hasQty ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{size}</td>
                        <td className="px-4 py-3">
                          {selectedBrand?.sellsInNos ? (
                            <select
                              value={item?.inputUnit || 'nos'}
                              onChange={e => handleItemChange(size, 'inputUnit', e.target.value)}
                              className="input-field py-1.5 text-sm"
                            >
                              <option value="nos">Nos</option>
                            </select>
                          ) : (
                            <span className="text-sm text-slate-600 capitalize">{globalUnit}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step={item?.inputUnit === 'kg' ? "0.01" : "1"}
                            value={item?.inputQty || ''}
                            onChange={e => handleItemChange(size, 'inputQty', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              // Prevent decimal point and 'e' for non-kg units
                              if (item?.inputUnit !== 'kg' && (e.key === '.' || e.key === 'e')) {
                                e.preventDefault();
                              }
                            }}
                            className="input-field py-1.5 w-24"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                          {item?.convertedKg?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                          {item?.convertedNos?.toFixed(0) || '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">
                          ₹{item?.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          {hasQty && (
                            <button
                              onClick={() => handleRemoveItem(size)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventory Items Section */}
          <div className="card overflow-hidden">
            <div className="section-header bg-gradient-to-r from-emerald-600 to-teal-600">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5" />
                <span>Other Items</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Add Item from Inventory</label>
              <select
                className="input-field w-full md:w-1/2"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddProduct(e.target.value);
                    e.target.value = ''; // Reset select
                  }
                }}
              >
                <option value="">-- Select Item to Add --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.unit}) - ₹{p.pricePerUnit}</option>
                ))}
              </select>
            </div>

            {quoteProducts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Item Name</th>
                      <th className="table-header">Unit</th>
                      <th className="table-header">Quantity</th>
                      <th className="table-header">Price/Unit (₹)</th>
                      <th className="table-header">Amount (₹)</th>
                      <th className="table-header">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {quoteProducts.map((product, index) => (
                      <tr key={index} className="table-row">
                        <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{product.unit}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step={product.unit === 'kg' ? "0.01" : "1"}
                            value={product.inputQty}
                            onChange={e => handleProductChange(index, 'inputQty', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (product.unit !== 'kg' && (e.key === '.' || e.key === 'e')) {
                                e.preventDefault();
                              }
                            }}
                            className="input-field py-1.5 w-24"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={product.pricePerUnit}
                            onChange={e => handleProductChange(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                            className="input-field py-1.5 w-24"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">
                          ₹{product.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input-field min-h-24"
              placeholder="Any special instructions or terms..."
              rows="3"
            />
          </div>

          {/* Discount Section */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Brand Discounts (Applied to Steel Total: ₹{steelTotal.toFixed(2)})
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Online Discount */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">Online Discount</span>
                  <span className="text-sm text-slate-500">Amount: <span className="text-red-600 font-semibold">-₹{onlineDiscountAmount.toFixed(2)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={onlineDiscountPercent}
                    onChange={e => setOnlineDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="input-field w-24"
                    placeholder="0"
                  />
                  <span className="text-slate-600">%</span>
                </div>
              </div>

              {/* Offline Discount */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">Offline Discount</span>
                  <span className="text-sm text-slate-500">Amount: <span className="text-red-600 font-semibold">-₹{offlineDiscountAmount.toFixed(2)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={offlineDiscountPercent}
                    onChange={e => setOfflineDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="input-field w-24"
                  />
                  <span className="text-slate-600">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Charges Section */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Additional Charges
              </label>
              <div className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                Total Weight: {totalWeight.toFixed(2)} kg
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transport Charges */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">Transport Charges</span>
                  <span className="text-xs text-slate-500">(Weight: {totalWeight.toFixed(2)} kg)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={transportCharges}
                    onChange={e => setTransportCharges(parseFloat(e.target.value) || 0)}
                    className="input-field w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Loading/Unloading Charges */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-700">Loading/Unloading</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs text-slate-500 block mb-1">Rate (₹/kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={loadingRate}
                      onChange={e => setLoadingRate(e.target.value)}
                      className="input-field w-full text-sm"
                      placeholder="Rate"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 block mb-1">Total Amount</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">₹</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={loadingUnloadingCharges}
                        onChange={e => {
                          setLoadingUnloadingCharges(parseFloat(e.target.value) || 0);
                          setLoadingRate(''); // Clear rate if manual override
                        }}
                        className="input-field w-full"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="card p-4 md:p-6 shadow-glow mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Steel Subtotal:</span>
                <span>₹{steelTotal.toFixed(2)}</span>
              </div>
              {productTotal > 0 && (
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>Other Items Subtotal:</span>
                  <span>₹{productTotal.toFixed(2)}</span>
                </div>
              )}

              {onlineDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-red-600">
                  <span>Online Discount ({onlineDiscountPercent}%):</span>
                  <span>-₹{onlineDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {offlineDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-red-600">
                  <span>Offline Discount ({offlineDiscountPercent}%):</span>
                  <span>-₹{offlineDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {transportCharges > 0 && (
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>Transport Charges:</span>
                  <span>+₹{parseFloat(transportCharges).toFixed(2)}</span>
                </div>
              )}

              {loadingUnloadingCharges > 0 && (
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>Loading/Unloading:</span>
                  <span>+₹{parseFloat(loadingUnloadingCharges).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-2xl border-t-2 border-indigo-200 pt-4">
                <span className="font-bold text-slate-800">Total (Tax Inclusive):</span>
                <span className="font-bold gradient-text">₹{total.toFixed(2)}</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : (initialData && initialData.mode === 'edit' ? 'Update Quote' : 'Save Quote')}
                </button>

                {initialData && initialData.mode === 'edit' && (
                  <button
                    onClick={handleCancel}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <ChevronDown className="w-5 h-5" />
                    Cancel
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quote Image Template (Hidden) */}
      <div className="hidden">
        <QuoteImageTemplate ref={imageTemplateRef} quote={quoteForImage} />
      </div>
    </div>
  );
}

export default QuoteCalculator;
