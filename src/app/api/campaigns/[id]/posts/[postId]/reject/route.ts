import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rejectPost } from '@/server/campaigns/postService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId, postId } = await params;
    const body = await request.json();
    const reason = body.reason || 'Content does not meet campaign requirements';

    const result = await rejectPost(postId, campaignId, session.user.id, reason);

    if ('error' in result) {
      if (result.error === 'Campaign not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      if (result.error === 'Forbidden') {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ post: result.post });
  } catch (error) {
    console.error('Error rejecting post:', error);
    return NextResponse.json({ error: 'Failed to reject post' }, { status: 500 });
  }
}
