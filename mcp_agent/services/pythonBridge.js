/**
 * @fileoverview Python Bridge Service
 * @description Secure integration with Python bridge for AI operations
 */

import { spawn } from 'child_process';
import path from 'path';

export class PythonBridge {
  constructor(errorManager) {
    this.errorManager = errorManager;
    this.pythonPath = process.env.PYTHON_BIN || 'python3';
    this.bridgePath = path.join(process.cwd(), 'mcp_agent', 'server', 'bridge.py');
    this.timeout = 30000; // 30 seconds
    this.maxRetries = 3;
  }

  /**
   * Execute Python bridge operation
   */
  async execute(operation, params = {}) {
    const context = this.errorManager.createContext('python-bridge', operation);
    
    try {
      const requestData = {
        operation,
        params,
        timestamp: new Date().toISOString()
      };

      const result = await this.runPythonScript(requestData);
      
      if (!result.success) {
        throw new Error(result.error || 'Python bridge operation failed');
      }

      return result.data;

    } catch (error) {
      this.errorManager.handleError(error, context, 'EXTERNAL_API');
      throw error;
    }
  }

  /**
   * Run Python script with proper error handling
   */
  async runPythonScript(data, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python bridge timeout'));
      }, this.timeout);

      const pythonProcess = spawn(this.pythonPath, [this.bridgePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          const error = new Error(`Python bridge exited with code ${code}: ${stderr}`);
          
          // Retry on failure
          if (retryCount < this.maxRetries) {
            setTimeout(() => {
              this.runPythonScript(data, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 1000 * (retryCount + 1)); // Exponential backoff
            return;
          }
          
          reject(error);
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python bridge response: ${parseError.message}`));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start Python bridge: ${error.message}`));
      });

      // Send input data
      pythonProcess.stdin.write(JSON.stringify(data));
      pythonProcess.stdin.end();
    });
  }

  /**
   * Analyze market data
   */
  async analyzeData(marketData) {
    return this.execute('analyze', { marketData });
  }

  /**
   * Predict yield
   */
  async predictYield(strategyData) {
    return this.execute('predict', { strategyData });
  }

  /**
   * Optimize strategy
   */
  async optimizeStrategy(portfolioData) {
    return this.execute('optimize', { portfolioData });
  }

  /**
   * Validate strategy
   */
  async validateStrategy(strategyConfig) {
    return this.execute('validate', { strategyConfig });
  }

  /**
   * Get bridge health status
   */
  async getHealthStatus() {
    try {
      const result = await this.runPythonScript({ operation: 'health' });
      return result.success ? result.data : { healthy: false, error: result.error };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Test bridge connectivity
   */
  async testConnection() {
    try {
      const testData = { test: true, timestamp: new Date().toISOString() };
      const result = await this.execute('validate', testData);
      return { connected: true, result };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

export default PythonBridge;