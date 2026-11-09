export interface PlatformSettings {
  siteName: string;
  tagline: string;
  supportEmail: string;
  timezone: string;
  allowAnonymousWatch: boolean;
  sessionTtlSeconds: number;
  maxConcurrentSessions: number;
  maintenanceMode: boolean;
}

export interface SettingsRepository {
  get(): Promise<PlatformSettings>;
  save(settings: PlatformSettings): Promise<PlatformSettings>;
}
