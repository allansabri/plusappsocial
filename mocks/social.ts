import { JournalEntry, UserMood, GroupedNotification } from '@/types';

export const MOOD_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: '😊', label: 'Content' },
  { emoji: '🤩', label: 'Excité' },
  { emoji: '😢', label: 'Ému' },
  { emoji: '😱', label: 'Choqué' },
  { emoji: '🤔', label: 'Pensif' },
  { emoji: '😴', label: 'Fatigué' },
  { emoji: '🥰', label: 'Amoureux' },
  { emoji: '😤', label: 'Frustré' },
  { emoji: '🎉', label: 'Festif' },
  { emoji: '😌', label: 'Détendu' },
  { emoji: '🫠', label: 'Nostalgique' },
  { emoji: '🔥', label: 'Motivé' },
];

export const STORY_REACTION_EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

export const MOCK_JOURNAL: JournalEntry[] = [
  { id: 'j1', tmdb_id: 550, tmdb_type: 'movie', tmdb_title: 'Fight Club', tmdb_poster: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', watched_at: '2026-02-22T20:00:00Z', rating: 4.5, note: 'Incroyable twist' },
  { id: 'j2', tmdb_id: 872585, tmdb_type: 'movie', tmdb_title: 'Oppenheimer', tmdb_poster: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', watched_at: '2026-02-20T21:00:00Z', rating: 4 },
  { id: 'j3', tmdb_id: 1396, tmdb_type: 'tv', tmdb_title: 'Breaking Bad', tmdb_poster: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg', watched_at: '2026-02-18T19:30:00Z', rating: 5, season: 5, episode: 16, note: 'La fin parfaite' },
  { id: 'j4', tmdb_id: 157336, tmdb_type: 'movie', tmdb_title: 'Interstellar', tmdb_poster: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', watched_at: '2026-02-15T22:00:00Z', rating: 5, note: 'Chef d\'oeuvre visuel' },
  { id: 'j5', tmdb_id: 1399, tmdb_type: 'tv', tmdb_title: 'Game of Thrones', tmdb_poster: '/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg', watched_at: '2026-02-12T20:00:00Z', rating: 3, season: 8, episode: 6 },
  { id: 'j6', tmdb_id: 238, tmdb_type: 'movie', tmdb_title: 'Le Parrain', tmdb_poster: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', watched_at: '2026-02-10T21:30:00Z', rating: 5, note: 'Classique absolu' },
  { id: 'j7', tmdb_id: 680, tmdb_type: 'movie', tmdb_title: 'Pulp Fiction', tmdb_poster: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', watched_at: '2026-02-08T19:00:00Z', rating: 4.5 },
];

export const MOCK_GROUPED_NOTIFICATIONS: GroupedNotification[] = [
  { id: 'gn1', type: 'like', users: [{ id: 'u1', name: 'Marie', avatar: null }, { id: 'u2', name: 'Lucas', avatar: null }, { id: 'u3', name: 'Emma', avatar: null }], message: 'ont aimé votre publication', postId: 'mock-1', timestamp: '2026-02-23T10:00:00Z', read: false, count: 3 },
  { id: 'gn2', type: 'follow', users: [{ id: 'u4', name: 'Hugo', avatar: null }, { id: 'u5', name: 'Léa', avatar: null }], message: 'vous suivent maintenant', timestamp: '2026-02-23T09:00:00Z', read: false, count: 2 },
  { id: 'gn3', type: 'mention', users: [{ id: 'u1', name: 'Marie', avatar: null }], message: 'vous a mentionné dans un commentaire', postId: 'mock-2', timestamp: '2026-02-23T08:30:00Z', read: false, count: 1 },
  { id: 'gn4', type: 'comment', users: [{ id: 'u2', name: 'Lucas', avatar: null }, { id: 'u6', name: 'Thomas', avatar: null }], message: 'ont commenté votre post', postId: 'mock-1', timestamp: '2026-02-22T18:00:00Z', read: true, count: 2 },
  { id: 'gn5', type: 'badge', users: [], message: 'Nouveau badge débloqué : Cinéphile 🍿', timestamp: '2026-02-22T15:00:00Z', read: true, count: 1 },
  { id: 'gn6', type: 'reminder', users: [], message: 'Dune 3 sort demain !', timestamp: '2026-02-22T12:00:00Z', read: true, count: 1 },
  { id: 'gn7', type: 'repost', users: [{ id: 'u3', name: 'Emma', avatar: null }], message: 'a reposté votre avis', postId: 'mock-3', timestamp: '2026-02-21T20:00:00Z', read: true, count: 1 },
  { id: 'gn8', type: 'like', users: [{ id: 'u7', name: 'Nathan', avatar: null }, { id: 'u8', name: 'Clara', avatar: null }, { id: 'u9', name: 'Maxime', avatar: null }, { id: 'u10', name: 'Julie', avatar: null }], message: 'ont aimé votre publication', postId: 'mock-2', timestamp: '2026-02-21T14:00:00Z', read: true, count: 4 },
];

export const COMPARISON_USERS = [
  { id: 'comp1', username: 'marie_films', display_name: 'Marie Dupont', avatar_url: null, compatibility: 85, commonMovies: 12, commonSeries: 5 },
  { id: 'comp2', username: 'lucas_series', display_name: 'Lucas Martin', avatar_url: null, compatibility: 72, commonMovies: 8, commonSeries: 9 },
  { id: 'comp3', username: 'emma_cinema', display_name: 'Emma Bernard', avatar_url: null, compatibility: 68, commonMovies: 15, commonSeries: 3 },
  { id: 'comp4', username: 'hugo_spoil', display_name: 'Hugo Petit', avatar_url: null, compatibility: 55, commonMovies: 6, commonSeries: 4 },
];

export const GENRE_STATS = [
  { genre: 'Action', count: 24, percentage: 22, color: '#FF4757' },
  { genre: 'Drame', count: 18, percentage: 17, color: '#2563EB' },
  { genre: 'Sci-Fi', count: 15, percentage: 14, color: '#30D158' },
  { genre: 'Thriller', count: 12, percentage: 11, color: '#FF9F0A' },
  { genre: 'Comédie', count: 10, percentage: 9, color: '#8B5CF6' },
  { genre: 'Horreur', count: 8, percentage: 7, color: '#FF453A' },
  { genre: 'Romance', count: 7, percentage: 6, color: '#F472B6' },
  { genre: 'Animation', count: 6, percentage: 5, color: '#06B6D4' },
  { genre: 'Documentaire', count: 5, percentage: 5, color: '#D4A810' },
  { genre: 'Autre', count: 4, percentage: 4, color: '#6B7280' },
];

export const MONTHLY_STATS = [
  { month: 'Sept', movies: 4, episodes: 12 },
  { month: 'Oct', movies: 6, episodes: 18 },
  { month: 'Nov', movies: 3, episodes: 22 },
  { month: 'Déc', movies: 8, episodes: 15 },
  { month: 'Janv', movies: 5, episodes: 20 },
  { month: 'Fév', movies: 7, episodes: 16 },
];