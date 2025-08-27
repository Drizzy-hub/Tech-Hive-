import { Request, Response, NextFunction } from 'express';

export const validateScanRequest = (req: Request, res: Response, next: NextFunction) => {
  const { repoUrl, provider } = req.body;
  const errors: string[] = [];

  // Validate repoUrl
  if (!repoUrl) {
    errors.push('repoUrl is required');
  } else if (typeof repoUrl !== 'string') {
    errors.push('repoUrl must be a string');
  } else {
    try {
      const url = new URL(repoUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('repoUrl must be a valid HTTP/HTTPS URL');
      }
      if (!['github.com', 'gitlab.com', 'bitbucket.org'].some(host => url.hostname.includes(host))) {
        if (provider !== 'other') {
          errors.push('repoUrl must be from a supported Git provider');
        }
      }
    } catch {
      errors.push('repoUrl must be a valid URL');
    }
  }

  if (!provider) {
    errors.push('provider is required');
  } else if (!['github', 'gitlab', 'bitbucket', 'other'].includes(provider)) {
    errors.push('provider must be one of: github, gitlab, bitbucket, other');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

export const validateHistoryQuery = (req: Request, res: Response, next: NextFunction) => {
  const errors: string[] = [];
  const { repoUrl, provider, page, limit, sortBy, sortOrder } = req.query;

  if (repoUrl) {
    if (typeof repoUrl !== 'string') {
      errors.push('repoUrl must be a string');
    } else {
      try {
        new URL(repoUrl);
      } catch {
        errors.push('repoUrl must be a valid URL');
      }
    }
  }

  if (provider) {
    if (!['github', 'gitlab', 'bitbucket', 'other'].includes(provider as string)) {
      errors.push('provider must be one of: github, gitlab, bitbucket, other');
    }
  }

  if (page) {
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('page must be a positive integer');
    }
  }

  if (limit) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('limit must be between 1 and 100');
    }
  }

  if (sortBy) {
    if (!['created_at', 'repo_url'].includes(sortBy as string)) {
      errors.push('sortBy must be one of: created_at, repo_url');
    }
  }

  if (sortOrder) {
    if (!['asc', 'desc'].includes(sortOrder as string)) {
      errors.push('sortOrder must be one of: asc, desc');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
};