# Security Policy

## Supported Versions

We provide security updates for the following versions of the MCP Diagnostics Extension:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in the MCP Diagnostics Extension, please report it responsibly:

### Private Disclosure

1. **Do NOT create a public GitHub issue** for security vulnerabilities
2. Send an email to: **newbpydev@gmail.com** with the subject line: `[SECURITY] MCP Diagnostics Extension Vulnerability`
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (if available)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix Development**: Within 30 days (depending on severity)
- **Public Disclosure**: After fix is released and users have time to update

### Severity Classification

We use the following severity levels:

- **Critical**: Remote code execution, privilege escalation
- **High**: Data exfiltration, unauthorized access
- **Medium**: Information disclosure, denial of service
- **Low**: Minor information leaks, configuration issues

## Security Measures

### Development Security

- **Dependency Scanning**: Automated security audits via GitHub Actions
- **Code Analysis**: Static analysis with CodeQL
- **Dependency Updates**: Automated dependency updates via Dependabot
- **Multi-platform Testing**: Ensuring security across all platforms

### Runtime Security

- **VS Code Sandbox**: Extension runs within VS Code's security model
- **Limited Permissions**: Minimal required permissions
- **MCP Transport Security**: Secure communication channels
- **Input Validation**: All inputs validated and sanitized

### Data Handling

- **Local Processing**: All diagnostic data processed locally
- **No External Transmission**: Diagnostic data not sent to external servers
- **Temporary Storage**: Only in-memory storage of diagnostic data
- **No User Data Collection**: Extension doesn't collect personal information

## Security Best Practices

### For Users

- **Keep Updated**: Always use the latest version from VS Code Marketplace
- **Review Permissions**: Check extension permissions before installation
- **Trusted Sources**: Only install from official VS Code Marketplace
- **Report Issues**: Report any suspicious behavior immediately

### For Contributors

- **Secure Coding**: Follow secure coding practices
- **Dependency Review**: Carefully review all dependency updates
- **Code Review**: All changes require security-focused code review
- **Testing**: Include security test cases

## Known Security Considerations

### MCP Server Exposure

- The extension creates a local MCP server
- Server only accepts connections from authorized MCP clients
- No network-exposed services by default
- All communication through secure transport methods

### Diagnostic Data Sensitivity

- Extension processes code diagnostic information
- Data may contain file paths and code snippets
- No data is persisted beyond VS Code session
- Data is not transmitted outside VS Code environment

### Extension Permissions

The extension requires the following VS Code permissions:
- `onDidChangeDiagnostics`: To monitor diagnostic changes
- `workspace.getConfiguration`: To read configuration settings
- No file system access beyond VS Code APIs
- No network access beyond local MCP server

## Security Updates

Security updates will be:
- Released as soon as possible after discovery
- Clearly marked in release notes
- Distributed through normal VS Code Marketplace updates
- Announced through project communication channels

## Acknowledgments

We appreciate security researchers and users who help improve the security of this extension. Contributors who responsibly disclose security issues may be acknowledged in release notes (with their permission).

## Contact

For security-related questions or concerns:
- Email: newbpydev@gmail.com
- Subject: `[SECURITY] MCP Diagnostics Extension`
- Response time: Within 48 hours

For general questions, please use GitHub Issues (but NOT for security vulnerabilities).
