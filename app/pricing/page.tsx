'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, X, ArrowLeft } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = 'https://api.imagetoolbox.online';

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
    featureNotAvailable: 'Not available',
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
    featureNotAvailable: '不支持',
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
  },
};

type Language = 'en' | 'zh';

const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic',
    nameZh: '基础版',
    quota: 25,
    price: 9.99,
    apiCost: 3.00,
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    nameZh: '专业版',
    quota: 60,
    price: 19.99,
    apiCost: 7.20,
    popular: true,
  },
];

const pointsPlans = [
  {
    id: 'starter',
    name: 'Starter',
    nameZh: '入门版',
    quota: 10,
    price: 4.99,
    apiCost: 1.20,
    popular: false,
  },
  {
    id: 'standard',
    name: 'Standard',
    nameZh: '标准版',
    quota: 30,
    price: 11.99,
    apiCost: 3.60,
    popular: true,
  },
  {
    id: 'bundle',
    name: 'Bundle',
    nameZh: '超值包',
    quota: 90,
    price: 34.99,
    apiCost: 10.80,
    popular: false,
  },
];

export default function PricingPage() {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'en' || urlLang === 'zh') {
      setLang(urlLang);
    } else {
      setLang('en');
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100">
      {/* Header */}
      <header className="sticky top-0 z-[100] border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <span className="text-lg">💎</span>
            </div>
            <span className="text-base font-semibold text-foreground">{t.pricing}</span>
          </div>
          <Button size="sm" onClick={() => { window.location.href = `/?lang=${lang}`; }} className="gap-1.5 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 shadow-lg shadow-blue-500/30">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.home}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Hero */}
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
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={`relative overflow-hidden ${plan.popular ? 'border-2 border-purple-400 shadow-xl shadow-purple-500/20' : 'shadow-lg'}`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-bl-lg rounded-tr-xl rounded-bl-none px-3 py-1.5 text-xs font-bold shadow-lg">
                      ⭐ {t.mostPopular}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold">
                    {lang === 'en' ? plan.name : plan.nameZh}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {plan.quota} {t.times} {t.monthly}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="mb-4">
                    <span className="text-4xl font-black text-foreground">${plan.price.toFixed(2)}</span>
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
                    className={`w-full font-semibold text-white shadow-lg ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30'
                        : 'bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 shadow-blue-500/30'
                    }`}
                    size="lg"
                    onClick={() => { alert(lang === 'en' ? 'Payment coming soon!' : '支付功能即将上线！'); }}
                  >
                    {t.subscribe}
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
            {pointsPlans.map((plan) => (
              <Card key={plan.id} className={`relative overflow-hidden ${plan.popular ? 'border-2 border-orange-400 shadow-xl shadow-orange-500/20' : 'shadow-lg'}`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 rounded-bl-lg rounded-tr-xl rounded-bl-none px-3 py-1.5 text-xs font-bold shadow-lg">
                      ⭐ {t.mostPopular}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold">
                    {lang === 'en' ? plan.name : plan.nameZh}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {plan.quota} {t.times}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="mb-4">
                    <span className="text-4xl font-black text-foreground">${plan.price.toFixed(2)}</span>
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
                    className={`w-full font-semibold text-white shadow-lg ${
                      plan.popular
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/30'
                    }`}
                    size="lg"
                    onClick={() => { alert(lang === 'en' ? 'Payment coming soon!' : '支付功能即将上线！'); }}
                  >
                    {t.buyCredits}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
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

        {/* Free Credits Note */}
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
