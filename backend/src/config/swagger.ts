import config from './index';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DataUlinzi Backend API',
    version: '1.0.0',
    description: 'API for repository vulnerability scanning using TruffleHog',
    contact: {
      name: 'DataUlinzi Team',
      email: 'dev@dataulinzi.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.server.port}${config.server.apiPrefix}`,
      description: 'Development server',
    },
  ],
  paths: {
    '/scan': {
      post: {
        summary: 'Scan repository for vulnerabilities',
        description: 'Scan a Git repository for secrets and vulnerabilities using TruffleHog',
        tags: ['Scanning'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['repoUrl', 'provider'],
                properties: {
                  repoUrl: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://github.com/org/repo',
                    description: 'Git repository URL',
                  },
                  provider: {
                    type: 'string',
                    enum: ['github', 'gitlab', 'bitbucket', 'other'],
                    example: 'github',
                    description: 'Git provider type',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Scan completed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        repoUrl: { type: 'string' },
                        provider: { type: 'string' },
                        vulnerabilities: {
                          type: 'array',
                          items: { type: 'object' },
                        },
                        metadata: {
                          type: 'object',
                          properties: {
                            totalVulnerabilities: { type: 'number' },
                            verifiedVulnerabilities: { type: 'number' },
                            scanDuration: { type: 'number' },
                            scannedAt: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          429: {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/history': {
      get: {
        summary: 'Get scan history',
        description: 'Retrieve historical scan results with filtering and pagination',
        tags: ['History'],
        parameters: [
          {
            name: 'repoUrl',
            in: 'query',
            description: 'Filter by repository URL',
            schema: { type: 'string' },
          },
          {
            name: 'provider',
            in: 'query',
            description: 'Filter by provider',
            schema: { 
              type: 'string',
              enum: ['github', 'gitlab', 'bitbucket', 'other'],
            },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number (starts from 1)',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Sort field',
            schema: { 
              type: 'string',
              enum: ['created_at', 'repo_url'],
              default: 'created_at',
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            description: 'Sort order',
            schema: { 
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
            },
          },
        ],
        responses: {
          200: {
            description: 'History retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          repo_url: { type: 'string' },
                          provider: { type: 'string' },
                          result: { type: 'object' },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'number' },
                        limit: { type: 'number' },
                        total: { type: 'number' },
                        pages: { type: 'number' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  tags: [
    {
      name: 'Scanning',
      description: 'Repository vulnerability scanning operations',
    },
    {
      name: 'History',
      description: 'Scan history and analytics operations',
    },
  ],
};