import type { Env } from '../config.js';
import type { HubStore } from '../store/types.js';

// Base Figma API URL
const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Helper to make Figma API requests
async function figmaRequest(
  endpoint: string,
  token: string,
  options?: RequestInit
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; details?: string }> {
  const resp = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'X-Figma-Token': token,
      ...options?.headers,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, error: `Figma API error: ${resp.status} ${resp.statusText}`, details: text };
  }

  const data = await resp.json();
  return { ok: true, data };
}

// Helper to parse Figma URL and extract file key and node ID
export function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
  // Patterns:
  // https://www.figma.com/file/FILE_KEY/...
  // https://www.figma.com/design/FILE_KEY/...
  // https://www.figma.com/file/FILE_KEY/...?node-id=NODE_ID
  // https://www.figma.com/design/FILE_KEY/Project-Name?node-id=123-456
  const patterns = [
    /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const fileKey = match[1];
      // Extract node-id from query params if present
      const urlObj = new URL(url);
      const nodeId = urlObj.searchParams.get('node-id');
      return { fileKey: fileKey!, nodeId: nodeId ?? undefined };
    }
  }

  // If just a file key is provided directly
  if (/^[a-zA-Z0-9]+$/.test(url)) {
    return { fileKey: url };
  }

  return null;
}

// Convert Figma node-id format (123-456) to API format (123:456)
function normalizeNodeId(nodeId: string): string {
  return nodeId.replace(/-/g, ':');
}

/**
 * Import basic file metadata and structure
 */
