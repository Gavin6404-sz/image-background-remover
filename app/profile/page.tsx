'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User, Loader2, Check, X, ChevronLeft, ChevronRight, Filter, Save, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast, Toaster } from 'sonner';

const API_BASE_URL = 'https://api.imagetoolbox.online';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  bio?: string;
  created_at?: number;
}

interface QuotaData {
  free: { used: number; total: number };
  subscription: { used: number; total: number; plan?: string };
  points: { balance: number };
}

interface HistoryItem {
  id: number;
  created_at: number;
  quota_type: 'free' | 'subscription' | 'points';
  credits_used: number;
  status: 'success' | 'failed';
  error_message?: string;
}

type HistoryFilter = 'all' | 'free' | 'subscription' | 'points' | 'success' | 'failed';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return formatDate(timestamp);
}

function getQuotaTypeLabel(type: string): string {
  switch (type) {
    case 'free': return '免费';
    case 'subscription': return '订阅';
    case 'points': return '积分';
    default: return type;
  }
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Account settings form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const PAGE_SIZE = 10;

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    const savedPicture = localStorage.getItem('userPicture');

    if (!token) {
      // Not logged in, redirect to home
      window.location.href = '/';
      return;
    }

    setSessionToken(token);
    setDisplayName(savedName || '');
    setMounted(true);

    // Fetch user info
    fetchUserInfo(token);
    fetchQuotas(token);
  }, []);

  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { user?: UserInfo; success?: boolean } = await res.json();
      if (data.user) {
        setUser(data.user);
        setDisplayName(data.user.name || '');
        setBio(data.user.bio || '');
        localStorage.setItem('userName', data.user.name || '');
        localStorage.setItem('userEmail', data.user.email || '');
        localStorage.setItem('userPicture', data.user.picture || '');
      }
    } catch (err) {
      toast.error('获取用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotas = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/quotas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: QuotaData | { success: false } = await res.json();
      if ('success' in data && data.success === false) {
        // Use defaults if API not ready
        setQuota({
          free: { used: 0, total: 3 },
          subscription: { used: 0, total: 0 },
          points: { balance: 0 },
        });
      } else {
        setQuota(data as QuotaData);
      }
    } catch {
      setQuota({
        free: { used: 0, total: 3 },
        subscription: { used: 0, total: 0 },
        points: { balance: 0 },
      });
    }
  };

  const fetchHistory = useCallback(async (token: string, page: number, filter: HistoryFilter) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (filter !== 'all') {
        params.set('type', filter);
      }

      const res = await fetch(`${API_BASE_URL}/api/user/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { items?: HistoryItem[]; history?: HistoryItem[]; total?: number; success?: boolean } = await res.json();
      if ('success' in data && data.success === false) {
        setHistory([]);
        setHistoryTotal(0);
      } else {
        setHistory(data.items || data.history || []);
        setHistoryTotal(data.total || 0);
      }
    } catch {
      setHistory([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionToken && mounted) {
      fetchHistory(sessionToken, historyPage, historyFilter);
    }
  }, [sessionToken, historyPage, historyFilter, mounted, fetchHistory]);

  const handleFilterChange = (filter: HistoryFilter) => {
    setHistoryFilter(filter);
    setHistoryPage(1);
  };

  const handleSaveDisplayName = async () => {
    if (!sessionToken || !displayName.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name: displayName.trim() }),
      });
      const data: { success?: boolean } = await res.json();
      if (data.success !== false) {
        setUser((prev) => prev ? { ...prev, name: displayName.trim() } : prev);
        localStorage.setItem('userName', displayName.trim());
        toast.success('显示名称已保存');
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveBio = async () => {
    if (!sessionToken) return;
    setSavingBio(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ bio: bio.trim() }),
      });
      const data: { success?: boolean } = await res.json();
      if (data.success !== false) {
        setUser((prev) => prev ? { ...prev, bio: bio.trim() } : prev);
        toast.success('个人简介已保存');
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingBio(false);
    }
  };

  const handleLogout = async () => {
    if (!sessionToken) return;
    setLoggingOut(true);
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    } catch {
      // Continue with logout even if API fails
    } finally {
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPicture');
      window.location.href = '/';
    }
  };

  const totalPages = Math.ceil(historyTotal / PAGE_SIZE);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="w-full h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100">
      <Toaster position="bottom-center" richColors />

      {/* Header */}
      <header className="sticky top-0 z-[100] border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">返回首页</span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30">
              <User className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-foreground">个人中心</span>
          </div>
          <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 gap-2 font-medium"
              >
                {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                退出登录
              </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
        {/* User Info Card */}
        {loading ? (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="w-40 h-6" />
                  <Skeleton className="w-56 h-4" />
                  <Skeleton className="w-32 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : user ? (
          <Card className="shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-orange-100 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-orange-100 shadow-lg">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-foreground">{user.name || '未设置名称'}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.created_at && (
                    <p className="text-xs text-muted-foreground">
                      注册于 {formatDate(user.created_at)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">无法加载用户信息</p>
              <a
                href="/"
                className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all"
              >
                返回首页
              </a>
            </CardContent>
          </Card>
        )}

        {/* Quota Overview */}
        <Card className="shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">额度概览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {/* Free Quota */}
                <div className="rounded-xl border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-4 text-center space-y-1">
                  <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">免费额度</p>
                  <p className="text-2xl font-black text-orange-600">
                    {quota ? `${quota.free.total - quota.free.used}/${quota.free.total}` : '—'}
                  </p>
                  <p className="text-xs text-orange-500">剩余</p>
                </div>

                {/* Subscription */}
                <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-4 text-center space-y-1">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">订阅</p>
                  <p className="text-2xl font-black text-blue-600">
                    {quota?.subscription && quota.subscription.total > 0
                      ? `${quota.subscription.total - quota.subscription.used}/${quota.subscription.total}`
                      : quota?.subscription?.total === 0 ? '0/0' : '—'}
                  </p>
                  <p className="text-xs text-blue-500">本月剩余</p>
                </div>

                {/* Points */}
                <div className="rounded-xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4 text-center space-y-1">
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">积分</p>
                  <p className="text-2xl font-black text-purple-600">
                    {quota?.points?.balance ?? '—'}
                  </p>
                  <p className="text-xs text-purple-500">可用</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-3">
              <a
                href="/pricing"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                💎 充值积分
              </a>
              <a
                href="/pricing"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-sky-500 text-white font-semibold shadow-lg hover:from-blue-600 hover:to-sky-600 transition-all"
              >
                📦 订阅会员
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">账户设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium">
                显示名称
              </Label>
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="输入显示名称"
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveDisplayName}
                  disabled={savingName || !displayName.trim() || displayName === user?.name}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 shadow-md font-semibold gap-2"
                >
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              </div>
            </div>

            <Separator />

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium">
                个人简介
              </Label>
              <div className="flex gap-2">
                <Input
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="介绍一下自己（可选）"
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveBio}
                  disabled={savingBio}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 shadow-md font-semibold gap-2"
                >
                  {savingBio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing History */}
        <Card className="shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">处理历史</CardTitle>
              <Select
                value={historyFilter}
                onValueChange={(v) => handleFilterChange(v as HistoryFilter)}
              >
                <SelectTrigger className="w-32 h-9">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="free">免费</SelectItem>
                  <SelectItem value="subscription">订阅</SelectItem>
                  <SelectItem value="points">积分</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">暂无处理记录</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">时间</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">类型</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">消耗</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2">
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(item.created_at)}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <Badge
                              variant="secondary"
                              className={
                                item.quota_type === 'free'
                                  ? 'bg-orange-100 text-orange-700 border-orange-200'
                                  : item.quota_type === 'subscription'
                                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : 'bg-purple-100 text-purple-700 border-purple-200'
                              }
                            >
                              {getQuotaTypeLabel(item.quota_type)}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            -{item.credits_used}次
                          </td>
                          <td className="py-2 px-2">
                            {item.status === 'success' ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <Check className="h-4 w-4" /> 成功
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center gap-1" title={item.error_message}>
                                <X className="h-4 w-4" /> 失败
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      共 {historyTotal} 条
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - historyPage) <= 1)
                        .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">...</span>
                          ) : (
                            <Button
                              key={p}
                              variant={historyPage === p ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setHistoryPage(p as number)}
                              className={`h-8 w-8 p-0 ${
                                historyPage === p
                                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-0'
                                  : ''
                              }`}
                            >
                              {p}
                            </Button>
                          )
                        )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                        disabled={historyPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
