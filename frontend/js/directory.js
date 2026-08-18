

    let providers = [];

    function loadDirectory() {
        const directory = document.getElementById("directory");
        directory.innerHTML = "Loading providers from database...";

        fetch('http://localhost:3000/api/providers')
            .then(response => response.json())
            .then(data => {
                providers = data; 
                displayProviders(providers); 
            })
            .catch(error => {
                console.error('Error loading directory:', error);
                directory.innerHTML = '<div class="empty" style="color: red;">Failed to load directory. Is the server running?</div>';
            });
    }

    function displayProviders(providerList) {

        const directory =
            document.getElementById("directory");

        directory.innerHTML = "";

        if (providerList.length === 0) {

            directory.innerHTML = `
                <div class="empty">
                    No providers found.
                </div>
            `;

            return;
        }

        providerList.forEach(provider => {

            const card =
                document.createElement("div");

            card.className = "provider-card";

            card.innerHTML = `

                <h2>${provider.name}</h2>

                <div class="info">
                    <strong>Provider ID:</strong>
                    ${provider.provider_id}
                </div>

                <div class="info">
                    <strong>Session Fee:</strong>
                    ৳${provider.session_fee}
                </div>

                <div class="info">
                    <strong>Maximum Capacity:</strong>
                    ${provider.max_capacity}
                </div>

                <div class="info rating">
                    <strong>Rating:</strong>
                    ${provider.rating_avg} / 5
                </div>

                <div class="info">
                    <strong>Latitude:</strong>
                    ${provider.latitude}
                </div>

                <div class="info">
                    <strong>Longitude:</strong>
                    ${provider.longitude}
                </div>

                <div class="info">
                    <strong>District ID:</strong>
                    ${provider.district_id}
                </div>

                ${
                    provider.accepts_insurance

                    ? `
                        <span class="insurance">
                            Accepts Insurance
                        </span>
                    `

                    : `
                        <span class="no-insurance">
                            Does Not Accept Insurance
                        </span>
                    `
                }

            `;

            directory.appendChild(card);

        });

    }

    function filterProviders() {

        const search =
            document
                .getElementById("searchInput")
                .value
                .toLowerCase();

        const insurance =
            document
                .getElementById("insuranceFilter")
                .value;

        const filtered =
            providers.filter(provider => {

                const matchesSearch =
                    provider.name
                        .toLowerCase()
                        .includes(search);

                const matchesInsurance =
                    insurance === "" ||
                    String(provider.accepts_insurance) === insurance;

                return (
                    matchesSearch &&
                    matchesInsurance
                );

            });

        displayProviders(filtered);

    }

    document
        .getElementById("searchInput")
        .addEventListener(
            "input",
            filterProviders
        );

    document
        .getElementById("insuranceFilter")
        .addEventListener(
            "change",
            filterProviders
        );

