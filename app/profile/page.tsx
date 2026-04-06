'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User, Loader2, Check, X, ChevronLeft, ChevronRight, Filter, LogOut } from 'lucide-react';
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
  free: { used: number; total: number; remaining: number };
  subscription: { used: number; total: number; remaining: number; plan?: string };
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

function formatDate(timestamp: number | string, lang: 'en' | 'zh' = 'zh'): string {
  const dateObj: Date = typeof timestamp === 'string'
    ? new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z')
    : new Date(timestamp * 1000);
  if (lang === 'en') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
  }
  const m = dateObj.getMonth() + 1;
  return `${dateObj.getFullYear()}年${m}月${dateObj.getDate()}日`;
}

function formatDateTime(timestamp: number | string, lang: 'en' | 'zh' = 'zh'): string {
  const dateObj: Date = typeof timestamp === 'string'
    ? new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z')
    : new Date(timestamp * 1000);
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const mm = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  if (lang === 'en') {
    return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
  }
  return `${y}年${m}月${d}日 ${hh}:${mm}:${ss}`;
}

function formatRelativeTime(timestamp: number | string, lang: 'en' | 'zh' = 'zh'): string {
  const timeMs: number = typeof timestamp === 'string'
    ? new Date(timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z').getTime()
    : timestamp * 1000;
  const now = Date.now();
  const diff = now - timeMs;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return lang === 'en' ? 'Just now' : '刚刚';
  if (minutes < 60) return lang === 'en' ? `${minutes}m ago` : `${minutes}分钟前`;
  if (hours < 24) return lang === 'en' ? `${hours}h ago` : `${hours}小时前`;
  if (days === 1) return lang === 'en' ? 'Yesterday' : '昨天';
  if (days < 7) return lang === 'en' ? `${days}d ago` : `${days}天前`;
  return formatDate(timestamp, lang);
}

function getQuotaTypeLabel(type: string): string {
  switch (type) {
    case 'free': return '免费';
    case 'subscription': return '订阅';
    case 'points': return '积分';
    default: return type;
  }
}
function getQuotaTypeLabelEn(type: string): string {
  switch (type) {
    case 'free': return 'Free';
    case 'subscription': return 'Sub';
    case 'points': return 'Credits';
    default: return type;
  }
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
    // Read lang from URL params
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'zh' || urlLang === 'en') {
      setLang(urlLang);
    } else {
      setLang('en');
    }

    // Fetch user info
    fetchUserInfo(token);
    fetchQuotas(token);
  }, []);

  // Redirect to home on load error
  useEffect(() => {
    if (loadError) {
      window.location.href = '/';
    }
  }, [loadError]);

  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user info');
      }
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
      console.error('Fetch user info error:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotas = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/quotas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch quotas');
      }
      const data: QuotaData | { success: false } = await res.json();
      if ('success' in data && data.success === false) {
        // Use defaults if API not ready
        setQuota({
          free: { used: 0, total: 3, remaining: 3 },
          subscription: { used: 0, total: 0, remaining: 0 },
          points: { balance: 0 },
        });
      } else {
        setQuota(data as QuotaData);
      }
    } catch (err) {
      console.error('Fetch quotas error:', err);
      setQuota({
        free: { used: 0, total: 3, remaining: 3 },
        subscription: { used: 0, total: 0, remaining: 0 },
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
      if (!res.ok) {
        setHistory([]);
        setHistoryTotal(0);
      } else {
        const data: { items?: HistoryItem[]; history?: HistoryItem[]; total?: number; success?: boolean } = await res.json();
        if ('success' in data && data.success === false) {
          setHistory([]);
          setHistoryTotal(0);
        } else {
          setHistory(data.items || data.history || []);
          setHistoryTotal(data.total || 0);
        }
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
        toast.success(lang === 'en' ? 'Display name saved' : '显示名称已保存');
      } else {
        toast.error(lang === 'en' ? 'Save failed' : '保存失败');
      }
    } catch {
      toast.error(lang === 'en' ? 'Save failed' : '保存失败');
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
        toast.success(lang === 'en' ? 'Bio saved' : '个人简介已保存');
      } else {
        toast.error(lang === 'en' ? 'Save failed' : '保存失败');
      }
    } catch {
      toast.error(lang === 'en' ? 'Save failed' : '保存失败');
    } finally {
      setSavingBio(false);
    }
  };

  const handleLogout = async () => {
    if (!sessionToken) return;
    setLoggingOut(true);
    
    // Fire and forget - don't wait for API response
    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    }).catch(() => {}); // Ignore errors
    
    // Clear localStorage and redirect immediately
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPicture');
    window.location.href = '/';
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
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <User className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-foreground">{lang === 'en' ? 'Profile' : '个人中心'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { window.location.href = `/?lang=${lang}`; }} className="gap-1.5 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 shadow-lg shadow-blue-500/30">
              <ArrowLeft className="h-3.5 w-3.5" />
              {lang === 'en' ? 'Home' : '首页'}
            </Button>
            <Button size="sm" onClick={handleLogout} disabled={loggingOut} className="gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-lg shadow-orange-500/30">
              {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              {lang === 'en' ? 'Sign Out' : '退出'}
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
                  <h2 className="text-xl font-bold text-foreground">{user.name || (lang === 'en' ? 'Unnamed' : '未设置名称')}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.created_at && (
                    <p className="text-xs text-muted-foreground">
                      {lang === 'en' ? 'Registered on' : '注册于'} {formatDate(user.created_at, lang)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">{lang === 'en' ? 'Failed to load user info' : '无法加载用户信息'}</p>
              <a
                href="/"
                className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all"
              >
                {lang === 'en' ? 'Back to Home' : '返回首页'}
              </a>
            </CardContent>
          </Card>
        )}

        {/* Quota Overview */}
        <Card className="shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">{lang === 'en' ? 'Quota Overview' : '额度概览'}</CardTitle>
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
                  <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">{lang === 'en' ? 'Free Credits' : '免费额度'}</p>
                  <p className="text-2xl font-black text-orange-600">
                    {quota ? `${quota.free.remaining}/${quota.free.total}` : '—'}
                  </p>
                  <p className="text-xs text-orange-500">{lang === 'en' ? 'left' : '剩余'}</p>
                </div>

                {/* Subscription */}
                <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-4 text-center space-y-1">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">{lang === 'en' ? 'Sub' : '订阅'}</p>
                  <p className="text-2xl font-black text-blue-600">
                    {quota?.subscription && quota.subscription.total > 0
                      ? `${quota.subscription.total - quota.subscription.used}/${quota.subscription.total}`
                      : quota?.subscription?.total === 0 ? '0/0' : '—'}
                  </p>
                  <p className="text-xs text-blue-500">{lang === 'en' ? 'this month' : '本月剩余'}</p>
                </div>

                {/* Points */}
                <div className="rounded-xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-4 text-center space-y-1">
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">{lang === 'en' ? 'Credits' : '积分'}</p>
                  <p className="text-2xl font-black text-purple-600">
                    {quota?.points?.balance ?? '—'}
                  </p>
                  <p className="text-xs text-purple-500">{lang === 'en' ? 'available' : '可用'}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-3">
              <a
                href="/pricing"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                💎 {lang === 'en' ? 'Buy Credits' : '充值积分'}
              </a>
              <a
                href="/pricing"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-sky-500 text-white font-semibold shadow-lg hover:from-blue-600 hover:to-sky-600 transition-all"
              >
                📦 {lang === 'en' ? 'Subscribe' : '订阅会员'}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Processing History */}
        <Card className="shadow-lg overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">{lang === 'en' ? 'Processing History' : '处理历史'}</CardTitle>
              <Select
                value={historyFilter}
                onValueChange={(v) => handleFilterChange(v as HistoryFilter)}
              >
                <SelectTrigger className="w-32 h-9">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === 'en' ? 'All' : '全部'}</SelectItem>
                  <SelectItem value="free">{lang === 'en' ? 'Free' : '免费'}</SelectItem>
                  <SelectItem value="subscription">{lang === 'en' ? 'Sub' : '订阅'}</SelectItem>
                  <SelectItem value="points">{lang === 'en' ? 'Credits' : '积分'}</SelectItem>
                  <SelectItem value="success">{lang === 'en' ? 'Success' : '成功'}</SelectItem>
                  <SelectItem value="failed">{lang === 'en' ? 'Failed' : '失败'}</SelectItem>
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
                <p className="text-sm">{lang === 'en' ? 'No processing records yet' : '暂无处理记录'}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">{lang === 'en' ? 'Time' : '时间'}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">{lang === 'en' ? 'Type' : '类型'}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">{lang === 'en' ? 'Usage' : '消耗'}</th>
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">{lang === 'en' ? 'Status' : '状态'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(item.created_at, lang)}
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
                              {lang === 'en' ? getQuotaTypeLabelEn(item.quota_type) : getQuotaTypeLabel(item.quota_type)}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            -{item.credits_used} {lang === 'en' ? 'times' : '次'}
                          </td>
                          <td className="py-2 px-2">
                            {item.status === 'success' ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <Check className="h-4 w-4" /> {lang === 'en' ? 'Success' : '成功'}
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center gap-1" title={item.error_message}>
                                <X className="h-4 w-4" /> {lang === 'en' ? 'Failed' : '失败'}
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
                      {lang === 'en' ? `Total ${historyTotal} items` : `共 ${historyTotal} 条`}
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
