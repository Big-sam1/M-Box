/**
 * Relax.MV Movie Web Application Script
 * Integrated with TMDb API
 */

// Global State Variables
let heroMoviesList = [];
let currentHeroIndex = 0;
let heroInterval;
let searchDebounceTimeout = null;

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Navbar Scroll Effect
function handleNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    if (window.scrollY > 0) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
    }
}

// Search Bar Typing Placeholder Effect
function initSearchTyping() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const placeholders = [
        "Search movies...",
        "Find by actor...",
        "Search by director...",
        "Discover genres...",
        "Look for 'Avatar'...",
        "Find 'Action' movies..."
    ];
    
    let currentPlaceholderIndex = 0;
    let currentText = "";
    let isDeleting = false;
    let charIndex = 0;
    
    function type() {
        if (document.activeElement === searchInput || searchInput.value.length > 0) {
            setTimeout(type, 1000);
            return;
        }

        const currentPlaceholder = placeholders[currentPlaceholderIndex];
        
        if (isDeleting) {
            currentText = currentPlaceholder.substring(0, charIndex - 1);
            charIndex--;
        } else {
            currentText = currentPlaceholder.substring(0, charIndex + 1);
            charIndex++;
        }
        
        searchInput.placeholder = currentText;
        
        let typeSpeed = isDeleting ? 30 : 100;
        
        if (!isDeleting && charIndex === currentPlaceholder.length) {
            typeSpeed = 1500;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            currentPlaceholderIndex = (currentPlaceholderIndex + 1) % placeholders.length;
            typeSpeed = 500;
        }
        
        setTimeout(type, typeSpeed);
    }
    
    type();
}

// Hero Carousel Initialization & Updates
async function initHeroCarousel() {
    const trending = await fetchTrendingMovies();
    if (trending && trending.length > 0) {
        heroMoviesList = trending.slice(0, 5);
    } else {
        return;
    }

    updateHeroContent(heroMoviesList[0]);
    createHeroIndicators(heroMoviesList.length);
    
    resetHeroInterval();
}

function updateHeroContent(movie) {
    if (!movie) return;
    
    const heroSlide = document.getElementById('heroSlide');
    if (!heroSlide) return;
    const heroBackground = heroSlide.querySelector('.hero-background');
    
    if (heroBackground) {
        heroBackground.style.backgroundImage = `url(${movie.backdrop})`;
    }
    
    const titleEl = document.getElementById('heroTitle');
    const taglineEl = document.getElementById('heroTagline');
    const synopsisEl = document.getElementById('heroSynopsis');

    if (titleEl) titleEl.textContent = movie.title;
    if (taglineEl) taglineEl.textContent = movie.tagline || movie.genres.join(' • ');
    if (synopsisEl) synopsisEl.textContent = movie.synopsis;
    
    const heroInfo = heroSlide.querySelector('.hero-info');
    if (heroInfo) {
        heroInfo.innerHTML = `
            <span class="hero-rating"><i class="fas fa-star"></i> ${movie.rating}</span>
            <span class="hero-year">${movie.year}</span>
            <span class="hero-age-rating">${movie.ageRating}</span>
            <span class="hero-duration">${movie.releaseDate || '2024'}</span>
        `;
    }

    // Attach click events for Watch Trailer / More Info buttons in hero
    const heroButtons = heroSlide.querySelectorAll('.hero-buttons .btn');
    heroButtons.forEach(btn => {
        btn.onclick = () => openMovieModal(movie.id);
    });
}

function createHeroIndicators(count) {
    const indicatorsContainer = document.getElementById('heroIndicators');
    if (!indicatorsContainer) return;
    indicatorsContainer.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const indicator = document.createElement('div');
        indicator.className = `hero-indicator ${i === 0 ? 'active' : ''}`;
        indicator.onclick = () => {
            currentHeroIndex = i;
            if (heroMoviesList[i]) {
                updateHeroContent(heroMoviesList[i]);
                updateHeroIndicators();
                resetHeroInterval();
            }
        };
        indicatorsContainer.appendChild(indicator);
    }
}

