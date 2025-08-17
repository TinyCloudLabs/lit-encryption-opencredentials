import type { Credential, UserProfile, StorageProvider } from "../../types";
import { STORAGE_KEYS, STORAGE_PROVIDERS, ERROR_MESSAGES } from "../../constants";
import { TinyCloudWeb } from "@tinycloudlabs/web-sdk";

// Abstract storage interface
export interface IStorageProvider {
  name: string;
  type: string;
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  list(): Promise<string[]>;
  exists(key: string): Promise<boolean>;
}

// Cache interface for local storage
export interface ICacheProvider {
  name: string;
  set<T>(key: string, data: T): void;
  get<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

// Local Storage Cache Provider
export class LocalStorageCache implements ICacheProvider {
  name = "Local Storage Cache";

  private getStorageKey(key: string): string {
    return `litapp_cache_${key}`;
  }

  set<T>(key: string, data: T): void {
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        version: "1.0",
      });
      localStorage.setItem(this.getStorageKey(key), serialized);
    } catch (error) {
      // Cache failures are non-critical, just log
      console.warn(`Failed to cache data for key: ${key}`, error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getStorageKey(key));
      if (!item) return null;

      const parsed = JSON.parse(item);
      return parsed.data as T;
    } catch (error) {
      console.warn(`Failed to load cached data for key: ${key}`, error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.getStorageKey(key));
  }

  clear(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("litapp_cache_")) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }

  has(key: string): boolean {
    return localStorage.getItem(this.getStorageKey(key)) !== null;
  }
}

// TinyCloud Storage Provider
export class TinyCloudStorageProvider implements IStorageProvider {
  name = "TinyCloud";
  type = "tinycloud";
  private tcw: TinyCloudWeb | null = null;

  constructor(tcw?: TinyCloudWeb) {
    this.tcw = tcw || null;
  }

  // Set TinyCloud Web instance
  setTinyCloudWeb(tcw: TinyCloudWeb): void {
    this.tcw = tcw;
  }

  // Check if TinyCloud is available and connected
  private checkConnection(): void {
    if (!this.tcw) {
      throw new Error(
        "TinyCloud not initialized. Please sign in to TinyCloud first.",
      );
    }
    if (!this.tcw.session()) {
      throw new Error("Not signed in to TinyCloud. Please sign in first.");
    }
  }

  private getStorageKey(key: string): string {
    return `${key}`;
  }

  async save<T>(key: string, data: T): Promise<void> {
    try {
      this.checkConnection();

      const serialized = JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        version: "1.0",
      });

      const storageKey = this.getStorageKey(key);
      await this.tcw!.storage.put(storageKey, serialized);
    } catch (error) {
      console.error("TinyCloud save error:", error);
      if (error instanceof Error && error.message.includes("TinyCloud")) {
        throw error;
      }
      throw new Error(ERROR_MESSAGES.storage.SAVE_FAILED);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      this.checkConnection();

      const storageKey = this.getStorageKey(key);
      const result = await this.tcw!.storage.get(storageKey);

      if (!result.data) return null;

      const parsed = JSON.parse(result.data);
      return parsed.data as T;
    } catch (error) {
      console.warn(`Failed to load data for key: ${key}`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.checkConnection();

      const storageKey = this.getStorageKey(key);
      await this.tcw!.storage.delete(storageKey);
    } catch (error) {
      console.error("TinyCloud remove error:", error);
      throw new Error("Failed to remove data from TinyCloud");
    }
  }

  async clear(): Promise<void> {
    try {
      this.checkConnection();

      const keys = await this.list();
      for (const key of keys) {
        // Extract the actual key from the full storage path
        const actualKey = key.replace(/^litapp\//, "");
        await this.remove(actualKey);
      }
    } catch (error) {
      console.error("TinyCloud clear error:", error);
      throw new Error("Failed to clear TinyCloud storage");
    }
  }

  async list(): Promise<string[]> {
    try {
      this.checkConnection();

      const result = await this.tcw!.storage.list({ removePrefix: false });
      
      if (!result.ok || !result.data) return [];

      // Filter for credential keys only
      return result.data.filter((key: string) =>
        key.includes("litapp/"),
      );
    } catch (error) {
      console.error("TinyCloud list error:", error);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      this.checkConnection();

      const storageKey = this.getStorageKey(key);
      const result = await this.tcw!.storage.get(storageKey);
      return !!result.data;
    } catch (error) {
      return false;
    }
  }
}

