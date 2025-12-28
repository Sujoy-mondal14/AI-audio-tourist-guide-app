const API_URL = "http://localhost:3000";
let currentUser = null;
let currentReviewPlaceId = null;

// --- Auth System ---
async function login() {
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;

    if (!usernameInput || !passwordInput) {
        alert("Please enter both username and password");
        return;
    }

    try {
        // Attempt Login
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await response.json();

        if (data.success) {
            initializeSession(data.username);
        } else {
            // Login failed, offer signup
            const wantSignup = confirm("User not found or wrong password. Create new account?");
            if (wantSignup) {
                register(usernameInput, passwordInput);
            }
        }
    } catch (error) {
        console.error("Login Connection Error:", error);
        alert("Could not connect to server. Is it running?");
    }
}

async function register(username, password) {
    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            initializeSession(username);
        } else {
            alert("Sign Up Failed: " + data.message);
        }
    } catch (error) {
        console.error("Signup Error:", error);
    }
}

function initializeSession(user) {
    currentUser = user;
    document.getElementById('display-name').innerText = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    loadTopSpots();
}

function logout() {
    location.reload();
}

// --- Geolocation ---
function detectLocation() {
    const resultsArea = document.getElementById('results-area');
    resultsArea.innerHTML = '<p>Locating you...</p>';

    if (!navigator.geolocation) {
        resultsArea.innerHTML = '<p>Geolocation is not supported.</p>';
        return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        fetchNearbySpots(lat, lng);
        fetchWeather(lat, lng);
    }, () => {
        resultsArea.innerHTML = '<p>Unable to retrieve your location.</p>';
    });
}

// --- Fetch Data ---
async function fetchNearbySpots(lat, lng) {
    try {
        const response = await fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}`);
        const data = await response.json();
        renderSpots(data, 'results-area');
    } catch (error) {
        console.error(error);
        document.getElementById('results-area').innerHTML = '<p>Error fetching data.</p>';
    }
}

async function loadTopSpots() {
    try {
        const response = await fetch(`${API_URL}/top-visited`);
        const data = await response.json();
        renderSpots(data, 'top-spots');
    } catch (error) {
        console.error("Backend not running");
    }
}

function handleSearch() {
    const query = document.getElementById('search-input').value;
    if(!query) return;
    
    fetch(`${API_URL}/search?q=${query}`)
        .then(res => res.json())
        .then(data => renderSpots(data, 'results-area'));
}

// --- Rendering ---
function renderSpots(spots, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if(spots.length === 0) {
        container.innerHTML = '<p>No spots found.</p>';
        return;
    }

    spots.forEach(spot => {
        const card = document.createElement('div');
        card.className = 'spot-card';
        
        // Handle Audio
        let audioHtml = '';
        if (spot.audioUrl) {
            audioHtml = `<audio controls src="${spot.audioUrl}" style="width: 100%; margin-top: 10px;"></audio>`;
        } else {
            audioHtml = `<button class="btn-speak" onclick="speak('${spot.history.replace(/'/g, "\\'")}')">
                            <i class="fas fa-volume-up"></i> Listen History
                         </button>`;
        }

        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;

        card.innerHTML = `
            <div class="spot-header">
                <h4>${spot.name}</h4>
                <span class="rating">★ ${spot.rating}</span>
            </div>
            <p>${spot.description}</p>
            <p><small>🕒 ${spot.openTime} - ${spot.closeTime}</small> 
               <span class="status ${spot.isOpen ? 'open' : 'closed'}">${spot.isOpen ? 'Open' : 'Closed'}</span>
            </p>
            <div class="actions">
                <button class="btn-map" onclick="window.open('${mapUrl}', '_blank')">
                    <i class="fas fa-map-marker-alt"></i> View Map
                </button>
                ${audioHtml}
                <button class="btn-review" onclick="openReviewModal('${spot.id}', '${spot.name}')">
                    <i class="fas fa-star"></i> Review
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Features ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Text-to-speech not supported.");
    }
}

// --- Reviews ---
function openReviewModal(id, name) {
    currentReviewPlaceId = id;
    document.getElementById('modal-place-name').innerText = `Review ${name}`;
    document.getElementById('review-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('review-modal').classList.add('hidden');
}

function submitReview() {
    const text = document.getElementById('review-text').value;
    const rating = document.getElementById('review-rating').value;
    
    fetch(`${API_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            placeId: currentReviewPlaceId,
            user: currentUser,
            text: text,
            rating: rating
        })
    }).then(res => res.json()).then(data => {
        alert(data.message);
        closeModal();
    });
}


async function fetchWeather(lat, lng) {
    // PASTE YOUR API KEY HERE INSIDE THE QUOTES
    const apiKey = "b1d6a00a2b9e9f20792485d9499a74a4"; 
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.weather) {
            const temp = Math.round(data.main.temp);
            const desc = data.weather[0].description;
            const iconCode = data.weather[0].icon;
            
            // Update UI
            document.getElementById('weather-temp').innerText = `${temp}°C`;
            document.getElementById('weather-desc').innerText = desc;
            document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            
            // Show the box
            document.getElementById('weather-box').classList.remove('hidden');
        }
    } catch (error) {
        console.error("Weather Error:", error);
    }
}