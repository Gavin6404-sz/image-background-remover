'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, ArrowLeft, Loader2, CircleCheck, CircleX } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = 'https://api.imagetoolbox.online';

// PayPal Sandbox Client ID - used to load PayPal SDK
const PAYPAL_SANDBOX_CLIENT_ID = 'AXnfpIWIZiT3tL-QIktv5Yq1PYjkwHVTZk14OSLRuhmqAxzuhtZLiLbX6sgRKpPmQpW9uynlmuLkbQ3g';

const translations = {
  en: {
    pricing: 'Pricing',
    pricingSubtitle: 'Choose the plan that fits your needs',
    subscription: 'Subscription',
    subscriptionDesc: 'Monthly quota, auto-resets on the 1st of each month',
    points: 'Credits',
    pointsDesc: 'Permanent, never expire, stack with subscription',
    perMonth: '/month',
    perTime: '/time',
    times: 'times',
    monthly: 'Monthly',
    quota: 'quota',
    mostPopular: 'Most Popular',
    buyCredits: 'Buy Credits',
    subscribe: 'Subscribe',
    features: 'Features',
    featureList: [
      'AI-powered background removal',
      'HD quality output',
      'No watermarks',
      'Batch processing',
    ],
    faq: 'FAQ',
    faq1Q: 'How does the monthly quota work?',
    faq1A: 'Your monthly quota resets on the 1st of each month at 00:00 UTC. Unused quota does not carry over to the next month.',
    faq2Q: 'Do credits expire?',
    faq2A: 'No, credits never expire. You can buy more anytime and they will be added to your balance.',
    faq3Q: 'Can I cancel my subscription?',
    faq3A: 'Yes, you can cancel anytime from your profile. Your remaining quota will still be available until the end of the billing period.',
    faq4Q: 'What payment methods do you accept?',
    faq4A: 'We accept PayPal and all major credit cards through our secure payment system.',
    faq5Q: 'Is there a free trial?',
    faq5A: 'Yes! Every new user gets 3 free credits to try our service.',
    home: 'Home',
    loading: 'Loading...',
    processing: 'Redirecting to PayPal...',
    paymentSuccess: 'Payment successful!',
    paymentFailed: 'Payment failed. Please try again.',
    pleaseLogin: 'Please sign in to continue',
    loginRequired: 'Sign In',
  },
  zh: {
    pricing: '定价方案',
    pricingSubtitle: '选择适合您的套餐',
    subscription: '订阅会员',
    subscriptionDesc: '按月计费，每月1日自动重置额度',
    points: '积分充值',
    pointsDesc: '永久有效，永不过期，可与订阅叠加',
    perMonth: '/月',
    perTime: '/次',
    times: '次',
    monthly: '每月',
    quota: '额度',
    mostPopular: '最受欢迎',
    buyCredits: '购买积分',
    subscribe: '立即订阅',
    features: '功能特点',
    featureList: [
      'AI 智能去背景',
      '高清画质输出',
      '无水印',
      '批量处理',
    ],
    faq: '常见问题',
    faq1Q: '每月额度如何计算？',
    faq1A: '您的每月额度会在每月1日 00:00 UTC 自动重置。当月未使用的额度不会累计到下个月。',
    faq2Q: '积分会过期吗？',
    faq2A: '不会，积分永久有效。您可以随时购买更多，积分会直接添加到您的账户余额中。',
    faq3Q: '可以取消订阅吗？',
    faq3A: '可以，您随时可以在个人中心取消订阅。取消后，当月剩余额度仍可使用至账单周期结束。',
    faq4Q: '支持哪些支付方式？',
    faq4A: '我们支持 PayPal 和所有主流信用卡，通过安全支付系统完成交易。',
    faq5Q: '有免费试用吗？',
    faq5A: '有的！每位新用户注册即送 3 次免费额度。',
    home: '返回首页',
    loading: '加载中...',
    processing: '正在跳转 PayPal...',
    paymentSuccess: '支付成功！',
    paymentFailed: '支付失败，请重试。',
    pleaseLogin: '请先登录再购买',
    loginRequired: '登录',
  },
};

