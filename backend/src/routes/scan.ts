import { Router } from 'express';
import { scanController } from '../controllers/scanController';
import { validateScanRequest, validateHistoryQuery } from '../validators/scanValidator';
import { scanRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /scan:
 *   post:
 *     summary: Scan repository for vulnerabilities
 *     description: Scan a Git repository for secrets and vulnerabilities using TruffleHog
 *     tags: [Scanning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repoUrl
 *               - provider
 *             properties:
 *               repoUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://github.com/org/repo
 *               provider:
 *                 type: string
 *                 enum: [github, gitlab, bitbucket, other]
 *                 example: github
 *     responses:
 *       200:
 *         description: Scan completed successfully
 *       400:
 *         description: Invalid request data
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/scan', scanRateLimiter, validateScanRequest, scanController.scanRepository);

/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get scan history
 *     description: Retrieve historical scan results with filtering and pagination
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: repoUrl
 *         schema:
 *           type: string
 *         description: Filter by repository URL
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [github, gitlab, bitbucket, other]
 *         description: Filter by provider
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, repo_url]
 *           default: created_at
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: History retrieved successfully
 */
router.get('/history', validateHistoryQuery, scanController.getScanHistory);



export default router;