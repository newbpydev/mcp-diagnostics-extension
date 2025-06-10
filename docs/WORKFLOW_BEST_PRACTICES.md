# VS Code Extension Development: Workflow Best Practices

**Last Updated:** June 2025
**Project:** MCP Diagnostics Extension
**Purpose:** Standardized workflow for bug fixes, versioning, and change management

## 🚨 Critical Bug Resolution Workflow

### 1. Issue Identification & Analysis

#### Step 1.1: Systematic Problem Investigation
```bash
# Always start with systematic analysis
1. Reproduce the issue in multiple environments
2. Check Extension Host Output logs
3. Identify root cause with evidence
4. Document exact error messages and stack traces
```

**Example from lodash dependency issue:**
- **Environment Testing**: Issue occurred in packaged extension but not Extension Development Host
- **Log Analysis**: `Error: Cannot find module 'lodash'` in Extension Host Output
- **Root Cause**: `.vscodeignore` excluded `node_modules/` preventing dependency bundling

#### Step 1.2: Impact Assessment
```markdown
## Impact Assessment Template
- **Severity**: Critical/High/Medium/Low
- **Affected Users**: All users/Subset/Development only
- **Environments**: VS Code/Cursor/Both
- **Functionality**: Extension activation/Feature specific/Performance
```

### 2. Solution Implementation

#### Step 2.1: Fix Strategy Selection
```typescript
// For dependency issues, prefer eliminating dependencies over bundling
// Example: Replace lodash.debounce with custom implementation

// ❌ Bad - Adding complex bundling configuration
// ✅ Good - Remove external dependency entirely

function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | undefined;

  return (...args: Parameters<F>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = undefined;
      func(...args);
    }, wait);
  };
}
```

#### Step 2.2: Testing Protocol
```bash
# Mandatory testing sequence
npm run lint           # ESLint validation
npm run compile        # TypeScript compilation
npm test              # Full test suite (must pass 100%)
npm run package       # VSIX packaging test
```

### 3. Versioning & Documentation

#### Step 3.1: Semantic Versioning Rules
```json
{
  "version": "MAJOR.MINOR.PATCH",
  "rules": {
    "PATCH": "Bug fixes, no breaking changes",
    "MINOR": "New features, backward compatible",
    "MAJOR": "Breaking changes"
  }
}
```

**Examples:**
- `1.2.0 → 1.2.1`: Critical dependency fix (PATCH)
- `1.2.1 → 1.3.0`: New feature addition (MINOR)
- `1.3.0 → 2.0.0`: Breaking API changes (MAJOR)

#### Step 3.2: CHANGELOG.md Format
```markdown
## [1.2.1](comparison-url) (2025-06-09)

### Fixed

- **🚨 CRITICAL**: Brief description of critical issue
  - Detailed explanation of the problem
  - Solution implemented
  - Impact on users
  - Why it only affected certain scenarios

### Technical Details

- **Root Cause**: Specific technical reason
- **Solution**: Implementation details
- **Impact**: Performance/size/reliability improvements
- **Validation**: Test results and verification

### Removed/Added/Changed

- List specific changes to dependencies, files, or functionality
```

### 4. Quality Assurance Protocol

#### Step 4.1: Pre-Release Checklist
```bash
# ✅ Code Quality
- [ ] All tests passing (322/322)
- [ ] ESLint clean (0 errors, 0 warnings)
- [ ] TypeScript compilation successful
- [ ] No console.log statements in production code

# ✅ Extension Testing
- [ ] Extension activates in VS Code
- [ ] Extension activates in Cursor
- [ ] All commands functional
- [ ] MCP server starts successfully
- [ ] No runtime errors in Extension Host Output

# ✅ Packaging
- [ ] VSIX package builds successfully
- [ ] Package size reasonable (<250KB for this project)
- [ ] All required files included
- [ ] No unnecessary files included

# ✅ Documentation
- [ ] CHANGELOG.md updated
- [ ] Version number incremented
- [ ] README updated if needed
- [ ] Breaking changes documented
```

#### Step 4.2: Post-Release Validation
```bash
# Install and test packaged extension
code --install-extension mcp-diagnostics-extension-1.2.1.vsix

# Verify functionality
1. Check extension appears in Extensions list
2. Test all registered commands
3. Verify MCP server functionality
4. Check for any runtime errors
```

## 📋 Standard Operating Procedures

### SOP 1: Emergency Bug Fix
```bash
# 1. Immediate Response (< 2 hours)
git checkout -b hotfix/critical-bug-description
# Implement minimal fix
npm run ci:check  # Full CI validation
git commit -m "fix: critical bug description"

# 2. Rapid Release (< 4 hours)
npm version patch  # Increment to x.x.PATCH
npm run package   # Create VSIX
# Test installation manually
# Deploy to marketplace
```

### SOP 2: Regular Development Cycle
```bash
# 1. Feature Development
git checkout -b feature/feature-name
# Implement feature with TDD
npm run test:watch  # Continuous testing

# 2. Integration
npm run ci:check
git commit -m "feat: feature description"
npm version minor  # Increment to x.MINOR.x

# 3. Release
npm run package
# Manual testing
# Marketplace deployment
```

