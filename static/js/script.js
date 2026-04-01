async function predictSmartphone() {
    const form = document.getElementById('predictionForm');
    const resultOutput = document.getElementById('resultOutput');
    const resultText = document.getElementById('resultText');
    const predictBtn = document.getElementById('predictBtn');

    // Collect data from form
    const formData = {
        processor_speed: parseFloat(document.getElementById('processor_speed').value),
        num_cores: parseInt(document.getElementById('num_cores').value),
        ram_capacity: parseFloat(document.getElementById('ram_capacity').value),
        internal_memory: parseFloat(document.getElementById('internal_memory').value),
        battery_capacity: parseFloat(document.getElementById('battery_capacity').value),
        primary_camera_rear: parseFloat(document.getElementById('primary_camera_rear').value),
        primary_camera_front: parseFloat(document.getElementById('primary_camera_front').value),
        rating: parseFloat(document.getElementById('rating').value),
        price: parseFloat(document.getElementById('price').value)
    };

    // UI Feedback: Loading
    predictBtn.innerText = 'Menganalisis...';
    predictBtn.disabled = true;
    resultOutput.style.display = 'none';

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            const prediction = result.prediction;
            let badgeClass = '';
            
            if (prediction === 'Flagship') badgeClass = 'badge-flagship';
            else if (prediction === 'Midrange') badgeClass = 'badge-midrange';
            else badgeClass = 'badge-budget';

            resultText.innerHTML = `
                <p style="color: var(--text-muted); margin-bottom: 5px;">Smartphone ini masuk ke kategori:</p>
                <div class="prediction-text ${badgeClass}">${prediction.toUpperCase()}</div>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 15px;">
                    Berdasarkan analisis algoritma KNN terhadap spesifikasi yang Anda masukkan.
                </p>
            `;
            
            resultOutput.style.display = 'block';
            resultOutput.classList.add('show');
            
            // Auto scroll to result
            resultOutput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error fetching prediction:', error);
        alert('Gagal menghubungi server. Pastikan Flask sedang berjalan.');
    } finally {
        predictBtn.innerText = 'Prediksi Segment Smartphone';
        predictBtn.disabled = false;
    }
}
