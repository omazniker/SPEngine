/** Basis-Felder eines UniverseProfiles, wie sie von `get_universe_profiles`-RPC geliefert werden. */
export interface UniverseProfileListItem {
  id: string;
  name: string;
  bond_count: number;
  source_file: string | null;
  is_default: boolean;
  created_at: string;
}

/** Bond-Eintrag im Universe-Snapshot — Format bleibt minimal bis XLSX-Parser steht. */
export interface UniverseBond {
  [key: string]: unknown;
}

export interface UniverseProfileDetail extends UniverseProfileListItem {
  user_id: string;
  bonds: UniverseBond[];
}