export async function figmaImport({
  fileKey,
  store,
  env,
}: {
  fileKey: string;
  store: HubStore;
  env: Env;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  const result = await figmaRequest(`/files/${encodeURIComponent(fileKey)}`, env.FIGMA_TOKEN);
  if (!result.ok) return result;

  const data = result.data as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name : undefined;

  const artifact = await store.createArtifact({
    type: 'figma_file',
    name: name ?? `figma:${fileKey}`,
    source: 'figma',
    contentType: 'application/json',
    contentText: JSON.stringify(data),
    metadata: { fileKey },
  });

  return { ok: true, artifact };
}

/**
 * Get specific nodes from a Figma file with full properties
 * This is the key endpoint for getting design data for code generation
 */
export async function figmaGetNodes({
  fileKey,
  nodeIds,
  env,
  depth,
  geometry,
  pluginData,
}: {
  fileKey: string;
  nodeIds: string[];
  env: Env;
  depth?: number;
  geometry?: 'paths' | 'bounds';
  pluginData?: string;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  // Normalize node IDs (convert 123-456 to 123:456)
  const normalizedIds = nodeIds.map(normalizeNodeId);

  const params = new URLSearchParams();
  params.set('ids', normalizedIds.join(','));
  if (depth !== undefined) params.set('depth', String(depth));
  if (geometry) params.set('geometry', geometry);
  if (pluginData) params.set('plugin_data', pluginData);

  const result = await figmaRequest(
    `/files/${encodeURIComponent(fileKey)}/nodes?${params.toString()}`,
    env.FIGMA_TOKEN
  );

  if (!result.ok) return result;

  const data = result.data as { nodes: Record<string, unknown> };

  // Simplify the response for AI consumption
  const simplifiedNodes = Object.entries(data.nodes).map(([id, nodeData]) => {
    const node = nodeData as { document?: unknown; components?: unknown; styles?: unknown };
    return {
      id,
      document: node.document,
      components: node.components,
      styles: node.styles,
    };
  });

  return {
    ok: true,
    fileKey,
    nodeIds: normalizedIds,
    nodes: simplifiedNodes,
    rawData: data,
  };
}

/**
 * Render nodes as images (PNG, SVG, PDF, JPG)
 * Useful for getting visual references of design elements
 */
export async function figmaGetImages({
  fileKey,
  nodeIds,
  env,
  format = 'png',
  scale = 2,
  svgOutlineText = true,
  svgIncludeId = false,
  svgIncludeNodeId = false,
  svgSimplifyStroke = true,
  contentsOnly = true,
}: {
  fileKey: string;
  nodeIds: string[];
  env: Env;
  format?: 'jpg' | 'png' | 'svg' | 'pdf';
  scale?: number;
  svgOutlineText?: boolean;
  svgIncludeId?: boolean;
  svgIncludeNodeId?: boolean;
  svgSimplifyStroke?: boolean;
  contentsOnly?: boolean;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  const normalizedIds = nodeIds.map(normalizeNodeId);

  const params = new URLSearchParams();
  params.set('ids', normalizedIds.join(','));
  params.set('format', format);
  params.set('scale', String(scale));
  params.set('contents_only', String(contentsOnly));

  if (format === 'svg') {
    params.set('svg_outline_text', String(svgOutlineText));
    params.set('svg_include_id', String(svgIncludeId));
    params.set('svg_include_node_id', String(svgIncludeNodeId));
    params.set('svg_simplify_stroke', String(svgSimplifyStroke));
  }

  const result = await figmaRequest(
    `/images/${encodeURIComponent(fileKey)}?${params.toString()}`,
    env.FIGMA_TOKEN
  );

  if (!result.ok) return result;

  const data = result.data as { images: Record<string, string>; err?: string };

  return {
    ok: true,
    fileKey,
    format,
    scale,
    images: data.images,
    error: data.err,
  };
}

/**
 * Get local variables from a file (colors, spacing, typography tokens)
 * This is extremely useful for design system integration
 * Note: Requires Enterprise plan for full access
 */
export async function figmaGetVariables({
  fileKey,
  env,
}: {
  fileKey: string;
  env: Env;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  const result = await figmaRequest(
    `/files/${encodeURIComponent(fileKey)}/variables/local`,
    env.FIGMA_TOKEN
  );

  if (!result.ok) {
    // Variables API might not be available on all plans
    if (result.details?.includes('403') || result.details?.includes('not authorized')) {
      return {
        ok: false,
        error: 'Variables API requires Enterprise plan or appropriate permissions',
        details: result.details,
      };
    }
    return result;
  }

  const data = result.data as {
    status?: number;
    meta?: {
      variableCollections: Record<string, unknown>;
      variables: Record<string, unknown>;
    };
  };

  // Transform for easier consumption
  const collections = data.meta?.variableCollections || {};
  const variables = data.meta?.variables || {};

  // Group variables by collection
  const groupedVariables: Record<string, unknown[]> = {};
  for (const [_id, variable] of Object.entries(variables)) {
    const v = variable as { variableCollectionId: string; name: string; resolvedType: string; valuesByMode: unknown };
    const collectionId = v.variableCollectionId;
    if (!groupedVariables[collectionId]) {
      groupedVariables[collectionId] = [];
    }
    groupedVariables[collectionId].push({
      name: v.name,
      type: v.resolvedType,
      values: v.valuesByMode,
    });
  }

  return {
    ok: true,
    fileKey,
    collections: Object.entries(collections).map(([id, col]) => {
      const c = col as { name: string; modes: unknown[] };
      return {
        id,
        name: c.name,
        modes: c.modes,
        variables: groupedVariables[id] || [],
      };
    }),
    rawData: data,
  };
}

/**
 * Get styles from a file (text styles, color styles, effect styles, grid styles)
 */
export async function figmaGetStyles({
  fileKey,
  env,
}: {
  fileKey: string;
  env: Env;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  const result = await figmaRequest(
    `/files/${encodeURIComponent(fileKey)}/styles`,
    env.FIGMA_TOKEN
  );

  if (!result.ok) return result;

  const data = result.data as {
    status?: number;
    meta?: {
      styles: Array<{
        key: string;
        name: string;
        description: string;
        style_type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
      }>;
    };
  };

  const styles = data.meta?.styles || [];

  // Group by type
  const groupedStyles = {
    fill: styles.filter(s => s.style_type === 'FILL'),
    text: styles.filter(s => s.style_type === 'TEXT'),
    effect: styles.filter(s => s.style_type === 'EFFECT'),
    grid: styles.filter(s => s.style_type === 'GRID'),
  };

  return {
    ok: true,
    fileKey,
    styles: groupedStyles,
    totalCount: styles.length,
    rawData: data,
  };
}

/**
 * Get components from a file
 */
export async function figmaGetComponents({
  fileKey,
  env,
}: {
  fileKey: string;
  env: Env;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  const result = await figmaRequest(
    `/files/${encodeURIComponent(fileKey)}/components`,
    env.FIGMA_TOKEN
  );

  if (!result.ok) return result;

  const data = result.data as {
    status?: number;
    meta?: {
      components: Array<{
        key: string;
        name: string;
        description: string;
        containing_frame?: { name: string; nodeId: string };
      }>;
    };
  };

  const components = data.meta?.components || [];

  return {
    ok: true,
    fileKey,
    components: components.map(c => ({
      key: c.key,
      name: c.name,
      description: c.description,
      frame: c.containing_frame,
    })),
    totalCount: components.length,
    rawData: data,
  };
}

/**
 * Get component sets (variants) from a file
 */
export async function figmaGetComponentSets({
  fileKey,
  env,
}: {
  fileKey: string;
  env: Env;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  const result = await figmaRequest(
    `/files/${encodeURIComponent(fileKey)}/component_sets`,
    env.FIGMA_TOKEN
  );

  if (!result.ok) return result;

  const data = result.data as {
    status?: number;
    meta?: {
      component_sets: Array<{
        key: string;
        name: string;
        description: string;
      }>;
    };
  };

  return {
    ok: true,
    fileKey,
    componentSets: data.meta?.component_sets || [],
    rawData: data,
  };
}

/**
 * Get file metadata without full document content (lighter weight)
 */
export async function figmaGetFileMetadata({
  fileKey,
  env,
}: {
  fileKey: string;
  env: Env;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  // Use the files endpoint with depth=0 to get just metadata
  const result = await figmaRequest(
    `/files/${encodeURIComponent(fileKey)}?depth=0`,
    env.FIGMA_TOKEN
  );

  if (!result.ok) return result;

  const data = result.data as {
    name: string;
    lastModified: string;
    thumbnailUrl: string;
    version: string;
    role: string;
    editorType: string;
  };

  return {
    ok: true,
    fileKey,
    name: data.name,
    lastModified: data.lastModified,
    thumbnailUrl: data.thumbnailUrl,
    version: data.version,
    role: data.role,
    editorType: data.editorType,
  };
}

/**
 * Extract code-ready design data from a frame
 * This is a higher-level function that combines multiple API calls
 * to provide comprehensive design context for code generation
 */
export async function figmaGetDesignContext({
  fileKey,
  nodeIds,
  env,
  includeImages = false,
  imageFormat = 'png',
  imageScale = 2,
}: {
  fileKey: string;
  nodeIds: string[];
  env: Env;
  includeImages?: boolean;
  imageFormat?: 'jpg' | 'png' | 'svg';
  imageScale?: number;
}) {
  if (!env.FIGMA_TOKEN) {
    return { ok: false, error: 'FIGMA_TOKEN is not configured' };
  }

  // Get node data with full geometry
  const nodesResult = await figmaGetNodes({
    fileKey,
    nodeIds,
    env,
    geometry: 'paths',
  });

  if (!nodesResult.ok) return nodesResult;

  // Optionally get images
  let images: Record<string, string> | undefined;
  if (includeImages) {
    const imagesResult = await figmaGetImages({
      fileKey,
      nodeIds,
      env,
      format: imageFormat,
      scale: imageScale,
    });
    if (imagesResult.ok) {
      images = imagesResult.images;
    }
  }

  // Try to get styles (may fail if not available)
  let styles = null;
  try {
    const stylesResult = await figmaGetStyles({ fileKey, env });
    if (stylesResult.ok) {
      styles = stylesResult.styles;
    }
  } catch {
    // Styles not available, continue without them
  }

  // Extract layout and style information for each node
  const nodes = ('nodes' in nodesResult && nodesResult.nodes) ? nodesResult.nodes : [];
  const designContext = nodes.map((node) => {
    const doc = node.document as Record<string, unknown> | undefined;
    if (!doc) return { id: node.id, error: 'No document data' };

    return {
      id: node.id,
      name: doc.name,
      type: doc.type,

      // Layout properties
      layout: {
        absoluteBoundingBox: doc.absoluteBoundingBox,
        constraints: doc.constraints,
        layoutMode: doc.layoutMode, // NONE, HORIZONTAL, VERTICAL (auto-layout)
        layoutWrap: doc.layoutWrap,
        primaryAxisSizingMode: doc.primaryAxisSizingMode,
        counterAxisSizingMode: doc.counterAxisSizingMode,
        primaryAxisAlignItems: doc.primaryAxisAlignItems,
        counterAxisAlignItems: doc.counterAxisAlignItems,
        paddingLeft: doc.paddingLeft,
        paddingRight: doc.paddingRight,
        paddingTop: doc.paddingTop,
        paddingBottom: doc.paddingBottom,
        itemSpacing: doc.itemSpacing,
        counterAxisSpacing: doc.counterAxisSpacing,
      },

      // Visual properties
      visual: {
        fills: doc.fills,
        strokes: doc.strokes,
        strokeWeight: doc.strokeWeight,
        cornerRadius: doc.cornerRadius,
        rectangleCornerRadii: doc.rectangleCornerRadii,
        opacity: doc.opacity,
        blendMode: doc.blendMode,
        effects: doc.effects,
      },

      // Typography (for text nodes)
      typography: doc.type === 'TEXT' ? {
        characters: doc.characters,
        style: doc.style,
        characterStyleOverrides: doc.characterStyleOverrides,
        styleOverrideTable: doc.styleOverrideTable,
      } : undefined,

      // Children (for frames/groups)
      childCount: Array.isArray(doc.children) ? doc.children.length : 0,
      children: Array.isArray(doc.children)
        ? doc.children.slice(0, 20).map((child: Record<string, unknown>) => ({
            id: child.id,
            name: child.name,
            type: child.type,
          }))
        : undefined,

      // Component info
      componentId: doc.componentId,

      // Image URL if requested
      imageUrl: images?.[node.id],
    };
  });

  return {
    ok: true,
    fileKey,
    nodeIds,
    designContext,
    styles,
    tip: 'Use layoutMode to determine if auto-layout is used. HORIZONTAL = flex row, VERTICAL = flex column.',
  };
}
