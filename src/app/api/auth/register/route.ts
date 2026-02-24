import { NextResponse } from 'next/server';
import { registerUser } from '@/server/auth/authService';

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (parseError) {
    console.error('[Register] Failed to parse request body:', parseError);
    return NextResponse.json(
      { message: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { name, email, role, password } = body;

  try {
    console.log('[Register] Received registration request:', { name, email, role });

    const user = await registerUser({ name, email, role, password });

    console.log('[Register] User created successfully:', user.id);

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error('[Register] Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Name and email are required' ||
        errorMessage === 'Password is required' ||
        errorMessage === 'Password must be at least 8 characters' ||
        errorMessage === 'User already exists') {
      return NextResponse.json({ message: errorMessage }, { status: 400 });
    }
    
    return NextResponse.json(
      { message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
