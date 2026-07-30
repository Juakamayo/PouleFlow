export type Gender = 'MALE' | 'FEMALE' | 'MIXED';
export type WeaponName = 'EPEE' | 'FOIL' | 'SABER';
export type BoutStatus = 'COMPLETED' | 'ABANDONMENT' | 'EXCLUSION' | 'MEDICAL' | 'PENDING';

export interface CountryDTO {
  id: number;
  name: string;
  iocCode: string;
}

export interface ClubDTO {
  id: number;
  name: string;
  shortCode: string;
  countryId: number;
  country?: CountryDTO;
}

export interface RefereeDTO {
  id: number;
  firstName: string;
  lastName: string;
  countryId: number;
  country?: CountryDTO;
}

export interface FencerDTO {
  id: number;
  firstName: string;
  lastName: string;
  clubId: number | null;
  club?: ClubDTO | null;
  countryId: number;
  country?: CountryDTO;
  nationalRank: number | null;
  internationalRank: number | null;
  points: number;
}

export interface WeaponDTO {
  id: number;
  name: WeaponName;
}

export interface CategoryDTO {
  id: number;
  name: string;
}

export interface TournamentDTO {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string | null;
}

export interface EventDTO {
  id: number;
  tournamentId: number;
  tournament?: TournamentDTO;
  weaponId: number;
  weapon?: WeaponDTO;
  categoryId: number;
  category?: CategoryDTO;
  gender: Gender;
}

export interface RegistrationDTO {
  id: number;
  eventId: number;
  event?: EventDTO;
  fencerId: number;
  fencer?: FencerDTO;
  seedRank: number | null;
}

export interface PoolAssignmentDTO {
  id: number;
  poolId: number;
  fencerId: number;
  fencer?: FencerDTO;
  victories: number;
  touchesScored: number;
  touchesReceived: number;
  indicator: number;
}

export interface PoolDTO {
  id: number;
  eventId: number;
  poolNumber: number;
  pisteNumber: number | null;
  refereeId: number | null;
  referee?: RefereeDTO | null;
  assignments: PoolAssignmentDTO[];
  bouts?: PoolBoutDTO[];
}

export interface PoolBoutDTO {
  id: number;
  poolId: number;
  fencerAId: number;
  fencerBId: number;
  scoreA: number;
  scoreB: number;
}

export interface BracketMatchDTO {
  id: number;
  tableauId: number;
  round: number;
  position: number;
  fencerAId: number | null;
  fencerA?: FencerDTO | null;
  fencerBId: number | null;
  fencerB?: FencerDTO | null;
  winnerId: number | null;
  winner?: FencerDTO | null;
  refereeId: number | null;
  scoreA: number;
  scoreB: number;
  status: BoutStatus;
  targetTouches: number;
}

export interface TableauDTO {
  id: number;
  eventId: number;
  size: number;
  roundConfigs: Record<number, number>;
  bracketMatches: BracketMatchDTO[];
  createdAt: string;
  updatedAt: string;
}
