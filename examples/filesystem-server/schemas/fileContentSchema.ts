import { z } from 'zod';

/**
 * Schema for file read response from Filesystem MCP server
 *
 * The server returns an array of content blocks where each block
 * can be text or other types of content.
 */
export const FileReadResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    })
  ),
});

/**
 * Schema for directory listing response
 */
export const DirectoryListingSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string().regex(/.*\.(txt|md|json|csv|js|ts|html|css)/), // Should contain file extensions
    })
  ),
});

/**
 * Schema for JSON config file content
 *
 * This is an example of validating structured data from a file
 */
export const ConfigFileSchema = z.object({
  version: z.string(),
  features: z.array(z.string()).optional(),
});

/**
 * Schema for parsing JSON content from file read response
 *
 * The response can be either:
 * - The full MCP response: { content: [{ type: 'text', text: '...' }] }
 * - Just the content array: [{ type: 'text', text: '...' }]
 *
 * This function handles both cases.
 */
export function extractAndValidateJSON<T extends z.ZodType>(
  response: unknown,
  schema: T
): z.infer<T> {
  let contentArray: Array<{ type: string; text: string }>;

  // Check if response is already the content array or the full MCP response
  if (Array.isArray(response)) {
    // Response is the content array directly (from eval runner)
    contentArray = response as Array<{ type: string; text: string }>;
  } else {
    // Response is the full MCP object, extract content
    const validated = FileReadResponseSchema.parse(response);
    contentArray = validated.content;
  }

  // Extract the text content
  const textContent = contentArray[0]?.text;

  if (!textContent) {
    throw new Error('No text content in response');
  }

  // Parse as JSON
  const jsonData = JSON.parse(textContent);

  // Validate against the provided schema
  return schema.parse(jsonData);
}
