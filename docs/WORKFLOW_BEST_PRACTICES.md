# VS Code MCP Diagnostics Extension - Workflow Best Practices

**Last Updated:** June 9, 2025
**Purpose:** Establish systematic workflows to prevent critical issues and ensure consistent, high-quality releases

## 🚨 Critical Issue Prevention Framework

### 1. Dependency Management Protocol

#### ❌ NEVER Add External Dependencies Without This Checklist:
- [ ] **Necessity Check**: Can this be implemented natively in TypeScript?
- [ ] **Bundle Impact**: Will this increase package size significantly?
- [ ] **Packaging Test**: Does it work in both dev and packaged extension?
- [ ] **Alternative Analysis**: Are there lighter alternatives?
- [ ] **Long-term Maintenance**: Is this dependency actively maintained?

#### ✅ Approved Dependency Categories:
1. **Essential Runtime Dependencies** (must be bundled):
   - `@modelcontextprotocol/sdk` - Core MCP functionality
   - `zod` - Runtime type validation (CRITICAL for MCP tools)
   - `tsconfig-paths` - TypeScript path resolution

2. **Development Dependencies** (excluded from package):
   - Testing frameworks, linters, build tools
   - Type definitions (`@types/*`)

#### 🔧 Custom Implementation Strategy:
```typescript
// ✅ PREFERRED: Custom implementations for simple utilities
function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | undefined;
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = undefined;
      func(...args);
    }, wait);
  };
}

// ❌ AVOID: External dependencies for simple utilities
// import { debounce } from 'lodash'; // Adds 70KB+ to bundle
```

### 2. Packaging Validation Protocol

#### Pre-Release Checklist (MANDATORY):
```bash
# 1. Clean build
npm run clean
npm run compile:prod

# 2. Dependency audit
npm ls --depth=0
npm audit

# 3. Package and test
npm run package
code --install-extension ./mcp-diagnostics-extension-*.vsix

# 4. Manual verification
# - Install in clean VS Code instance
# - Test all commands work
# - Check Extension Host Output for errors
# - Verify MCP tools respond correctly
```

#### Automated Validation Script:
```bash
#!/bin/bash
# scripts/validate-package.sh

set -e

echo "🔍 Starting package validation..."

# Check for critical dependencies
echo "📦 Checking dependencies..."
if ! npm ls zod > /dev/null 2>&1; then
  echo "❌ Missing zod dependency"
  exit 1
fi

if ! npm ls @modelcontextprotocol/sdk > /dev/null 2>&1; then
  echo "❌ Missing MCP SDK dependency"
  exit 1
fi

# Build and package
echo "🏗️ Building production version..."
npm run compile:prod

echo "📦 Creating package..."
npm run package

# Extract and verify package contents
echo "🔍 Verifying package contents..."
VSIX_FILE=$(ls *.vsix | head -n1)
unzip -l "$VSIX_FILE" | grep -E "(node_modules|zod|@modelcontextprotocol)" || {
  echo "❌ Package missing required dependencies"
  exit 1
}

echo "✅ Package validation complete"
```

### 3. VS Code Extension Packaging Deep Dive

#### Understanding .vscodeignore Impact:
```bash
# Current .vscodeignore excludes:
node_modules/     # ❌ PROBLEM: Excludes ALL dependencies
src/**           # ✅ Correct: Source files not needed
**/*.ts          # ✅ Correct: TypeScript files not needed
coverage/        # ✅ Correct: Test artifacts not needed
```

#### Solution Options Analysis:

**Option 1: Bundle Dependencies (RECOMMENDED)**
```json
// package.json - Add bundling script
{
  "scripts": {
    "bundle": "webpack --mode production",
    "vscode:prepublish": "npm run bundle"
  }
}
```

**Option 2: Selective Dependency Inclusion**
```bash
# .vscodeignore - Include only required dependencies
node_modules/
!node_modules/zod/**
!node_modules/@modelcontextprotocol/**
```

**Option 3: Remove External Dependencies (CURRENT APPROACH)**
- Replace `zod` with custom validation
- Replace `@modelcontextprotocol/sdk` with manual implementation
- ❌ Not recommended: Loses type safety and MCP compatibility

### 4. Systematic Issue Detection

#### Development Environment Validation:
```typescript
// src/shared/environment-check.ts
export function validateDevelopmentEnvironment(): void {
  const requiredDependencies = [
    'zod',
    '@modelcontextprotocol/sdk'
  ];

  for (const dep of requiredDependencies) {
    try {
      require.resolve(dep);
    } catch (error) {
      throw new Error(`Missing required dependency: ${dep}`);
    }
  }
}
```

