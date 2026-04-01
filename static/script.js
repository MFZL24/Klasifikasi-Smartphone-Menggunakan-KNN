// Theme Script
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('theme', target);
    updateThemeIcon();
}

function formatIDR(price) {
    // Assuming dataset price is in INR (Indian Rupee), conversion approx 190 IDR
    const idrValue = Math.round(parseFloat(price) * 190);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(idrValue);
}

function formatPriceInput(el) {
    // Remove non-numbers
    let val = el.value.replace(/[^0-9]/g, '');
    if (val) {
        // Format with dots
        el.value = new Intl.NumberFormat('id-ID').format(val);
        // Save raw number to hidden input
        document.getElementById('price_currency').value = val;
    } else {
        el.value = '';
        document.getElementById('price_currency').value = '';
    }
}

function updateThemeIcon() {
    const theme = document.documentElement.getAttribute('data-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerText = theme === 'dark' ? '🌓' : '☀️';
}

// Initial theme check
(function () {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', updateThemeIcon);

// History Saver
function saveToHistory(name, specs, prediction) {
    let history = JSON.parse(localStorage.getItem('smartphone_history') || '[]');
    const record = {
        name: name,
        specs: specs,
        prediction: prediction,
        timestamp: new Date().toISOString()
    };
    history.push(record);
    // Keep only last 50
    if (history.length > 50) history.shift();
    localStorage.setItem('smartphone_history', JSON.stringify(history));
}

// Prediction Logic for Home Page
async function predictSmartphone() {
    const resultOutput = document.getElementById('resultOutput');
    const resultText = document.getElementById('resultText');
    const predictBtn = document.getElementById('predictBtn');

    const formData = {
        processor_speed: parseFloat(document.getElementById('processor_speed').value),
        num_cores: parseInt(document.getElementById('num_cores').value),
        ram_capacity: parseFloat(document.getElementById('ram_capacity').value),
        internal_memory: parseFloat(document.getElementById('internal_memory').value),
        battery_capacity: parseFloat(document.getElementById('battery_capacity').value),
        primary_camera_rear: parseFloat(document.getElementById('primary_camera_rear').value),
        primary_camera_front: parseFloat(document.getElementById('primary_camera_front').value),
        rating: parseFloat(document.getElementById('rating').value),
        // Convert Rupiah input back to dataset scale (INR/Relative)
        price: parseFloat(document.getElementById('price_currency').value) / 190
    };

    predictBtn.innerText = '🤖 Menganalisis...';
    predictBtn.disabled = true;
    resultOutput.style.display = 'none';

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            const prediction = result.prediction;
            const textDiv = document.getElementById('resultText');
            const descDiv = document.getElementById('resultDesc');

            textDiv.innerText = prediction.toUpperCase();
            textDiv.className = 'prediction-text badge-' + prediction.toLowerCase();

            if (prediction === 'Flagship') {
                descDiv.innerText = "Perangkat kelas atas dengan spesifikasi terbaik untuk performa tanpa kompromi.";
            } else if (prediction === 'Midrange') {
                descDiv.innerText = "Keseimbangan sempurna antara harga dan performa, cocok untuk penggunaan harian intensif.";
            } else {
                descDiv.innerText = "Fokus pada efisiensi biaya dan fungsionalitas dasar yang handal.";
            }

            resultOutput.style.display = 'block';

            // RECOMMENDATIONS
            const recContainer = document.getElementById('recContainer');
            const recSection = document.getElementById('recommendations');
            recContainer.innerHTML = '';

            if (result.recommendations && result.recommendations.length > 0) {
                result.recommendations.forEach(phone => {
                    const card = document.createElement('div');
                    card.className = 'rec-card';
                    card.style.textAlign = 'left';
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-size: 0.65rem; color: var(--primary); font-weight: 800; text-transform: uppercase;">${phone.brand}</span>
                            <span style="background:var(--primary); color:#000; font-size:0.6rem; padding:2px 6px; border-radius:4px; font-weight:800;">SIMILAR</span>
                        </div>
                        <div style="font-weight: 700; margin-top: 8px; font-size: 1rem; color: var(--text-main);">${phone.model}</div>
                        <div style="margin-top: 10px; display: flex; gap: 8px;">
                            <span style="font-size: 0.7rem; background: var(--glass); padding: 4px 10px; border-radius: 6px; color: var(--text-muted); border:1px solid var(--border);">${phone.ram}GB RAM</span>
                        </div>
                        <div style="font-weight: 700; color: var(--primary); margin-top: 12px; font-size: 0.95rem;">${formatIDR(phone.price)}</div>
                    `;
                    recContainer.appendChild(card);
                });
                recSection.style.display = 'block';
            } else {
                recSection.style.display = 'none';
            }

            resultOutput.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // SAVE TO HISTORY
            saveToHistory("Manual Input Spec", formData, prediction);

        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        predictBtn.innerText = 'Prediksi Segment Smartphone';
        predictBtn.disabled = false;
    }
}
