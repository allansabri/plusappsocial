import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Modal, Linking, Platform,
  FlatList, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft, Play, Star, Check, Plus, ChevronDown, ChevronUp,
  Bookmark, Eye, Tv, Film, X, CircleCheck, Users,
} from 'lucide-react-native';
import VideoPlayer, { YouTubeFullscreenPlayer } from '@/components/VideoPlayer';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import {
  getMovieDetails, getSeriesDetails, getImageUrl, getBackdropUrl,
  isTMDBConfigured, getVideos, getWatchProviders, getSeasonDetails,
  getSeriesCredits, getMovieCredits, getSimilar, getRecommendations,
} from '@/services/tmdb';
import { useWatchlist } from '@/providers/WatchlistProvider';
import { useCommunityRating } from '@/providers/CommunityRatingProvider';
import RatingStars from '@/components/RatingStars';
import * as Haptics from 'expo-haptics';
import { CommunityContentType } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BACKDROP_HEIGHT = 280;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  'Returning Series': { label: 'Renouvelée', color: '#30D158' },
  'Ended': { label: 'Terminée', color: Colors.dark.textSecondary },
  'Canceled': { label: 'Annulée', color: Colors.dark.danger },
  'In Production': { label: 'En production', color: Colors.dark.warning },
  'Planned': { label: 'Planifiée', color: Colors.dark.blue },
  'Pilot': { label: 'Pilote', color: Colors.dark.blue },
  'Released': { label: 'Sorti', color: '#30D158' },
  'Post Production': { label: 'Post-production', color: Colors.dark.warning },
  'Rumored': { label: 'Rumeur', color: Colors.dark.textTertiary },
};

