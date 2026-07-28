/**
 * TMDb API Service Module
 * Handles all requests to the TMDb API and transforms raw data into application-friendly objects.
 */

// Cache for movie genres (ID -> Name)
let genreCache = {};

/**
 * Initialize genre cache from TMDb API
 */
async function initGenreCache() {
    if (Object.keys(genreCache).length > 0) return genreCache;
    
    try {
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/genre/movie/list?api_key=${TMDB_CONFIG.API_KEY}&language=en-US`
        );
        if (!response.ok) throw new Error('Failed to fetch genres');
        const data = await response.json();
        
        data.genres.forEach(genre => {
            genreCache[genre.id] = genre.name;
        });
    } catch (error) {
        console.error('Error fetching genre cache:', error);
    }
    return genreCache;
}

/**
 * Format image path to full URL
 */
function getImageUrl(path, size = TMDB_CONFIG.POSTER_SIZE) {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `${TMDB_CONFIG.IMAGE_BASE_URL}${size}${path}`;
}

/**
 * Format backdrop path to full URL
 */
function getBackdropUrl(path) {
    if (!path) return 'https://via.placeholder.com/1280x720?text=No+Image';
    return `${TMDB_CONFIG.IMAGE_BASE_URL}${TMDB_CONFIG.BACKDROP_SIZE}${path}`;
}

/**
 * Transform TMDb movie item to UI model
 */
function transformMovieItem(item) {
    const genreNames = (item.genre_ids || [])
        .map(id => genreCache[id])
        .filter(Boolean);
        
    return {
        id: item.id.toString(),
        title: item.title || item.original_title || 'Untitled',
        tagline: item.overview ? item.overview.slice(0, 60) + '...' : '',
        poster: getImageUrl(item.poster_path),
        backdrop: getBackdropUrl(item.backdrop_path || item.poster_path),
        synopsis: item.overview || 'No description available.',
        genres: genreNames.length > 0 ? genreNames : ['Movie'],
        year: item.release_date ? new Date(item.release_date).getFullYear() : 'N/A',
        releaseDate: item.release_date || 'N/A',
        rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
        ageRating: item.adult ? '18+' : 'PG-13',
        duration: 'N/A', // Will be populated in details
        voteCount: item.vote_count || 0
    };
}

/**
 * Fetch Trending Movies (Week)
 */
async function fetchTrendingMovies() {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/trending/movie/week?api_key=${TMDB_CONFIG.API_KEY}`
        );
        if (!response.ok) throw new Error('Failed to fetch trending movies');
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error('Error fetching trending movies:', error);
        return [];
    }
}

/**
 * Fetch Popular Movies
 */
async function fetchPopularMovies() {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/popular?api_key=${TMDB_CONFIG.API_KEY}&language=en-US&page=1`
        );
        if (!response.ok) throw new Error('Failed to fetch popular movies');
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error('Error fetching popular movies:', error);
        return [];
    }
}

/**
 * Fetch Top Rated Movies
 */
async function fetchTopRatedMovies() {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/top_rated?api_key=${TMDB_CONFIG.API_KEY}&language=en-US&page=1`
        );
        if (!response.ok) throw new Error('Failed to fetch top rated movies');
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error('Error fetching top rated movies:', error);
        return [];
    }
}

/**
 * Fetch Upcoming Movies
 */
async function fetchUpcomingMovies() {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/upcoming?api_key=${TMDB_CONFIG.API_KEY}&language=en-US&page=1`
        );
        if (!response.ok) throw new Error('Failed to fetch upcoming movies');
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error('Error fetching upcoming movies:', error);
        return [];
    }
}

/**
 * Fetch Now Playing Movies
 */
async function fetchNowPlayingMovies() {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/now_playing?api_key=${TMDB_CONFIG.API_KEY}&language=en-US&page=1`
        );
        if (!response.ok) throw new Error('Failed to fetch now playing movies');
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error('Error fetching now playing movies:', error);
        return [];
    }
}

/**
 * Fetch Movies by Genre ID
 * Action: 28, Sci-Fi: 878, etc.
 */
async function fetchMoviesByGenre(genreId) {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/discover/movie?api_key=${TMDB_CONFIG.API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`
        );
        if (!response.ok) throw new Error(`Failed to fetch movies for genre ${genreId}`);
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error(`Error fetching movies for genre ${genreId}:`, error);
        return [];
    }
}

/**
 * Fetch Movies using TMDb Discover Filters (Genre, Year, Country)
 */
async function fetchFilteredMovies({ genreId = '', year = '', country = '' }) {
    try {
        await initGenreCache();
        let url = `${TMDB_CONFIG.BASE_URL}/discover/movie?api_key=${TMDB_CONFIG.API_KEY}&sort_by=popularity.desc&page=1`;

        if (genreId) {
            url += `&with_genres=${genreId}`;
        }
        
        if (year) {
            if (year === 'older') {
                url += `&primary_release_date.lte=2015-12-31`;
            } else {
                url += `&primary_release_year=${year}`;
            }
        }

        if (country) {
            url += `&with_origin_country=${country}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch filtered movies');
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error('Error fetching filtered movies:', error);
        return [];
    }
}

