#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== OCX E2E Test Script ===${NC}"
echo ""

# Check if server is running
if ! curl -s http://localhost:8787/api/providers > /dev/null 2>&1; then
  echo -e "${RED}Error: Server not running at localhost:8787${NC}"
  echo "Start with: bun run preview"
  exit 1
fi

echo -e "${GREEN}✓ Server is running${NC}"

# Step 1: Add local registry
echo ""
echo -e "${YELLOW}Step 1: Adding local registry...${NC}"
ocx registry add http://localhost:8787/r --name tweak-local --global --force
echo -e "${GREEN}✓ Registry added${NC}"

# Step 2: Create profile via API
echo ""
echo -e "${YELLOW}Step 2: Creating profile via API...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8787/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "harnessId": "kdco-workspace",
    "providers": ["anthropic"],
    "primary": {"providerId": "anthropic", "modelId": "claude-sonnet-4-20250514"},
    "secondary": {"providerId": "anthropic", "modelId": "claude-3-5-haiku-20241022"},
    "options": {"context7": true}
  }')

COMPONENT_ID=$(echo "$RESPONSE" | jq -r '.componentId')

if [ "$COMPONENT_ID" == "null" ] || [ -z "$COMPONENT_ID" ]; then
  echo -e "${RED}Error: Failed to create profile${NC}"
  echo "$RESPONSE" | jq
  exit 1
fi

echo -e "${GREEN}✓ Created profile: ${COMPONENT_ID}${NC}"

# Step 3: Verify packument
echo ""
echo -e "${YELLOW}Step 3: Verifying packument...${NC}"
PACKUMENT=$(curl -s "http://localhost:8787/r/components/${COMPONENT_ID}.json")
PACKUMENT_NAME=$(echo "$PACKUMENT" | jq -r '.name')

if [ "$PACKUMENT_NAME" != "$COMPONENT_ID" ]; then
  echo -e "${RED}Error: Packument verification failed${NC}"
  echo "$PACKUMENT" | jq
  exit 1
fi

echo -e "${GREEN}✓ Packument verified${NC}"

# Step 4: Install profile using OCX
echo ""
echo -e "${YELLOW}Step 4: Installing profile with OCX...${NC}"
PROFILE_NAME="test-$(date +%s)"

# Remove existing test profile if exists
rm -rf ~/.config/opencode/profiles/$PROFILE_NAME 2>/dev/null || true

ocx profile add $PROFILE_NAME --from tweak-local/$COMPONENT_ID

echo -e "${GREEN}✓ Profile installed${NC}"

# Step 5: Verify installed files
echo ""
echo -e "${YELLOW}Step 5: Verifying installed files...${NC}"
PROFILE_DIR=~/.config/opencode/profiles/$PROFILE_NAME

if [ ! -d "$PROFILE_DIR" ]; then
  echo -e "${RED}Error: Profile directory not found: $PROFILE_DIR${NC}"
  exit 1
fi

echo "Files in $PROFILE_DIR:"
ls -la "$PROFILE_DIR"

if [ -f "$PROFILE_DIR/opencode.jsonc" ]; then
  echo -e "${GREEN}✓ opencode.jsonc exists${NC}"
  echo "Content:"
  cat "$PROFILE_DIR/opencode.jsonc"
else
  echo -e "${RED}✗ opencode.jsonc missing${NC}"
  exit 1
fi

echo ""
if [ -f "$PROFILE_DIR/ocx.jsonc" ]; then
  echo -e "${GREEN}✓ ocx.jsonc exists${NC}"
else
  echo -e "${RED}✗ ocx.jsonc missing${NC}"
  exit 1
fi

# Cleanup
echo ""
echo -e "${YELLOW}Cleanup: Removing test profile...${NC}"
rm -rf "$PROFILE_DIR"
echo -e "${GREEN}✓ Test profile removed${NC}"

echo ""
echo -e "${GREEN}=== All tests passed! ===${NC}"
echo "Component ID: $COMPONENT_ID"
