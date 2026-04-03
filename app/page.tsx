'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Download, ZoomIn, ZoomOut, RotateCcw, Wand2, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { toast, Toaster } from 'sonner';

type Language = 'en' | 'zh';
type BackgroundColor = 'transparent' | 'white' | 'black' | 'cream' | 'pink' | 'lavender' | 'sky' | 'mint';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface ImageState {
  original: string | null;
  result: string | null;
  isProcessing: boolean;
}

interface PendingImage {
  file: File;
  preview: string;
}

const translations = {
  en: {
    title: 'Background Remover',
    subtitle: 'Remove image backgrounds with AI in seconds',
    heroTitle: 'Image Background Remover',
    heroSubtitle: 'Remove image backgrounds with AI in seconds',
    dropHere: 'Drop your image here',
    orBrowse: 'or click to browse from your computer',
    supports: 'JPG, PNG • Max 10MB',
    feature1Title: 'Lightning Fast',
    feature1Desc: 'Process your images in seconds with our advanced AI technology. No waiting, no hassle.',
    feature2Title: '8 Background Colors',
    feature2Desc: 'Choose from transparent, white, black, cream, pink, lavender, sky blue, or mint green backgrounds.',
    feature3Title: 'Any Device',
    feature3Desc: 'Works perfectly on desktop computers, tablets, and mobile phones. No software installation needed.',
    usageTitle: 'Perfect For Every Project',
    fashion: 'Fashion & Apparel',
    fashionDesc: 'E-commerce product photos',
    food: 'Food & Restaurants',
    foodDesc: 'Beautiful menu items',
    portrait: 'Portraits & Selfies',
    portraitDesc: 'Profile pictures & headshots',
    realEstate: 'Real Estate',
    realEstateDesc: 'Property listings & interiors',
    originalImage: 'Original',
    result: 'Result',
    processing: 'Processing...',
    chooseBackground: 'Background Color',
    download: 'Download Image',
    newImage: 'Upload New',
    tips: 'Pro Tips',
    tip1: 'Use high-resolution images for best results',
    tip2: 'Ensure good contrast between subject and background',
    tip3: 'Try different background colors to match your project',
    zoom: 'Zoom',
    dragPan: 'Drag to pan • Scroll to zoom',
    bgTransparent: 'Transparent',
    bgWhite: 'White',
    bgBlack: 'Black',
    bgCream: 'Cream',
    bgPink: 'Pink',
    bgLavender: 'Lavender',
    bgSky: 'Sky',
    bgMint: 'Mint',
    bgCoral: 'Coral',
    bgGold: 'Gold',
    bgPurple: 'Purple',
    footer: 'Powered by Remove.bg',
    success: 'Background removed successfully!',
    downloaded: 'Image downloaded!',
    errorType: 'Only JPG and PNG are supported',
    errorSize: 'File size must be under 10MB',
    errorFailed: 'Failed to process',
    errorProcess: 'Failed to process image',
    login: 'Sign In',
    logout: 'Logout',
    welcome: 'Welcome',
    loginSuccess: 'Login successful!',
    loginError: 'Login failed',
  },
  zh: {
    title: '背景消除器',
    subtitle: 'AI 智能去除图片背景',
    heroTitle: '图片背景消除器',
    heroSubtitle: 'AI 智能去除图片背景',
    dropHere: '拖放图片到此处',
    orBrowse: '或点击从电脑浏览',
    supports: 'JPG、PNG • 最大 10MB',
    feature1Title: '闪电般快速',
    feature1Desc: '使用我们先进的 AI 技术在几秒钟内处理您的图片。',
    feature2Title: '8种背景颜色',
    feature2Desc: '可选择透明、白色、黑色、奶油色、粉红色、薰衣草色、天蓝色或薄荷绿背景。',
    feature3Title: '任何设备',
    feature3Desc: '在台式电脑、平板电脑和手机上都能完美运行。无需安装软件。',
    usageTitle: '适合每一个项目',
    fashion: '时尚服装',
    fashionDesc: '电商产品照片',
    food: '美食餐饮',
    foodDesc: '精美的菜单项目',
    portrait: '人像自拍',
    portraitDesc: '个人资料照片和头像',
    realEstate: '房地产',
    realEstateDesc: '房产列表和室内设计',
    originalImage: '原图',
    result: '结果',
    processing: '处理中...',
    chooseBackground: '背景颜色',
    download: '下载图片',
    newImage: '上传新图',
    tips: '使用技巧',
    tip1: '使用高分辨率图片以获得最佳效果',
    tip2: '确保主体和背景之间有良好的对比度',
    tip3: '尝试不同的背景颜色以匹配您的项目',
    zoom: '缩放',
    dragPan: '拖动平移 • 滚动缩放',
    bgTransparent: '透明',
    bgWhite: '白色',
    bgBlack: '黑色',
    bgCream: '米色',
    bgPink: '粉色',
    bgLavender: '薰衣草',
    bgSky: '天蓝',
    bgMint: '薄荷绿',
    bgCoral: '珊瑚',
    bgGold: '金色',
    bgPurple: '紫色',
    footer: '由 Remove.bg 提供支持',
    success: '背景已成功消除！',
    downloaded: '图片已下载！',
    errorType: '仅支持 JPG 和 PNG 格式',
    errorSize: '文件大小必须小于 10MB',
    errorFailed: '处理失败',
    errorProcess: '图片处理失败',
    login: '登录',
    logout: '退出登录',
    welcome: '欢迎',
    loginSuccess: '登录成功！',
    loginError: '登录失败',
  }
};

