const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p';

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY || '';

export const isTMDBConfigured = Boolean(API_KEY);

export function getImageUrl(path: string | null, size: string = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE}/${size}${path}`;
}

export function getBackdropUrl(path: string | null): string | null {
  return getImageUrl(path, 'w1280');
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const searchParams = new URLSearchParams({ api_key: API_KEY, language: 'fr-FR', ...params });
  const url = `${TMDB_BASE}${endpoint}?${searchParams.toString()}`;
  console.log('[TMDB] Fetching:', endpoint);
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('[TMDB] Error:', res.status, errorText);
    throw new Error(`TMDB API error: ${res.status}`);
  }
  return res.json();
}

export async function searchMulti(query: string, page: number = 1) {
  return tmdbFetch<{ page: number; results: any[]; total_pages: number; total_results: number }>('/search/multi', {
    query,
    page: String(page),
    include_adult: 'false',
  });
}

export async function getTrending(mediaType: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week') {
  return tmdbFetch<{ results: any[] }>(`/trending/${mediaType}/${timeWindow}`);
}

export async function getNowPlaying() {
  return tmdbFetch<{ results: any[] }>('/movie/now_playing');
}

export async function getPopularSeries() {
  return tmdbFetch<{ results: any[] }>('/tv/popular');
}

export async function getUpcoming() {
  return tmdbFetch<{ results: any[] }>('/movie/upcoming');
}

export async function getUpcomingMovies(page: number = 1) {
  return tmdbFetch<{ results: any[]; total_pages: number; page: number }>('/movie/upcoming', { page: String(page), region: 'FR' });
}

export async function getUpcomingTVShows(page: number = 1) {
  return tmdbFetch<{ results: any[]; total_pages: number; page: number }>('/tv/on_the_air', { page: String(page), watch_region: 'FR' });
}

export async function getTrendingDay() {
  return tmdbFetch<{ results: any[] }>('/trending/all/day');
}

export async function discoverByGenre(genreId: number, mediaType: 'movie' | 'tv' = 'movie', page: number = 1) {
  return tmdbFetch<{ results: any[]; total_pages: number; page: number }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    page: String(page),
    sort_by: 'popularity.desc',
  });
}

export async function discoverByProvider(providerId: number, mediaType: 'movie' | 'tv' = 'movie', page: number = 1) {
  return tmdbFetch<{ results: any[]; total_pages: number; page: number }>(`/discover/${mediaType}`, {
    with_watch_providers: String(providerId),
    watch_region: 'FR',
    page: String(page),
    sort_by: 'popularity.desc',
  });
}

export async function getMovieDetails(id: number) {
  return tmdbFetch<any>(`/movie/${id}`);
}

export async function getSeriesDetails(id: number) {
  return tmdbFetch<any>(`/tv/${id}`);
}

export async function getMovieCredits(id: number) {
  return tmdbFetch<{ cast: any[]; crew: any[] }>(`/movie/${id}/credits`);
}

export async function getSeriesCredits(id: number) {
  return tmdbFetch<{ cast: any[]; crew: any[] }>(`/tv/${id}/credits`);
}

export async function getSimilar(type: 'movie' | 'tv', id: number) {
  return tmdbFetch<{ results: any[] }>(`/${type}/${id}/similar`);
}

export async function getVideos(type: 'movie' | 'tv', id: number) {
  return tmdbFetch<{ results: any[] }>(`/${type}/${id}/videos`);
}

export async function getWatchProviders(type: 'movie' | 'tv', id: number) {
  return tmdbFetch<{ results: Record<string, any> }>(`/${type}/${id}/watch/providers`);
}

export async function getSeasonDetails(seriesId: number, seasonNumber: number) {
  return tmdbFetch<any>(`/tv/${seriesId}/season/${seasonNumber}`);
}

export async function getPersonDetails(personId: number) {
  return tmdbFetch<any>(`/person/${personId}`);
}

export async function getPersonCredits(personId: number) {
  return tmdbFetch<{ cast: any[]; crew: any[] }>(`/person/${personId}/combined_credits`);
}

export async function getRecommendations(type: 'movie' | 'tv', id: number) {
  return tmdbFetch<{ results: any[] }>(`/${type}/${id}/recommendations`);
}

export async function getUpcomingMoviesMultiPage(pages: number = 5) {
  const requests = Array.from({ length: pages }, (_, i) => getUpcomingMovies(i + 1));
  const results = await Promise.allSettled(requests);
  const allMovies: any[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allMovies.push(...(result.value.results || []));
    }
  }
  return allMovies;
}

export async function getUpcomingTVMultiPage(pages: number = 5) {
  const requests = Array.from({ length: pages }, (_, i) => getUpcomingTVShows(i + 1));
  const results = await Promise.allSettled(requests);
  const allShows: any[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allShows.push(...(result.value.results || []));
    }
  }
  return allShows;
}

export async function getPopularMovies(page: number = 1) {
  return tmdbFetch<{ results: any[]; total_pages: number; page: number }>('/movie/popular', { page: String(page), region: 'FR' });
}

const FR_ORIGIN_COUNTRIES = 'FR|US|GB|DE|ES|IT|CA|MX|BR|AR|CO|CL|PT|NL|BE|CH|AT|SE|NO|DK|FI|IE|PL|CZ|HU|RO|GR|PE|UY';

export async function discoverUpcoming(mediaType: 'movie' | 'tv', page: number = 1) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const params: Record<string, string> = {
    page: String(page),
    sort_by: 'popularity.desc',
    watch_region: 'FR',
    with_origin_country: FR_ORIGIN_COUNTRIES,
  };
  if (mediaType === 'movie') {
    params['primary_release_date.gte'] = today;
    params['primary_release_date.lte'] = futureDate;
  } else {
    params['first_air_date.gte'] = today;
    params['first_air_date.lte'] = futureDate;
  }
  return tmdbFetch<{ results: any[]; total_pages: number }>(`/discover/${mediaType}`, params);
}

export async function discoverUpcomingByCountry(mediaType: 'movie' | 'tv', countries: string, page: number = 1) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const params: Record<string, string> = {
    page: String(page),
    sort_by: 'popularity.desc',
    watch_region: 'FR',
    with_origin_country: countries,
  };
  if (mediaType === 'movie') {
    params['primary_release_date.gte'] = today;
    params['primary_release_date.lte'] = futureDate;
  } else {
    params['first_air_date.gte'] = today;
    params['first_air_date.lte'] = futureDate;
  }
  return tmdbFetch<{ results: any[]; total_pages: number }>(`/discover/${mediaType}`, params);
}

export async function discoverByGenreAndRegion(genreId: number, mediaType: 'movie' | 'tv' = 'movie', page: number = 1) {
  return tmdbFetch<{ results: any[]; total_pages: number; page: number }>(`/discover/${mediaType}`, {
    with_genres: String(genreId),
    page: String(page),
    sort_by: 'popularity.desc',
    watch_region: 'FR',
  });
}

export async function getPopularByProvider(providerId: number, mediaType: 'movie' | 'tv' = 'movie', page: number = 1) {
  return tmdbFetch<{ results: any[]; total_pages: number }>(`/discover/${mediaType}`, {
    with_watch_providers: String(providerId),
    watch_region: 'FR',
    page: String(page),
    sort_by: 'popularity.desc',
  });
}

export async function getPersonImages(personId: number) {
  return tmdbFetch<{ profiles: any[] }>(`/person/${personId}/images`);
}

export async function getExternalIds(type: 'movie' | 'tv', id: number) {
  return tmdbFetch<{ imdb_id?: string; facebook_id?: string; instagram_id?: string; twitter_id?: string }>(`/${type}/${id}/external_ids`);
}

export async function getMediaImages(type: 'movie' | 'tv', id: number) {
  return tmdbFetch<{ posters: { file_path: string; iso_639_1: string | null; vote_average: number; width: number; height: number }[] }>(
    `/${type}/${id}/images`,
    { include_image_language: 'fr,en,null' }
  );
}