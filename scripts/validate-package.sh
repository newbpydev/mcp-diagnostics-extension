#!/bin/bash
# scripts/validate-package.sh
# Comprehensive package validation to prevent dependency issues

set -e

echo "🔍 Starting comprehensive package validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check Node.js and npm versions
echo "📋 Checking environment..."
node_version=$(node --version)
npm_version=$(npm --version)
print_status $GREEN "Node.js: $node_version"
print_status $GREEN "npm: $npm_version"

# Check for critical dependencies in node_modules
echo "📦 Checking critical dependencies..."
critical_deps=("zod" "@modelcontextprotocol/sdk" "tsconfig-paths")

for dep in "${critical_deps[@]}"; do
    if npm ls "$dep" > /dev/null 2>&1; then
        print_status $GREEN "✅ $dep is installed"
    else
        print_status $RED "❌ Missing critical dependency: $dep"
        exit 1
    fi
done

# Check for potential problematic dependencies
echo "🔍 Checking for problematic dependencies..."
problematic_deps=("lodash" "moment" "axios")

for dep in "${problematic_deps[@]}"; do
    if npm ls "$dep" > /dev/null 2>&1; then
        print_status $YELLOW "⚠️  Found potentially problematic dependency: $dep"
        print_status $YELLOW "    Consider replacing with native implementation"
    fi
done

# Run security audit
echo "🔒 Running security audit..."
if npm audit --audit-level=high; then
    print_status $GREEN "✅ No high-severity security vulnerabilities"
else
    print_status $RED "❌ Security vulnerabilities found"
    exit 1
fi

# Clean and build
echo "🧹 Cleaning previous builds..."
npm run clean

echo "🏗️ Building production version..."
if npm run compile:prod; then
    print_status $GREEN "✅ Production build successful"
else
    print_status $RED "❌ Production build failed"
    exit 1
fi

# Run tests
echo "🧪 Running test suite..."
if npm run test:ci; then
    print_status $GREEN "✅ All tests passed"
else
    print_status $RED "❌ Tests failed"
    exit 1
fi

# Create package
echo "📦 Creating VSIX package..."
if npm run package; then
    print_status $GREEN "✅ Package created successfully"
else
    print_status $RED "❌ Package creation failed"
    exit 1
fi

# Verify package contents
echo "🔍 Verifying package contents..."
VSIX_FILE=$(ls *.vsix | head -n1)

if [ ! -f "$VSIX_FILE" ]; then
    print_status $RED "❌ VSIX file not found"
    exit 1
fi

print_status $GREEN "📦 Package file: $VSIX_FILE"

# Check package size
package_size=$(stat -f%z "$VSIX_FILE" 2>/dev/null || stat -c%s "$VSIX_FILE" 2>/dev/null)
package_size_mb=$((package_size / 1024 / 1024))

if [ $package_size_mb -gt 5 ]; then
    print_status $YELLOW "⚠️  Package size is large: ${package_size_mb}MB"
else
    print_status $GREEN "✅ Package size acceptable: ${package_size_mb}MB"
fi

# Extract and verify critical dependencies are included
echo "🔍 Verifying critical dependencies in package..."
temp_dir=$(mktemp -d)
unzip -q "$VSIX_FILE" -d "$temp_dir"

for dep in "${critical_deps[@]}"; do
    if find "$temp_dir" -name "*$dep*" -type d | grep -q .; then
        print_status $GREEN "✅ $dep included in package"
    else
        print_status $RED "❌ $dep missing from package"
        rm -rf "$temp_dir"
        exit 1
    fi
done

# Check for compiled output
if [ -d "$temp_dir/extension/out" ]; then
    print_status $GREEN "✅ Compiled output included"
else
    print_status $RED "❌ Compiled output missing"
    rm -rf "$temp_dir"
    exit 1
fi

# Check for source files (should be excluded)
if find "$temp_dir" -name "*.ts" -not -path "*/node_modules/*" | grep -q .; then
    print_status $YELLOW "⚠️  TypeScript source files found in package"
else
    print_status $GREEN "✅ Source files properly excluded"
fi

# Check for @modelcontextprotocol/sdk
if ls extension/node_modules/@modelcontextprotocol/ >/dev/null 2>&1; then
  print_status $GREEN "✅ @modelcontextprotocol/sdk included in package"
else
  print_status $RED "❌ @modelcontextprotocol/sdk missing from package"
  validation_failed=true
fi

# Cleanup
rm -rf "$temp_dir"

# Final validation summary
echo ""
print_status $GREEN "🎉 Package validation completed successfully!"
echo ""
echo "📋 Validation Summary:"
echo "  ✅ All critical dependencies present"
echo "  ✅ Security audit passed"
echo "  ✅ Production build successful"
echo "  ✅ All tests passed"
echo "  ✅ Package created and verified"
echo "  ✅ Dependencies included in package"
echo ""
print_status $GREEN "🚀 Package is ready for deployment!"

# Optional: Test installation (requires VS Code)
if command -v code > /dev/null 2>&1; then
    echo ""
    read -p "🤔 Test installation in VS Code? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status $YELLOW "📥 Installing extension for testing..."
        if code --install-extension "$VSIX_FILE" --force; then
            print_status $GREEN "✅ Extension installed successfully"
            print_status $YELLOW "🔍 Please manually test the extension functionality"
        else
            print_status $RED "❌ Extension installation failed"
            exit 1
        fi
    fi
fi
