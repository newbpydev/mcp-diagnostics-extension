# Contributing to MCP Diagnostics Extension

Thank you for your interest in contributing to the MCP Diagnostics Extension! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [CI/CD Pipeline](#cicd-pipeline)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x (22.x recommended)
- npm 9.x or later
- VS Code 1.96.0 or later
- Git

### Project Stats (Current)

- **🏆 602 Tests Passing** (3 skipped, 0 failing)
- **📊 95.45% Test Coverage** (exceeding 90% requirement)
- **🔧 34 Test Suites** covering all components
- **✨ v1.3.0** with cross-platform support

### Development Tools

We use the following tools for development:
- **TypeScript**: Strict typing and modern JavaScript features
- **Jest**: Unit and integration testing
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Wallaby.js**: Live testing feedback (optional but recommended)

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/mcp-diagnostics-extension.git
   cd mcp-diagnostics-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build and Test**
   ```bash
   npm run compile
   npm test
   ```

4. **VS Code Development**
   - Open the project in VS Code
   - Press F5 to launch Extension Development Host
   - Test the extension in the new VS Code window

## Development Workflow

### Branch Strategy

- **main**: Production-ready code, triggers stable releases
- **develop**: Integration branch for features, triggers pre-releases
- **feature/***: Feature branches for new functionality
- **bugfix/***: Bug fix branches
- **hotfix/***: Critical fixes that need immediate release

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Follow TDD Approach**
   - Write failing tests first
   - Implement minimal code to pass tests
   - Refactor while keeping tests green

3. **Make Incremental Commits**
   ```bash
   git add .
   git commit -m "feat: add diagnostic filtering functionality"
   ```

4. **Keep Branch Updated**
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

5. **Create Pull Request**
   - Push branch to your fork
   - Create PR against `develop` branch
   - Fill out PR template completely

## Testing

### Test Structure

```
src/test/
├── unit/           # Fast, isolated tests
├── integration/    # Component interaction tests
├── fixtures/       # Test data and mocks
└── helpers/        # Test utilities
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run CI tests (no watch, coverage)
npm run test:ci
```

### Test Requirements

- **Unit Tests**: 90%+ coverage requirement (currently achieving 95.45%)
- **Integration Tests**: Cover component interactions
- **E2E Tests**: Full extension workflow validation
- **Cross-Platform Tests**: Windows, macOS, Linux compatibility
- **TDD Approach**: Write tests before implementation
- **Mocking**: Use proper VS Code API mocking

### Using Wallaby.js

If you have Wallaby.js installed:
- Tests run automatically as you type
- Real-time coverage indicators
- Runtime value inspection
- Performance monitoring

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper access modifiers (private, public, protected)
- Document public APIs with JSDoc

### Code Style

- Use ESLint and Prettier for consistent formatting
- Follow established patterns in the codebase
- Keep functions small and focused
- Use meaningful variable and function names

### Commit Messages

Follow [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): description

feat(mcp): add new diagnostic filtering tool
fix(diagnostics): resolve memory leak in watcher
docs(readme): update installation instructions
test(integration): add MCP server connection tests
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

## Pull Request Process

### Before Creating PR

- [ ] All tests pass (`npm run ci:check`)
- [ ] Code follows style guidelines
- [ ] Changes are documented
- [ ] CHANGELOG.md updated (if needed)
- [ ] Self-review completed

### PR Requirements

1. **Fill Out Template**: Complete all sections of the PR template
2. **Link Issues**: Reference related issues with `Fixes #123`
3. **Add Labels**: Apply appropriate labels (bug, feature, docs, etc.)
4. **Request Review**: Add reviewers when ready
5. **Respond to Feedback**: Address all review comments

### PR Checklist

- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Performance impact considered
- [ ] Security implications reviewed

## CI/CD Pipeline

### Automated Checks

Every PR triggers:
- **Multi-platform Testing**: Ubuntu, Windows, macOS
- **Node.js Compatibility**: Tests on Node 18.x and 20.x
- **Security Scanning**: npm audit and CodeQL analysis
- **Code Quality**: Linting, formatting, type checking
- **Performance Testing**: Bundle size and performance checks

### Pipeline Stages

1. **Test Stage**: Run all tests with coverage
2. **Security Stage**: Security audit and analysis
3. **Quality Stage**: Code formatting and build verification
4. **Package Stage**: Extension packaging (on releases)
5. **Publish Stage**: Marketplace publishing (on releases)

### Status Checks

All status checks must pass before merging:
- ✅ Tests pass on all platforms
- ✅ Code coverage meets threshold
- ✅ Security audit passes
- ✅ Code formatting is correct
- ✅ Build succeeds

## Release Process

### Version Management

- **Patch**: Bug fixes, no breaking changes
- **Minor**: New features, backward compatible
- **Major**: Breaking changes

### Release Steps

1. **Update Version**
   ```bash
   npm run version:patch  # or minor/major
   ```

2. **Update CHANGELOG.md**
   - Add new version section
   - Document all changes

3. **Create GitHub Release**
   - Tag format: `v1.2.3`
   - Target: `main` branch
   - Include release notes

4. **Automated Publishing**
   - CI/CD pipeline handles marketplace publishing
   - GitHub release includes VSIX attachment

### Pre-release Testing

- Push to `develop` branch triggers pre-release
- Test extension before stable release
- Gather feedback from early adopters

## Getting Help

### Documentation

- [Project README](../README.md)
- [Architecture Documentation](../src/README.md)
- [Release Process](RELEASE.md)
- [Security Policy](SECURITY.md)

### Communication

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Email**: newbpydev@gmail.com for private matters

### Development Environment

- **VS Code Settings**: Project includes recommended settings
- **Extensions**: Recommended extensions for development
- **Debugging**: Launch configurations for testing

## Code of Conduct

Please note that this project has a Code of Conduct. By participating in this project, you agree to abide by its terms:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Recognition

Contributors are recognized in:
- Release notes for significant contributions
- GitHub contributors list
- Project documentation credits

Thank you for contributing to make this extension better for everyone!
