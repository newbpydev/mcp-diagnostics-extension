# Release Process Guide

## 🏆 **v1.2.12 - EXCEPTIONAL ACHIEVEMENTS**
- **552 Tests Passing** | **98.8% Coverage** | **Production Ready**
- **Real-time VS Code Diagnostics** via MCP for AI agents
- **Universal Client Support** - Cursor, VS Code, Windsurf, Claude Desktop

This document outlines the complete release process for the MCP Diagnostics Extension, including semantic versioning, automated workflows, and best practices.

## 📋 Table of Contents

- [Release Types](#release-types)
- [Semantic Versioning](#semantic-versioning)
- [Conventional Commits](#conventional-commits)
- [Release Workflows](#release-workflows)
- [Pre-release Testing](#pre-release-testing)
- [Hotfix Process](#hotfix-process)
- [Manual Release Steps](#manual-release-steps)
- [Troubleshooting](#troubleshooting)

## 🎯 Release Types

### 1. Regular Releases

**Patch Release (1.0.0 → 1.0.1)**
- Bug fixes
- Security patches
- Documentation updates
- Minor performance improvements

**Minor Release (1.0.0 → 1.1.0)**
- New features
- Enhancements to existing features
- Deprecations (non-breaking)

**Major Release (1.0.0 → 2.0.0)**
- Breaking changes
- Major architectural changes
- Removal of deprecated features

### 2. Pre-releases

**Alpha (1.0.0-alpha.1)**
- Early development builds
- Experimental features
- Internal testing

**Beta (1.0.0-beta.1)**
- Feature-complete pre-releases
- Community testing
- Release candidate preparation

### 3. Hotfixes

**Emergency Patch (1.0.1)**
- Critical bug fixes
- Security vulnerabilities
- Expedited release process

## 📝 Semantic Versioning

We follow [Semantic Versioning 2.0.0](https://semver.org/) specification:

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

### Version Increment Rules

| Change Type | Version Impact | Example |
|-------------|----------------|---------|
| Breaking change | MAJOR | 1.0.0 → 2.0.0 |
| New feature | MINOR | 1.0.0 → 1.1.0 |
| Bug fix | PATCH | 1.0.0 → 1.0.1 |
| Pre-release | PRERELEASE | 1.0.0 → 1.1.0-alpha.1 |

## 💬 Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Supported Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks
- `revert`: Revert previous commit

### Examples

```bash
# Feature
feat(mcp): add new diagnostic filtering tool

# Bug fix
fix(watcher): resolve memory leak in diagnostic processing

# Breaking change
feat(api)!: restructure MCP tool interface

BREAKING CHANGE: Tool response format has changed
```

### Using Commitizen

For interactive commit creation:

```bash
npm run commit
```

This will guide you through creating a conventional commit.

## 🚀 Release Workflows

### Automated Release Workflow

#### Via GitHub Actions UI

1. Go to GitHub Actions → "Release" workflow
2. Click "Run workflow"
3. Select branch (`main` for stable, `develop` for pre-release)
4. Choose release type:
   - `patch`: Bug fixes and minor updates
   - `minor`: New features
   - `major`: Breaking changes
   - `prerelease-alpha`: Alpha version
   - `prerelease-beta`: Beta version
5. Optional: Check "Dry run" to preview changes
6. Click "Run workflow"

#### Via Command Line

```bash
# Regular releases
npm run release              # Automatic version bump based on commits
npm run release:patch        # Force patch release
npm run release:minor        # Force minor release
npm run release:major        # Force major release

# Pre-releases
npm run release:alpha        # Alpha pre-release
npm run release:beta         # Beta pre-release

# Dry run (preview only)
npm run release:dry-run
```

### Release Workflow Steps

1. **Validation**
   - Run full test suite (552 tests)
   - Code linting and formatting
   - Security audit
   - Type checking

2. **Version Bump**
   - Analyze commits since last release
   - Determine appropriate version increment
   - Update `package.json` and `package-lock.json`

3. **Changelog Generation**
   - Generate CHANGELOG.md from conventional commits
   - Group changes by type (features, bug fixes, etc.)
   - Add commit links and contributor information

4. **Git Operations**
   - Create release commit
   - Tag with new version
   - Push changes and tags

5. **Build & Package**
   - Install dependencies
   - Run production build
   - Package extension as VSIX

6. **GitHub Release**
   - Create GitHub release with generated notes
   - Upload VSIX artifact
   - Mark as pre-release if applicable

7. **Marketplace Publishing**
   - Publish to VS Code Marketplace
   - Stable releases go to main channel
   - Pre-releases go to pre-release channel

## 🧪 Pre-release Testing

### Alpha Testing Workflow

1. Create alpha release: `npm run release:alpha`
2. Install locally: `code --install-extension *.vsix`
3. Test core functionality:
   - Extension activation
   - MCP server startup
   - Diagnostic capture
   - Tool responses
4. Report issues with `[ALPHA]` tag

### Beta Testing Workflow

1. Create beta release: `npm run release:beta`
2. Publish to pre-release channel
3. Community testing period (1-2 weeks)
4. Collect feedback and bug reports
5. Address critical issues
6. Promote to stable release

### Testing Checklist

- [ ] Extension activates without errors
- [ ] MCP server starts and responds to tools
- [ ] Diagnostics are captured correctly
- [ ] Status bar updates properly
- [ ] Commands work as expected
- [ ] Performance is acceptable (large workspaces)
- [ ] Memory usage is stable
- [ ] Cross-platform compatibility (Windows, macOS, Linux)

## 🚨 Hotfix Process

### When to Use Hotfixes

- Critical bugs affecting all users
- Security vulnerabilities
- Data corruption issues
- Extension fails to activate

### Hotfix Workflow

1. **Immediate Assessment**
   - Confirm severity and impact
   - Identify root cause
   - Estimate fix complexity

2. **Create Hotfix**
   - Branch from `main` if needed
   - Implement minimal fix
   - Write focused tests

3. **Emergency Release**
   - Use GitHub Actions "Hotfix Release" workflow
   - Provide clear description
   - Mark as emergency if critical

4. **Post-Hotfix Review**
   - Automated issue created for review
   - Plan proper fix for next release
   - Update documentation if needed

### Hotfix Commands

```bash
# Via GitHub Actions (recommended)
# Go to Actions → "Hotfix Release" → Run workflow

# Manual hotfix (if needed)
npm run release:patch
```

## 🔧 Manual Release Steps

If automated workflows fail, follow these manual steps:

### Prerequisites

```bash
# Install required tools
npm install -g @vscode/vsce
npm install -g standard-version

# Ensure clean working directory
git status
```

### Step-by-Step Process

1. **Prepare Release**
   ```bash
   # Run full CI check
   npm run ci:check

   # Create release (updates version, changelog, tags)
   npm run release
   ```

2. **Build and Package**
   ```bash
   # Package extension
   vsce package
   ```

3. **Create GitHub Release**
   ```bash
   # Push changes and tags
   git push --follow-tags origin main

   # Create release via GitHub CLI or web interface
   gh release create v1.0.0 *.vsix --generate-notes
   ```

4. **Publish to Marketplace**
   ```bash
   # Publish to VS Code Marketplace
   vsce publish --pat YOUR_PAT
   ```

## 🔍 Troubleshooting

### Common Issues

#### Version Conflicts

```bash
# Reset to clean state
git checkout main
git pull origin main
npm ci

# Try release again
npm run release
```

#### Package Build Failures

```bash
# Clean build artifacts
npm run clean
npm ci
npm run compile:prod

# Check for linting errors
npm run lint
```

#### Marketplace Publishing Failures

1. Verify VSCE_PAT secret is configured
2. Check marketplace publisher permissions
3. Ensure extension name is unique
4. Verify package.json metadata

### Getting Help

- Check GitHub Actions logs for detailed error information
- Review CHANGELOG.md for recent changes
- Open issue with `release` label for assistance
- Contact maintainers for urgent release issues

## 📊 Release Metrics

Track these metrics for each release:

- Time from commit to published release
- Number of commits included
- Test coverage percentage
- Extension size (VSIX file)
- Download/install metrics
- User feedback and ratings

## 🔄 Continuous Improvement

- Regularly review and update release process
- Automate additional checks as needed
- Gather feedback from contributors
- Monitor release success rates
- Optimize workflow performance

---

For questions or improvements to this process, please open an issue or discuss in team meetings.
