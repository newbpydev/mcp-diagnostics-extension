# Changelog

All notable changes to the "MCP Diagnostics Extension" will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-01-14

### Added
- **Enhanced Debugging**: Added comprehensive activation logging with step-by-step progress indicators
- **Visible Activation Feedback**: Added notification messages to confirm extension activation attempts
- **Multiple Activation Events**: Added command-specific and wildcard activation events for better compatibility
- **Comprehensive Troubleshooting Guide**: Created detailed TROUBLESHOOTING.md with step-by-step diagnostics
- **Extension Debug Script**: Added scripts/debug-extension.js for automated issue detection

### Fixed
- **Activation Reliability**: Improved extension activation with multiple trigger events
- **Command Registration**: Enhanced command registration reliability across different VS Code variants
- **Cursor Compatibility**: Added specific activation events and debugging for Cursor IDE compatibility

### Changed
- **Error Reporting**: Enhanced error logging with stack traces and detailed context
- **Activation Events**: Expanded from single "onStartupFinished" to multiple activation triggers
- **Console Logging**: Added emoji indicators and structured logging for better debugging experience

### Technical Details
- Added `onCommand:` activation events for both MCP commands
- Added wildcard `*` activation event as fallback for compatibility
- Enhanced extension.ts with comprehensive logging throughout activation process
- Added error boundary improvements with detailed error context
- Created automated debugging script for common issues

## [1.0.2] - 2025-01-14

### Fixed
- **Critical**: Fixed TypeScript path alias resolution preventing extension from loading
- **Extension Commands**: Fixed "command not found" errors for `mcpDiagnostics.restart` and `mcpDiagnostics.showStatus`
- **Module Resolution**: Converted TypeScript path aliases (@core/*, @infrastructure/*, etc.) to relative imports for proper runtime resolution

### Technical Details
- Updated all main source files to use relative imports instead of path aliases
- Fixed import paths in extension.ts, ExtensionCommands.ts, McpServerWrapper.ts, DiagnosticsWatcher.ts, and VsCodeApiAdapter.ts
- Resolved module resolution issues that prevented VS Code from loading extension components
- Ensured proper compilation with working relative paths in output JavaScript

## [1.0.1] - 2025-01-11

### Changed
- Updated package.json metadata for marketplace publishing
- Enhanced README with comprehensive setup instructions
- Added extension icon and gallery banner

### Fixed
- Corrected publisher information and repository URLs
- Fixed marketplace category assignment

## [1.0.0] - 2025-01-11

### Added
- Initial release of MCP Diagnostics Extension
- Real-time monitoring of VS Code Problems panel
- Model Context Protocol (MCP) server integration
- Diagnostic change event handling with 300ms debouncing
- ProblemItem data model for AI agent consumption
- Comprehensive test suite with >95% coverage
- TypeScript strict mode and ESLint configuration
- Automated CI/CD pipeline with GitHub Actions
- Extension commands for server management and status display

### Features
- **Real-time Diagnostics**: Monitors VS Code diagnostics in real-time
- **MCP Integration**: Exposes diagnostics via Model Context Protocol
- **Performance Optimized**: Handles large workspaces efficiently
- **Command Interface**: Restart server and view status commands
- **Status Bar Integration**: Shows error/warning counts in status bar
- **Multi-workspace Support**: Works with multi-root workspaces
- **Type Safety**: Full TypeScript support with strict configuration

### Technical Details
- Built with TypeScript and strict type checking
- Uses @modelcontextprotocol/sdk v1.12.1+
- Supports VS Code 1.100.0+
- Test-driven development with Jest
- Clean architecture with dependency injection
- Memory-efficient with automatic cleanup
