export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    /**
     * Client id que ve el SDK nativo (iOS/Android) al firmar su idToken — el
     * que el frontend pasa a `GoogleSignIn.initialize({ clientId })`, es
     * decir `environment.googleWebClientId` (hoy igual en todos los
     * `environment.*.ts`, asi que es el mismo pase lo que pase con la API a
     * la que apunte el build). NO es el `GIDClientID` de Info.plist (ese es
     * un id de app iOS distinto, para el flujo nativo con Google, no para la
     * audiencia del idToken). En produccion coincide con `clientId`; en un
     * backend de pre/dev que use un client id distinto para el flujo web,
     * hay que declarar aqui el valor de `environment.googleWebClientId`
     * (producción) para poder verificar tambien esos tokens nativos.
     */
    nativeClientId?: string;
  };
  footballData: {
    baseUrl: string;
    apiKey: string;
  };
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  comeback: {
    enabled: boolean;
    pointsPerBonus: number;
  };
  mail: {
    resendApiKey: string;
    /** Remitente tal cual lo espera Resend: "Nombre <direccion@dominio>". */
    from: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  google: {
    // Valores placeholder si no se configuran: evitan que passport-google-oauth20
    // lance al arrancar (exige clientID/clientSecret no vacios). El login con
    // Google simplemente fallara contra la API de Google hasta que se configuren.
    clientId: process.env.GOOGLE_CLIENT_ID || 'not-configured',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    nativeClientId: process.env.GOOGLE_NATIVE_CLIENT_ID || undefined,
  },
  footballData: {
    baseUrl: process.env.FOOTBALL_DATA_BASE_URL ?? 'https://api.football-data.org/v4',
    apiKey: process.env.FOOTBALL_DATA_API_KEY ?? '',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  },
  comeback: {
    // Valores por defecto al crear un grupo nuevo (editables despues por su admin).
    enabled: (process.env.COMEBACK_ENABLED_DEFAULT ?? 'true') === 'true',
    // Cada N puntos de diferencia con el lider dan 1 uso mas del comodin de
    // remontada esa jornada (ver WildcardsService.getComebackStatus).
    pointsPerBonus: parseInt(process.env.COMEBACK_POINTS_PER_BONUS_DEFAULT ?? '10', 10),
  },
  mail: {
    // Sin configurar en local: MailService deja el correo en el log en vez
    // de enviarlo de verdad (ver MailService.send).
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.MAIL_FROM ?? 'Piqo <support@piqo.es>',
  },
});
