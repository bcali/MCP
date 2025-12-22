# Gamma MCP Server

Open-source Model Context Protocol (MCP) server for the [Gamma Generate API](https://developers.gamma.app). This project lets any MCP-capable assistant (Claude Desktop, custom agents, etc.) spin up Gamma presentations, documents, or social cards on demand—complete with themes, imagery, exports, and share links.

---

## Table of Contents
1. [Why this exists](#why-this-exists)
2. [Feature highlights](#feature-highlights)
3. [Quick start](#quick-start)
4. [MCP tools](#mcp-tools)
5. [Workflow recipes](#workflow-recipes)
6. [Live run log](#live-run-log)
7. [Contributing](#contributing)
8. [License](#license)

---

## Why this exists
Gamma’s web UI is brilliant—but repetitive tasks (briefs, doc variants, campaign decks) still take too many clicks. The Gamma MCP server exposes the full Gamma API through MCP so agents can:
- Prototype ideas and decks in seconds.
- Standardize brand-ready exports (PDF/PPTX).
- Keep humans focused on feedback, not formatting.

The repository is structured to feel “official”: clear install steps, reproducible scripts, and live links to assets generated during this build.

---

## Feature highlights
- **Any Gamma artifact**: presentations, documents, or social cards via `format`.
- **Text intelligence**: choose generation vs condensation, tone, language, per-card density.
- **Imagery controls**: AI generated, Unsplash, Giphy, curated web options, plus model and style hints.
- **Layout mastery**: explicit card counts, split modes, aspect ratios (16×9, 4×5, Letter, etc.).
- **Sharing & exports**: set workspace/external permissions and request additional exports (PDF/PPTX).
- **Options catalogue**: `gamma_describe_options` reports all accepted enum values straight from code—no guessing.
- **Status + share links**: `gamma_get_status` returns live progress, Gamma URLs, and credit usage.

---

## Quick start
### Prerequisites
- Node.js ≥ **18**
- A Gamma API key (request via [Gamma Generate](https://developers.gamma.app))
- `git`

### Installation
```bash
# 1. Clone
git clone https://github.com/CryptoJym/gamma-mcp-server.git
cd gamma-mcp-server

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# edit .env and set
# GAMMA_API_KEY=sk-gamma-your-key

# 4. Type-check & build
npm run build

# 5. Optional smoke test (hits live Gamma API)
GAMMA_API_KEY=sk-gamma-your-key npm run test
```

### Register with MCP clients (Claude Desktop example)
Add this entry to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "gamma": {
      "command": "node",
      "args": ["/absolute/path/to/gamma-mcp-server/dist/index.js"],
      "env": {
        "GAMMA_API_KEY": "sk-gamma-your-key"
      }
    }
  }
}
```

---

## MCP tools
| Tool | Purpose | Key Inputs |
| ---- | ------- | ---------- |
| `gamma_generate` | Main generator for presentations, documents, and social cards. | `inputText`, optional knobs (`format`, `textMode`, `numCards`, `cardOptions.dimensions`, `imageOptions`, `sharingOptions`, etc.) |
| `gamma_get_status` | Polls job status, shareable `gammaUrl`, and credit consumption. | `generationId` |
| `gamma_get_themes` | Returns Gamma themes; falls back to curated defaults if the API doesn’t respond. | _None_ |
| `gamma_describe_options` | Lists accepted enum values so prompts stay valid. | Optional `category` (e.g., `imageSources`) and `format` |

Schema validation happens with Zod, mirroring Gamma’s documentation (length limits, enum enforcement, etc.). Any validation errors are surfaced as MCP-friendly responses.

---

## Workflow recipes
### 1. Utlyze “Open AI Bar” social promo (multi-platform asset)
Generate Gamma-branded social copy/cards advertising the free Tuesday AI clinic.
```bash
GAMMA_API_KEY=sk-gamma-your-key \
npx tsx scripts/generate-utlyze-ad.ts
```
**Live asset:** `https://gamma.app/docs/8hkm743zfnymbrr`

### 2. “Gamma MCP Launchpad” deck (official overview)
Create a Gamma-themed presentation that explains this MCP, setup steps, and CTAs.
```bash
GAMMA_API_KEY=sk-gamma-your-key \
npx tsx scripts/generate-gamma-overview.ts
```
**Live asset:** `https://gamma.app/docs/lta8lrr6104aksa`

Both scripts rely on the shared `GammaClient`, wait for `gammaUrl` readiness, and print the shareable link once Gamma marks the run `completed`.

---

## Live run log
These instructions were executed during the conversation and are preserved here for transparency:
1. Hardened the MCP server, added `scripts/generate-utlyze-ad.ts`, and confirmed outputs via `npm run build` & `npm run test`.
2. Triggered a live Gamma job for the Utlyze Open AI Bar promotion and captured the share link above.
3. Authored `scripts/generate-gamma-overview.ts` to build an official MCP launch deck and captured the share link above.
4. Updated the README to reflect setup, workflow, and live assets so future users can reproduce the exact process.

Use these steps as a checklist when demoing or onboarding new teammates—everything needed to regenerate the assets or create fresh ones is versioned here.

---

## Contributing
Issues and PRs are welcome! Suggested contributions:
- Additional workflow scripts (e.g., meeting notes, investor decks, weekly reports).
- Integration with schedulers/automation pipelines for posting Gamma-generated content.
- Enhanced error handling or caching for theme lists/status polling.

Before submitting:
```bash
npm run build
npm run test   # requires GAMMA_API_KEY
```

---

## License
MIT License © Utlyze / CryptoJym. Feel free to adapt for your own MCP tooling while crediting the original repository.