function updateHeroIndicators() {
    const indicators = document.querySelectorAll('.hero-indicator');
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentHeroIndex);
    });
}

function resetHeroInterval() {
    clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        if (heroMoviesList.length > 0) {
            currentHeroIndex = (currentHeroIndex + 1) % heroMoviesList.length;
            updateHeroContent(heroMoviesList[currentHeroIndex]);
            updateHeroIndicators();
        }
    }, 8000);
}

// Render Movie Carousels from TMDb Data
async function initMovieCarousels() {
    // Show loaders in carousels
    ['trending', 'new-releases', 'action', 'scifi', 'acclaimed', 'tv-shows-carousel', 'my-list-carousel'].forEach(id => {
        showCarouselLoader(id);
    });

    // Fetch TMDb sections in parallel
    const [trending, popular, action, scifi, topRated, tvShows] = await Promise.all([
        fetchTrendingMovies(),
        fetchPopularMovies(),
        fetchMoviesByGenre(28),  // Action Genre ID
        fetchMoviesByGenre(878), // Sci-Fi Genre ID
        fetchTopRatedMovies(),
        fetchPopularTvShows()
    ]);

    renderMovieCarousel('trending', trending);
    renderMovieCarousel('new-releases', popular);
    renderMovieCarousel('action', action);
    renderMovieCarousel('scifi', scifi);
    renderMovieCarousel('acclaimed', topRated);
    renderMovieCarousel('tv-shows-carousel', tvShows);
    renderMovieCarousel('my-list-carousel', popular.slice(0, 6));
}

