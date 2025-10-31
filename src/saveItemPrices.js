        function saveItemPrices() {
            const priceInputFields = document.getElementById('priceInputFields');
            const inputs = priceInputFields.querySelectorAll('input[type="number"]');
            let updated = {};

            inputs.forEach(input => {
                const name = input.id.replace('Price', ''); // Get resource name from input id
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    updated[name] = value;
                }
            });

            // Merge with existing priceCache
            priceCache = { ...priceCache, ...updated };
            persistPriceCache();
            closePriceInputModal();
        }