// Storage Manager - TinyCloud primary with local cache
export class StorageManager {
  private tinyCloudProvider: TinyCloudStorageProvider;
  private cache: LocalStorageCache;

  constructor() {
    // Initialize TinyCloud as primary storage
    this.tinyCloudProvider = new TinyCloudStorageProvider();
    // Initialize local storage as cache
    this.cache = new LocalStorageCache();
  }

  // Set TinyCloud Web instance
  setTinyCloudWeb(tcw: TinyCloudWeb): void {
    this.tinyCloudProvider.setTinyCloudWeb(tcw);
  }

  // Check storage availability (read-only, no initialization)
  async initializeStorage(): Promise<void> {
    if (!this.isTinyCloudAvailable()) {
      return;
    }

    try {
      // Just check connectivity - no auto-writing
      await this.tinyCloudProvider.exists(STORAGE_KEYS.CREDENTIALS);
    } catch (error) {
      console.warn('TinyCloud storage check failed:', error);
      // Non-critical error, continue without initialization
    }
  }

  // Check if TinyCloud is available
  private isTinyCloudAvailable(): boolean {
    try {
      return (
        !!(this.tinyCloudProvider as any).tcw &&
        !!(this.tinyCloudProvider as any).tcw.session()
      );
    } catch {
      return false;
    }
  }

  // Ensure TinyCloud is available for operations
  private ensureTinyCloudAvailable(): void {
    if (!this.isTinyCloudAvailable()) {
      throw new Error(
        "TinyCloud connection required. Please sign in to TinyCloud to manage credentials.",
      );
    }
  }

  // Get TinyCloud provider info
  getPrimaryProvider(): { name: string; type: string } {
    return {
      name: this.tinyCloudProvider.name,
      type: this.tinyCloudProvider.type,
    };
  }

  // Get all available providers
  getAvailableProviders(): StorageProvider[] {
    return STORAGE_PROVIDERS.filter(
      (provider) => provider.type === "tinycloud",
    );
  }

  // Save user profile
  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.ensureTinyCloudAvailable();

    // Write to TinyCloud first (primary storage)
    await this.tinyCloudProvider.save(STORAGE_KEYS.USER_PROFILE, profile);

