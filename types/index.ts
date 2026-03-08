export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  photos?: string[];
  video_url?: string | null;
  tmdb_id: number | null;
  tmdb_type: 'movie' | 'tv' | null;
  tmdb_title: string | null;
  tmdb_poster: string | null;
  tmdb_season?: number | null;
  tmdb_episode?: number | null;
  has_spoiler: boolean;
  created_at: string;
  updated_at?: string;
  profiles?: Profile;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  is_liked: boolean;
  is_following?: boolean;
  is_bookmarked?: boolean;
  is_reposted?: boolean;
  is_pinned?: boolean;
  is_draft?: boolean;
  rating?: number;
  views_count?: number;
  quote_text?: string | null;
  quoted_post?: Post | null;
  watch_date?: string | null;
  mentions?: string[];
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  has_spoiler: boolean;
  created_at: string;
  profiles?: Profile;
  mentions?: string[];
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  tmdb_type: 'movie' | 'tv';
  tmdb_title: string;
  tmdb_poster: string | null;
  status: 'want_to_watch' | 'watching' | 'watched';
  created_at: string;
}

export interface Rating {
  id: string;
  user_id: string;
  tmdb_id: number;
  tmdb_type: 'movie' | 'tv';
  score: number;
  review: string | null;
  created_at: string;
}

export type CommunityContentType = 'movie' | 'series' | 'season' | 'episode';

export interface CommunityRating {
  content_id: string;
  content_type: CommunityContentType;
  tmdb_id: number;
  parent_id?: string;
  season_number?: number;
  episode_number?: number;
  user_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityStats {
  content_id: string;
  rating_avg: number;
  rating_count: number;
  views_unique_24h: number;
}

export interface ContentView {
  content_id: string;
  viewer_id: string;
  viewed_at: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type?: string;
  genres?: TMDBGenre[];
  runtime?: number;
  tagline?: string;
  status?: string;
}

export interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type?: string;
  genres?: TMDBGenre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBSearchResult {
  page: number;
  results: (TMDBMovie & TMDBSeries & { media_type: string })[];
  total_pages: number;
  total_results: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'watching' | 'social' | 'collection' | 'special';
  unlockedAt?: string;
  progress: number;
  target: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  progress: number;
  reward_xp: number;
  startDate: string;
  endDate: string;
  completed: boolean;
  icon: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  rank: number;
}

export interface JournalEntry {
  id: string;
  tmdb_id: number;
  tmdb_type: 'movie' | 'tv';
  tmdb_title: string;
  tmdb_poster: string | null;
  watched_at: string;
  rating?: number;
  season?: number;
  episode?: number;
  note?: string;
}

export interface UserMood {
  emoji: string;
  label: string;
  mediaId?: number;
  mediaType?: 'movie' | 'tv';
  mediaTitle?: string;
  updatedAt: string;
}

export interface StoryReaction {
  storyId: string;
  emoji: string;
  userId: string;
  username: string;
  timestamp: string;
}

export interface PosterOverride {
  id: string;
  user_id: string;
  media_type: 'movie' | 'tv';
  tmdb_id: number;
  source: 'upload' | 'tmdb';
  custom_url: string | null;
  tmdb_poster_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseReminder {
  id: string;
  tmdb_id: number;
  tmdb_type: 'movie' | 'tv';
  tmdb_title: string;
  tmdb_poster: string | null;
  release_date: string;
  reminded: boolean;
}

export interface GroupedNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'mention' | 'badge' | 'reminder';
  users: { id: string; name: string; avatar: string | null }[];
  message: string;
  postId?: string;
  timestamp: string;
  read: boolean;
  count: number;
}