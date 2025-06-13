#!/usr/bin/env node

/**
 * Sprint 4 Auto-Deployment Validation Script
 *
 * Validates that Sprint 4 auto-deployment functionality is working correctly
 * in CI/CD environments without requiring VS Code extension host.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALIDATION_RESULTS = {
  passed: 0,
  failed: 0,
  details: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📋';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function validateTest(testName, testFn) {
  try {
    const result = testFn();
    if (result) {
      VALIDATION_RESULTS.passed++;
      VALIDATION_RESULTS.details.push({ test: testName, status: 'PASSED' });
      log(`${testName}: PASSED`, 'success');
      return true;
    } else {
      VALIDATION_RESULTS.failed++;
      VALIDATION_RESULTS.details.push({ test: testName, status: 'FAILED', reason: 'Test returned false' });
      log(`${testName}: FAILED - Test returned false`, 'error');
      return false;
    }
  } catch (error) {
    VALIDATION_RESULTS.failed++;
    VALIDATION_RESULTS.details.push({ test: testName, status: 'FAILED', reason: error.message });
    log(`${testName}: FAILED - ${error.message}`, 'error');
    return false;
  }
}

function validateBundledServerExists() {
  const serverPath = path.join(__dirname, '..', 'scripts', 'mcp-server.js');
  return fs.existsSync(serverPath);
}

function validateServerInstallUtilsExists() {
  const utilsPath = path.join(__dirname, '..', 'out', 'shared', 'utils', 'ServerInstallUtils.js');
  return fs.existsSync(utilsPath);
}

function validateServerDeploymentExists() {
  const deploymentPath = path.join(__dirname, '..', 'out', 'shared', 'deployment', 'ServerDeployment.js');
  return fs.existsSync(deploymentPath);
}

function validateMcpServerRegistrationExists() {
  const registrationPath = path.join(__dirname, '..', 'out', 'infrastructure', 'mcp', 'McpServerRegistration.js');
  return fs.existsSync(registrationPath);
}

function validateExtensionCommandsExists() {
  const commandsPath = path.join(__dirname, '..', 'out', 'commands', 'ExtensionCommands.js');
  return fs.existsSync(commandsPath);
}

function validatePackageJsonCommands() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  const requiredCommands = [
    'mcpDiagnostics.configureServer',
    'mcpDiagnostics.showStatus',
    'mcpDiagnostics.restart',
    'mcpDiagnostics.showSetupGuide'
  ];

  const commands = packageJson.contributes?.commands?.map(cmd => cmd.command) || [];

  return requiredCommands.every(cmd => commands.includes(cmd));
}

function validateCompiledTypescriptPaths() {
  const compiledExtension = path.join(__dirname, '..', 'out', 'extension.js');
  if (!fs.existsSync(compiledExtension)) {
    return false;
  }

  // Check that TypeScript path aliases were resolved properly
  const content = fs.readFileSync(compiledExtension, 'utf8');
  // Should not contain unresolved path aliases like @shared, @core, etc.
  return !content.includes('@shared/') && !content.includes('@core/') && !content.includes('@infrastructure/');
}

function validateCrossplatformUtilsExists() {
  const utilsPath = path.join(__dirname, '..', 'out', 'shared', 'utils', 'CrossPlatformUtils.js');
  return fs.existsSync(utilsPath);
}

function validateConfigurationSchemaExists() {
  const schemaPath = path.join(__dirname, '..', 'out', 'shared', 'types.js');
  return fs.existsSync(schemaPath);
}

function validateE2ETestsExist() {
  const e2eTestPath = path.join(__dirname, '..', 'src', 'test', 'e2e', 'Sprint4AutoDeploymentE2E.test.ts');
  return fs.existsSync(e2eTestPath);
}

function validateIntegrationTestsExist() {
  const integrationTestPath = path.join(__dirname, '..', 'src', 'test', 'integration', 'mcp', 'Sprint4AutoDeploymentIntegration.test.ts');
  return fs.existsSync(integrationTestPath);
}

function validateDocumentationUpdated() {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  // Check for Sprint 4 auto-deployment documentation
  return readmeContent.includes('AUTO-DEPLOYMENT & ONE-CLICK SETUP') &&
         readmeContent.includes('```mermaid') &&
         readmeContent.includes('MCP Diagnostics: Configure Server');
}

function validatePackageJsonScripts() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  const requiredScripts = [
    'compile',
    'compile:prod',
    'test',
    'test:coverage',
    'lint',
    'package',
    'ci:check'
  ];

  const scripts = Object.keys(packageJson.scripts || {});

  return requiredScripts.every(script => scripts.includes(script));
}

async function runValidation() {
  log('🚀 Starting Sprint 4 Auto-Deployment Validation', 'info');
  log(`Platform: ${os.platform()}, Node: ${process.version}`, 'info');

  // Core Component Validation
  validateTest('Bundled MCP Server Exists', validateBundledServerExists);
  validateTest('ServerInstallUtils Compiled', validateServerInstallUtilsExists);
  validateTest('ServerDeployment Compiled', validateServerDeploymentExists);
  validateTest('McpServerRegistration Compiled', validateMcpServerRegistrationExists);
  validateTest('ExtensionCommands Compiled', validateExtensionCommandsExists);
  validateTest('CrossPlatformUtils Compiled', validateCrossplatformUtilsExists);
  validateTest('Configuration Schema Compiled', validateConfigurationSchemaExists);

  // TypeScript & Build Validation
  validateTest('TypeScript Path Aliases Resolved', validateCompiledTypescriptPaths);

  // Package Configuration Validation
  validateTest('Package.json Commands Registered', validatePackageJsonCommands);
  validateTest('Package.json Scripts Complete', validatePackageJsonScripts);

  // Testing Infrastructure Validation
  validateTest('Sprint 4 E2E Tests Exist', validateE2ETestsExist);
  validateTest('Sprint 4 Integration Tests Exist', validateIntegrationTestsExist);

  // Documentation Validation
  validateTest('README Auto-Deployment Documentation', validateDocumentationUpdated);

  // Summary
  const total = VALIDATION_RESULTS.passed + VALIDATION_RESULTS.failed;
  const passRate = ((VALIDATION_RESULTS.passed / total) * 100).toFixed(1);

  log('', 'info');
  log('📊 SPRINT 4 VALIDATION SUMMARY', 'info');
  log(`Total Tests: ${total}`, 'info');
  log(`Passed: ${VALIDATION_RESULTS.passed}`, 'success');
  log(`Failed: ${VALIDATION_RESULTS.failed}`, VALIDATION_RESULTS.failed > 0 ? 'error' : 'info');
  log(`Pass Rate: ${passRate}%`, passRate === '100.0' ? 'success' : 'error');

  if (VALIDATION_RESULTS.failed > 0) {
    log('', 'info');
    log('❌ FAILED TESTS:', 'error');
    VALIDATION_RESULTS.details
      .filter(detail => detail.status === 'FAILED')
      .forEach(detail => {
        log(`  - ${detail.test}: ${detail.reason}`, 'error');
      });
  }

  // Exit with appropriate code
  process.exit(VALIDATION_RESULTS.failed > 0 ? 1 : 0);
}

// Run validation if called directly
if (require.main === module) {
  runValidation().catch(error => {
    log(`Validation failed with error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runValidation, VALIDATION_RESULTS };
