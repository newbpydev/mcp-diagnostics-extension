#!/usr/bin/env node

/**
 * Debug script for MCP Diagnostics Extension
 * This script helps identify why the extension might not be working properly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MCP Diagnostics Extension Debug Script');
console.log('==========================================\n');

// Check compiled files
console.log('1. Checking compiled extension files...');
const outDir = path.join(__dirname, '..', 'out');
const extensionJs = path.join(outDir, 'extension.js');

if (fs.existsSync(extensionJs)) {
    console.log('✅ extension.js exists in out/');

    // Check if main entry point is correct
    const packageJson = require('../package.json');
    console.log(`✅ package.json main entry: "${packageJson.main}"`);

    // Check commands in package.json
    if (packageJson.contributes && packageJson.contributes.commands) {
        console.log('✅ Commands declared in package.json:');
        packageJson.contributes.commands.forEach(cmd => {
            console.log(`   - ${cmd.command}: ${cmd.title}`);
        });
    }

    // Check activation events
    if (packageJson.activationEvents) {
        console.log('✅ Activation events:');
        packageJson.activationEvents.forEach(event => {
            console.log(`   - ${event}`);
        });
    }

} else {
    console.log('❌ extension.js NOT found in out/');
    console.log('   Run: npm run compile');
}

// Check for import issues in compiled code
console.log('\n2. Checking for potential import issues...');
if (fs.existsSync(extensionJs)) {
    const content = fs.readFileSync(extensionJs, 'utf-8');

    // Check for remaining path aliases
    const pathAliasRegex = /require\(["']@[^"']+["']\)/g;
    const aliases = content.match(pathAliasRegex);

    if (aliases) {
        console.log('❌ Found unresolved path aliases:');
        aliases.forEach(alias => console.log(`   - ${alias}`));
    } else {
        console.log('✅ No unresolved path aliases found');
    }

    // Check for relative imports
    const relativeImports = content.match(/require\(["']\.[^"']+["']\)/g);
    if (relativeImports && relativeImports.length > 0) {
        console.log('✅ Found relative imports (good):');
        console.log(`   - ${relativeImports.length} relative imports found`);
    }
}

// Check required directories
console.log('\n3. Checking required directories...');
const requiredDirs = [
    'out/commands',
    'out/core/diagnostics',
    'out/infrastructure/mcp',
    'out/shared'
];

requiredDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${dir}/ exists`);
    } else {
        console.log(`❌ ${dir}/ missing`);
    }
});

// Check specific compiled files
console.log('\n4. Checking specific compiled files...');
const requiredFiles = [
    'out/commands/ExtensionCommands.js',
    'out/core/diagnostics/DiagnosticsWatcher.js',
    'out/infrastructure/mcp/McpServerWrapper.js',
    'out/shared/constants.js'
];

requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
    }
});

console.log('\n5. Extension installation check...');
console.log('To check if extension is installed in VS Code/Cursor:');
console.log('1. Open Command Palette (Ctrl+Shift+P)');
console.log('2. Type "Extensions: Show Installed Extensions"');
console.log('3. Look for "MCP Diagnostics Server" by newbpydev');
console.log('4. If found, check if it\'s enabled');

console.log('\n6. Command registration check...');
console.log('To check if commands are registered:');
console.log('1. Open Command Palette (Ctrl+Shift+P)');
console.log('2. Type "MCP Diagnostics" - you should see:');
console.log('   - "MCP Diagnostics: Restart MCP Diagnostics Server"');
console.log('   - "MCP Diagnostics: Show MCP Diagnostics Status"');

console.log('\n7. Extension activation check...');
console.log('To check if extension is activated:');
console.log('1. Open VS Code/Cursor Developer Tools (Help > Toggle Developer Tools)');
console.log('2. Go to Console tab');
console.log('3. Look for: "MCP Diagnostics Extension activating..."');
console.log('4. And: "MCP Diagnostics Extension activated successfully in Xms"');

console.log('\n8. Troubleshooting steps...');
console.log('If extension is not working:');
console.log('1. Reload window: Ctrl+Shift+P > "Developer: Reload Window"');
console.log('2. Check extension host: Ctrl+Shift+P > "Developer: Show Running Extensions"');
console.log('3. Check logs: Ctrl+Shift+P > "Developer: Open Extension Host Output"');

console.log('\n9. Manual installation (if needed)...');
console.log('If extension is not installed:');
console.log('1. Install from VSIX: code --install-extension mcp-diagnostics-extension-1.0.2.vsix');
console.log('2. Or from marketplace: Search for "MCP Diagnostics Server"');

console.log('\n✨ Debug script completed!\n');
