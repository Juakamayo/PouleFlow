export type Gender = 'MALE' | 'FEMALE' | 'MIXED';
export type WeaponName = 'EPEE' | 'FOIL' | 'SABER';

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

export interface PoolBoutDTO {
  id: number;
  poolId: number;
  fencerAId: number;
  fencerBId: number;
  scoreA: number;
  scoreB: number;
}
