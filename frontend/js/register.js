document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault(); 

    const patientData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        date_of_birth: document.getElementById('dob').value
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
