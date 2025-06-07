# Release Process

This document outlines the release process for the MCP Diagnostics Extension.

## Release Types

### 1. Pre-release (Development Branch)
- **Branch**: `develop`
- **Trigger**: Push to develop branch
- **Marketplace**: Published as pre-release
- **Purpose**: Testing and validation before stable release

### 2. Stable Release (Main Branch)
- **Branch**: `main`
- **Trigger**: GitHub Release creation
- **Marketplace**: Published as stable release
- **Purpose**: Production-ready version for all users

## Automated Release Workflow

### CI/CD Pipeline Overview
1. **Test Phase**: Multi-platform testing (Ubuntu, Windows, macOS) with Node.js 18.x and 20.x
2. **Security Phase**: Security audit and CodeQL analysis
3. **Quality Phase**: Code formatting, production build, and git status verification
4. **Package Phase**: Extension packaging and VSIX artifact creation
5. **Publish Phase**: Marketplace publishing and GitHub release creation

### Prerequisites
- All tests must pass (300+ tests)
- Code must be properly formatted
- No linting errors
- Security audit passes
- VSCE_PAT secret configured in GitHub repository

## Manual Release Steps

### 1. Prepare Release

#### Update Version
```bash
# For patch releases (bug fixes)
npm run version:patch

# For minor releases (new features)
npm run version:minor

# For major releases (breaking changes)
npm run version:major
```

#### Update CHANGELOG.md
- Add new version section
- List all changes, features, and fixes
- Follow [Keep a Changelog](https://keepachangelog.com/) format

#### Verify Package Contents
```bash
npm run package
# Check the generated .vsix file size and contents
```

### 2. Create GitHub Release

1. Go to [GitHub Releases](https://github.com/newbpydev/mcp-diagnostics-extension/releases)
2. Click "Draft a new release"
3. Create a new tag: `v{major}.{minor}.{patch}` (e.g., `v1.0.1`)
4. Set target branch to `main`
5. Release title: `v{version} - {Brief Description}`
6. Add release notes from CHANGELOG.md
7. Mark as pre-release if needed
8. Click "Publish release"

### 3. Monitor Release

- Check GitHub Actions workflow completion
- Verify VS Code Marketplace publication
- Test extension installation from marketplace
- Monitor for any issues or user feedback

## Release Checklist

### Pre-Release Checklist
- [ ] All tests pass locally (`npm test`)
- [ ] Code is properly formatted (`npm run format:check`)
- [ ] No linting errors (`npm run lint`)
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately
- [ ] Package.json metadata is current
- [ ] Assets are optimized and current
- [ ] Documentation is up to date

### Post-Release Checklist
- [ ] GitHub Actions workflow completed successfully
- [ ] Extension published to VS Code Marketplace
- [ ] Release notes are accurate
- [ ] GitHub release created with VSIX attachment
- [ ] Social media announcements (if applicable)
- [ ] Documentation site updated (if applicable)

## Hotfix Process

For critical bugs that need immediate fixes:

1. Create hotfix branch from `main`
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-fix
   ```

2. Make minimal changes to fix the issue
3. Update version (patch increment)
4. Create PR to `main` with "hotfix" label
5. Once merged, create immediate release
6. Merge `main` back to `develop`

## Rolling Back a Release

If a release needs to be rolled back:

1. **Marketplace**: Create new release with previous stable version
2. **GitHub**: Edit release to mark as "yanked" or delete if not widely adopted
3. **Communication**: Notify users through appropriate channels
4. **Investigation**: Document what went wrong and improve process

## Marketplace Publishing

### Automatic Publishing
The CI/CD pipeline automatically publishes to the VS Code Marketplace when:
- A GitHub release is created (stable release)
- Code is pushed to `develop` branch (pre-release)

### Manual Publishing
If needed, you can manually publish:

```bash
# Install VSCE
npm install -g @vscode/vsce

# Login to Azure DevOps (one time setup)
vsce login newbpydev

# Publish stable release
npm run publish

# Publish pre-release
npm run publish:pre-release
```

## Environment Setup

### Required Secrets
- `VSCE_PAT`: Personal Access Token for VS Code Marketplace publishing
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Setting up VSCE_PAT
1. Go to [Azure DevOps](https://dev.azure.com)
2. Create Personal Access Token with Marketplace permissions
3. Add as repository secret in GitHub Settings

## Monitoring and Analytics

After each release:
- Monitor VS Code Marketplace analytics
- Check GitHub repository insights
- Review user feedback and issues
- Track performance metrics
- Plan next release based on feedback

## Troubleshooting

### Common Issues

#### Publishing Fails
- Check VSCE_PAT token validity
- Verify publisher ID matches
- Ensure all required fields in package.json

#### Tests Fail in CI
- Check for platform-specific issues
- Verify Node.js version compatibility
- Review test output for specific failures

#### Large Package Size
- Review .vscodeignore file
- Check for unnecessary included files
- Optimize assets and dependencies

### Getting Help
- Check GitHub Actions logs for detailed error messages
- Review VS Code extension publishing documentation
- Contact repository maintainers if needed
