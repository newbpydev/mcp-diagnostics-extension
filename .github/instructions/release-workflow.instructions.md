---
applyTo: '**'
---

# Complete Release Management Workflow

This rule defines the comprehensive end-to-end release management workflow that must be followed for all software releases, based on industry best practices from [LaunchDarkly](mdc:https:/launchdarkly.com/blog/release-management-checklist) and [Zeet](mdc:https:/zeet.co/blog/release-management-checklist).

## 🎯 Overview

Every software release must follow this systematic checklist to minimize downtime risks, ensure quality, and maintain professional standards. This workflow combines traditional best practices with modern feature management approaches.

## 📋 Complete Release Management Checklist

### Phase 1: Pre-Release Quality Assurance

#### 1.1 Test Suite Validation

```bash
# Run comprehensive test suite
npm run test:ci

# Verify all tests pass (target: 100% pass rate)
# Check test coverage (target: >90%)
# Ensure no failing or skipped tests
```

#### 1.2 Code Quality Checks

```bash
# Run linting
npm run lint

# Check code formatting
npm run format:check

# Verify TypeScript compilation
npm run compile
```

#### 1.3 Build Verification

```bash
# Clean build
npm run clean
npm run compile:prod

# Package extension
npm run package

# Verify package contents and size
```

### Phase 2: Version Management & Documentation

#### 2.1 Semantic Versioning

```bash
# Choose appropriate version bump:
npm run release:patch    # Bug fixes (1.0.0 → 1.0.1)
npm run release:minor    # New features (1.0.0 → 1.1.0)
npm run release:major    # Breaking changes (1.0.0 → 2.0.0)

# For pre-releases:
npm run release:alpha    # Alpha releases
npm run release:beta     # Beta releases
```

#### 2.2 Changelog Generation

- **Automatic**: `standard-version` generates changelog from conventional commits
- **Manual Review**: Verify changelog accuracy and completeness
- **Enhancement**: Add detailed descriptions for major features/fixes

#### 2.3 Documentation Updates

- **README.md**: Update features, installation, usage instructions
- **API Documentation**: Update MCP tools, resources, configuration
- **Troubleshooting**: Add new known issues and solutions
- **Migration Guides**: For breaking changes

### Phase 3: Release Preparation

#### 3.1 Pre-flight Checks

```bash
# Verify git status is clean
git status

# Ensure all changes are committed
git add .
git commit -m "docs: update documentation for v1.x.x"

# Verify remote is up to date
git pull origin master
```

#### 3.2 Package Validation

```bash
# Final package build
npm run package

# Verify package contents
vsce ls --tree

# Check package size (target: <500KB)
# Verify all necessary files included
# Ensure no sensitive files included
```

### Phase 4: Release Execution

#### 4.1 Repository Release

```bash
# Push version bump and tags
git push --follow-tags origin master

# Verify tags are pushed correctly
git tag -l
```

#### 4.2 Marketplace Publishing

```bash
# Publish to VS Code Marketplace
npm run publish

# For pre-releases:
npm run publish:pre-release

# Verify publication success
# Check marketplace listing
```

#### 4.3 Release Validation

- **Marketplace**: Verify extension appears in search results
- **Installation**: Test installation from marketplace
- **Functionality**: Verify core features work in fresh environment
- **Documentation**: Ensure marketplace description is accurate

### Phase 5: Post-Release Monitoring

#### 5.1 Immediate Monitoring (First 24 hours)

- **Download metrics**: Monitor adoption rate
- **Error reports**: Watch for crash reports or issues
- **User feedback**: Monitor reviews and GitHub issues
- **Performance**: Check extension activation times

#### 5.2 Success Metrics Tracking

- **Installation count**: Target growth rate
- **User ratings**: Maintain >4.0 stars
- **Issue resolution**: <48 hour response time
- **Performance**: <2s activation time

#### 5.3 Release Retrospective

- **What worked well**: Document successful practices
- **Areas for improvement**: Identify process gaps
- **Lessons learned**: Update this workflow as needed
- **Next release planning**: Set goals for next iteration

## 🚨 Critical Requirements

### Must-Have Before Release

- [ ] All tests passing (322/322)
- [ ] No linting errors
- [ ] Clean TypeScript compilation
- [ ] Updated documentation
- [ ] Proper semantic versioning
- [ ] Generated changelog
- [ ] Git tags pushed
- [ ] Marketplace publication successful

### Quality Gates

- **Test Coverage**: >90% statement coverage
- **Performance**: Extension activation <2 seconds
- **Package Size**: <500KB total size
- **Documentation**: All features documented
- **Compatibility**: Works in VS Code 1.96.0+

### Rollback Plan

```bash
# If issues discovered post-release:
# 1. Identify the issue severity
# 2. For critical issues:
npm run release:patch  # Quick hotfix
# 3. For major issues:
vsce unpublish         # Remove from marketplace (last resort)
```

## 🔧 Automation Integration

### GitHub Actions Workflow

This workflow integrates with [GitHub Actions CI/CD](mdc:.github/workflows/ci-cd.yml):

- **Automated testing** on pull requests
- **Automated publishing** on releases
- **Security scanning** and quality checks
- **Multi-platform validation**

### Development Tools Integration

- **Wallaby.js**: Live test feedback during development
- **Console Ninja**: Runtime debugging and performance monitoring
- **ESLint/Prettier**: Code quality enforcement
- **Husky**: Pre-commit hooks for quality gates

## 📚 References

- [LaunchDarkly Release Management Checklist](mdc:https:/launchdarkly.com/blog/release-management-checklist)
- [Zeet Complete Release Management Guide](mdc:https:/zeet.co/blog/release-management-checklist)
- [VS Code Extension Publishing Guide](mdc:https:/code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Semantic Versioning Specification](mdc:https:/semver.org)
- [Conventional Commits](mdc:https:/www.conventionalcommits.org)

## 🎯 Success Example

**Version 1.2.0 Release (2025-06-09)**:

- ✅ Fixed critical hardcoded data issue
- ✅ Added comprehensive test workspace
- ✅ Updated documentation and guides
- ✅ All 322 tests passing
- ✅ Clean linting and compilation
- ✅ Proper semantic versioning (minor bump)
- ✅ Generated changelog with detailed descriptions
- ✅ Successfully published to marketplace
- ✅ Zero post-release issues reported

This workflow ensures consistent, reliable releases that maintain user trust and minimize downtime risks.
