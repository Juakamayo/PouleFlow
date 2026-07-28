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

export interface FencerDTO {
  id: number;
  firstName: string;
  lastName: string;
  clubId: number | null;
  countryId: number;
  nationalRank: number | null;
  internationalRank: number | null;
  points: number;
}

export interface EventDTO {
  id: number;
  tournamentId: number;
  weaponId: number;
  categoryId: number;
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
