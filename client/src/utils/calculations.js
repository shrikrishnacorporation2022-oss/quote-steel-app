
export const evaluatePrice = (basePrice, formulaType, modifier) => {
    if (formulaType === 'add') return basePrice + modifier;
    if (formulaType === 'mul') return basePrice * modifier;
    return basePrice;
};

export const calculateItem = (item, brand) => {
    const { size, inputUnit, inputQty } = item;

    // 1. Get Weights & Counts
    const rodWeight = brand.rodWeightMap?.[size] || 0;
    const rodsPerBundle = brand.rodsPerBundleMap?.[size] || 0;

    // Calculate Bundle Weight:
    // If we have explicit bundle weight in map (legacy), use it.
    // Otherwise, if we have rodWeight and rodsPerBundle, calculate it.
    // The backend might have already populated bundleWeightMap with the calculated value, 
    // but let's be robust.
    let bundleWeight = brand.bundleWeightMap?.[size] || 0;
    if (bundleWeight === 0 && rodWeight > 0 && rodsPerBundle > 0) {
        bundleWeight = rodWeight * rodsPerBundle;
    }

    // 2. Calculate Quantities
    let convertedKg = 0;
    let convertedNos = 0;
    let convertedBundles = 0;

    if (inputUnit === 'kg') {
        convertedKg = inputQty;
        if (rodWeight > 0) convertedNos = inputQty / rodWeight;
        if (bundleWeight > 0) convertedBundles = inputQty / bundleWeight;
    } else if (inputUnit === 'bundle') {
        convertedBundles = inputQty;
        if (bundleWeight > 0) convertedKg = inputQty * bundleWeight;

        // For rods, use rodsPerBundle if available for exact count
        if (rodsPerBundle > 0) {
            convertedNos = inputQty * rodsPerBundle;
        } else if (rodWeight > 0 && bundleWeight > 0) {
            convertedNos = (inputQty * bundleWeight) / rodWeight;
        }
    } else if (inputUnit === 'nos') {
        convertedNos = inputQty;
        if (rodWeight > 0) convertedKg = inputQty * rodWeight;

        // For bundles, use rodsPerBundle if available
        if (rodsPerBundle > 0) {
            convertedBundles = inputQty / rodsPerBundle;
        } else if (bundleWeight > 0 && rodWeight > 0) {
            convertedBundles = (inputQty * rodWeight) / bundleWeight;
        }
    }

    // 3. Calculate Amount
    let amount = 0;
    let pricePerKg = 0;
    let pricePerRod = 0;

    if (brand.sellsInNos) {
        // Pricing per Rod (Fixed Price)
        // Check if sizePricing exists and has a value for this size
        if (brand.sizePricing && brand.sizePricing[size]) {
            pricePerRod = parseFloat(brand.sizePricing[size]);
        }

        // If pricePerRod is found, calculate amount
        if (pricePerRod > 0) {
            amount = convertedNos * pricePerRod;

            // Derived price per kg for reference (if weight exists)
            if (rodWeight > 0) {
                pricePerKg = pricePerRod / rodWeight;
            }
        }
    } else {
        // Pricing per Kg
        const formula = brand.sizeFormulas?.[size];
        pricePerKg = evaluatePrice(brand.basePrice, formula?.formulaType || 'add', formula?.modifier || 0);

        if (pricePerKg > 0) {
            amount = convertedKg * pricePerKg;

            // Derived price per rod
            if (rodWeight > 0) {
                pricePerRod = pricePerKg * rodWeight;
            }
        }
    }

    return {
        pricePerKg,
        pricePerRod,
        convertedKg: Math.round(convertedKg * 100) / 100,
        convertedNos: Math.round(convertedNos * 100) / 100,
        convertedBundles: Math.round(convertedBundles * 100) / 100,
        amount
    };
};
