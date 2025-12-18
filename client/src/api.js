const API_URL = '/api';

async function handleResponse(res) {
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Request failed');
    }
    return res.json();
}

// --- BRANDS ---
export const fetchBrands = async () => {
    const res = await fetch(`${API_URL}/brands`);
    return handleResponse(res);
};

export const fetchBrand = async (id) => {
    const res = await fetch(`${API_URL}/brands?id=${id}`);
    return handleResponse(res);
};

export const createBrand = async (brand) => {
    const res = await fetch(`${API_URL}/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand)
    });
    return handleResponse(res);
};

export const updateBrand = async (id, brand) => {
    const res = await fetch(`${API_URL}/brands?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand)
    });
    return handleResponse(res);
};

export const deleteBrand = async (id) => {
    const res = await fetch(`${API_URL}/brands?id=${id}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
};

// --- WEIGHT PROFILES ---
export const fetchWeightProfiles = async () => {
    const res = await fetch(`${API_URL}/weight-profiles`);
    return handleResponse(res);
};

export const createWeightProfile = async (profile) => {
    const res = await fetch(`${API_URL}/weight-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
    });
    return handleResponse(res);
};

export const updateWeightProfile = async (id, profile) => {
    const res = await fetch(`${API_URL}/weight-profiles?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
    });
    return handleResponse(res);
};

export const deleteWeightProfile = async (id) => {
    const res = await fetch(`${API_URL}/weight-profiles?id=${id}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
};

// --- PRODUCTS ---
export const fetchProducts = async () => {
    const res = await fetch(`${API_URL}/products`);
    return handleResponse(res);
};

export const createProduct = async (product) => {
    const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    });
    return handleResponse(res);
};

export const updateProduct = async (id, product) => {
    const res = await fetch(`${API_URL}/products?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    });
    return handleResponse(res);
};

export const deleteProduct = async (id) => {
    const res = await fetch(`${API_URL}/products?id=${id}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
};

// --- QUOTES ---
export const fetchQuotes = async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_URL}/quotes?${params}`);
    return handleResponse(res);
};

export const fetchQuote = async (id) => {
    const res = await fetch(`${API_URL}/quotes?id=${id}`);
    return handleResponse(res);
};

export const createQuote = async (quote) => {
    const res = await fetch(`${API_URL}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quote)
    });
    return handleResponse(res);
};

export const updateQuote = async (id, quote) => {
    const res = await fetch(`${API_URL}/quotes?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quote)
    });
    return handleResponse(res);
};

export const exportQuotePDF = async (id) => {
    const res = await fetch(`${API_URL}/quotes?id=${id}&export=true`, {
        method: 'POST'
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
    }
    return res.blob();
};

export const deleteQuote = async (id) => {
    const res = await fetch(`${API_URL}/quotes?id=${id}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
};

export const deleteQuotesBulk = async (ids) => {
    const res = await fetch(`${API_URL}/quotes?bulkDelete=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    return handleResponse(res);
};

// --- EXTRACTION ---
export const extractVendorQuote = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/extraction/extract-quote`, {
        method: 'POST',
        body: formData
    });
    return handleResponse(res);
};
