export interface ProductionUpdate {
  id: string;
  tmdb_id: number;
  tmdb_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  status: 'rumored' | 'pre_production' | 'filming' | 'post_production' | 'completed' | 'released' | 'renewed' | 'cancelled';
  statusLabel: string;
  statusColor: string;
  details: string;
  date?: string;
  filmingLocation?: string;
  filmingStart?: string;
  filmingEnd?: string;
  releaseDate?: string;
  season?: number;
  source?: string;
  updatedAt: string;
}

export const PRODUCTION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  rumored: { label: 'Rumeur', color: '#6B7280' },
  pre_production: { label: 'Pré-production', color: '#8B5CF6' },
  filming: { label: 'En tournage', color: '#FF9F0A' },
  post_production: { label: 'Post-production', color: '#06B6D4' },
  completed: { label: 'Terminé', color: '#30D158' },
  released: { label: 'Sorti', color: '#30D158' },
  renewed: { label: 'Renouvelée', color: '#2563EB' },
  cancelled: { label: 'Annulée', color: '#FF453A' },
};

export const MOCK_PRODUCTION_UPDATES: ProductionUpdate[] = [
  {
    id: 'pu1',
    tmdb_id: 1399,
    tmdb_type: 'tv',
    title: 'A Knight of the Seven Kingdoms',
    poster_path: '/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg',
    status: 'filming',
    statusLabel: 'Saison 2 en tournage',
    statusColor: '#FF9F0A',
    details: 'Le tournage de la saison 2 a débuté à Belfast. La production devrait durer jusqu\'en août 2026.',
    filmingLocation: 'Belfast, Irlande du Nord',
    filmingStart: '2026-02-10',
    filmingEnd: '2026-08-15',
    season: 2,
    source: 'Deadline',
    updatedAt: '2026-02-22T10:00:00Z',
  },
  {
    id: 'pu2',
    tmdb_id: 572802,
    tmdb_type: 'movie',
    title: 'Aquaman et le Royaume Perdu 2',
    poster_path: '/8xV47NDrjdZDpkVcCFqkdHa3T0C.jpg',
    status: 'pre_production',
    statusLabel: 'En développement',
    statusColor: '#8B5CF6',
    details: 'Le script est en cours d\'écriture. James Wan confirmé à la réalisation. Casting prévu pour le printemps 2026.',
    releaseDate: '2027-12-20',
    source: 'The Hollywood Reporter',
    updatedAt: '2026-02-20T14:00:00Z',
  },
  {
    id: 'pu3',
    tmdb_id: 693134,
    tmdb_type: 'movie',
    title: 'Dune 3',
    poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    status: 'filming',
    statusLabel: 'En tournage',
    statusColor: '#FF9F0A',
    details: 'Le tournage principal se déroule actuellement en Jordanie et à Budapest. Denis Villeneuve dirige le troisième volet basé sur "Le Messie de Dune".',
    filmingLocation: 'Jordanie / Budapest, Hongrie',
    filmingStart: '2026-01-15',
    filmingEnd: '2026-06-30',
    releaseDate: '2027-03-19',
    source: 'Variety',
    updatedAt: '2026-02-21T08:00:00Z',
  },
  {
    id: 'pu4',
    tmdb_id: 94997,
    tmdb_type: 'tv',
    title: 'House of the Dragon',
    poster_path: '/z2yahl2uefxDCl0nogcRBstwruJ.jpg',
    status: 'post_production',
    statusLabel: 'Saison 3 en post-production',
    statusColor: '#06B6D4',
    details: 'Le tournage est terminé. La saison 3 est actuellement en phase de post-production avec des effets spéciaux et le montage final.',
    season: 3,
    releaseDate: '2026-06-15',
    source: 'HBO',
    updatedAt: '2026-02-18T16:00:00Z',
  },
  {
    id: 'pu5',
    tmdb_id: 76479,
    tmdb_type: 'tv',
    title: 'The Boys',
    poster_path: '/stTEycfG9Lkz7IlqaiEEjKK7syh.jpg',
    status: 'filming',
    statusLabel: 'Saison finale en tournage',
    statusColor: '#FF9F0A',
    details: 'La saison 5, qui sera la dernière, est actuellement en cours de tournage à Toronto. La production prévoit une fin épique pour la série.',
    filmingLocation: 'Toronto, Canada',
    filmingStart: '2025-11-01',
    filmingEnd: '2026-04-30',
    season: 5,
    source: 'Prime Video',
    updatedAt: '2026-02-19T12:00:00Z',
  },
  {
    id: 'pu6',
    tmdb_id: 550,
    tmdb_type: 'movie',
    title: 'The Batman 2',
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    status: 'pre_production',
    statusLabel: 'Pré-production',
    statusColor: '#8B5CF6',
    details: 'Matt Reeves a terminé le scénario. Robert Pattinson reprendra le rôle. Le tournage devrait démarrer au printemps 2026 à Londres.',
    filmingLocation: 'Londres, Royaume-Uni',
    filmingStart: '2026-04-01',
    releaseDate: '2027-10-01',
    source: 'Warner Bros.',
    updatedAt: '2026-02-15T09:00:00Z',
  },
  {
    id: 'pu7',
    tmdb_id: 1396,
    tmdb_type: 'tv',
    title: 'Stranger Things',
    poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    status: 'post_production',
    statusLabel: 'Saison finale en post-production',
    statusColor: '#06B6D4',
    details: 'Le tournage de la saison 5 est terminé. Les Duffer Brothers supervisent la post-production avec des effets visuels massifs.',
    season: 5,
    releaseDate: '2026-07-04',
    source: 'Netflix',
    updatedAt: '2026-02-17T11:00:00Z',
  },
  {
    id: 'pu8',
    tmdb_id: 157336,
    tmdb_type: 'movie',
    title: 'Inception 2',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    status: 'rumored',
    statusLabel: 'Rumeur',
    statusColor: '#6B7280',
    details: 'Des sources proches de Warner Bros. suggèrent que Christopher Nolan serait en discussions préliminaires pour une suite d\'Inception. Rien n\'est confirmé.',
    source: 'The Wrap',
    updatedAt: '2026-02-10T15:00:00Z',
  },
  {
    id: 'pu9',
    tmdb_id: 100088,
    tmdb_type: 'tv',
    title: 'The Last of Us',
    poster_path: '/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
    status: 'renewed',
    statusLabel: 'Saison 3 renouvelée',
    statusColor: '#2563EB',
    details: 'HBO a officiellement renouvelé The Last of Us pour une troisième saison. L\'écriture du scénario a commencé.',
    season: 3,
    source: 'HBO',
    updatedAt: '2026-02-12T10:00:00Z',
  },
  {
    id: 'pu10',
    tmdb_id: 238,
    tmdb_type: 'movie',
    title: 'Avatar 3',
    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    status: 'post_production',
    statusLabel: 'Post-production',
    statusColor: '#06B6D4',
    details: 'James Cameron est en pleine post-production pour Avatar 3. Les effets visuels révolutionnaires nécessitent encore plusieurs mois de travail.',
    releaseDate: '2026-12-19',
    source: '20th Century Studios',
    updatedAt: '2026-02-14T13:00:00Z',
  },
];

export function getStatusFilterOptions() {
  return [
    { key: 'all', label: 'Tous' },
    { key: 'filming', label: 'En tournage' },
    { key: 'post_production', label: 'Post-prod' },
    { key: 'pre_production', label: 'Pré-prod' },
    { key: 'renewed', label: 'Renouvelée' },
    { key: 'rumored', label: 'Rumeurs' },
  ];
}