#!/bin/bash

FEATURE_NAME=$1

echo "Step 1: Architecture Design"
opencode run --agent architect "Design architecture for feature: $FEATURE_NAME" > architecture.md

echo "Step 2: Implementation"
opencode run --agent senior-coder "Implement feature based on architecture.md" > implementation.patch

echo "Step 3: Test Suite"
opencode run --agent test-engineer "Write full test suite for this feature" > tests.patch

echo "Step 4: Review"
opencode run --agent code-reviewer "Review the implementation and tests"

echo "Step 5: Security Check"
opencode run --agent security-reviewer "Security review the implementation"

echo "✅ Feature pipeline completed"