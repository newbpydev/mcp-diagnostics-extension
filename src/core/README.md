# Core Module

This module contains the core business logic of the extension, independent of any external frameworks or libraries.

## Structure

- **models/**: Domain entities and value objects (ProblemItem, etc.)
- **services/**: Business logic and use cases (DiagnosticsWatcher, etc.)

## Principles

- Framework-independent
- Contains pure business logic
- No dependencies on VS Code API or MCP SDK
- Testable in isolation
- Follows Domain-Driven Design principles
