# Changelog

All notable changes to the "MCP Diagnostics Extension" will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-01-14

### Fixed
- **Critical**: Fixed TypeScript path alias resolution preventing extension from loading
- **Extension Commands**: Fixed "command not found" errors for `mcpDiagnostics.restart` and `mcpDiagnostics.showStatus`
- **Module Resolution**: Converted TypeScript path aliases (@core/*, @infrastructure/*, etc.) to relative imports for proper runtime resolution

### Technical Details
- Updated all main source files to use relative imports instead of path aliases
- Fixed import paths in extension.ts, ExtensionCommands.ts, McpServerWrapper.ts, DiagnosticsWatcher.ts, and VsCodeApiAdapter.ts
- Extension now properly loads and registers commands in VS Code
- All 322 tests continue to pass after the fixes
- Maintains full backward compatibility

## [1.0.1] - 2025-06-07

### Changed
- **Compatibility**: Downgraded VS Code version requirement from ^1.100.0 to ^1.96.0 for better compatibility with Cursor and other VS Code-based editors

### Technical Details
- Updated `@types/vscode` dependency to match new version requirement
- Maintains full backward compatibility with all existing features
- All 322 tests continue to pass with the downgraded version requirement

## [1.0.0] - 2025-06-07

### Added
- Initial release of MCP Diagnostics Extension
- Real-time diagnostics monitoring from VS Code Problems panel
- MCP server integration with stdio transport
- MCP tools for querying diagnostics:
  - `getProblems` - Get all problems with optional filtering
  - `getProblemsForFile` - Get problems for specific file
  - `getProblemsForWorkspace` - Get problems for specific workspace
- MCP resources for dynamic content access
- Real-time notifications for diagnostic changes
- Performance optimizations with debounced event handling
- Multi-workspace support
- Extension commands:
  - Restart MCP Diagnostics Server
  - Show MCP Diagnostics Status
- Status bar integration showing problem counts
- Comprehensive configuration options
- TypeScript strict mode compliance
- Comprehensive test suite with >95% coverage

### Features
- **Performance**: Handles large workspaces (10,000+ files) efficiently
- **Real-time**: Sub-500ms diagnostic change processing
- **Reliable**: Robust error handling and recovery mechanisms
- **Configurable**: Extensive settings for customization
- **Developer-friendly**: Rich debugging and logging capabilities

### Technical Details
- Built with TypeScript and strict type checking
- Uses @modelcontextprotocol/sdk v1.12.1+
- Supports VS Code 1.100.0+
- Test-driven development with Jest
- Clean architecture with dependency injection
- Memory-efficient with automatic cleanup
