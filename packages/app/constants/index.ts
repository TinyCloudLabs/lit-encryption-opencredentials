// Storage provider types for the app
export interface StorageProvider {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

// Storage providers configuration - simplified for app
export const STORAGE_PROVIDERS: StorageProvider[] = [
  {
    name: "TinyCloud",
    type: "tinycloud",
    enabled: true,
    config: {
      prefix: "opencredentials",
      decentralized: true,
    },
  },
];

// Local storage keys
export const STORAGE_KEYS = {
  USER_PROFILE: "user_profile",
  CREDENTIALS: "credentials",
  WALLET_INFO: "wallet_info",
  SETTINGS: "settings",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  wallet: {
    NOT_CONNECTED: "Please connect your wallet to continue",
    CONNECTION_FAILED: "Failed to connect wallet. Please try again",
    SIGNATURE_REJECTED: "Signature was rejected. Please try again",
  },
  storage: {
    SAVE_FAILED: "Failed to save data. Please try again",
    LOAD_FAILED: "Failed to load data",
    QUOTA_EXCEEDED: "Storage quota exceeded",
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  wallet: {
    CONNECTED: "Wallet connected successfully!",
    SIGNATURE_COMPLETE: "Message signed successfully!",
  },
  storage: {
    SAVED: "Data saved successfully!",
    EXPORTED: "Credentials exported successfully!",
  },
} as const;
