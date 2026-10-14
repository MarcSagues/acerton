/** Equipo favorito con los dos colores de su bandera (ver users/team-catalog.ts en el backend). */
export interface FavoriteTeam {
  name: string;
  primary: string;
  secondary: string;
}

export interface TeamCatalog {
  teams: FavoriteTeam[];
}
