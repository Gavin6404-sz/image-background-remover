'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const translations = {
  en: {
    privacy: 'Privacy Policy',
    lastUpdated: 'Last updated',
    home: 'Home',
    content: [
      {
        title: 'Information We Collect',
        text: 'We collect information you provide directly to us, including your name, email address, and profile picture when you sign up via Google or GitHub OAuth. If you register with an email and password, we store a hashed version of your password using PBKDF2 with 30,000 iterations.',
      },
      {
        title: 'How We Use Your Information',
        text: 'We use the information we collect to provide, maintain, and improve our services. We use your email to communicate with you about your account and to send service-related notifications.',
      },
      {
        title: 'Information Sharing',
        text: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy or as necessary to provide our services.',
      },
      {
        title: 'Data Security',
        text: 'We implement appropriate technical and organizational measures to protect the security of your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.',
      },
      {
        title: 'Cookies',
        text: 'We use cookies and similar tracking technologies to track activity on our website and hold certain information. Cookies are files with small amounts of data which may include an anonymous unique identifier.',
      },
      {
        title: 'Third-Party Services',
        text: 'We may employ third-party companies and services to process images on your behalf. These service providers have access to your images solely for the purpose of performing the image processing tasks you request.',
      },
      {
        title: "Children's Privacy",
        text: 'Our service is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13.',
      },
      {
        title: 'Changes to This Policy',
        text: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.',
      },
      {
        title: 'Contact Us',
        text: 'If you have any questions about this Privacy Policy, please contact us at support@imagetoolbox.online.',
      },
    ],
  },
  zh: {
    privacy: '隐私政策',
    lastUpdated: '最后更新',
    home: '返回首页',
    content: [
      {
        title: '我们收集的信息',
        text: '我们会收集您直接向我们提供的信息，包括您的姓名、电子邮件地址以及通过 Google 或 GitHub OAuth 注册时的头像。如果您使用邮箱和密码注册，我们将使用 PBKDF2（30,000 次迭代）哈希后的密码。',
      },
      {
        title: '我们如何使用您的信息',
        text: '我们使用收集的信息来提供、维护和改进我们的服务。我们使用您的电子邮件地址就您的账户和服务相关通知与您沟通。',
      },
      {
        title: '信息共享',
        text: '未经您同意，我们不会向第三方出售、交易或以其他方式转让您的个人信息，但本政策中描述的情况或为提供我们的服务所必需的情况除外。',
      },
      {
        title: '数据安全',
        text: '我们实施适当的技术和组织措施来保护您个人信息的安全。然而，通过互联网传输或电子存储的方法无法做到100%安全。',
      },
      {
        title: 'Cookies',
        text: '我们使用 cookies 和类似的跟踪技术来跟踪我们网站上的活动并保存某些信息。Cookies 是包含少量数据的文件，可能包含匿名唯一标识符。',
      },
      {
        title: '第三方服务',
        text: '我们可能聘请第三方公司和服务商代表您处理图片。这些服务提供商仅出于执行您请求的图片处理任务的目的而访问您的图片。',
      },
      {
        title: '儿童隐私',
        text: '我们的服务不面向13岁以下的个人。我们不会故意收集13岁以下儿童的个人信息。',
      },
      {
        title: '政策变更',
        text: '我们可能会不时更新我们的隐私政策。我们将通过在此页面上发布新的隐私政策并更新"最后更新"日期来通知您任何变更。',
      },
      {
        title: '联系我们',
        text: '如果您对本隐私政策有任何疑问，请通过 support@imagetoolbox.online 联系我们。',
      },
    ],
  },
};

type Language = 'en' | 'zh';

export default function PrivacyPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Language>('en');

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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100 flex items-center justify-center">
        <div className="animate-pulse bg-muted w-8 h-8 rounded-full" />
      </div>
    );
  }

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100">
      {/* Header */}
      <header className="sticky top-0 z-[100] border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <span className="text-lg">🔒</span>
            </div>
            <span className="text-base font-semibold text-foreground">{t.privacy}</span>
          </div>
          <Button
            size="sm"
            onClick={() => { router.push(`/?lang=${lang}`); }}
            className="gap-1.5 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 shadow-lg shadow-blue-500/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.home}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t.privacy}</h1>
          <p className="text-sm text-muted-foreground">{t.lastUpdated}: 2026-04-06</p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {t.content.map((section, idx) => (
            <Card key={idx} className="shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-foreground">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
