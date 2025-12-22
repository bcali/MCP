#!/bin/bash

echo "🚀 Setting up Gamma MCP Server for Claude Desktop"
echo "================================================"

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if .env exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "📝 Please edit .env and add your Gamma API key"
    echo "   Get your API key from: https://gamma.app/api"
    exit 1
fi

# Check if API key is set
if grep -q "sk-gamma-your-api-key-here" "$SCRIPT_DIR/.env"; then
    echo "❌ Please update the GAMMA_API_KEY in .env file"
    echo "   Get your API key from: https://gamma.app/api"
    exit 1
fi

# Extract API key
GAMMA_API_KEY=$(grep GAMMA_API_KEY "$SCRIPT_DIR/.env" | cut -d '=' -f2)

# Create the configuration
echo ""
echo "📋 Add this to your Claude Desktop configuration:"
echo "   ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "{"
echo "  \"mcpServers\": {"
echo "    \"gamma\": {"
echo "      \"command\": \"node\","
echo "      \"args\": [\"$SCRIPT_DIR/dist/index.js\"],"
echo "      \"env\": {"
echo "        \"GAMMA_API_KEY\": \"$GAMMA_API_KEY\""
echo "      }"
echo "    }"
echo "  }"
echo "}"
echo ""
echo "✅ After adding this configuration:"
echo "   1. Restart Claude Desktop"
echo "   2. Look for 'gamma' in the MCP tools list"
echo "   3. Try: 'Use gamma_generate to create a presentation about AI'"