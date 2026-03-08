import { Badge, Challenge, LeaderboardEntry } from '@/types';

export const ALL_BADGES: Badge[] = [
  { id: 'b1', name: 'Premier Pas', description: 'Regardez votre premier film', icon: '🎬', category: 'watching', progress: 0, target: 1 },
  { id: 'b2', name: 'Cinéphile', description: 'Regardez 10 films', icon: '🍿', category: 'watching', progress: 0, target: 10 },
  { id: 'b3', name: 'Marathonien', description: 'Regardez 50 films', icon: '🏃', category: 'watching', progress: 0, target: 50 },
  { id: 'b4', name: 'Binge Watcher', description: 'Terminez 5 séries', icon: '📺', category: 'watching', progress: 0, target: 5 },
  { id: 'b5', name: 'Sériephile', description: 'Terminez 20 séries', icon: '🎭', category: 'watching', progress: 0, target: 20 },
  { id: 'b6', name: 'Critique', description: 'Publiez 10 avis', icon: '✍️', category: 'social', progress: 0, target: 10 },
  { id: 'b7', name: 'Influenceur', description: 'Obtenez 50 likes sur vos posts', icon: '❤️', category: 'social', progress: 0, target: 50 },
  { id: 'b8', name: 'Sociable', description: 'Suivez 20 personnes', icon: '👥', category: 'social', progress: 0, target: 20 },
  { id: 'b9', name: 'Collectionneur', description: 'Ajoutez 30 films à votre watchlist', icon: '📋', category: 'collection', progress: 0, target: 30 },
  { id: 'b10', name: 'Explorateur', description: 'Regardez des films de 10 genres différents', icon: '🌍', category: 'collection', progress: 0, target: 10 },
  { id: 'b11', name: 'Noctambule', description: 'Regardez un film après minuit', icon: '🌙', category: 'special', progress: 0, target: 1 },
  { id: 'b12', name: 'Dévoué', description: 'Connectez-vous 7 jours d\'affilée', icon: '🔥', category: 'special', progress: 0, target: 7 },
  { id: 'b13', name: 'Commentateur', description: 'Écrivez 25 commentaires', icon: '💬', category: 'social', progress: 0, target: 25 },
  { id: 'b14', name: 'Étoile Montante', description: 'Atteignez le niveau 10', icon: '⭐', category: 'special', progress: 0, target: 10 },
  { id: 'b15', name: 'Légende', description: 'Atteignez le niveau 25', icon: '👑', category: 'special', progress: 0, target: 25 },
  { id: 'b16', name: 'Challenger', description: 'Complétez 10 défis', icon: '🏆', category: 'special', progress: 0, target: 10 },
];

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: 'ch1', title: 'Film du jour', description: 'Regardez un film aujourd\'hui',
    type: 'daily', target: 1, progress: 0, reward_xp: 50,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(),
    completed: false, icon: '🎬',
  },
  {
    id: 'ch2', title: 'Critique express', description: 'Publiez un avis sur un film ou série',
    type: 'daily', target: 1, progress: 0, reward_xp: 30,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(),
    completed: false, icon: '✍️',
  },
  {
    id: 'ch3', title: 'Semaine cinéma', description: 'Regardez 5 films cette semaine',
    type: 'weekly', target: 5, progress: 2, reward_xp: 200,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    completed: false, icon: '🍿',
  },
  {
    id: 'ch4', title: 'Social papillon', description: 'Commentez 10 posts cette semaine',
    type: 'weekly', target: 10, progress: 4, reward_xp: 150,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    completed: false, icon: '💬',
  },
  {
    id: 'ch5', title: 'Marathon mensuel', description: 'Regardez 20 épisodes ce mois',
    type: 'monthly', target: 20, progress: 8, reward_xp: 500,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    completed: false, icon: '📺',
  },
  {
    id: 'ch6', title: 'Découverte', description: 'Regardez un film d\'un genre que vous ne connaissez pas',
    type: 'weekly', target: 1, progress: 0, reward_xp: 100,
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    completed: false, icon: '🌍',
  },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'lb1', username: 'cinephile_pro', display_name: 'Alexandre M.', avatar_url: null, xp: 12450, level: 24, rank: 1 },
  { id: 'lb2', username: 'movie_queen', display_name: 'Camille D.', avatar_url: null, xp: 11200, level: 22, rank: 2 },
  { id: 'lb3', username: 'binge_master', display_name: 'Théo L.', avatar_url: null, xp: 9800, level: 20, rank: 3 },
  { id: 'lb4', username: 'film_addict', display_name: 'Julie R.', avatar_url: null, xp: 8500, level: 18, rank: 4 },
  { id: 'lb5', username: 'serie_lover', display_name: 'Maxime B.', avatar_url: null, xp: 7200, level: 16, rank: 5 },
  { id: 'lb6', username: 'critic_eye', display_name: 'Léa P.', avatar_url: null, xp: 6800, level: 15, rank: 6 },
  { id: 'lb7', username: 'watch_all', display_name: 'Nathan F.', avatar_url: null, xp: 5900, level: 13, rank: 7 },
  { id: 'lb8', username: 'popcorn_time', display_name: 'Clara V.', avatar_url: null, xp: 5100, level: 12, rank: 8 },
  { id: 'lb9', username: 'screen_junkie', display_name: 'Lucas K.', avatar_url: null, xp: 4600, level: 11, rank: 9 },
  { id: 'lb10', username: 'cine_fan', display_name: 'Emma S.', avatar_url: null, xp: 4200, level: 10, rank: 10 },
];

export const XP_PER_LEVEL = 500;

export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(xp: number): { current: number; needed: number } {
  const currentLevelXp = xp % XP_PER_LEVEL;
  return { current: currentLevelXp, needed: XP_PER_LEVEL };
}

export const XP_REWARDS = {
  watch_movie: 100,
  watch_episode: 25,
  post_review: 50,
  comment: 10,
  like_received: 5,
  follow: 15,
  complete_challenge: 0,
  daily_login: 20,
} as const;