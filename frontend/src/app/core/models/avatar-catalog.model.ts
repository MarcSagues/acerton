export interface AvatarMascotOption {
  id: string;
  url: string;
}

export interface AvatarCatalog {
  mascots: AvatarMascotOption[];
  backgrounds: string[];
}