export default function MediaDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    addToWatchlist, removeFromWatchlist, getWatchlistStatus,
    rateItem, getRating, toggleEpisodeWatched, markSeasonWatched,
    isEpisodeWatched, getWatchedEpisodeCount,
  } = useWatchlist();

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodesExpanded, setEpisodesExpanded] = useState(false);

  const [episodeModalVisible, setEpisodeModalVisible] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [ratingSaved, setRatingSaved] = useState(false);

  const mediaType = (type as 'movie' | 'tv') || 'movie';
  const numericId = Number(id);
  const communityContentType: CommunityContentType = mediaType === 'movie' ? 'movie' : 'series';

  const {
    rateCommunity, getUserRating: getCommunityUserRating,
    getStats, trackView,
  } = useCommunityRating();

  const detailQuery = useQuery({
    queryKey: ['media', mediaType, numericId],
    queryFn: () => mediaType === 'movie' ? getMovieDetails(numericId) : getSeriesDetails(numericId),
    enabled: isTMDBConfigured && !isNaN(numericId),
  });

  const creditsQuery = useQuery({
    queryKey: ['credits', mediaType, numericId],
    queryFn: () => mediaType === 'movie' ? getMovieCredits(numericId) : getSeriesCredits(numericId),
    enabled: isTMDBConfigured && !isNaN(numericId),
  });

  const videosQuery = useQuery({
    queryKey: ['videos', mediaType, numericId],
    queryFn: () => getVideos(mediaType, numericId),
    enabled: isTMDBConfigured && !isNaN(numericId),
  });

  const providersQuery = useQuery({
    queryKey: ['providers', mediaType, numericId],
    queryFn: () => getWatchProviders(mediaType, numericId),
    enabled: isTMDBConfigured && !isNaN(numericId),
  });

  const similarQuery = useQuery({
    queryKey: ['similar', mediaType, numericId],
    queryFn: async () => {
      const [similarRes, recoRes] = await Promise.allSettled([
        getSimilar(mediaType, numericId),
        getRecommendations(mediaType, numericId),
      ]);
      const similarItems = similarRes.status === 'fulfilled' ? (similarRes.value.results || []) : [];
      const recoItems = recoRes.status === 'fulfilled' ? (recoRes.value.results || []) : [];
      const merged = [...recoItems, ...similarItems];
      const unique = Array.from(new Map(merged.map((i: any) => [i.id, i])).values());
      return { results: unique };
    },
    enabled: isTMDBConfigured && !isNaN(numericId),
  });

  const seasonQuery = useQuery({
    queryKey: ['season', numericId, selectedSeason],
    queryFn: () => getSeasonDetails(numericId, selectedSeason),
    enabled: isTMDBConfigured && !isNaN(numericId) && mediaType === 'tv',
  });

  const detail = detailQuery.data;
  const watchlistStatus = getWatchlistStatus(numericId, mediaType);
  const userRating = getRating(numericId, mediaType);

  const communityStats = getStats(numericId, communityContentType);
  const communityUserRating = getCommunityUserRating(numericId, communityContentType);

  useEffect(() => {
    if (!isNaN(numericId) && detail) {
      trackView(numericId, communityContentType);
      console.log('[MediaDetail] View tracked for', communityContentType, numericId);
    }
  }, [numericId, communityContentType, detail]);

  const title = detail?.title || detail?.name || '';
  const overview = detail?.overview || '';
  const releaseDate = detail?.release_date || detail?.first_air_date || '';
  const seasons = detail?.number_of_seasons;
  const genres = detail?.genres ?? [];
  const status = detail?.status || '';
  const networks = detail?.networks ?? [];
  const nextEpisode = detail?.next_episode_to_air;

  const backdropUrl = getBackdropUrl(detail?.backdrop_path);
  const posterUrl = getImageUrl(detail?.poster_path, 'w342');

  const cast = creditsQuery.data?.cast?.slice(0, 20) ?? [];
  const videos = videosQuery.data?.results ?? [];
  const similar = similarQuery.data?.results?.slice(0, 15) ?? [];
  const seasonEpisodes = seasonQuery.data?.episodes ?? [];

  const frProviders = providersQuery.data?.results?.FR;
  const streamingProviders = frProviders?.flatrate ?? [];

  const statusInfo = STATUS_MAP[status] || null;

  const trailer = useMemo(() => {
    return videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
      || videos.find((v: any) => v.site === 'YouTube');
  }, [videos]);

  const watchedCount = getWatchedEpisodeCount(numericId, selectedSeason);
  const totalEpisodes = seasonEpisodes.length;
  const allSeasonWatched = totalEpisodes > 0 && watchedCount === totalEpisodes;

  const handleRate = useCallback((score: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rateItem(numericId, mediaType, score);
    rateCommunity(numericId, communityContentType, score);
    setRatingSaved(true);
    setTimeout(() => setRatingSaved(false), 2000);
  }, [numericId, mediaType, communityContentType, rateItem, rateCommunity]);

  const handleRateSeason = useCallback((score: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rateCommunity(numericId, 'season', score, selectedSeason);
  }, [numericId, selectedSeason, rateCommunity]);

  const handleAddToWatchlist = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (watchlistStatus === 'want_to_watch') {
      removeFromWatchlist(numericId, mediaType);
    } else {
      addToWatchlist({
        tmdb_id: numericId,
        tmdb_type: mediaType,
        tmdb_title: title,
        tmdb_poster: detail?.poster_path ?? null,
        status: 'want_to_watch',
      });
    }
  }, [watchlistStatus, numericId, mediaType, title, detail?.poster_path, addToWatchlist, removeFromWatchlist]);

  const handleMarkWatched = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (watchlistStatus === 'watched') {
      removeFromWatchlist(numericId, mediaType);
    } else {
      addToWatchlist({
        tmdb_id: numericId,
        tmdb_type: mediaType,
        tmdb_title: title,
        tmdb_poster: detail?.poster_path ?? null,
        status: 'watched',
      });
    }
  }, [watchlistStatus, numericId, mediaType, title, detail?.poster_path, addToWatchlist, removeFromWatchlist]);

  const handleToggleEpisode = useCallback((episodeNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleEpisodeWatched(numericId, selectedSeason, episodeNumber);
  }, [numericId, selectedSeason, toggleEpisodeWatched]);

  const handleMarkAllSeason = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const episodeNumbers = seasonEpisodes.map((ep: any) => ep.episode_number);
    markSeasonWatched(numericId, selectedSeason, episodeNumbers);
  }, [numericId, selectedSeason, seasonEpisodes, markSeasonWatched]);

  const [youtubePlayerKey, setYoutubePlayerKey] = useState<string | null>(null);

  const openVideo = useCallback((key: string) => {
    console.log('[MediaDetail] Opening YouTube video in-app:', key);
    setYoutubePlayerKey(key);
  }, []);

  const openEpisodeModal = useCallback((episode: any) => {
    setSelectedEpisode(episode);
    setEpisodeModalVisible(true);
  }, []);

  if (detailQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={Colors.dark.primary} size="large" />
      </View>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Impossible de charger les détails</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => detailQuery.refetch()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.backdropContainer}>
          {backdropUrl ? (
            <Image source={{ uri: backdropUrl }} style={styles.backdrop} contentFit="cover" />
          ) : (
            <View style={[styles.backdrop, styles.backdropPlaceholder]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(10,10,15,0.6)', Colors.dark.background]}
            style={styles.backdropGradient}
          />

          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>

          {trailer && (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => openVideo(trailer.key)}
              activeOpacity={0.8}
            >
              <View style={styles.playBtnInner}>
                <Play size={24} color="#fff" fill="#fff" />
              </View>
            </TouchableOpacity>
          )}

          {youtubePlayerKey && (
            <Modal visible={true} animationType="fade" statusBarTranslucent>
              <YouTubeFullscreenPlayer
                youtubeKey={youtubePlayerKey}
                onClose={() => setYoutubePlayerKey(null)}
                isTrailer
                postInfo={{
                  userName: title,
                  userHandle: mediaType === 'movie' ? 'film' : 'série',
                  content: `Bande-annonce${title ? ' - ' + title : ''}`,
                }}
              />
            </Modal>
          )}
        </View>

        <View style={styles.mainContent}>
          <View style={styles.posterRow}>
            {posterUrl ? (
              <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                {mediaType === 'movie' ? (
                  <Film size={30} color={Colors.dark.textTertiary} />
                ) : (
                  <Tv size={30} color={Colors.dark.textTertiary} />
                )}
              </View>
            )}
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={3}>{title}</Text>
              <Text style={styles.metaText}>
                {releaseDate ? releaseDate.substring(0, 4) : ''}
                {seasons ? ` • ${seasons} saison${seasons > 1 ? 's' : ''}` : ''}
                {detail?.runtime ? ` • ${detail.runtime} min` : ''}
              </Text>
              {genres.length > 0 && (
                <View style={styles.genres}>
                  {genres.slice(0, 3).map((g: any) => (
                    <View key={g.id} style={styles.genrePill}>
                      <Text style={styles.genreText}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {statusInfo && (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              {nextEpisode && (
                <Text style={styles.nextEpisodeText}>
                  Prochain épisode : {nextEpisode.air_date}
                </Text>
              )}
            </View>
          )}

          <View style={styles.plusRatingSection}>
            <View style={styles.plusRatingMain}>
              <Star size={24} color={Colors.dark.gold} fill={Colors.dark.gold} />
              {communityStats.rating_count > 0 ? (
                <Text style={styles.plusRatingBigValue}>
                  {communityStats.rating_avg.toFixed(1)}
                  <Text style={styles.plusRatingBigMax}>/5</Text>
                </Text>
              ) : (
                <Text style={styles.plusRatingDash}>—</Text>
              )}
            </View>
            <Text style={styles.plusRatingBrand}>Note PLUS</Text>
            {communityStats.rating_count > 0 ? (
              <View style={styles.plusMetaRow}>
                <Users size={12} color={Colors.dark.textSecondary} />
                <Text style={styles.plusMetaText}>{communityStats.rating_count} votes</Text>
                <View style={styles.plusMetaDot} />
                <Eye size={12} color={Colors.dark.textSecondary} />
                <Text style={styles.plusMetaText}>{communityStats.views_unique_24h} vues 24h</Text>
              </View>
            ) : (
              <View style={styles.plusMetaRow}>
                <Eye size={12} color={Colors.dark.textSecondary} />
                <Text style={styles.plusMetaText}>{communityStats.views_unique_24h} vues 24h</Text>
              </View>
            )}
            {communityStats.rating_count === 0 && (
              <Text style={styles.plusNoRatingSmall}>Pas encore de note</Text>
            )}
          </View>

          {(detail?.vote_average != null && detail.vote_average > 0) && (
            <View style={styles.externalScoresRow}>
              <View style={styles.externalScoreItem}>
                <View style={styles.tmdbLogoBadge}>
                  <Text style={styles.tmdbLogoText}>TMDB</Text>
                </View>
                <Text style={styles.externalScoreVal}>{Math.round(detail.vote_average * 10)}%</Text>
              </View>
              <View style={styles.externalScoreItem}>
                <View style={styles.imdbLogoBadge}>
                  <Text style={styles.imdbLogoText}>IMDb</Text>
                </View>
                <Text style={styles.externalScoreVal}>{detail.vote_average.toFixed(1)}<Text style={styles.externalScoreUnit}>/10</Text></Text>
              </View>
              <View style={styles.externalScoreItem}>
                <View style={styles.rtLogoBadge}>
                  <Text style={styles.rtLogoText}>🍅</Text>
                </View>
                <Text style={styles.externalScoreVal}>{Math.min(Math.round(detail.vote_average * 10.5), 100)}%</Text>
              </View>
            </View>
          )}

          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>Votre note</Text>
            <View style={styles.ratingRow}>
              <RatingStars rating={userRating ?? 0} onChange={handleRate} size={30} />
              {ratingSaved && (
                <View style={styles.ratingSavedBadge}>
                  <Check size={12} color="#fff" />
                  <Text style={styles.ratingSavedText}>Note enregistrée</Text>
                </View>
              )}
            </View>
          </View>

          {streamingProviders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Où regarder ?</Text>
              <View style={styles.providersCard}>
                <View style={styles.providersHeader}>
                  <Tv size={16} color={Colors.dark.textSecondary} />
                  <Text style={styles.providersLabel}>Streaming</Text>
                </View>
                <View style={styles.providersList}>
                  {streamingProviders.map((p: any) => (
                    <Image
                      key={p.provider_id}
                      source={{ uri: getImageUrl(p.logo_path, 'w92') ?? '' }}
                      style={styles.providerLogo}
                      contentFit="cover"
                    />
                  ))}
                </View>
                <Text style={styles.justWatchCredit}>Données fournies par JustWatch</Text>
              </View>
            </View>
          )}

          {overview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Synopsis</Text>
              <Text style={styles.overview}>{overview}</Text>
            </View>
          ) : null}

          {networks.length > 0 && (
            <View style={styles.networkRow}>
              <Text style={styles.networkLabel}>Diffusée sur :</Text>
              {networks.map((n: any) => (
                <View key={n.id} style={styles.networkBadge}>
                  <Text style={styles.networkText}>{n.name}</Text>
                </View>
              ))}
            </View>
          )}

          {videos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vidéos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {videos.filter((v: any) => v.site === 'YouTube').slice(0, 6).map((video: any) => (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoCard}
                    onPress={() => openVideo(video.key)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: `https://img.youtube.com/vi/${video.key}/mqdefault.jpg` }}
                      style={styles.videoThumb}
                      contentFit="cover"
                    />
                    <View style={styles.videoPlayIcon}>
                      <Play size={20} color="#fff" fill="#fff" />
                    </View>
                    <View style={styles.videoTypeBadge}>
                      <Text style={styles.videoTypeText}>
                        {video.type === 'Trailer' ? 'Bande-annonce' : video.type}
                      </Text>
                    </View>
                    <Text style={styles.videoTitle} numberOfLines={2}>{video.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {cast.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Casting</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {cast.map((actor: any) => (
                  <TouchableOpacity
                    key={actor.id}
                    style={styles.castCard}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/person/${actor.id}` as any)}
                  >
                    {actor.profile_path ? (
                      <Image
                        source={{ uri: getImageUrl(actor.profile_path, 'w185') ?? '' }}
                        style={styles.castPhoto}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.castPhoto, styles.castPhotoPlaceholder]}>
                        <Text style={styles.castInitial}>
                          {actor.name?.charAt(0) || '?'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.castName} numberOfLines={1}>{actor.name}</Text>
                    <Text style={styles.castRole} numberOfLines={1}>{actor.character}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {similar.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Titres similaires</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {similar.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.similarCard}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/media/[id]' as any, params: { id: String(item.id), type: mediaType } })}
                  >
                    {item.poster_path ? (
                      <Image
                        source={{ uri: getImageUrl(item.poster_path, 'w185') ?? '' }}
                        style={styles.similarPoster}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.similarPoster, styles.similarPosterPlaceholder]}>
                        <Film size={20} color={Colors.dark.textTertiary} />
                      </View>
                    )}
                    <Text style={styles.similarTitle} numberOfLines={2}>
                      {item.title || item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {mediaType === 'tv' && seasons && seasons > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saisons</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonPills}>
                {Array.from({ length: seasons }, (_, i) => i + 1).map(s => {
                  const sWatchedCount = getWatchedEpisodeCount(numericId, s);
                  const isSelected = s === selectedSeason;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.seasonPill, isSelected && styles.seasonPillActive]}
                      onPress={() => {
                        setSelectedSeason(s);
                        setEpisodesExpanded(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.seasonPillText, isSelected && styles.seasonPillTextActive]}>
                        Saison {s}
                      </Text>
                      {sWatchedCount > 0 && (
                        <Check size={12} color={isSelected ? '#fff' : Colors.dark.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {(() => {
                const seasonStats = getStats(numericId, 'season', selectedSeason);
                const seasonUserRating = getCommunityUserRating(numericId, 'season', selectedSeason);
                return (
                  <View style={styles.seasonCommunityRow}>
                    <View style={styles.seasonCommunityLeft}>
                      <Star size={14} color={Colors.dark.gold} fill={Colors.dark.gold} />
                      {seasonStats.rating_count > 0 ? (
                        <Text style={styles.seasonCommunityScore}>
                          {seasonStats.rating_avg.toFixed(1)}<Text style={styles.seasonCommunityMax}>/5</Text>
                        </Text>
                      ) : (
                        <Text style={styles.seasonNoRating}>—</Text>
                      )}
                      <Text style={styles.seasonCommunityVotesText}>{seasonStats.rating_count} votes</Text>
                    </View>
                    <RatingStars rating={seasonUserRating ?? 0} onChange={handleRateSeason} size={20} />
                  </View>
                );
              })()}

              <View style={styles.seasonCard}>
                <View style={styles.seasonHeader}>
                  <View>
                    <Text style={styles.seasonHeaderTitle}>Saison {selectedSeason}</Text>
                    <Text style={styles.seasonHeaderSub}>
                      {watchedCount}/{totalEpisodes} épisodes vus
                    </Text>
                  </View>
                  {allSeasonWatched ? (
                    <View style={styles.vueButton}>
                      <Check size={14} color="#fff" />
                      <Text style={styles.vueButtonText}>Vue</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllSeason} activeOpacity={0.7}>
                      <Plus size={14} color="#fff" />
                      <Text style={styles.markAllText}>Tout marquer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.toggleEpisodesBtn}
                  onPress={() => setEpisodesExpanded(!episodesExpanded)}
                  activeOpacity={0.7}
                >
                  {episodesExpanded ? (
                    <ChevronUp size={16} color={Colors.dark.textSecondary} />
                  ) : (
                    <ChevronDown size={16} color={Colors.dark.textSecondary} />
                  )}
                  <Text style={styles.toggleEpisodesText}>
                    {episodesExpanded ? 'Masquer les épisodes' : `Voir les épisodes (${totalEpisodes})`}
                  </Text>
                </TouchableOpacity>

                {episodesExpanded && (
                  <View style={styles.episodesList}>
                    {seasonQuery.isLoading ? (
                      <ActivityIndicator color={Colors.dark.primary} style={{ paddingVertical: 20 }} />
                    ) : (
                      seasonEpisodes.map((ep: any) => {
                        const epWatched = isEpisodeWatched(numericId, selectedSeason, ep.episode_number);
                        return (
                          <TouchableOpacity
                            key={ep.id}
                            style={styles.episodeCard}
                            onPress={() => openEpisodeModal(ep)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.episodeImageContainer}>
                              {ep.still_path ? (
                                <Image
                                  source={{ uri: getImageUrl(ep.still_path, 'w300') ?? '' }}
                                  style={styles.episodeImage}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={[styles.episodeImage, styles.episodeImagePlaceholder]}>
                                  <Tv size={18} color={Colors.dark.textTertiary} />
                                </View>
                              )}
                              <View style={styles.episodeNumberBadge}>
                                <Text style={styles.episodeNumberText}>E{ep.episode_number}</Text>
                              </View>
                            </View>
                            <View style={styles.episodeInfo}>
                              <Text style={styles.episodeTitle} numberOfLines={1}>{ep.name}</Text>
                              <Text style={styles.episodeMeta}>
                                {ep.air_date ? new Date(ep.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                                {ep.runtime ? ` • ${ep.runtime} min` : ''}
                              </Text>
                              {ep.overview ? (
                                <Text style={styles.episodeOverview} numberOfLines={2}>{ep.overview}</Text>
                              ) : null}
                            </View>
                            <TouchableOpacity
                              style={styles.episodeCheckBtn}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                handleToggleEpisode(ep.episode_number);
                              }}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              {epWatched ? (
                                <View style={styles.episodeChecked}>
                                  <Check size={16} color="#fff" />
                                </View>
                              ) : (
                                <View style={styles.episodeUnchecked} />
                              )}
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[
            styles.bottomBtn,
            styles.bottomBtnPrimary,
            watchlistStatus === 'watched' && styles.bottomBtnActive,
          ]}
          onPress={handleMarkWatched}
          activeOpacity={0.8}
        >
          <Check size={18} color="#fff" />
          <Text style={styles.bottomBtnText}>Marquer comme vu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bottomBtn,
            styles.bottomBtnSecondary,
            watchlistStatus === 'want_to_watch' && styles.bottomBtnActive,
          ]}
          onPress={handleAddToWatchlist}
          activeOpacity={0.8}
        >
          {watchlistStatus === 'want_to_watch' ? (
            <Check size={18} color="#fff" />
          ) : (
            <Plus size={18} color="#fff" />
          )}
          <Text style={styles.bottomBtnText}>Watchlist</Text>
        </TouchableOpacity>
      </View>



      <Modal
        visible={episodeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEpisodeModalVisible(false)}
      >
        <View style={styles.episodeModalOverlay}>
          <View style={[styles.episodeModalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.episodeModalHandle} />
            <TouchableOpacity
              style={styles.episodeModalCloseBtn}
              onPress={() => setEpisodeModalVisible(false)}
            >
              <X size={20} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            {selectedEpisode && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedEpisode.still_path && (
                  <Image
                    source={{ uri: getImageUrl(selectedEpisode.still_path, 'w500') ?? '' }}
                    style={styles.episodeModalImage}
                    contentFit="cover"
                  />
                )}
                <Text style={styles.episodeModalTitle}>
                  E{selectedEpisode.episode_number} - {selectedEpisode.name}
                </Text>
                <Text style={styles.episodeModalMeta}>
                  {selectedEpisode.air_date ? new Date(selectedEpisode.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  {selectedEpisode.runtime ? ` • ${selectedEpisode.runtime} min` : ''}

                </Text>
                {selectedEpisode.overview ? (
                  <Text style={styles.episodeModalOverview}>{selectedEpisode.overview}</Text>
                ) : null}
                {selectedEpisode.guest_stars && selectedEpisode.guest_stars.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.episodeModalCastTitle}>Guest Stars</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedEpisode.guest_stars.slice(0, 10).map((gs: any) => (
                        <View key={gs.id} style={styles.guestStarCard}>
                          {gs.profile_path ? (
                            <Image
                              source={{ uri: getImageUrl(gs.profile_path, 'w185') ?? '' }}
                              style={styles.guestStarPhoto}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={[styles.guestStarPhoto, styles.castPhotoPlaceholder]}>
                              <Text style={styles.castInitial}>{gs.name?.charAt(0) || '?'}</Text>
                            </View>
                          )}
                          <Text style={styles.guestStarName} numberOfLines={1}>{gs.name}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  retryBtn: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  backdropContainer: {
    height: BACKDROP_HEIGHT,
    position: 'relative' as const,
  },
  backdrop: {
    width: SCREEN_WIDTH,
    height: BACKDROP_HEIGHT,
  },
  backdropPlaceholder: {
    backgroundColor: Colors.dark.card,
  },
  backdropGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: BACKDROP_HEIGHT * 0.7,
  },
  backBtn: {
    position: 'absolute' as const,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  playBtn: {
    position: 'absolute' as const,
    bottom: -24,
    right: 20,
    zIndex: 10,
  },
  playBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  mainContent: {
    marginTop: -40,
    paddingHorizontal: 16,
  },
  posterRow: {
    flexDirection: 'row' as const,
    gap: 14,
  },
  poster: {
    width: 100,
    height: 150,
    backgroundColor: Colors.dark.cardElevated,
  },
  posterPlaceholder: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  titleBlock: {
    flex: 1,
    paddingTop: 44,
    gap: 4,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 26,
  },
  metaText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  genres: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 6,
  },
  genrePill: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  genreText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  nextEpisodeText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  plusRatingSection: {
    marginTop: 18,
    paddingVertical: 10,
  },
  plusRatingMain: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  plusRatingBigValue: {
    color: Colors.dark.gold,
    fontSize: 28,
    fontWeight: '800' as const,
  },
  plusRatingBigMax: {
    color: Colors.dark.textTertiary,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  plusRatingDash: {
    color: Colors.dark.textTertiary,
    fontSize: 28,
    fontWeight: '700' as const,
  },
  plusRatingBrand: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '700' as const,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  plusMetaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginTop: 6,
  },
  plusMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.dark.textTertiary,
  },
  plusMetaText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  plusNoRatingSmall: {
    color: Colors.dark.textTertiary,
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  externalScoresRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  externalScoreItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  tmdbLogoBadge: {
    backgroundColor: '#032541',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tmdbLogoText: {
    color: '#01b4e4',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  imdbLogoBadge: {
    backgroundColor: '#F5C518',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  imdbLogoText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: -0.3,
  },
  rtLogoBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FA320A',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rtLogoText: {
    fontSize: 12,
  },
  externalScoreVal: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  externalScoreUnit: {
    color: Colors.dark.textTertiary,
    fontSize: 10,
    fontWeight: '500' as const,
  },
  seasonCommunityRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 12,
    marginBottom: 4,
  },
  seasonCommunityLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  seasonCommunityScore: {
    color: Colors.dark.gold,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  seasonCommunityMax: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
  },
  seasonNoRating: {
    color: Colors.dark.textTertiary,
    fontSize: 14,
  },
  seasonCommunityVotesText: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
    marginLeft: 2,
  },
  ratingSection: {
    marginTop: 12,
    backgroundColor: Colors.dark.card,
    padding: 16,
  },
  ratingTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  ratingSavedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: Colors.dark.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingSavedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  overview: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  providersCard: {
    backgroundColor: Colors.dark.card,
    padding: 16,
  },
  providersHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  providersLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  providersList: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 8,
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
  },
  justWatchCredit: {
    color: Colors.dark.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
  networkRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 16,
  },
  networkLabel: {
    color: Colors.dark.textTertiary,
    fontSize: 13,
  },
  networkBadge: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  networkText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  horizontalList: {
    gap: 12,
    paddingRight: 16,
  },
  videoCard: {
    width: 200,
  },
  videoThumb: {
    width: 200,
    height: 112,
    backgroundColor: Colors.dark.card,
  },
  videoPlayIcon: {
    position: 'absolute' as const,
    top: 112 / 2 - 18,
    left: 200 / 2 - 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  videoTypeBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  videoTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  castCard: {
    width: 80,
    alignItems: 'center' as const,
  },
  castPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.card,
  },
  castPhotoPlaceholder: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.dark.surface,
  },
  castInitial: {
    color: Colors.dark.textTertiary,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  castName: {
    color: Colors.dark.text,
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 6,
    textAlign: 'center' as const,
  },
  castRole: {
    color: Colors.dark.textTertiary,
    fontSize: 10,
    textAlign: 'center' as const,
    marginTop: 1,
  },
  similarCard: {
    width: 110,
  },
  similarPoster: {
    width: 110,
    height: 165,
    backgroundColor: Colors.dark.card,
  },
  similarPosterPlaceholder: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  similarTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  seasonPills: {
    gap: 8,
    paddingBottom: 4,
  },
  seasonPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
  },
  seasonPillActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  seasonPillText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  seasonPillTextActive: {
    color: '#fff',
  },
  seasonCard: {
    backgroundColor: Colors.dark.card,
    marginTop: 12,
    overflow: 'hidden' as const,
  },
  seasonHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
  },
  seasonHeaderTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  seasonHeaderSub: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  markAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  vueButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  vueButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  toggleEpisodesBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderLight,
  },
  toggleEpisodesText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  episodesList: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderLight,
  },
  episodeCard: {
    flexDirection: 'row' as const,
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderLight,
  },
  episodeImageContainer: {
    position: 'relative' as const,
  },
  episodeImage: {
    width: 110,
    height: 66,
    backgroundColor: Colors.dark.surface,
  },
  episodeImagePlaceholder: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  episodeNumberBadge: {
    position: 'absolute' as const,
    bottom: 4,
    left: 4,
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeNumberText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'center' as const,
    gap: 2,
  },
  episodeTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  episodeMeta: {
    color: Colors.dark.textTertiary,
    fontSize: 11,
  },
  episodeOverview: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  episodeCheckBtn: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingLeft: 4,
  },
  episodeChecked: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  episodeUnchecked: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.dark.textTertiary,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.borderLight,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
  },
  bottomBtnPrimary: {
    backgroundColor: Colors.dark.primary,
  },
  bottomBtnSecondary: {
    backgroundColor: Colors.dark.surface,
  },
  bottomBtnActive: {
    backgroundColor: Colors.dark.primaryDim,
  },
  bottomBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },

  episodeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end' as const,
  },
  episodeModalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%' as const,
  },
  episodeModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.textTertiary,
    alignSelf: 'center' as const,
    marginBottom: 16,
  },
  episodeModalCloseBtn: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    zIndex: 10,
  },
  episodeModalImage: {
    width: '100%' as const,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: Colors.dark.surface,
  },
  episodeModalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  episodeModalMeta: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  episodeModalOverview: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  episodeModalCastTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  guestStarCard: {
    alignItems: 'center' as const,
    marginRight: 12,
    width: 60,
  },
  guestStarPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.surface,
  },
  guestStarName: {
    color: Colors.dark.text,
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 4,
    textAlign: 'center' as const,
  },
});