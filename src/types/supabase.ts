/**
 * Platzhalter bis `npm run gen:types` erstmals gegen ein reales Supabase-Projekt läuft.
 * Sobald ein Schema existiert, diese Datei NICHT manuell editieren — immer regenerieren.
 *
 * Für den Übergangszustand lassen wir die Schema-Einträge offen: RPCs und Tabellen
 * werden aus den Migrations abgeleitet und sind hier nur lose tippiert. Die echten
 * Typen liefert `supabase gen types typescript`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type AnyTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type AnyFunction = {
  Args: Record<string, unknown>;
  Returns: unknown;
};

export type Database = {
  public: {
    Tables: {
      [key: string]: AnyTable;
    };
    Views: Record<string, never>;
    Functions: {
      [key: string]: AnyFunction;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
