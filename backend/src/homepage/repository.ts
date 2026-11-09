import type { HomeResponse } from '../../../contracts/src/index.js';

export interface HomepageVersion { version: number; createdAt: string; payload: HomeResponse; }
export interface HomepageRepository {
  getPublished(): Promise<HomeResponse>;
  getDraft(): Promise<HomeResponse>;
  saveDraft(payload: HomeResponse): Promise<HomeResponse>;
  publish(): Promise<HomepageVersion>;
  listVersions(): Promise<HomepageVersion[]>;
  restore(version: number): Promise<HomeResponse | null>;
}
