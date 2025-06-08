#!/bin/bash

# VS Code MCP Diagnostics Extension - Branch Protection Setup
# This script sets up proper branch protection rules for the project

echo "🔒 Setting up branch protection for master branch..."

# Enable branch protection with appropriate settings for a VS Code extension project
gh api repos/newbpydev/mcp-diagnostics-extension/branches/master/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=build \
  --field required_status_checks[contexts][]=ci \
  --field required_status_checks[contexts][]=completed \
  --field required_status_checks[contexts][]=coverage \
  --field required_status_checks[contexts][]=lint \
  --field required_status_checks[contexts][]=test \
  --field enforce_admins=false \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field required_pull_request_reviews[require_code_owner_reviews]=false \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field block_creations=false \
  --field required_linear_history=true \
  --field required_conversation_resolution=true

echo "✅ Branch protection rules configured successfully!"
echo ""
echo "📋 Configured settings:"
echo "  - Require status checks: build, ci, completed, coverage, lint, test"
echo "  - Require 1 approving review"
echo "  - Dismiss stale reviews when new commits are pushed"
echo "  - Require conversation resolution before merging"
echo "  - Require linear history"
echo "  - Block force pushes and deletions"
echo "  - Allow admins to bypass (for emergency fixes)"
echo ""
echo "🎯 Your branch is now properly protected for VS Code extension development!"