/**
 * Fetch Popular TV Shows
 */
async function fetchPopularTvShows() {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/tv/popular?api_key=${TMDB_CONFIG.API_KEY}&language=en-US&page=1`
        );
        if (!response.ok) throw new Error('Failed to fetch popular TV shows');
        const data = await response.json();
        return data.results.map(item => ({
            id: item.id.toString(),
            title: item.name || item.original_name || 'TV Show',
            tagline: item.overview ? item.overview.slice(0, 60) + '...' : '',
            poster: getImageUrl(item.poster_path),
            backdrop: getBackdropUrl(item.backdrop_path || item.poster_path),
            synopsis: item.overview || 'No description available.',
            genres: (item.genre_ids || []).map(id => genreCache[id]).filter(Boolean),
            year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'TV',
            rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
            ageRating: 'TV-MA'
        }));
    } catch (error) {
        console.error('Error fetching popular TV shows:', error);
        return [];
    }
}

/**
 * Fetch Full Movie Details (including credits, videos, reviews)
 */
async function fetchMovieDetails(movieId) {
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}&append_to_response=credits,videos,reviews,release_dates`
        );
        if (!response.ok) throw new Error(`Failed to fetch movie details for ID ${movieId}`);
        const data = await response.json();

        // Find director
        const directorObj = data.credits?.crew?.find(c => c.job === 'Director');
        const director = directorObj ? directorObj.name : 'Unknown';

        // Format cast
        const cast = (data.credits?.cast || []).slice(0, 8).map(actor => ({
            id: actor.id.toString(),
            name: actor.name,
            role: actor.character || 'Actor',
            image: actor.profile_path ? getImageUrl(actor.profile_path, TMDB_CONFIG.PROFILE_SIZE) : 'https://via.placeholder.com/150?text=No+Photo'
        }));

        // Format trailer URL (YouTube)
        const trailerObj = data.videos?.results?.find(
            v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        ) || data.videos?.results?.find(v => v.site === 'YouTube');
        
        const trailerUrl = trailerObj ? `https://www.youtube.com/embed/${trailerObj.key}` : '';

        // Format reviews
        const reviews = (data.reviews?.results || []).slice(0, 3).map(rev => ({
            id: rev.id,
            user: rev.author_details?.username || rev.author || 'User',
            avatar: rev.author_details?.avatar_path 
                ? (rev.author_details.avatar_path.startsWith('/http') 
                    ? rev.author_details.avatar_path.substring(1) 
                    : getImageUrl(rev.author_details.avatar_path, 'w45'))
                : `https://i.pravatar.cc/150?u=${rev.id}`,
            rating: rev.author_details?.rating ? (rev.author_details.rating / 2) : 4,
            date: rev.created_at ? rev.created_at.split('T')[0] : 'Recently',
            content: rev.content ? rev.content.slice(0, 300) + '...' : '',
            likes: Math.floor(Math.random() * 50) + 1
        }));

        // Duration string
        const hours = Math.floor((data.runtime || 0) / 60);
        const mins = (data.runtime || 0) % 60;
        const duration = data.runtime ? `${hours}h ${mins}m` : 'N/A';

        // Country
        const country = data.production_countries?.length > 0 ? data.production_countries[0].name : 'N/A';

        // Genres array
        const genres = data.genres ? data.genres.map(g => g.name) : [];

        return {
            id: data.id.toString(),
            title: data.title || data.original_title,
            tagline: data.tagline || (data.overview ? data.overview.slice(0, 60) + '...' : ''),
            poster: getImageUrl(data.poster_path),
            backdrop: getBackdropUrl(data.backdrop_path || data.poster_path),
            trailerUrl: trailerUrl,
            synopsis: data.overview || 'No description available.',
            genres: genres.length > 0 ? genres : ['Movie'],
            year: data.release_date ? new Date(data.release_date).getFullYear() : 'N/A',
            releaseDate: data.release_date || 'N/A',
            country: country,
            duration: duration,
            rating: data.vote_average ? Number(data.vote_average.toFixed(1)) : 0,
            ageRating: data.adult ? '18+' : 'PG-13',
            director: director,
            cast: cast,
            reviews: reviews,
            budget: data.budget ? `$${data.budget.toLocaleString()}` : 'N/A',
            revenue: data.revenue ? `$${data.revenue.toLocaleString()}` : 'N/A',
            originalLanguage: data.original_language ? data.original_language.toUpperCase() : 'EN',
            status: data.status || 'Released'
        };
    } catch (error) {
        console.error(`Error fetching movie details for ID ${movieId}:`, error);
        return null;
    }
}

/**
 * Search Movies by title
 */
async function searchMoviesQuery(query) {
    if (!query || !query.trim()) return [];
    try {
        await initGenreCache();
        const response = await fetch(
            `${TMDB_CONFIG.BASE_URL}/search/movie?api_key=${TMDB_CONFIG.API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
        );
        if (!response.ok) throw new Error('Search request failed');
        const data = await response.json();
        return data.results.map(transformMovieItem);
    } catch (error) {
        console.error('Error searching movies:', error);
        return [];
    }
}
