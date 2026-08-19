const cityCoordinates = {
    'Dhaka': { latitude: 23.8103, longitude: 90.4125 },
    'Chittagong': { latitude: 22.3569, longitude: 91.7832 },
    'Sylhet': { latitude: 24.8949, longitude: 91.8687 },
    'Rajshahi': { latitude: 24.3636, longitude: 88.6241 },
    'Khulna': { latitude: 22.8456, longitude: 89.5403 },
    'Barisal': { latitude: 22.7010, longitude: 90.3535 },
    'Rangpur': { latitude: 25.7439, longitude: 89.2752 }
};

document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    const city = document.getElementById('city').value;
    const coords = cityCoordinates[city] || { latitude: null, longitude: null };

    const patientData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        date_of_birth: document.getElementById('dob').value,
        income_bracket: document.getElementById('income').value,
        preferred_language: document.getElementById('preferred_language').value,
        street: document.getElementById('street').value,
        city: city,
        zip_code: document.getElementById('zip_code').value,
        latitude: coords.latitude,
        longitude: coords.longitude
    };

    fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patientData)
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || 'Success!'); 
        document.getElementById('registrationForm').reset(); 
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Something went wrong. Check the console.');
    });
});