function showCarouselLoader(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner-container">
                <div class="spinner"></div>
                <span>Loading movies...</span>
            </div>
        `;
    }
}

function renderMovieCarousel(containerId, movies) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    if (!movies || movies.length === 0) {
        container.innerHTML = `
            <div class="error-message-container">
                <i class="fas fa-exclamation-circle"></i>
                <p>Unable to load movies right now.</p>
            </div>
        `;
        return;
    }

    movies.forEach(movie => {
        const card = createMovieCard(movie);
        container.appendChild(card);
    });
}

/**
 * Create Movie Card Component using exact existing markup
 */
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => openMovieModal(movie.id);
    
    const matchPercentage = Math.round(movie.rating * 10);
    
    card.innerHTML = `
        <div class="movie-card-poster">
            <img src="${movie.poster}" alt="${movie.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750?text=No+Poster'">
            <div class="movie-card-overlay">
                <div class="movie-card-actions">
                    <button class="card-action-btn play" onclick="event.stopPropagation(); openMovieModal('${movie.id}')">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="card-action-btn add" onclick="event.stopPropagation(); toggleMyList('${movie.id}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <h3 class="movie-card-title">${movie.title}</h3>
                <div class="movie-card-info">
                    <span>${matchPercentage}% Match</span>
                    <span class="movie-card-age">${movie.ageRating}</span>
                    <span class="movie-card-duration">${movie.year}</span>
                </div>
                <div class="movie-card-genres">
                    ${(movie.genres || []).slice(0, 2).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Carousel Scroll Navigation
function scrollCarousel(carouselId, direction) {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    const scrollAmount = carousel.offsetWidth / 1.5;
    carousel.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

/**
 * Open Movie Modal & Load Detailed TMDb Info
 */
async function openMovieModal(movieInput) {
    const modal = document.getElementById('movieModal');
    if (!modal) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset fields to placeholder while fetching details
    document.getElementById('modalBackdrop').src = '';
    document.getElementById('modalTitle').textContent = 'Loading...';
    document.getElementById('modalTagline').textContent = '';
    document.getElementById('modalRating').innerHTML = `<i class="fas fa-star"></i> --/10`;
    document.getElementById('modalDuration').textContent = '--';
    document.getElementById('modalYear').textContent = '--';
    document.getElementById('modalAge').textContent = '--';
    document.getElementById('modalSynopsis').textContent = 'Fetching movie details from TMDb...';
    document.getElementById('modalDirector').textContent = '...';
    document.getElementById('modalCountry').textContent = '...';
    document.getElementById('modalTrailer').src = '';
    document.getElementById('modalCast').innerHTML = '<div class="spinner"></div>';
    document.getElementById('modalReviews').innerHTML = '<div class="spinner"></div>';
    document.getElementById('modalSidebarInfo').innerHTML = 'Loading info...';

    // Obtain movie object or fetch by ID
    let movieId = typeof movieInput === 'object' ? movieInput.id : movieInput;
    const movieDetails = await fetchMovieDetails(movieId);

    if (!movieDetails) {
        document.getElementById('modalTitle').textContent = 'Movie Details Unavailable';
        document.getElementById('modalSynopsis').textContent = 'Could not load details from TMDb. Please try again later.';
        document.getElementById('modalCast').innerHTML = '';
        document.getElementById('modalReviews').innerHTML = '';
        return;
    }

    // Populate modal elements
    document.getElementById('modalBackdrop').src = movieDetails.backdrop;
    document.getElementById('modalTitle').textContent = movieDetails.title;
    document.getElementById('modalTagline').textContent = movieDetails.tagline || movieDetails.genres.join(', ');
    document.getElementById('modalRating').innerHTML = `<i class="fas fa-star"></i> ${movieDetails.rating}/10`;
    document.getElementById('modalDuration').textContent = movieDetails.duration;
    document.getElementById('modalYear').textContent = movieDetails.year;
    document.getElementById('modalAge').textContent = movieDetails.ageRating;
    document.getElementById('modalSynopsis').textContent = movieDetails.synopsis;
    document.getElementById('modalDirector').textContent = movieDetails.director;
    document.getElementById('modalCountry').textContent = movieDetails.country;
    
    // Trailer embed iframe
    const trailerIframe = document.getElementById('modalTrailer');
    if (movieDetails.trailerUrl) {
        trailerIframe.src = movieDetails.trailerUrl;
        trailerIframe.parentElement.style.display = 'block';
    } else {
        trailerIframe.parentElement.style.display = 'none';
    }

    // Render Cast
    const castContainer = document.getElementById('modalCast');
    if (movieDetails.cast && movieDetails.cast.length > 0) {
        castContainer.innerHTML = movieDetails.cast.map(actor => `
            <div class="cast-member">
                <img src="${actor.image}" alt="${actor.name}" class="cast-avatar" onerror="this.src='https://via.placeholder.com/150?text=No+Photo'">
                <div class="cast-info">
                    <div class="cast-name">${actor.name}</div>
                    <div class="cast-role">${actor.role}</div>
                </div>
            </div>
        `).join('');
    } else {
        castContainer.innerHTML = '<p style="color: var(--text-tertiary);">No cast details available.</p>';
    }

    // Render Reviews
    const reviewsContainer = document.getElementById('modalReviews');
    if (movieDetails.reviews && movieDetails.reviews.length > 0) {
        reviewsContainer.innerHTML = movieDetails.reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-user">
                        <img src="${review.avatar}" alt="${review.user}" class="review-avatar" onerror="this.src='https://i.pravatar.cc/150'">
                        <div class="review-user-info">
                            <h4>${review.user}</h4>
                            <div class="review-rating">
                                ${Array(5).fill(0).map((_, i) => `
                                    <i class="fas fa-star ${i < Math.floor(review.rating) ? '' : 'far'}"></i>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <span class="review-date">${review.date}</span>
                </div>
                <p class="review-content">${review.content}</p>
                <div class="review-actions">
                    <button class="review-action-btn">
                        <i class="fas fa-thumbs-up"></i> ${review.likes} Helpful
                    </button>
                    <button class="review-action-btn">
                        <i class="fas fa-comment"></i> Reply
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        reviewsContainer.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 1.5rem;">No reviews available for this movie.</p>';
    }

    // Render Sidebar Info
    const sidebarInfo = document.getElementById('modalSidebarInfo');
    sidebarInfo.innerHTML = `
        <div class="sidebar-info-item">
            <span class="sidebar-label">Original Title</span>
            <span class="sidebar-value">${movieDetails.title}</span>
        </div>
        <div class="sidebar-info-item">
            <span class="sidebar-label">Status</span>
            <span class="sidebar-value">${movieDetails.status}</span>
        </div>
        <div class="sidebar-info-item">
            <span class="sidebar-label">Language</span>
            <span class="sidebar-value">${movieDetails.originalLanguage}</span>
        </div>
        <div class="sidebar-info-item">
            <span class="sidebar-label">Budget</span>
            <span class="sidebar-value">${movieDetails.budget}</span>
        </div>
        <div class="sidebar-info-item">
            <span class="sidebar-label">Revenue</span>
            <span class="sidebar-value">${movieDetails.revenue}</span>
        </div>
    `;
}

function closeMovieModal() {
    const modal = document.getElementById('movieModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Stop YouTube video playback
    const trailerIframe = document.getElementById('modalTrailer');
    if (trailerIframe) {
        trailerIframe.src = '';
    }
}

// Toggle My List placeholder functionality
function toggleMyList(movieId) {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '2rem';
    notification.style.right = '2rem';
    notification.style.backgroundColor = 'var(--accent-primary)';
    notification.style.color = 'white';
    notification.style.padding = '0.75rem 1.5rem';
    notification.style.borderRadius = '0.375rem';
    notification.style.zIndex = '3000';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> Added to My List!`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
}

// Search Functionality
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounceTimeout);

        if (query.length === 0) {
            clearSearchResults();
            return;
        }

        if (query.length >= 2) {
            searchDebounceTimeout = setTimeout(() => {
                performSearch(query);
            }, 400);
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query.length > 0) {
                clearTimeout(searchDebounceTimeout);
                performSearch(query);
            }
        }
    });
}

async function performSearch(query) {
    const section = document.getElementById('searchResultsSection');
    const grid = document.getElementById('searchResultsGrid');
    const title = document.getElementById('searchQueryTitle');

    if (!section || !grid) return;

    section.style.display = 'block';
    if (title) title.textContent = `- "${query}"`;
    
    grid.innerHTML = `
        <div class="loading-spinner-container">
            <div class="spinner"></div>
            <span>Searching TMDb for "${query}"...</span>
        </div>
    `;

    // Scroll smoothly to search section
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const results = await searchMoviesQuery(query);
    grid.innerHTML = '';

    if (results.length === 0) {
        grid.innerHTML = `
            <div class="error-message-container">
                <i class="fas fa-search"></i>
                <p>No movies found matching "${query}". Try another title.</p>
            </div>
        `;
        return;
    }

    results.forEach(movie => {
        const card = createMovieCard(movie);
        grid.appendChild(card);
    });
}

function clearSearchResults() {
    const section = document.getElementById('searchResultsSection');
    const grid = document.getElementById('searchResultsGrid');
    const searchInput = document.getElementById('searchInput');

    if (section) section.style.display = 'none';
    if (grid) grid.innerHTML = '';
    if (searchInput) searchInput.value = '';
}

// Filter Functionality
function initFilters() {
    const genreFilter = document.getElementById('genreFilter');
    const yearFilter = document.getElementById('yearFilter');
    const countryFilter = document.getElementById('countryFilter');

    const handleFilterChange = async () => {
        const genre = genreFilter ? genreFilter.value : '';
        const year = yearFilter ? yearFilter.value : '';
        const country = countryFilter ? countryFilter.value : '';

        // Mapping local genre names to TMDb Genre IDs
        const genreMap = {
            'action': 28,
            'adventure': 12,
            'animation': 16,
            'comedy': 35,
            'crime': 80,
            'documentary': 99,
            'drama': 18,
            'family': 10751,
            'fantasy': 14,
            'history': 36,
            'horror': 27,
            'music': 10402,
            'mystery': 9648,
            'romance': 10749,
            'sci-fi': 878,
            'tv-movie': 10770,
            'thriller': 53,
            'war': 10752,
            'western': 37
        };

        if (genre || year || country) {
            const genreId = genre ? genreMap[genre.toLowerCase()] : '';
            const labelParts = [];
            if (genre) labelParts.push(`Genre: ${genre.toUpperCase()}`);
            if (year) labelParts.push(`Year: ${year}`);
            if (country) labelParts.push(`Country: ${country}`);

            const filteredMovies = await fetchFilteredMovies({ genreId, year, country });
            performFilteredDisplay(filteredMovies, labelParts.join(' | '));
        } else {
            clearSearchResults();
        }
    };

    if (genreFilter) genreFilter.addEventListener('change', handleFilterChange);
    if (yearFilter) yearFilter.addEventListener('change', handleFilterChange);
    if (countryFilter) countryFilter.addEventListener('change', handleFilterChange);
}

function performFilteredDisplay(movies, label) {
    const section = document.getElementById('searchResultsSection');
    const grid = document.getElementById('searchResultsGrid');
    const title = document.getElementById('searchQueryTitle');

    if (!section || !grid) return;

    section.style.display = 'block';
    if (title) title.textContent = `- (${label})`;

    grid.innerHTML = '';
    if (!movies || movies.length === 0) {
        grid.innerHTML = `
            <div class="error-message-container">
                <i class="fas fa-filter"></i>
                <p>No movies found for selected filter.</p>
            </div>
        `;
        return;
    }

    movies.forEach(movie => {
        const card = createMovieCard(movie);
        grid.appendChild(card);
    });

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Google Translate Element Initialization
function googleTranslateElementInit() {
    if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
    }
}

// Full Website Language Switching Handler
function changeLanguage(langCode, langName) {
    const langLabel = document.getElementById('currentLangText');
    if (langLabel) langLabel.textContent = langName;

    const dropdown = document.getElementById('translateDropdown');
    if (dropdown) dropdown.classList.remove('active');

    // Set translation cookies for full page translation
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=/en/${langCode}; path=/`;

    // Trigger Mateza or Google Translate Engine
    if (window.Mateza && typeof window.Mateza.setLanguage === 'function') {
        window.Mateza.setLanguage(langCode);
    } else {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change'));
        } else {
            // Reload page with translation cookie active
            window.location.reload();
        }
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initSearchTyping();
    initSearch();
    initFilters();
    
    // Fetch live TMDb data for hero & carousels
    initHeroCarousel();
    initMovieCarousels();
    
    // Event Listeners
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) mobileBtn.addEventListener('click', toggleMobileMenu);

    // Notification Bell Listener
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationDot = document.getElementById('notificationDot');
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationDropdown.classList.toggle('active');
            if (notificationDot) notificationDot.style.display = 'none';
        });

        document.addEventListener('click', function(e) {
            if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('active');
            }
        });
    }

    // Mateza / Language Translation Trigger
    const matezaBtn = document.getElementById('matezaTranslateBtn');
    const translateDropdown = document.getElementById('translateDropdown');
    if (matezaBtn && translateDropdown) {
        matezaBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (window.Mateza && typeof window.Mateza.open === 'function') {
                window.Mateza.open();
            } else {
                translateDropdown.classList.toggle('active');
            }
        });

        document.addEventListener('click', function(e) {
            if (!matezaBtn.contains(e.target) && !translateDropdown.contains(e.target)) {
                translateDropdown.classList.remove('active');
            }
        });
    }

    // Scroll To Top Floating Button Handler
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });

        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Fully Functional & Responsive Nav Link Smooth Scrolling
    document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const targetHref = this.getAttribute('href');
            if (targetHref && targetHref.startsWith('#')) {
                e.preventDefault();
                
                if (targetHref === '#home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    const targetEl = document.querySelector(targetHref);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }

                // Auto-close mobile menu
                const mobileMenu = document.getElementById('mobileMenu');
                if (mobileMenu) mobileMenu.classList.remove('active');

                // Update active link state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    window.addEventListener('scroll', handleNavbarScroll);
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMovieModal();
        }
    });
});
