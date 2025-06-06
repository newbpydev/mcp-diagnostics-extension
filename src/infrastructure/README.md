# Infrastructure Module

This module contains adapters that connect the core business logic to external systems and frameworks.

## Structure

- **mcp/**: Model Context Protocol server implementation
- **vscode/**: VS Code API adapters and wrappers

## Principles

- Implements interfaces defined in core
- Handles external system integration
- Translates between external APIs and core domain
- Contains framework-specific code
- Dependency injection for testability
