# Contributing to MCP

Thank you for your interest in contributing to the MCP project! This document provides guidelines and instructions for developers who want to contribute to the codebase.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Git Workflow](#git-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Updates](#documentation-updates)
- [Pull Request Process](#pull-request-process)
- [Getting Help](#getting-help)

---

## Development Setup

### Prerequisites

- **Node.js**: Version 18+ (recommend LTS)
- **npm**: Version 8+ (comes with Node.js)
- **Git**: Version 2.40+
- **Code Editor**: VS Code recommended (project includes workspace configuration)

### Initial Setup

1. **Fork and Clone**:
   ```bash
   # Fork the repository on GitHub first
   git clone https://github.com/YOUR_USERNAME/MCP.git
   cd MCP
   ```

2. **Install Dependencies**:
   ```bash
   # MCP Hub
   cd mcp-hub
   npm install

   # MCP Console
   cd ../mcp-console
   npm install

   # Gamma MCP Server
   cd ../gamma-mcp-server
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   # MCP Hub
   cd mcp-hub
   cp .env.example .env
   # Edit .env with your configuration
   # For local dev, set DATABASE_URL=memory
   ```

4. **Verify Setup**:
   ```bash
   # Build all projects
   cd mcp-hub && npm run build && cd ..
   cd mcp-console && npm run build && cd ..
   cd gamma-mcp-server && npm run build && cd ..
   ```

### Running Locally

**MCP Hub** (Development Server):
```bash
cd mcp-hub
npm run dev
# Server runs on http://localhost:8080
# Verify: curl http://localhost:8080/healthz
```

**MCP Console** (Development Server):
```bash
cd mcp-console
npm run dev
# App runs on http://localhost:5173
```

**Gamma MCP Server** (Test Mode):
```bash
cd gamma-mcp-server
npm run build
node dist/index.js
# Test via MCP client (e.g., Cursor, Claude Code)
```

### VS Code Setup

The project includes `.vscode/tasks.json` with auto-start tasks:

- **"Start MCP Hub (Dev)"** - Auto-runs on folder open
- **"Stop MCP Hub (Dev)"** - Manual shutdown

To disable auto-start, remove `"runOptions"` from `.vscode/tasks.json`.

---

## Code Standards

### TypeScript Conventions

**File Structure**:
- Use ES modules (`"type": "module"` in package.json)
- Import statements must include `.js` extension (TypeScript ES module requirement)
- One export per file for classes/interfaces, multiple exports allowed for utilities

**Example**:
```typescript
// Good
import { createStore } from './store/index.js';
import type { HubStore } from './store/types.js';

// Bad
import { createStore } from './store/index'; // Missing .js
```

**Naming Conventions**:

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `gamma-constants.ts`, `resilience.ts` |
| Classes/Interfaces | PascalCase | `MemoryItem`, `HubStore` |
| Functions | camelCase | `generateEventId`, `createStore` |
| Constants | SCREAMING_SNAKE_CASE | `STATIC_TOOLS`, `MCP_HUB_API_KEY` |
| Type-only imports | Use `type` keyword | `import type { AccountInfo } from '@azure/msal-browser';` |

**Type Safety**:
- Use `strict: true` in tsconfig.json
- Avoid `any` types (use `unknown` if type is truly unknown)
- Prefer interfaces for object shapes, types for unions/intersections
- Use Zod for runtime validation of external inputs

**Example**:
```typescript
import { z } from 'zod';

// Schema definition
const MemoryPutSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  tags: z.array(z.string()).optional(),
});

// Type inference from schema
type MemoryPutInput = z.infer<typeof MemoryPutSchema>;

// Runtime validation
const input = MemoryPutSchema.parse(request.params.arguments);
```

### Error Handling

**Use MCP SDK Error Types**:
```typescript
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Good
throw new McpError(
  ErrorCode.InvalidParams,
  'Missing required parameter: key'
);

// Bad
throw new Error('Missing required parameter: key');
```

**Common Error Codes**:
- `ErrorCode.InvalidParams` - Invalid input parameters
- `ErrorCode.InternalError` - Server-side errors
- `ErrorCode.MethodNotFound` - Unknown tool/method
- `ErrorCode.InvalidRequest` - Malformed request

**Resilience Pattern**:
```typescript
const breaker = resilienceRegistry.getBreaker('connector-name');
const bulkhead = resilienceRegistry.getBulkhead('connector-name');

if (breaker.isOpen()) {
  throw new McpError(
    ErrorCode.InternalError,
    `Connector 'connector-name' temporarily unavailable (Circuit Breaker OPEN)`
  );
}

await bulkhead.execute(async () => {
  return await withTimeout(
    externalApiCall(),
    15000,
    'Operation timed out'
  );
});
```

### Async/Await

- Prefer `async/await` over `.then()` chains
- Always `await` promises (don't leave them floating)
- Use `Promise.all()` for parallel operations

**Example**:
```typescript
// Good
async function processItems(items: string[]) {
  const results = await Promise.all(
    items.map(item => processItem(item))
  );
  return results;
}

// Bad
async function processItems(items: string[]) {
  const results = [];
  for (const item of items) {
    results.push(await processItem(item)); // Sequential, slow
  }
  return results;
}
```

### Logging

**Use Structured Logger**:
```typescript
import { logger } from './utils/logger.js';

// Info logs
logger.info('Server started', { port: 8080 });

// Error logs with context
logger.error('Database connection failed', {
  error: err.message,
  stack: err.stack,
  database: config.DATABASE_URL
});
```

**Log Levels**:
- `debug` - Detailed diagnostics (disabled in production)
- `info` - Normal operations
- `warn` - Unexpected but handled situations
- `error` - Errors that need attention

---

## Git Workflow

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New features | `feat/add-notion-connector` |
| `fix/` | Bug fixes | `fix/circuit-breaker-timeout` |
| `docs/` | Documentation only | `docs/update-readme` |
| `refactor/` | Code refactoring | `refactor/simplify-store-interface` |
| `test/` | Tests only | `test/add-unit-tests` |
| `chore/` | Maintenance | `chore/update-dependencies` |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples**:
```
feat(hub): add Notion connector with page creation tool

- Implement notion_create_page tool
- Add circuit breaker for Notion API
- Update tool registry

Closes #123
```

```
fix(console): resolve infinite loop in runs history

The useEffect hook was missing dependencies, causing
excessive re-renders and API calls.

Fixes #456
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Add/update tests
- `chore` - Maintenance tasks

**Scope** (optional):
- `hub` - MCP Hub changes
- `console` - MCP Console changes
- `gamma` - Gamma MCP Server changes
- `ci` - CI/CD changes

### Pull Request Process

1. **Create Feature Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Changes**:
   - Write code following standards above
   - Test locally
   - Update documentation

3. **Commit Changes**:
   ```bash
   git add .
   git commit -m "feat(hub): add your feature"
   ```

4. **Keep Branch Updated**:
   ```bash
   git fetch origin
   git rebase origin/main
   # Resolve conflicts if any
   ```

5. **Push to Your Fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Create Pull Request**:
   - Go to GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out PR template

**PR Title Format**:
```
feat(hub): add Notion connector
fix(console): resolve infinite loop in runs history
docs: update CONTRIBUTING.md with PR guidelines
```

**PR Description Template**:
```markdown
## What does this PR do?
Brief description of changes.

## Why is this needed?
Context or issue reference.

## How was this tested?
- [ ] Local development server
- [ ] Built and checked TypeScript errors
- [ ] Tested in production-like environment

## Checklist
- [ ] Code follows project conventions
- [ ] Tests added/updated (if applicable)
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors

## Related Issues
Closes #123
```

### Code Review Guidelines

**For Contributors**:
- Keep PRs focused (one feature/fix per PR)
- Respond to feedback promptly
- Update PR based on review comments
- Squash commits before merge (optional)

**For Reviewers**:
- Review within 48 hours
- Provide constructive feedback
- Test changes locally if possible
- Approve when ready

---

## Testing Guidelines

### Manual Testing

**MCP Hub**:
1. Start dev server: `npm run dev`
2. Check health endpoint: `curl http://localhost:8080/healthz`
3. Test tools via MCP client (Claude Code, Cursor)
4. Verify logs for errors

**MCP Console**:
1. Start dev server: `npm run dev`
2. Test all pages (Dashboard, Tools, Runs, Connections)
3. Check browser console for errors
4. Verify API calls succeed

### Integration Testing

**Tool Execution**:
```bash
# Connect Claude Code to local hub
# In Claude Code settings, add SSE server:
# URL: http://localhost:8080/v1/sse?key=YOUR_API_KEY

# Test memory tools
"Store this in memory: key=test, value=hello"

# Test artifact creation
"Create an artifact with type=document, content=test"

# Test platform connectors (requires API keys)
"Import Figma file: [file-url]"
```

### TypeScript Compilation

```bash
# Check for type errors (no output = success)
npm run build

# Watch mode during development
npm run dev
```

### Future: Unit Tests (Planned)

The project will add unit tests in future versions:

```typescript
// Example test structure (Jest/Vitest)
import { describe, it, expect } from 'vitest';
import { generateEventId } from './utils/id.js';

describe('generateEventId', () => {
  it('should generate consistent IDs for same input', () => {
    const id1 = generateEventId('test', '123');
    const id2 = generateEventId('test', '123');
    expect(id1).toBe(id2);
  });
});
```

---

## Documentation Updates

### When to Update Documentation

**Always update when**:
- Adding new MCP tools
- Changing API endpoints
- Modifying environment variables
- Updating deployment process
- Changing architecture

**Files to update**:
- `README.md` - High-level project overview
- `PRD.md` - Product requirements and architecture
- `CLAUDE.md` - Context for AI assistants
- `ARCHITECTURE.md` - System architecture details
- `CONTRIBUTING.md` - This file

### Documentation Standards

**Use Markdown**:
- Headers: `#`, `##`, `###`
- Code blocks: ` ```typescript ` or ` ```bash `
- Links: `[text](url)`
- Tables: Markdown tables for structured data

**Be Concise**:
- Use bullet points
- Keep paragraphs short
- Provide examples
- Link to external resources

**Keep Updated**:
- Update "Last Updated" dates
- Remove outdated information
- Add "Deprecated" warnings when needed

---

## Pull Request Process

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows TypeScript conventions
- [ ] No TypeScript compilation errors
- [ ] No console errors or warnings
- [ ] Changes tested locally
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow Conventional Commits
- [ ] PR description is clear and complete

### Review Process

1. **Automated Checks**:
   - TypeScript compilation
   - GitHub Actions workflows
   - No merge conflicts

2. **Manual Review**:
   - Code quality
   - Architecture alignment
   - Documentation completeness

3. **Approval**:
   - At least 1 reviewer approval required
   - All comments resolved

4. **Merge**:
   - Squash and merge (default)
   - Delete branch after merge

### Deployment

**Automatic deployment** after merge to `main`:
- MCP Hub → Google Cloud Run
- MCP Console → GitHub Pages

Monitor deployments:
- GitHub Actions: https://github.com/bcali/MCP/actions
- Cloud Run: GCP Console

---

## Getting Help

### Resources

- **README**: [README.md](./README.md)
- **Product Requirements**: [PRD.md](./PRD.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Setup Guide**: [SETUP.md](./SETUP.md)
- **AI Context**: [CLAUDE.md](./CLAUDE.md)

### Communication

- **Issues**: https://github.com/bcali/MCP/issues
- **Discussions**: https://github.com/bcali/MCP/discussions
- **Email**: Open an issue for contact info

### Common Questions

**Q: How do I test changes without deploying to production?**
A: Run locally using `npm run dev` and test with `DATABASE_URL=memory` for in-memory mode.

**Q: Can I use a different database for local development?**
A: Yes, you can use local PostgreSQL or keep using in-memory mode (`DATABASE_URL=memory`).

**Q: How do I add a new platform connector?**
A: See existing connectors in `mcp-hub/src/tools/` as examples. Follow the pattern:
1. Create new file (e.g., `notion.ts`)
2. Define tools with schemas
3. Register with circuit breaker/bulkhead
4. Add to `STATIC_TOOLS` in `tools.ts`

**Q: Where do I add new environment variables?**
A:
1. Add to `.env.example` with description
2. Update GitHub Secrets (for production)
3. Document in `PRD.md` under "Environment Variables"

**Q: How do I debug SSE connection issues?**
A:
1. Check browser DevTools → Network tab → SSE connection
2. Review server logs for session ID
3. Verify API key is correct
4. Ensure Cloud Run session affinity is enabled

---

## License

By contributing to MCP, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to MCP!**

For questions or feedback, please open an issue on GitHub.
