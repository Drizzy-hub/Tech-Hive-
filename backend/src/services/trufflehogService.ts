import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config';
import { logger } from '../utils/logger';
import { ScanError } from '../middleware/errorHandler';
import { TruffleHogResult } from '../models/scan';

const execAsync = promisify(exec);

export class TruffleHogService {
  private maxConcurrentScans = config.trufflehog.maxConcurrentScans;
  private currentScans = 0;
  private timeout = config.trufflehog.timeout;


  async scanRepository(repoUrl: string, provider: string): Promise<TruffleHogResult[]> {
    if (this.currentScans >= this.maxConcurrentScans) {
      throw new ScanError('Maximum concurrent scans reached. Please try again later.');
    }

    this.currentScans++;
    const startTime = Date.now();

    try {
      logger.info('Starting TruffleHog scan', { repoUrl, provider });

      const results = await this.executeTruffleHog(repoUrl);
      const scanDuration = Date.now() - startTime;

      logger.info('TruffleHog scan completed', {
        repoUrl,
        provider,
        duration: scanDuration,
        vulnerabilitiesFound: results.length
      });

      return results;
    } catch (error) {
      const scanDuration = Date.now() - startTime;
      logger.error('TruffleHog scan failed', {
        repoUrl,
        provider,
        duration: scanDuration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof ScanError) {
        throw error;
      }

      throw new ScanError(`Failed to scan repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.currentScans--;
    }
  }

  private async executeTruffleHog(repoUrl: string): Promise<TruffleHogResult[]> {
    
    const command = this.buildTruffleHogCommand(repoUrl);

    try {
      
      const { stdout, stderr } = await this.executeWithTimeout(command, this.timeout);

      
      if (stderr) {
        logger.warn('TruffleHog stderr output', { stderr: stderr.slice(0, 1000) });
      }

     
      return this.parseTruffleHogOutput(stdout);
    } catch (error) {
      if (error instanceof Error) {

        if (error.message.includes('timeout')) {
          throw new ScanError('Scan timed out. Repository may be too large or network is slow.');
        }
        
        if (error.message.includes('not found') || error.message.includes('command not found')) {
          throw new ScanError('TruffleHog is not installed or not accessible.');
        }
        
        if (error.message.includes('permission denied') || error.message.includes('access denied')) {
          throw new ScanError('Access denied to repository. Please check repository permissions.');
        }

        if (error.message.includes('repository not found') || error.message.includes('404')) {
          throw new ScanError('Repository not found or is private.');
        }
      }

      throw error;
    }
  }

  
  private buildTruffleHogCommand(repoUrl: string): string {
  
  let subcommand = 'github'; 
  
  if (repoUrl.includes('gitlab.com')) {
    subcommand = 'gitlab';
  } else if (repoUrl.includes('github.com')) {
    subcommand = 'github';
  } else {

    subcommand = 'git';
  }

  const flags = [
    '--json',                    
    '--no-verification',         
    '--concurrency=1',          
  ];

 
  if (subcommand === 'git') {
   
    return `trufflehog git ${this.escapeShellArg(repoUrl)} ${flags.join(' ')}`;
  } else {
    
    return `trufflehog ${subcommand} --repo=${this.escapeShellArg(repoUrl)} ${flags.join(' ')}`;
  }
}


    private executeWithTimeout(command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = exec(command, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024, 
      });

      let stdout = '';
      let stderr = '';

   
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data;
        });
      }

      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data;
        });
      }

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Command timeout'));
      }, timeoutMs);

      child.on('exit', (code, signal) => {
        clearTimeout(timer);
        
        if (signal === 'SIGKILL') {
          reject(new Error('Command was killed due to timeout'));
        } else if (code !== 0 && code !== null) {
          reject(new Error(`TruffleHog exited with code ${code}: ${stderr || 'Unknown error'}`));
        } else {
          resolve({
            stdout,
            stderr
          });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  
  private parseTruffleHogOutput(output: string): TruffleHogResult[] {
    if (!output.trim()) {
      return [];
    }

    const results: TruffleHogResult[] = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line);
        
      
        const result: TruffleHogResult = {
          SourceMetadata: parsed.SourceMetadata,
          SourceID: parsed.SourceID,
          SourceType: parsed.SourceType,
          SourceName: parsed.SourceName,
          DetectorType: parsed.DetectorType,
          DetectorName: parsed.DetectorName,
          DecoderName: parsed.DecoderName,
          Verified: parsed.Verified || false,
          Raw: parsed.Raw,
          RawV2: parsed.RawV2,
          Redacted: parsed.Redacted,
          ExtraData: parsed.ExtraData || {}
        };

        results.push(result);
      } catch (parseError) {
        logger.warn('Failed to parse TruffleHog output line', {
          line: line.slice(0, 200),
          error: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        });
       
      }
    }

    return results;
  }

  
  private escapeShellArg(arg: string): string {
    
    return `'${arg.replace(/'/g, "'\"'\"'")}'`;
  }


  async checkTruffleHogAvailability(): Promise<boolean> {
    try {
      await execAsync('trufflehog --version');
      return true;
    } catch (error) {
      logger.error('TruffleHog is not available', { error });
      return false;
    }
  }

  getScanStats() {
    return {
      currentScans: this.currentScans,
      maxConcurrentScans: this.maxConcurrentScans,
      availableSlots: this.maxConcurrentScans - this.currentScans
    };
  }
}