    // Update cache
    this.cache.set(STORAGE_KEYS.USER_PROFILE, profile);
  }

  // Load user profile
  async loadUserProfile(): Promise<UserProfile | null> {
    // Always load from TinyCloud first to get the latest data
    this.ensureTinyCloudAvailable();
    
    try {
      const profile = await this.tinyCloudProvider.load<UserProfile>(
        STORAGE_KEYS.USER_PROFILE,
      );

      // Update cache with TinyCloud data
      if (profile) {
        this.cache.set(STORAGE_KEYS.USER_PROFILE, profile);
      }

      return profile;
    } catch (error) {
      console.warn('Failed to load user profile from TinyCloud, falling back to cache:', error);
      
      // If TinyCloud fails, try cache as fallback
      const cached = this.cache.get<UserProfile>(STORAGE_KEYS.USER_PROFILE);
      return cached || null;
    }
  }

  // Save credentials
  async saveCredentials(credentials: Credential[]): Promise<void> {
    this.ensureTinyCloudAvailable();

    // Write to TinyCloud first (primary storage)
    await this.tinyCloudProvider.save(STORAGE_KEYS.CREDENTIALS, credentials);

    // Update cache
    this.cache.set(STORAGE_KEYS.CREDENTIALS, credentials);
  }

  // Load credentials
  async loadCredentials(): Promise<Credential[]> {
    // Always load from TinyCloud first to get the latest data
    this.ensureTinyCloudAvailable();
    
    try {
      const credentials = await this.tinyCloudProvider.load<Credential[]>(
        STORAGE_KEYS.CREDENTIALS,
      );

      // If no credentials exist in TinyCloud yet, return empty array
      if (credentials === null) {
        return [];
      }

      // Update cache and return credentials
      this.cache.set(STORAGE_KEYS.CREDENTIALS, credentials);
      return credentials;
    } catch (error) {
      console.warn('Failed to load from TinyCloud, falling back to cache:', error);
      
      // If TinyCloud fails, try cache as fallback
      const cached = this.cache.get<Credential[]>(STORAGE_KEYS.CREDENTIALS);
      console.log('📦 Falling back to cache:', cached?.length || 0, 'credentials');
      return cached || [];
    }
  }

  // Get a single credential by ID
  async getCredential(credentialId: string): Promise<Credential | null> {
    const credentials = await this.loadCredentials();
    return credentials.find((cred) => cred.id === credentialId) || null;
  }

  // Add a new credential
  async addCredential(credential: Credential): Promise<void> {
    const existingCredentials = await this.loadCredentials();
    const updatedCredentials = [...existingCredentials, credential];
    await this.saveCredentials(updatedCredentials);
  }

  // Update a credential
  async updateCredential(
    credentialId: string,
    updates: Partial<Credential>,
  ): Promise<void> {
    const credentials = await this.loadCredentials();
    const index = credentials.findIndex((cred) => cred.id === credentialId);

    if (index === -1) {
      throw new Error(`Credential with id '${credentialId}' not found`);
    }

    credentials[index] = { ...credentials[index], ...updates };
    await this.saveCredentials(credentials);
  }

  // Remove a credential
  async removeCredential(credentialId: string): Promise<void> {
    const credentials = await this.loadCredentials();
    const filteredCredentials = credentials.filter(
      (cred) => cred.id !== credentialId,
    );
    await this.saveCredentials(filteredCredentials);
  }

  // Save app settings
  async saveSettings(settings: any): Promise<void> {
    this.ensureTinyCloudAvailable();

    // Write to TinyCloud first (primary storage)
    await this.tinyCloudProvider.save(STORAGE_KEYS.SETTINGS, settings);

    // Update cache
    this.cache.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // Load app settings
  async loadSettings(): Promise<any> {
    // Always load from TinyCloud first to get the latest data
    this.ensureTinyCloudAvailable();
    
    try {
      const settings = await this.tinyCloudProvider.load(STORAGE_KEYS.SETTINGS);

      // Update cache with TinyCloud data
      if (settings) {
        this.cache.set(STORAGE_KEYS.SETTINGS, settings);
      }

      return settings;
    } catch (error) {
      console.warn('Failed to load settings from TinyCloud, falling back to cache:', error);
      
      // If TinyCloud fails, try cache as fallback
      const cached = this.cache.get(STORAGE_KEYS.SETTINGS);
      return cached || null;
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    this.ensureTinyCloudAvailable();

    // Clear from TinyCloud
    await this.tinyCloudProvider.clear();

    // Clear cache
    this.cache.clear();
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{
    provider: string;
    credentialCount: number;
    hasProfile: boolean;
    estimatedSize: string;
  }> {
    const credentials = await this.loadCredentials();
    const profile = await this.loadUserProfile();

    // Estimate size (rough calculation)
    const dataSize = JSON.stringify({ credentials, profile }).length;
    const estimatedSizeKB = Math.round(dataSize / 1024);

    return {
      provider: this.tinyCloudProvider.name,
      credentialCount: credentials.length,
      hasProfile: !!profile,
      estimatedSize:
        estimatedSizeKB > 1024
          ? `${Math.round(estimatedSizeKB / 1024)} MB`
          : `${estimatedSizeKB} KB`,
    };
  }

  // Check if TinyCloud is available
  isTinyCloudConnectionAvailable(): boolean {
    return this.isTinyCloudAvailable();
  }
}

// Create singleton instance
export const storageManager = new StorageManager();

// Utility functions
export const saveCredential = (credential: Credential) =>
  storageManager.addCredential(credential);
export const loadCredentials = () => storageManager.loadCredentials();
export const setTinyCloudWeb = (tcw: TinyCloudWeb) =>
  storageManager.setTinyCloudWeb(tcw);
export const isTinyCloudAvailable = () =>
  storageManager.isTinyCloudConnectionAvailable();
export const initializeStorage = () => storageManager.initializeStorage();