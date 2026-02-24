import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server-auth';
import { getCreatorTrackingLinks, createTrackingLink } from '@/server/campaigns/trackingLinkService';

const createLinkSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-zA-Z0-9-_]+$/).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const user = await requireRole('CREATOR');

    const result = await getCreatorTrackingLinks(campaignId, user.id);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ links: result.links });
  } catch (error) {
    console.error('Error fetching tracking links:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch tracking links' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const user = await requireRole('CREATOR');
    
    let validated: { slug?: string } = {};
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const body = await request.json();
      validated = createLinkSchema.parse(body);
    }

    const result = await createTrackingLink(campaignId, user.id, validated.slug);

    if ('error' in result) {
      if (result.error === 'Not approved for this campaign') {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      if (result.error === 'Link with this slug already exists') {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ link: result.link }, { status: 201 });
  } catch (error) {
    console.error('Error creating tracking link:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create tracking link' }, { status: 500 });
  }
}
