export interface ScanRequest {
  repoUrl: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
}

export interface TruffleHogResult {
  SourceMetadata?: {
    Data?: {
      Git?: {
        commit?: string;
        file?: string;
        email?: string;
        repository?: string;
        timestamp?: string;
        line?: number;
      };
    };
  };
  SourceID?: number;
  SourceType?: number;
  SourceName?: string;
  DetectorType?: number;
  DetectorName?: string;
  DecoderName?: string;
  Verified?: boolean;
  Raw?: string;
  RawV2?: string;
  Redacted?: string;
  ExtraData?: Record<string, unknown>;
}

export interface ScanResult {
  repoUrl: string;
  provider: string;
  vulnerabilities: TruffleHogResult[];
  metadata: {
    totalVulnerabilities: number;
    verifiedVulnerabilities: number;
    scanDuration: number;
    scannedAt: Date;
  };
}

export interface ScanRecord {
  id: string;
  repo_url: string;
  provider: string;
  result: ScanResult;
  created_at: Date;
}

export interface HistoryQuery {
  repoUrl?: string;
  provider?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'repo_url';
  sortOrder?: 'asc' | 'desc';
}

export interface HistoryResponse {
  data: ScanRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    trufflehog: 'available' | 'unavailable';
  };
}