const GOOGLE_CLIENT_ID = '300047558352-79f5fjc6vtdoljont9ukuvdme2g4e65h.apps.googleusercontent.com';
const API_BASE_URL = 'https://api.imagetoolbox.online';

// Helper: Convert data URL to File object
function dataURLtoFile(dataURL: string, filename: string = 'image.png'): File {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// Process image via worker API (handles auth + quota deduction)
const processImageViaApi = async (file: File, sessionToken: string): Promise<{ result: string; quotaType: string; remaining: number }> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('format', 'png');

  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: formData,
  });

  const data: { error?: string; success?: boolean; result?: string; quota_type?: string; remaining?: number } = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('NOT_AUTHENTICATED');
    }
    if (response.status === 402) {
      throw new Error('INSUFFICIENT_QUOTA');
    }
    throw new Error(data.error || 'Processing failed');
  }

  return {
    result: data.result as string,
    quotaType: data.quota_type as string,
    remaining: data.remaining as number,
  };
};

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: { theme: string; size: string; text: string; width: number }) => void;
        };
      };
    };
  }
}

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const githubLinkRef = useRef<HTMLAnchorElement>(null);
  const t = translations[lang];

  // Initialize Google Identity Services
  useEffect(() => {
    // Function to initialize Google - use setTimeout to ensure script is loaded
    let initialized = false;
    
    function initializeGoogle() {
      if (initialized) return true;
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
        initialized = true;
        return true;
      }
      return false;
    }

    // Wait for Google script to load, then initialize
    const timer = setInterval(() => {
      if (initializeGoogle()) {
        clearInterval(timer);
      }
    }, 50);
    
    // Check for existing session
    const savedToken = localStorage.getItem('sessionToken');
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    const savedPicture = localStorage.getItem('userPicture');
    
    if (savedToken && savedName) {
      // Restore user from localStorage for immediate display
      setUser({
        id: 'restored',
        email: savedEmail || '',
        name: savedName,
        picture: savedPicture || '',
      });
      setSessionToken(savedToken);
      
      // Then verify with server in background
      verifySession(savedToken);
    }
    
    // Listen for GitHub OAuth callback from popup
    const handleGitHubMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GITHUB_SESSION' && event.data?.token) {
        verifyGitHubSession(event.data.token);
      }
    };
    window.addEventListener('message', handleGitHubMessage);
    
    // Check for GitHub OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const githubSuccess = urlParams.get('github_success');
    const githubToken = urlParams.get('token');
    
    if (githubSuccess === 'true' && githubToken) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Check if opened from parent tab (GitHub OAuth popup)
      if (window.opener && !window.opener.closed) {
        // Send session to parent tab and close this popup
        window.opener.postMessage({ type: 'GITHUB_SESSION', token: githubToken }, window.location.origin);
        window.close();
        return;
      }
      
      // Verify and set the GitHub session (for direct access case)
      verifyGitHubSession(githubToken);
    }
    
    setMounted(true);
  }, []);

  // Render Google button when dialog opens
  useEffect(() => {
    if (showLoginDialog) {
      // Check if we have a valid session before rendering
      const savedToken = localStorage.getItem('sessionToken');
      if (!savedToken) {
        // No session, clear any cached user data
        setUser(null);
      }
      
      // Render Google button immediately if ready, or poll briefly
      function renderButton() {
        if (window.google && window.google.accounts && window.google.accounts.id && googleButtonRef.current) {
          googleButtonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'filled_black',
            size: 'large',
            text: 'signin_with',
            width: 300,
          });
          return true;
        }
        return false;
      }
      
      // Try immediately first
      if (!renderButton()) {
        // If not ready, try a few times with short delays
        let attempts = 0;
        const interval = setInterval(() => {
          if (renderButton() || attempts++ > 10) {
            clearInterval(interval);
          }
        }, 50);
        return () => clearInterval(interval);
      }
    }
  }, [showLoginDialog]);

  const handleCredentialResponse = async (response: { credential: string }) => {
    setIsLoggingIn(true);
    setShowLoginDialog(false);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      
      const data: { success?: boolean; user?: User; sessionToken?: string; error?: string } = await res.json();
      
      if (data.user) {
        // Save to localStorage immediately
        if (data.sessionToken) {
          localStorage.setItem('sessionToken', data.sessionToken);
        }
        localStorage.setItem('userName', data.user.name || '');
        localStorage.setItem('userEmail', data.user.email || '');
        localStorage.setItem('userPicture', data.user.picture || '');
        
        // Clear pending state
        setPendingImage(null);
        sessionStorage.removeItem('pendingImagePreview');
        sessionStorage.removeItem('pendingImageData');
        
        // Redirect immediately - don't wait for state updates
        window.location.replace('/');
      } else {
        toast.error('Login failed');
        setIsLoggingIn(false);
      }
    } catch {
      toast.error('Login failed');
      setIsLoggingIn(false);
    }
  };

  const verifySession = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: { success?: boolean; user?: User; sessionToken?: string; error?: string } = await res.json();
      if (data.user) {
        setUser(data.user);
        setSessionToken(token);
      } else {
        // Try to restore from localStorage as fallback
        const savedName = localStorage.getItem('userName');
        const savedEmail = localStorage.getItem('userEmail');
        const savedPicture = localStorage.getItem('userPicture');
        if (savedName) {
          setUser({
            id: '',
            name: savedName,
            email: savedEmail || '',
            picture: savedPicture || '',
          });
          setSessionToken(token);
        } else {
          localStorage.removeItem('sessionToken');
        }
      }
    } catch {
      // Try to restore from localStorage as fallback
      const savedName = localStorage.getItem('userName');
      const savedEmail = localStorage.getItem('userEmail');
      const savedPicture = localStorage.getItem('userPicture');
      if (savedName) {
        setUser({
          id: '',
          name: savedName,
          email: savedEmail || '',
          picture: savedPicture || '',
        });
        setSessionToken(token);
      } else {
        localStorage.removeItem('sessionToken');
      }
    }
  };

  // Verify GitHub session token
  const verifyGitHubSession = async (token: string) => {
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: { success?: boolean; user?: User; sessionToken?: string; error?: string } = await res.json();
      if (data.user) {
        // Save to localStorage immediately
        localStorage.setItem('sessionToken', token);
        localStorage.setItem('userName', data.user.name || '');
        localStorage.setItem('userEmail', data.user.email || '');
        localStorage.setItem('userPicture', data.user.picture || '');
        
        // Clear pending state
        setPendingImage(null);
        sessionStorage.removeItem('pendingImagePreview');
        sessionStorage.removeItem('pendingImageData');
        
        // Redirect immediately - don't wait for state updates
        window.location.replace('/');
      } else {
        toast.error('Login failed');
        setIsLoggingIn(false);
      }
    } catch {
      toast.error('Login failed');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    // Save token before clearing
    const currentToken = sessionToken;
    
    // Immediately clear ALL local storage and state
    setUser(null);
    setSessionToken(null);
    localStorage.clear();
    
    // Call API to invalidate session on server
    if (currentToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` },
        });
      } catch (e) {
        console.error('Logout API error:', e);
      }
    }
    
    toast.success(t.logout || 'Logged out');
    
    // Force reload to reset everything
    window.location.href = window.location.pathname;
  };

  const [imageState, setImageState] = useState<ImageState>({ original: null, result: null, isProcessing: false });
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<BackgroundColor>('transparent');
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estimated processing time (seconds)
  const ESTIMATED_TIME = 20;

  const processImage = async (file: File) => {
    // Check auth first
    const currentToken = sessionToken || localStorage.getItem('sessionToken');
    if (!currentToken) {
      setImageState((prev) => ({ ...prev, isProcessing: false }));
      toast.error(lang === 'en' ? 'Please sign in to process images' : '请先登录后再处理图片');
      setShowLoginDialog(true);
      return;
    }

    // Set processing state
    setImageState((prev) => ({ ...prev, isProcessing: true }));

    // Start processing timer
    setProcessingSeconds(0);
    processingTimerRef.current = setInterval(() => {
      setProcessingSeconds((prev) => prev + 1);
    }, 1000);
    
    try {
      const { result: resultUrl, quotaType, remaining } = await processImageViaApi(file, currentToken);
      setImageState((prev) => ({ ...prev, result: resultUrl, isProcessing: false }));
      toast.success(t.success);
      // Show remaining quota info
      const quotaLabel = quotaType === 'free' ? (lang === 'en' ? 'Free quota' : '免费额度') :
                         quotaType === 'subscription' ? (lang === 'en' ? 'Subscription' : '订阅额度') :
                         (lang === 'en' ? 'Points' : '积分');
      toast.success(`${quotaLabel}: ${remaining} ${lang === 'en' ? 'remaining' : '剩余'}`);
    } catch (error: any) { 
      const msg = error.message || '';
      if (msg === 'NOT_AUTHENTICATED') {
        toast.error(lang === 'en' ? 'Session expired, please sign in again' : '登录已过期，请重新登录');
        setShowLoginDialog(true);
      } else if (msg === 'INSUFFICIENT_QUOTA') {
        toast.error(lang === 'en' ? 'Insufficient quota! Please subscribe or purchase points.' : '额度不足！请订阅或购买积分。');
      } else {
        toast.error(t.errorFailed || '背景移除失败，请重试');
      }
      setImageState((prev) => ({ ...prev, isProcessing: false, result: null })); 
    } finally {
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      setProcessingSeconds(0);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) { toast.error(t.errorType); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t.errorSize); return; }
    
    const reader = new FileReader();
    reader.onload = (e) => { 
      const preview = e.target?.result as string;
      // Store pending image data in sessionStorage (for cross-context access)
      const pendingData = { preview, timestamp: Date.now() };
      try {
        sessionStorage.setItem('pendingImagePreview', preview);
        sessionStorage.setItem('pendingImageData', JSON.stringify(pendingData));
      } catch (e) {
        console.error('Failed to save pending image to sessionStorage:', e);
      }
      setPendingImage({ file, preview });
      // Show preview immediately
      setImageState({ original: preview, result: null, isProcessing: false });
      setZoom(1); 
      setPan({ x: 0, y: 0 }); 
      
      // Check if logged in and process immediately
      const currentToken = sessionToken || localStorage.getItem('sessionToken');
      if (currentToken) {
        processImage(file);
      } else {
        // Not logged in - show login dialog, don't process yet
        toast.error(lang === 'en' ? 'Please sign in to process images' : '请先登录后再处理图片');
        setShowLoginDialog(true);
      }
    };
    reader.readAsDataURL(file);
  }, [t, lang, sessionToken]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }, [handleFileSelect]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => { setIsDragging(false); }, []);
  const handleZoomIn = () => setZoom((p) => Math.min(p * 1.2, 5));
  const handleZoomOut = () => setZoom((p) => Math.max(p / 1.2, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const handleMouseDown = (e: React.MouseEvent) => { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); };
  const handleMouseUp = () => setIsPanning(false);
  const handleWheel = (e: React.WheelEvent) => { e.stopPropagation(); e.preventDefault(); setZoom((p) => e.deltaY < 0 ? Math.min(p * 1.1, 5) : Math.max(p / 1.1, 0.5)); };

  const handleDownload = () => {
    if (!imageState.result) return;
    let url = imageState.result;
    if (backgroundColor !== 'transparent') {
      const canvas = document.createElement('canvas');
      const img = new window.Image();
      img.onload = () => { canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext('2d'); if (ctx) { const colorMap: Record<string, string> = { white: '#ffffff', black: '#1a1a1a', cream: '#f5f5dc', pink: '#ffb6c1', lavender: '#e6e6fa', sky: '#87ceeb', mint: '#98fb98' }; ctx.fillStyle = colorMap[backgroundColor] || '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); url = canvas.toDataURL('image/png'); triggerDownload(url); } };
      img.src = imageState.result;
    } else { triggerDownload(url); }
  };
  const triggerDownload = (url: string) => { const a = document.createElement('a'); a.href = url; a.download = 'background-removed.png'; a.click(); toast.success(t.downloaded); };
  const handleResetAll = () => { setImageState({ original: null, result: null, isProcessing: false }); setZoom(1); setPan({ x: 0, y: 0 }); setBackgroundColor('transparent'); };

  const colorMap: Record<string, string> = { white: '#ffffff', black: '#1a1a1a', cream: '#f5f5dc', pink: '#ffb6c1', lavender: '#e6e6fa', sky: '#87ceeb', mint: '#98fb98' };

  if (!mounted) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="w-8 h-8 rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100">
      {/* Hidden link for GitHub OAuth */}
      <a ref={githubLinkRef} href={`${API_BASE_URL}/api/auth/github`} className="hidden" target="_blank" rel="noopener noreferrer">GitHub</a>
      {/* Google Identity Services Script */}
      <script src="https://accounts.google.com/gsi/client" async defer></script>

      {/* Header */}
      <header className="sticky top-0 z-[100] border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30">
              <Wand2 className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-foreground">Image Toolbox</span>
          </div>

          {/* Right: User actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <a
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 hover:from-orange-200 hover:to-amber-200 transition-all group"
                >
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-orange-700 group-hover:text-orange-800">
                    {user.name}
                  </span>
                </a>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 text-white shadow-lg shadow-orange-500/30 font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.logout}</span>
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  onClick={() => setShowLoginDialog(true)} 
                  size="sm" 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 text-white font-medium"
                >
                  {t.login}
                </Button>
                <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                  <DialogContent className="sm:max-w-[480px] bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 border border-orange-300 shadow-2xl rounded-2xl text-gray-900">
                    <DialogHeader className="text-center space-y-3 pb-4">
                      <DialogTitle className="text-2xl font-bold text-white">
                        {lang === 'en' ? 'Welcome' : '欢迎'}
                      </DialogTitle>
                      <DialogDescription className="text-orange-100 text-base">
                        {lang === 'en' ? 'Sign in to continue to Image Toolbox' : '登录以继续使用 Image Toolbox'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col gap-3 py-4">
                      {/* Hidden Google button container - rendered by Google Identity Services */}
                      <div ref={googleButtonRef} className="hidden"></div>
                      
                      {/* Google Login Button */}
                      <Button 
                        variant="outline"
                        className="w-full h-14 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium flex items-center justify-center gap-3 rounded-lg transition-all shadow-sm"
                        onClick={() => {
                          // Trigger the hidden native Google button
                          const nativeButton = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
                          if (nativeButton) {
                            nativeButton.click();
                          } else if (window.google && window.google.accounts && window.google.accounts.id) {
                            window.google.accounts.id.prompt();
                          }
                        }}
                      >
                        {/* Official Google Logo - Clear SVG */}
                        <svg width="24" height="24" viewBox="0 0 24 24" className="flex-shrink-0">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="text-base font-semibold">{lang === 'en' ? 'Continue with Google' : '使用 Google 登录'}</span>
                      </Button>
                      
                      {/* GitHub Login Button */}
                      <a 
                        href={`${API_BASE_URL}/api/auth/github`}
                        className="w-full h-14 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-3 rounded-lg transition-all shadow-sm no-underline"
                      >
                        {/* Official GitHub Mark Logo - Clear SVG */}
                        <svg width="24" height="24" viewBox="0 0 24 24" className="flex-shrink-0">
                          <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <span className="text-base font-semibold">{lang === 'en' ? 'Continue with GitHub' : '使用 GitHub 登录'}</span>
                      </a>
                    </div>
                    
                    <Separator className="bg-orange-300" />
                    
                    <p className="text-center text-sm text-orange-100">
                      {lang === 'en' ? "Don't have an account?" : '没有账号?'}{' '}
                      <Button variant="link" className="text-white hover:text-orange-100 p-0 h-auto font-semibold underline underline-offset-2">
                        {lang === 'en' ? 'Sign Up' : '注册'}
                      </Button>
                    </p>
                  </DialogContent>
                </Dialog>
              </>
            )}

            <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
              <SelectTrigger className="h-11 pl-4 pr-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 border-0 shadow-lg shadow-orange-500/40 hover:shadow-xl hover:shadow-orange-500/50 transition-all duration-200 gap-3">
                <span className="text-lg">🌐</span>
                <span className="text-white font-bold text-sm">{lang === 'en' ? 'EN' : '中文'}</span>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-0 min-w-[140px] overflow-hidden bg-background">
                <SelectItem value="en" className="py-3 px-4 hover:bg-orange-50 focus:bg-orange-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🇺🇸</span>
                    <span className="font-bold text-foreground text-base">English</span>
                  </div>
                </SelectItem>
                <SelectItem value="zh" className="py-3 px-4 hover:bg-orange-50 focus:bg-orange-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🇨🇳</span>
                    <span className="font-bold text-foreground text-base">中文</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-2">
        {!imageState.original ? (
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Hero */}
            <div className="text-center space-y-3 pt-3">
              <h2 className="text-5xl font-black tracking-tight leading-tight bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 bg-clip-text text-transparent">
                {t.heroTitle}
              </h2>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                {t.heroSubtitle}
              </p>
            </div>

            {/* Upload Card */}
            <Card className="overflow-hidden shadow-xl">
              <CardContent className="p-0">
                <div
                  className={`flex flex-col items-center justify-center py-12 cursor-pointer transition-all duration-300 ${isDragging ? 'bg-orange-50' : 'hover:bg-muted/20'}`}
                  style={{ border: '3px dashed #f97316' }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white mb-4 shadow-lg shadow-orange-500/40">
                    <Upload className="h-8 w-8" />
                  </div>
                  <p className="text-xl font-bold mb-2">{t.dropHere}</p>
                  <p className="text-base text-muted-foreground mb-3">{t.orBrowse}</p>
                  <Badge className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 hover:bg-orange-100 px-4 py-1 text-sm">{t.supports}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-0 shadow-md shadow-orange-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white text-xl shadow-lg shadow-orange-500/30">⚡</span> 
                    {t.feature1Title}
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-base text-muted-foreground">{t.feature1Desc}</p></CardContent>
              </Card>
              <Card className="border-0 shadow-md shadow-orange-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white text-xl shadow-lg shadow-orange-500/30">🎨</span> 
                    {t.feature2Title}
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-base text-muted-foreground">{t.feature2Desc}</p></CardContent>
              </Card>
              <Card className="border-0 shadow-md shadow-orange-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white text-xl shadow-lg shadow-orange-500/30">📱</span> 
                    {t.feature3Title}
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-base text-muted-foreground">{t.feature3Desc}</p></CardContent>
              </Card>
            </div>

            {/* Usage */}
            <Card className="border-0 shadow-md shadow-orange-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-center text-lg font-bold">{t.usageTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { icon: '👗', title: t.fashion, desc: t.fashionDesc },
                    { icon: '🍕', title: t.food, desc: t.foodDesc },
                    { icon: '👤', title: t.portrait, desc: t.portraitDesc },
                    { icon: '🏠', title: t.realEstate, desc: t.realEstateDesc },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center group">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 mb-3 shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                        <span className="text-3xl">{item.icon}</span>
                      </div>
                      <p className="text-base font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Image Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t.originalImage}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}>
                    <img src={imageState.original!} alt="Original" className="w-full h-full object-contain" style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transition: isPanning ? 'none' : 'transform 0.2s' }} draggable={false} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{imageState.isProcessing ? t.processing : t.result}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="relative aspect-square rounded-lg overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none', backgroundColor: backgroundColor === 'transparent' ? '#f8fafc' : colorMap[backgroundColor] }}>
                    {imageState.isProcessing ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 p-6">
                        {/* Countdown timer circle */}
                        <div className="relative w-20 h-20 mb-4">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            {/* Background circle */}
                            <path
                              className="text-orange-200"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            {/* Progress circle */}
                            <path
                              className="text-orange-500 transition-all duration-1000"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              fill="none"
                              strokeDasharray={`${Math.min(100, (processingSeconds / ESTIMATED_TIME) * 100)} 100`}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          {/* Countdown number */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold text-orange-600">
                              {Math.max(0, ESTIMATED_TIME - processingSeconds)}s
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{t.processing}</p>
                        <p className="text-xs text-gray-500">预计剩余 {Math.max(0, ESTIMATED_TIME - processingSeconds)} 秒</p>
                      </div>
                    ) : imageState.result ? (
                      <img src={imageState.result} alt="Result" className="w-full h-full object-contain" style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transition: isPanning ? 'none' : 'transform 0.2s' }} draggable={false} />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t.zoom}: {Math.round(zoom * 100)}%</span>
              <span>{t.dragPan}</span>
            </div>

            {/* Controls */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.chooseBackground}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Compact horizontal color picker */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Transparent option */}
                    <button
                      onClick={() => setBackgroundColor('transparent')}
                      className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all ${
                        backgroundColor === 'transparent' 
                          ? 'border-orange-500 ring-2 ring-orange-200 scale-110' 
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ background: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)', backgroundSize: '8px 8px, 8px 8px', backgroundPosition: '0 0, 4px 4px' }}
                      title={t.bgTransparent || 'Transparent'}
                    />
                    {/* Color options */}
                    {[
                      { value: 'white', bg: '#ffffff' },
                      { value: 'black', bg: '#1a1a1a' },
                      { value: 'cream', bg: '#f5f5dc' },
                      { value: 'pink', bg: '#ffb6c1' },
                      { value: 'lavender', bg: '#e6e6fa' },
                      { value: 'sky', bg: '#87ceeb' },
                      { value: 'mint', bg: '#98fb98' },
                      { value: 'coral', bg: '#ff7f50' },
                      { value: 'gold', bg: '#ffd700' },
                      { value: 'purple', bg: '#9370db' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setBackgroundColor(item.value as BackgroundColor)}
                        className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all hover:scale-105 ${
                          backgroundColor === item.value 
                            ? 'border-orange-500 ring-2 ring-orange-200 scale-110' 
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: item.bg }}
                        title={item.value}
                      />
                    ))}
                  </div>
                  {/* Selected color indicator */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <div 
                      className="w-6 h-6 rounded-full border shadow-sm"
                      style={{ 
                        backgroundColor: backgroundColor === 'transparent' ? '#f8fafc' : (backgroundColor === 'white' ? '#ffffff' : backgroundColor === 'black' ? '#1a1a1a' : backgroundColor === 'cream' ? '#f5f5dc' : backgroundColor === 'pink' ? '#ffb6c1' : backgroundColor === 'lavender' ? '#e6e6fa' : backgroundColor === 'sky' ? '#87ceeb' : backgroundColor === 'mint' ? '#98fb98' : backgroundColor === 'coral' ? '#ff7f50' : backgroundColor === 'gold' ? '#ffd700' : backgroundColor === 'purple' ? '#9370db' : '#f8fafc'),
                        background: backgroundColor === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' : undefined
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {t[`bg${backgroundColor.charAt(0).toUpperCase() + backgroundColor.slice(1)}` as keyof typeof t] || backgroundColor}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.tips}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>• {t.tip1}</p>
                  <p>• {t.tip2}</p>
                  <p>• {t.tip3}</p>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <Button onClick={handleDownload} disabled={!imageState.result} size="lg" className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 shadow-lg shadow-orange-500/30 font-bold">
                  <Download className="mr-2 h-5 w-5" />{t.download}
                </Button>
                <Button variant="outline" onClick={handleResetAll} size="lg" className="w-full h-14 text-lg border-2 hover:bg-orange-50 font-semibold">
                  <Upload className="mr-2 h-5 w-5" />{t.newImage}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-2 px-4">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            {t.footer} · <span className="text-orange-500">✨</span>
          </p>
        </div>
      </footer>

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
