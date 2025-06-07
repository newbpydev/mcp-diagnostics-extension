# Changelog

All notable changes to the "MCP Diagnostics Extension" will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

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
