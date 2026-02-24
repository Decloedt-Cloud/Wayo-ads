import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema, ZodError as ZodErrorType } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function validateRequest<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodErrorType) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Invalid request body' };
  }
}

export function createValidatedHandler<T extends ZodSchema, R>(
  schema: T,
  handler: (data: z.infer<T>, request: NextRequest) => Promise<R>
) {
  return async (request: NextRequest) => {
    const validation = await validateRequest(request, schema);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    try {
      const result = await handler(validation.data!, request);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export function validateQuery<T extends ZodSchema>(
  url: URL,
  schema: T
): ValidationResult<z.infer<T>> {
  try {
    const params = Object.fromEntries(url.searchParams);
    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodErrorType) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Invalid query parameters' };
  }
}

export function validateParams<T extends ZodSchema>(
  params: Record<string, string>,
  schema: T
): ValidationResult<z.infer<T>> {
  try {
    const validated = schema.parse(params);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodErrorType) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Invalid path parameters' };
  }
}
