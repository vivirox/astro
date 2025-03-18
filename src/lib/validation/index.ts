import { z } from 'zod';

/**
 * Validates request body against a Zod schema
 * @param request The request object
 * @param schema The Zod schema to validate against
 * @returns A tuple of [data, error] where data is the validated data and error is the validation error
 */
export async function validateRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<[z.infer<T> | null, { status: number; error: string; details?: any } | null]> {
  try {
    // Parse request body as JSON
    const body = await request.json();
    
    // Validate against schema
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return [
        null,
        {
          status: 400,
          error: 'Invalid request parameters',
          details: result.error.format()
        }
      ];
    }
    
    return [result.data, null];
  } catch (error) {
    return [
      null,
      {
        status: 400,
        error: 'Invalid JSON in request body',
        details: error instanceof Error ? error.message : String(error)
      }
    ];
  }
}

/**
 * Validates query parameters against a Zod schema
 * @param url The URL object containing query parameters
 * @param schema The Zod schema to validate against
 * @returns A tuple of [data, error] where data is the validated data and error is the validation error
 */
export function validateQueryParams<T extends z.ZodType>(
  url: URL,
  schema: T
): [z.infer<T> | null, { status: number; error: string; details?: any } | null] {
  try {
    // Create an object from URL search params
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Validate against schema
    const result = schema.safeParse(params);
    
    if (!result.success) {
      return [
        null,
        {
          status: 400,
          error: 'Invalid query parameters',
          details: result.error.format()
        }
      ];
    }
    
    return [result.data, null];
  } catch (error) {
    return [
      null,
      {
        status: 400,
        error: 'Error parsing query parameters',
        details: error instanceof Error ? error.message : String(error)
      }
    ];
  }
} 