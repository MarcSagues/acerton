export interface AvatarMascotOption {
  id: string;
  url: string;
  /** Id del trofeo (ver domain/trophies.ts) que hace falta tener para poder elegir esta mascota, o null si es una mascota normal. */
  requiresTrophyId: string | null;
}

export interface AvatarCatalog {
  mascots: AvatarMascotOption[];
  backgrounds: string[];
}
