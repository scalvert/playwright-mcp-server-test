import { z } from 'zod';

/**
 * Schema for SQLite query response from MCP server
 *
 * The server returns results in a specific format with rows of data
 */
export const QueryResultSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    })
  ),
});

/**
 * Schema for a user record
 */
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.string().optional(),
  created_at: z.number().optional(),
});

/**
 * Schema for a post record
 */
export const PostSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  published: z.union([z.number(), z.boolean()]),
});

/**
 * Schema for table list response
 *
 * The response can be either:
 * - The full MCP response: { content: [{ type: 'text', text: '...' }] }
 * - Just the content array: [{ type: 'text', text: '...' }]
 */
export const TableListSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(), // JSON array of table objects
    })
  ),
});

/**
 * Extract table names from list_tables response
 */
export function extractTableNames(response: unknown): string[] {
  let contentArray: Array<{ type: string; text: string }>;

  // Check if response is already the content array or the full MCP response
  if (Array.isArray(response)) {
    contentArray = response as Array<{ type: string; text: string }>;
  } else {
    const validated = TableListSchema.parse(response);
    contentArray = validated.content;
  }

  const textContent = contentArray[0]?.text;
  if (!textContent) {
    return [];
  }

  try {
    const tables = JSON.parse(textContent);
    return Array.isArray(tables) ? tables.map((t: any) => t.name) : [];
  } catch {
    return [];
  }
}

/**
 * Schema for table description response
 *
 * The response can be either:
 * - The full MCP response: { content: [{ type: 'text', text: '...' }] }
 * - Just the content array: [{ type: 'text', text: '...' }]
 */
export const TableDescriptionSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(), // Should contain column type information
    })
  ),
});

/**
 * Extract table description from describe_table response
 */
export function extractTableDescription(response: unknown): string {
  let contentArray: Array<{ type: string; text: string }>;

  // Check if response is already the content array or the full MCP response
  if (Array.isArray(response)) {
    contentArray = response as Array<{ type: string; text: string }>;
  } else {
    const validated = TableDescriptionSchema.parse(response);
    contentArray = validated.content;
  }

  return contentArray[0]?.text || '';
}

/**
 * Extract and parse JSON data from SQLite query result
 *
 * The SQLite MCP server returns results as text, often in JSON format
 */
export function extractQueryData(response: unknown): any[] {
  const validated = QueryResultSchema.parse(response);

  const textContent = validated.content[0]?.text;
  if (!textContent) {
    return [];
  }

  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(textContent);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // If not JSON, return the raw text
    return [{ raw: textContent }];
  }
}

/**
 * Validate query result contains expected number of records
 */
export function validateRecordCount(
  response: unknown,
  expectedCount: number
): { pass: boolean; details: string } {
  try {
    const data = extractQueryData(response);
    const pass = data.length === expectedCount;

    return {
      pass,
      details: pass
        ? `Found expected ${expectedCount} record(s)`
        : `Expected ${expectedCount} record(s), found ${data.length}`,
    };
  } catch (error) {
    return {
      pass: false,
      details: `Failed to validate: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
