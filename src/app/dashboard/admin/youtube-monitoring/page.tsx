'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Youtube, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  ArrowLeft,
  BarChart3
} from 'lucide-react';

interface PostViewSnapshot {
  id: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  deltaViews: number;
  isValidated: boolean;
  isFlagged: boolean;
  flagReason: string | null;
  payoutAmountCents: number;
  checkedAt: string;
  socialPost: {
    id: string;
    title: string | null;
    externalPostId: string;
  };
}

interface PostsByStatus {
  status: string;
  _count: number;
}

interface QuotaUsage {
  used: number;
  limit: number;
  percentUsed: number;
}

export default function YouTubeMonitoringPage() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [postsByStatus, setPostsByStatus] = useState<PostsByStatus[]>([]);
  const [recentSnapshots, setRecentSnapshots] = useState<PostViewSnapshot[]>([]);
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage>({ used: 0, limit: 10000, percentUsed: 0 });
  const [runningJob, setRunningJob] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/jobs/check-post-views');
      const data = await response.json();
      
      if (response.ok) {
        setPostsByStatus(data.postsByStatus || []);
        setRecentSnapshots(data.recentSnapshots || []);
        setQuotaUsage(data.quotaUsage || { used: 0, limit: 10000, percentUsed: 0 });
        setLastUpdated(new Date());
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const triggerViewCheck = async () => {
    try {
      setRunningJob(true);
      const response = await fetch('/api/admin/jobs/check-post-views', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_JOB_SECRET || ''}`,
        },
      });
      const data = await response.json();
      
      if (response.ok) {
        await fetchData();
      } else {
        setError(data.error || 'Failed to run job');
      }
    } catch (err) {
      setError('Failed to trigger job');
    } finally {
      setRunningJob(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading YouTube monitoring...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-500">Paused</Badge>;
      case 'FLAGGED':
        return <Badge className="bg-red-500">Flagged</Badge>;
      case 'PENDING':
        return <Badge className="bg-blue-500">Pending</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-gray-500">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalPosts = postsByStatus.reduce((sum, item) => sum + item._count, 0);
  const activePosts = postsByStatus.find(s => s.status === 'ACTIVE')?._count || 0;
  const flaggedPosts = postsByStatus.find(s => s.status === 'FLAGGED')?._count || 0;

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Youtube className="h-8 w-8 text-red-500" />
              YouTube Monitoring
            </h1>
            <p className="text-muted-foreground">
              Monitor YouTube post performance and view validation
            </p>
          </div>
        </div>
        <Button onClick={triggerViewCheck} disabled={runningJob}>
          {runningJob ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking Views...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Check View Counts
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Play className="h-5 w-5" />
              {totalPosts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {activePosts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {flaggedPosts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotaUsage.percentUsed}%</div>
            <Progress value={quotaUsage.percentUsed} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {quotaUsage.used.toLocaleString()} / {quotaUsage.limit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="snapshots">View Snapshots</TabsTrigger>
          <TabsTrigger value="flagged">Flagged Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Posts by Status</CardTitle>
              <CardDescription>Distribution of YouTube posts across status categories</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postsByStatus.map((item) => (
                    <TableRow key={item.status}>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="font-medium">{item._count}</TableCell>
                      <TableCell>
                        {totalPosts > 0 ? Math.round((item._count / totalPosts) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {postsByStatus.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No YouTube posts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots">
          <Card>
            <CardHeader>
              <CardTitle>Recent View Snapshots</CardTitle>
              <CardDescription>Latest view count checks (last 24 hours)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSnapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {snapshot.socialPost.title || snapshot.socialPost.externalPostId}
                      </TableCell>
                      <TableCell>{snapshot.viewCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={snapshot.deltaViews > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                          {snapshot.deltaViews > 0 ? '+' : ''}{snapshot.deltaViews.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{snapshot.likeCount.toLocaleString()}</TableCell>
                      <TableCell>{snapshot.commentCount.toLocaleString()}</TableCell>
                      <TableCell>
                        {snapshot.isFlagged ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        ) : snapshot.isValidated ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Validated
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {snapshot.payoutAmountCents > 0 ? (
                          <span className="text-green-600 font-medium">
                            ${(snapshot.payoutAmountCents / 100).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(snapshot.checkedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentSnapshots.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No snapshots found. Run the view check job to collect data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Posts</CardTitle>
              <CardDescription>Posts flagged for suspicious activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video</TableHead>
                    <TableHead>Current Views</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>Flag Reason</TableHead>
                    <TableHead>Checked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSnapshots.filter(s => s.isFlagged).map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {snapshot.socialPost.title || snapshot.socialPost.externalPostId}
                      </TableCell>
                      <TableCell>{snapshot.viewCount.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">
                        +{snapshot.deltaViews.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-red-500">{snapshot.flagReason}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(snapshot.checkedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentSnapshots.filter(s => s.isFlagged).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No flagged posts
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground mt-4 text-right">
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      )}
    </div>
  );
}