### SOP 3: Issue Investigation Template
```markdown
## Issue Report Template

### Environment
- **OS**: Windows/macOS/Linux
- **VS Code Version**: x.x.x
- **Extension Version**: x.x.x
- **Editor**: VS Code/Cursor

### Reproduction Steps
1. Step one
2. Step two
3. Expected vs Actual behavior

### Investigation Results
- **Error Messages**: Exact text from logs
- **Stack Traces**: Full stack trace if available
- **Timing**: When does the error occur
- **Conditions**: What triggers the issue

### Root Cause Analysis
- **Component**: Which part of the system
- **Code Location**: File and line number
- **Dependencies**: External factors
- **Configuration**: Settings that affect behavior
```

## 🔧 Development Environment Setup

### Required Tools Checklist
```bash
# Core Development
- [ ] Node.js 18+ installed
- [ ] npm 8+ installed
- [ ] TypeScript 5+ installed
- [ ] VS Code with extension development setup

# Quality Tools
- [ ] ESLint configured and working
- [ ] Prettier configured and working
- [ ] Jest test runner configured
- [ ] Wallaby.js for live testing (optional but recommended)

# Extension Tools
- [ ] @vscode/vsce package tool
- [ ] VS Code Extension Development Host working (F5)
- [ ] MCP server testing setup
```

### Project Configuration Files
```bash
# Essential Configuration Files
tsconfig.json          # TypeScript compiler configuration
tsconfig.prod.json     # Production build configuration
jest.config.js         # Test runner configuration
eslint.config.mjs      # Linting rules
.vscodeignore         # Package exclusion rules (critical!)
package.json          # Dependencies and scripts
```

## 🚀 Automation & CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run ci:check  # lint + format + build + test

  package:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run package
      - uses: actions/upload-artifact@v4
        with:
          name: vsix-package
          path: '*.vsix'
```

### NPM Scripts for Workflow
```json
{
  "scripts": {
    "ci:check": "npm run lint && npm run format:check && npm run compile:prod && npm run test:ci",
    "version:patch": "npm version patch",
    "version:minor": "npm version minor",
    "version:major": "npm version major",
    "postversion": "git push && git push --tags",
    "package:test": "npm run package && echo 'Package created successfully'"
  }
}
```

## 📊 Success Metrics & Monitoring

### Quality Metrics Dashboard
```markdown
## Quality Metrics (Target vs Actual)

### Code Quality
- **Test Coverage**: >95% (Current: 100%)
- **ESLint Errors**: 0 (Current: 0)
- **TypeScript Errors**: 0 (Current: 0)
- **Security Vulnerabilities**: 0 (Current: 0)

### Performance Metrics
- **Extension Activation**: <2s (Current: <1s)
- **Package Size**: <250KB (Current: 210KB)
- **Memory Usage**: <50MB (Current: ~30MB)
- **Test Execution**: <30s (Current: ~16s)

### User Experience
- **Marketplace Rating**: >4.0 stars
- **Installation Success Rate**: >99%
- **Bug Reports**: <1 per 1000 downloads
- **Documentation Clarity**: User feedback positive
```

### Monitoring & Alerting
```typescript
// Extension telemetry (anonymized)
const telemetry = {
  activationTime: Date.now() - startTime,
  mcpServerStatus: 'success' | 'failed',
  commandsRegistered: commandCount,
  errorsEncountered: errorCount
};

// Send to telemetry service for monitoring
```

## 💡 Lessons Learned & Best Practices

### Critical Insights from lodash Issue

1. **Dependency Management**
   - Always prefer native implementations over external dependencies
   - Understand packaging exclusions (`.vscodeignore`)
   - Test packaged extensions, not just development environment

2. **Testing Strategy**
   - Extension Development Host (F5) ≠ Real installation
   - Always test `.vsix` package installation
   - Include both environments in CI/CD

3. **Error Investigation**
   - Extension Host Output is primary debugging tool
   - Stack traces reveal exact failure points
   - Environment differences provide crucial clues

4. **Documentation**
   - CHANGELOG.md must explain technical context
   - Version numbers should reflect change impact
   - Quick fixes need same documentation rigor as features

### Future Prevention Strategies

1. **Automated Testing**
   ```bash
   # Add to CI/CD pipeline
   - Install packaged extension in clean environment
   - Automated activation testing
   - Dependency validation checks
   ```

2. **Development Workflow**
   ```bash
   # Before every commit
   npm run ci:check && npm run package:test
   ```

3. **Documentation Standards**
   - Every bug fix documented in CHANGELOG
   - Technical details preserved for future reference
   - Reproduction steps documented for testing

---

**🎯 Workflow Success Criteria:**
- Zero-surprise deployments
- <4 hour critical bug resolution
- >99% extension activation success rate
- Comprehensive documentation for all changes
- Automated quality gates preventing regressions

This workflow ensures systematic, professional development practices that prevent issues like the lodash dependency problem and enable rapid, confident deployments.
