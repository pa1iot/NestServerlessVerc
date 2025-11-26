#!/usr/bin/env node

/**
 * GPS Tracking IoT - Serverless Migration Validation Script
 * 
 * This script validates that all components of the serverless migration
 * are properly configured and ready for deployment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ValidationResult {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.results = [];
  }

  addResult(category, test, status, message, details = null) {
    this.results.push({ category, test, status, message, details });
    if (status === 'PASS') this.passed++;
    else if (status === 'FAIL') this.failed++;
    else if (status === 'WARN') this.warnings++;
  }

  printResults() {
    console.log(`\n${colors.cyan}=== GPS Tracking IoT - Serverless Migration Validation ===${colors.reset}\n`);
    
    let currentCategory = '';
    this.results.forEach(result => {
      if (result.category !== currentCategory) {
        currentCategory = result.category;
        console.log(`${colors.magenta}${currentCategory}:${colors.reset}`);
      }
      
      const statusColor = result.status === 'PASS' ? colors.green : 
                         result.status === 'FAIL' ? colors.red : colors.yellow;
      
      console.log(`  ${statusColor}${result.status}${colors.reset} ${result.test}: ${result.message}`);
      
      if (result.details) {
        console.log(`       ${colors.blue}${result.details}${colors.reset}`);
      }
    });
    
    console.log(`\n${colors.cyan}Summary:${colors.reset}`);
    console.log(`  ${colors.green}Passed: ${this.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${this.failed}${colors.reset}`);
    console.log(`  ${colors.yellow}Warnings: ${this.warnings}${colors.reset}`);
    
    if (this.failed > 0) {
      console.log(`\n${colors.red}❌ Migration validation failed. Please fix the issues above before deploying.${colors.reset}`);
      process.exit(1);
    } else if (this.warnings > 0) {
      console.log(`\n${colors.yellow}⚠️  Migration validation passed with warnings. Review warnings before deploying.${colors.reset}`);
    } else {
      console.log(`\n${colors.green}✅ Migration validation passed! Ready for deployment.${colors.reset}`);
    }
  }
}

class MigrationValidator {
  constructor() {
    this.result = new ValidationResult();
    this.projectRoot = process.cwd();
  }

  fileExists(filePath) {
    return fs.existsSync(path.join(this.projectRoot, filePath));
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(path.join(this.projectRoot, filePath), 'utf8');
    } catch (error) {
      return null;
    }
  }

  runCommand(command) {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      return null;
    }
  }

  validateFileStructure() {
    const requiredFiles = [
      'serverless.yml',
      '.env.example',
      'deploy.sh',
      'webpack.config.js',
      'tsconfig.serverless.json',
      'README-SERVERLESS.md',
      'MIGRATION_GUIDE.md'
    ];

    const serverlessFunctions = [
      'serverless/functions/auth/send-otp.ts',
      'serverless/functions/auth/verify-otp.ts',
      'serverless/functions/auth/jwt-authorizer.ts',
      'serverless/functions/devices/create-devices.ts',
      'serverless/functions/devices/track-device.ts',
      'serverless/functions/devices/get-tracking-history.ts',
      'serverless/functions/websocket/connect.ts',
      'serverless/functions/websocket/disconnect.ts',
      'serverless/functions/websocket/join-room.ts',
      'serverless/functions/websocket/default.ts'
    ];

    const sharedFiles = [
      'serverless/shared/prisma-client.ts',
      'serverless/shared/utils.ts',
      'serverless/shared/sms.service.ts'
    ];

    // Check required configuration files
    requiredFiles.forEach(file => {
      if (this.fileExists(file)) {
        this.result.addResult('File Structure', file, 'PASS', 'Configuration file exists');
      } else {
        this.result.addResult('File Structure', file, 'FAIL', 'Required configuration file missing');
      }
    });

    // Check serverless functions
    serverlessFunctions.forEach(file => {
      if (this.fileExists(file)) {
        this.result.addResult('Serverless Functions', path.basename(file), 'PASS', 'Function file exists');
      } else {
        this.result.addResult('Serverless Functions', path.basename(file), 'FAIL', 'Function file missing');
      }
    });

    // Check shared utilities
    sharedFiles.forEach(file => {
      if (this.fileExists(file)) {
        this.result.addResult('Shared Utilities', path.basename(file), 'PASS', 'Shared utility exists');
      } else {
        this.result.addResult('Shared Utilities', path.basename(file), 'FAIL', 'Shared utility missing');
      }
    });
  }

  validatePackageJson() {
    const packageJsonPath = 'package.json';
    if (!this.fileExists(packageJsonPath)) {
      this.result.addResult('Dependencies', 'package.json', 'FAIL', 'package.json not found');
      return;
    }

    try {
      const packageJson = JSON.parse(this.readFile(packageJsonPath));
      
      // Check required dependencies
      const requiredDevDeps = [
        'serverless',
        'serverless-webpack',
        'serverless-offline',
        'serverless-dotenv-plugin',
        '@types/aws-lambda',
        'webpack',
        'ts-loader'
      ];

      const devDeps = packageJson.devDependencies || {};
      
      requiredDevDeps.forEach(dep => {
        if (devDeps[dep]) {
          this.result.addResult('Dependencies', dep, 'PASS', `Dependency installed (${devDeps[dep]})`);
        } else {
          this.result.addResult('Dependencies', dep, 'FAIL', 'Required dependency missing');
        }
      });

      // Check scripts
      const requiredScripts = [
        'deploy:dev',
        'deploy:staging',
        'deploy:prod',
        'start:serverless'
      ];

      const scripts = packageJson.scripts || {};
      
      requiredScripts.forEach(script => {
        if (scripts[script]) {
          this.result.addResult('NPM Scripts', script, 'PASS', 'Script configured');
        } else {
          this.result.addResult('NPM Scripts', script, 'WARN', 'Recommended script missing');
        }
      });

    } catch (error) {
      this.result.addResult('Dependencies', 'package.json', 'FAIL', 'Invalid package.json format');
    }
  }

  validateServerlessConfig() {
    const serverlessYml = this.readFile('serverless.yml');
    if (!serverlessYml) {
      this.result.addResult('Serverless Config', 'serverless.yml', 'FAIL', 'serverless.yml not found');
      return;
    }

    // Check for required sections
    const requiredSections = [
      'service:',
      'provider:',
      'functions:',
      'resources:',
      'plugins:'
    ];

    requiredSections.forEach(section => {
      if (serverlessYml.includes(section)) {
        this.result.addResult('Serverless Config', section.replace(':', ''), 'PASS', 'Section configured');
      } else {
        this.result.addResult('Serverless Config', section.replace(':', ''), 'FAIL', 'Required section missing');
      }
    });

    // Check for specific configurations
    const configurations = [
      { pattern: 'runtime: nodejs18.x', name: 'Node.js Runtime' },
      { pattern: 'environment:', name: 'Environment Variables' },
      { pattern: 'iamRoleStatements:', name: 'IAM Permissions' },
      { pattern: 'websocket:', name: 'WebSocket API' },
      { pattern: 'DynamoDB', name: 'DynamoDB Resources' }
    ];

    configurations.forEach(config => {
      if (serverlessYml.includes(config.pattern)) {
        this.result.addResult('Serverless Config', config.name, 'PASS', 'Configuration present');
      } else {
        this.result.addResult('Serverless Config', config.name, 'WARN', 'Configuration may be missing');
      }
    });
  }

  validateEnvironmentConfig() {
    // Check .env.example
    const envExample = this.readFile('.env.example');
    if (envExample) {
      this.result.addResult('Environment', '.env.example', 'PASS', 'Environment template exists');
      
      const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
        'AWS_REGION',
        'SMS_API_KEY'
      ];

      requiredVars.forEach(varName => {
        if (envExample.includes(varName)) {
          this.result.addResult('Environment', varName, 'PASS', 'Environment variable template exists');
        } else {
          this.result.addResult('Environment', varName, 'WARN', 'Environment variable template missing');
        }
      });
    } else {
      this.result.addResult('Environment', '.env.example', 'FAIL', 'Environment template missing');
    }

    // Check if .env exists (should not be committed)
    if (this.fileExists('.env')) {
      this.result.addResult('Environment', '.env', 'WARN', 'Local .env file exists (ensure it\'s in .gitignore)');
    } else {
      this.result.addResult('Environment', '.env', 'PASS', 'No .env file in repository (good practice)');
    }
  }

  validatePrismaConfig() {
    // Check Prisma schema
    if (this.fileExists('prisma/schema.prisma')) {
      this.result.addResult('Database', 'Prisma Schema', 'PASS', 'Prisma schema exists');
    } else {
      this.result.addResult('Database', 'Prisma Schema', 'FAIL', 'Prisma schema missing');
    }

    // Check Prisma client configuration
    const prismaClient = this.readFile('serverless/shared/prisma-client.ts');
    if (prismaClient) {
      if (prismaClient.includes('PrismaClient')) {
        this.result.addResult('Database', 'Prisma Client', 'PASS', 'Prisma client configured');
      } else {
        this.result.addResult('Database', 'Prisma Client', 'WARN', 'Prisma client may not be properly configured');
      }
    } else {
      this.result.addResult('Database', 'Prisma Client', 'FAIL', 'Prisma client configuration missing');
    }
  }

  validateTooling() {
    // Check if required tools are available
    const tools = [
      { command: 'node --version', name: 'Node.js' },
      { command: 'npm --version', name: 'NPM' }
    ];

    tools.forEach(tool => {
      const output = this.runCommand(tool.command);
      if (output) {
        this.result.addResult('Tooling', tool.name, 'PASS', `Installed (${output.trim()})`);
      } else {
        this.result.addResult('Tooling', tool.name, 'FAIL', 'Not installed or not in PATH');
      }
    });

    // Check Serverless Framework
    const slsOutput = this.runCommand('sls --version') || this.runCommand('serverless --version');
    if (slsOutput) {
      this.result.addResult('Tooling', 'Serverless Framework', 'PASS', 'Installed');
    } else {
      this.result.addResult('Tooling', 'Serverless Framework', 'FAIL', 'Not installed (run: npm install -g serverless)');
    }

    // Check AWS CLI (optional but recommended)
    const awsOutput = this.runCommand('aws --version');
    if (awsOutput) {
      this.result.addResult('Tooling', 'AWS CLI', 'PASS', 'Installed');
    } else {
      this.result.addResult('Tooling', 'AWS CLI', 'WARN', 'Not installed (recommended for deployment)');
    }
  }

  validateTypeScriptConfig() {
    // Check TypeScript configurations
    const configs = [
      { file: 'tsconfig.json', name: 'Main TypeScript Config' },
      { file: 'tsconfig.serverless.json', name: 'Serverless TypeScript Config' }
    ];

    configs.forEach(config => {
      if (this.fileExists(config.file)) {
        try {
          const content = this.readFile(config.file);
          JSON.parse(content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));
          this.result.addResult('TypeScript', config.name, 'PASS', 'Valid configuration');
        } catch (error) {
          this.result.addResult('TypeScript', config.name, 'FAIL', 'Invalid JSON configuration');
        }
      } else {
        this.result.addResult('TypeScript', config.name, 'FAIL', 'Configuration file missing');
      }
    });
  }

  validateWebpackConfig() {
    const webpackConfig = this.readFile('webpack.config.js');
    if (webpackConfig) {
      const requiredConfigs = [
        { pattern: 'ts-loader', name: 'TypeScript Loader' },
        { pattern: 'externals', name: 'Externals Configuration' },
        { pattern: 'target: \'node\'', name: 'Node.js Target' }
      ];

      requiredConfigs.forEach(config => {
        if (webpackConfig.includes(config.pattern)) {
          this.result.addResult('Webpack', config.name, 'PASS', 'Configuration present');
        } else {
          this.result.addResult('Webpack', config.name, 'WARN', 'Configuration may be missing');
        }
      });
    } else {
      this.result.addResult('Webpack', 'Configuration', 'FAIL', 'webpack.config.js missing');
    }
  }

  validateDeploymentScript() {
    if (this.fileExists('deploy.sh')) {
      const deployScript = this.readFile('deploy.sh');
      
      // Check if script is executable (on Unix systems)
      try {
        const stats = fs.statSync(path.join(this.projectRoot, 'deploy.sh'));
        const isExecutable = !!(stats.mode & parseInt('111', 8));
        
        if (process.platform !== 'win32' && !isExecutable) {
          this.result.addResult('Deployment', 'Script Permissions', 'WARN', 'deploy.sh may not be executable (run: chmod +x deploy.sh)');
        } else {
          this.result.addResult('Deployment', 'Script Permissions', 'PASS', 'Script has proper permissions');
        }
      } catch (error) {
        this.result.addResult('Deployment', 'Script Permissions', 'WARN', 'Could not check script permissions');
      }

      // Check script content
      const scriptChecks = [
        { pattern: 'sls deploy', name: 'Serverless Deploy Command' },
        { pattern: 'npm install', name: 'Dependency Installation' },
        { pattern: 'prisma generate', name: 'Prisma Client Generation' }
      ];

      scriptChecks.forEach(check => {
        if (deployScript.includes(check.pattern)) {
          this.result.addResult('Deployment', check.name, 'PASS', 'Command present in script');
        } else {
          this.result.addResult('Deployment', check.name, 'WARN', 'Command may be missing from script');
        }
      });
    } else {
      this.result.addResult('Deployment', 'Deploy Script', 'FAIL', 'deploy.sh missing');
    }
  }

  run() {
    console.log(`${colors.blue}Starting serverless migration validation...${colors.reset}\n`);
    
    this.validateFileStructure();
    this.validatePackageJson();
    this.validateServerlessConfig();
    this.validateEnvironmentConfig();
    this.validatePrismaConfig();
    this.validateTooling();
    this.validateTypeScriptConfig();
    this.validateWebpackConfig();
    this.validateDeploymentScript();
    
    this.result.printResults();
  }
}

// Run validation
if (require.main === module) {
  const validator = new MigrationValidator();
  validator.run();
}

module.exports = MigrationValidator;