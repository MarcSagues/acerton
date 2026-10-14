/** Textos de un correo (el HTML comun esta en mail.service.ts). */
export interface EmailCopy {
  subject: string;
  preheader: string;
  mascotAlt: string;
  heading: string;
  body: string;
  button: string;
  expiry: string;
  buttonFallback: string;
  ignore: string;
}

export interface EmailFooterCopy {
  tagline: string;
  notOperator: string;
}

/** Todo el texto de los correos en un idioma. */
export interface LocaleEmailCopy {
  verification: EmailCopy;
  reset: EmailCopy;
  footer: EmailFooterCopy;
}