#### Runtime Dependency Verification:
```typescript
// src/extension.ts - Add to activation
export async function activate(context: vscode.ExtensionContext) {
  try {
    // Verify critical dependencies are available
    await import('zod');
    await import('@modelcontextprotocol/sdk/server/index.js');

    // Continue with normal activation...
  } catch (error) {
    vscode.window.showErrorMessage(
      `MCP Diagnostics Extension failed to activate: ${error.message}`
    );
    throw error;
  }
}
```

### 5. Testing Strategy for Packaging Issues

#### Multi-Environment Testing:
```typescript
// src/test/packaging/dependency-resolution.test.ts
describe('Dependency Resolution', () => {
  it('should resolve zod in packaged extension', async () => {
    // This test should run in both dev and packaged environments
    expect(() => require('zod')).not.toThrow();
  });

  it('should resolve MCP SDK in packaged extension', async () => {
    expect(() => require('@modelcontextprotocol/sdk/server/index.js')).not.toThrow();
  });
});
```

#### CI/CD Pipeline Enhancement:
```yaml
# .github/workflows/ci-cd.yml
- name: Test Packaged Extension
  run: |
    npm run package
    # Install and test the packaged extension
    code --install-extension ./mcp-diagnostics-extension-*.vsix
    # Run integration tests against installed extension
    npm run test:e2e:packaged
```

### 6. Version Management & Change Documentation

#### Semantic Versioning Protocol:
```bash
# For dependency-related fixes
npm version patch  # 1.2.1 → 1.2.2

# For new MCP tools/features
npm version minor  # 1.2.2 → 1.3.0

# For breaking API changes
npm version major  # 1.3.0 → 2.0.0
```

#### CHANGELOG.md Template:
```markdown
## [X.Y.Z] - YYYY-MM-DD

### 🚨 Critical Fixes
- **Dependency Resolution**: Fixed missing zod dependency in packaged extension
  - **Root Cause**: .vscodeignore excluded node_modules/
  - **Solution**: [Specific solution implemented]
  - **Impact**: Extension now activates correctly in all environments

### 🔧 Technical Details
- **Files Modified**: List of changed files
- **Dependencies**: Changes to package.json dependencies
- **Build Process**: Changes to compilation/packaging
- **Testing**: New tests added to prevent regression

### 🧪 Validation Performed
- [ ] Clean installation test
- [ ] Extension activation test
- [ ] MCP tools functionality test
- [ ] Performance regression test
```

### 7. Emergency Response Protocol

#### Critical Bug Response (< 24 hours):
1. **Immediate Assessment**:
   ```bash
   # Quick diagnosis commands
   npm ls --depth=0
   npm run package
   unzip -l *.vsix | grep node_modules
   ```

2. **Hotfix Branch Creation**:
   ```bash
   git checkout -b hotfix/critical-dependency-issue
   # Implement minimal fix
   git commit -m "fix: resolve critical dependency issue"
   ```

3. **Rapid Testing**:
   ```bash
   npm run ci:check
   npm run package
   # Manual installation test
   ```

4. **Emergency Release**:
   ```bash
   npm version patch
   npm run publish
   git push origin hotfix/critical-dependency-issue
   ```

### 8. Long-term Architecture Decisions

#### Dependency Strategy Evolution:
```typescript
// Phase 1: Current (Custom implementations)
// - Custom debounce function
// - Minimal external dependencies

// Phase 2: Bundling (Recommended next step)
// - Webpack bundling for dependencies
// - Tree-shaking for optimal size
// - Source maps for debugging

// Phase 3: Micro-bundling (Future consideration)
// - Individual tool bundling
// - Lazy loading for MCP tools
// - Dynamic imports for optional features
```

#### Performance Monitoring Integration:
```typescript
// src/core/services/DependencyMonitor.ts
export class DependencyMonitor {
  public static validateCriticalDependencies(): ValidationResult {
    const results = {
      zod: this.checkZod(),
      mcpSdk: this.checkMcpSdk(),
      performance: this.checkPerformanceImpact()
    };

    return {
      allValid: Object.values(results).every(r => r.valid),
      details: results
    };
  }
}
```

## 🎯 Success Metrics

### Quality Gates:
- **Zero Dependency Failures**: 100% success rate in package installation
- **Activation Success**: >99% successful extension activation
- **Performance Targets**: All timing requirements met
- **User Experience**: No user-facing dependency errors

### Monitoring Dashboard:
```typescript
// Extension telemetry for dependency health
{
  "dependencyResolution": {
    "zodAvailable": boolean,
    "mcpSdkAvailable": boolean,
    "activationTime": number,
    "packageSize": number
  }
}
```

This comprehensive workflow ensures that dependency issues like the `zod` problem are systematically prevented, quickly detected, and rapidly resolved with minimal user impact.