type Language = 'en' | 'zh';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [payingPlanId, setPayingPlanId] = useState<number | null>(null);
  const [payingType, setPayingType] = useState<'subscription' | 'points' | null>(null);
  const [plans, setPlans] = useState<{
    subscriptions: Array<{ id: number; plan_name: string; display_name: string; quota_monthly: number; price_usd: number }>;
    points: Array<{ id: number; package_name: string; display_name: string; points: number; price_usd: number }>;
  }>({ subscriptions: [], points: [] });

  // Handle PayPal return with orderId
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');
  const type = searchParams.get('type') as 'points' | 'subscription' | null;

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'en' || urlLang === 'zh') {
      setLang(urlLang);
    } else {
      setLang('en');
    }
  }, []);

  // Fetch plans from API
  useEffect(() => {
    async function fetchPlans() {
      try {
        const [subRes, pointsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/plans/subscription`),
          fetch(`${API_BASE_URL}/api/plans/points`),
        ]);
        const subData = await subRes.json();
        const pointsData = await pointsRes.json();
        setPlans({
          subscriptions: subData.plans || [],
          points: pointsData.packages || [],
        });
      } catch (e) {
        console.error('Failed to fetch plans:', e);
      }
    }
    if (mounted) fetchPlans();
  }, [mounted]);

  // Handle PayPal return
  useEffect(() => {
    if (!mounted || !orderId || !type) return;
    const t = translations[lang];

    async function verify() {
      const endpoint = type === 'points' ? '/api/points/buy/verify' : '/api/subscribe/verify';
      const token = getCookie('token') || localStorage.getItem('sessionToken');
      if (!token) {
        toast.error(t.pleaseLogin);
        router.replace(`/${type === 'points' ? 'pricing' : 'pricing'}?lang=${lang}`);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(t.paymentSuccess);
        } else {
          toast.error(data.error || t.paymentFailed);
        }
      } catch {
        toast.error(t.paymentFailed);
      } finally {
        // Clean URL
        router.replace(`/${type === 'points' ? 'pricing' : 'pricing'}?lang=${lang}`);
      }
    }

    verify();
  }, [mounted, orderId, type, lang]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const t = translations[lang];

  const handlePurchase = async (id: number, type: 'subscription' | 'points') => {
    const token = getCookie('token') || localStorage.getItem('sessionToken');
    if (!token) {
      toast.error(t.pleaseLogin);
      setShowLoginDialog(true);
      return;
    }

    setPayingPlanId(id);
    setPayingType(type);

    try {
      const endpoint = type === 'points' ? '/api/points/buy' : '/api/subscribe';
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('orderId');
      currentUrl.searchParams.delete('status');
      currentUrl.searchParams.delete('type');
      const successUrl = `${currentUrl.origin}/${type === 'points' ? 'pricing' : 'pricing'}?lang=${lang}&orderId=CHECKOUT_ID&status=success&type=${type}`;
      const cancelUrl = `${currentUrl.origin}/pricing?lang=${lang}`;

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: type === 'points' ? id : undefined, planId: type === 'subscription' ? id : undefined, successUrl, cancelUrl }),
      });

      const data = await res.json();

      if (data.approvalUrl) {
        // Redirect to PayPal
        window.location.href = data.approvalUrl;
      } else {
        toast.error(data.error || t.paymentFailed);
        setPayingPlanId(null);
        setPayingType(null);
      }
    } catch {
      toast.error(t.paymentFailed);
      setPayingPlanId(null);
      setPayingType(null);
    }
  };

  const isSubsButton = (type: 'subscription' | 'points', id: number) => payingPlanId === id && payingType === type;

  const getPlanById = (type: 'subscription' | 'points', id: number) => {
    if (type === 'subscription') return plans.subscriptions.find(p => p.id === id);
    return plans.points.find(p => p.id === id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100">
      <header className="sticky top-0 z-[100] border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <span className="text-lg">💎</span>
            </div>
            <span className="text-base font-semibold text-foreground">{t.pricing}</span>
          </div>
          <Button size="sm" onClick={() => { router.push(`/?lang=${lang}`); }} className="gap-1.5 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 shadow-lg shadow-blue-500/30">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.home}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">{t.pricing}</h1>
          <p className="text-lg text-muted-foreground">{t.pricingSubtitle}</p>
        </div>

        {/* Subscription Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">{t.subscription}</h2>
            <p className="text-muted-foreground">{t.subscriptionDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.subscriptions.map((plan) => (
              <Card key={plan.id} className={`relative overflow-hidden ${plan.plan_name === 'pro' ? 'border-2 border-purple-400 shadow-xl shadow-purple-500/20' : 'shadow-lg'}`}>
                {plan.plan_name === 'pro' && (
                  <div className="absolute top-0 right-0">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-bl-lg rounded-tr-xl rounded-bl-none px-3 py-1.5 text-xs font-bold shadow-lg">
                      ⭐ {t.mostPopular}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold">
                    {lang === 'en' ? plan.display_name : plan.display_name}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {plan.quota_monthly} {t.times} {t.monthly}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="mb-4">
                    <span className="text-4xl font-black text-foreground">${plan.price_usd.toFixed(2)}</span>
                    <span className="text-muted-foreground ml-1">{t.perMonth}</span>
                  </div>
                  <Separator className="my-4" />
                  <ul className="space-y-2.5">
                    {t.featureList.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    disabled={isSubsButton('subscription', plan.id)}
                    className={`w-full font-semibold text-white shadow-lg ${
                      plan.plan_name === 'pro'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30'
                        : 'bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 shadow-blue-500/30'
                    }`}
                    size="lg"
                    onClick={() => handlePurchase(plan.id, 'subscription')}
                  >
                    {isSubsButton('subscription', plan.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t.processing}
                      </>
                    ) : (
                      t.subscribe
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Points Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">{t.points}</h2>
            <p className="text-muted-foreground">{t.pointsDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.points.map((pkg) => (
              <Card key={pkg.id} className={`relative overflow-hidden ${pkg.package_name === 'standard' ? 'border-2 border-orange-400 shadow-xl shadow-orange-500/20' : 'shadow-lg'}`}>
                {pkg.package_name === 'standard' && (
                  <div className="absolute top-0 right-0">
                    <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 rounded-bl-lg rounded-tr-xl rounded-bl-none px-3 py-1.5 text-xs font-bold shadow-lg">
                      ⭐ {t.mostPopular}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold">
                    {lang === 'en' ? pkg.display_name : pkg.display_name}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {pkg.points} {t.times}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="mb-4">
                    <span className="text-4xl font-black text-foreground">${pkg.price_usd.toFixed(2)}</span>
                    <span className="text-muted-foreground ml-1">{t.perTime}</span>
                  </div>
                  <Separator className="my-4" />
                  <ul className="space-y-2.5">
                    {t.featureList.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    disabled={isSubsButton('points', pkg.id)}
                    className={`w-full font-semibold text-white shadow-lg ${
                      pkg.package_name === 'standard'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30'
                    }`}
                    size="lg"
                    onClick={() => handlePurchase(pkg.id, 'points')}
                  >
                    {isSubsButton('points', pkg.id) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t.processing}
                      </>
                    ) : (
                      t.buyCredits
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">{t.faq}</h2>
          <div className="space-y-4">
            {[
              { q: t.faq1Q, a: t.faq1A },
              { q: t.faq2Q, a: t.faq2A },
              { q: t.faq3Q, a: t.faq3A },
              { q: t.faq4Q, a: t.faq4A },
              { q: t.faq5Q, a: t.faq5A },
            ].map((item, idx) => (
              <Card key={idx} className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">{item.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-xl mx-auto shadow-lg border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <p className="text-foreground font-semibold mb-1">🎁 {lang === 'en' ? 'New User? Start for free!' : '新用户？免费试用！'}</p>
              <p className="text-sm text-muted-foreground">{lang === 'en' ? 'Register now and get 3 free credits instantly.' : '立即注册，立获 3 次免费额度。'}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
