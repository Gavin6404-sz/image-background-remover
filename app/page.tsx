'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Download, ZoomIn, ZoomOut, RotateCcw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast, Toaster } from 'sonner';

type Language = 'en' | 'zh';
type BackgroundColor = 'transparent' | 'white' | 'black' | 'cream' | 'pink' | 'lavender' | 'sky' | 'mint';

interface ImageState {
  original: string | null;
  result: string | null;
  isProcessing: boolean;
}

const translations = {
  en: {
    title: 'Background Remover',
    subtitle: 'Remove image backgrounds with AI in seconds',
    heroTitle: 'Transform Your Images Instantly',
    heroSubtitle: 'Upload any image and let our AI-powered tool automatically remove the background. Perfect for product photos, portraits, and creative projects.',
    dropHere: 'Drop your image here',
    orBrowse: 'or click to browse from your computer',
    supports: 'Supports JPG, PNG • Maximum file size: 10MB',
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
    originalImage: 'Original Image',
    result: 'Result',
    processing: 'Processing...',
    chooseBackground: 'Choose Background Color',
    download: 'Download Image',
    newImage: 'New',
    tips: 'Pro Tips',
    tip1: 'Use high-resolution images for best results',
    tip2: 'Ensure good contrast between subject and background',
    tip3: 'Try different background colors to match your project',
    zoom: 'Zoom',
    dragPan: 'Drag to pan • Scroll to zoom',
    footer: 'Powered by Remove.bg • Create beautiful images in seconds',
    success: 'Background removed successfully!',
    downloaded: 'Image downloaded!',
    errorType: 'Only JPG and PNG are supported',
    errorSize: 'File size must be under 10MB',
    errorFailed: 'Failed to process',
    errorProcess: 'Failed to process image',
  },
  zh: {
    title: '背景消除器',
    subtitle: 'AI 智能去除图片背景',
    heroTitle: '瞬间转换您的图片',
    heroSubtitle: '上传任意图片，我们的人工智能工具将自动去除背景。非常适合产品照片、肖像照和创意项目。',
    dropHere: '拖放图片到此处',
    orBrowse: '或点击从电脑浏览',
    supports: '支持 JPG、PNG • 最大文件大小：10MB',
    feature1Title: '闪电般快速',
    feature1Desc: '使用我们先进的 AI 技术在几秒钟内处理您的图片。无需等待，无麻烦。',
    feature2Title: '8种背景颜色',
    feature2Desc: '可选择透明、白色、黑色、奶油色、粉红色、薰衣草色，天蓝色或薄荷绿背景。',
    feature3Title: '任何设备',
    feature3Desc: '在台式电脑，平板电脑和手机上都能完美运行。无需安装软件。',
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
    chooseBackground: '选择背景颜色',
    download: '下载图片',
    newImage: '新建',
    tips: '使用技巧',
    tip1: '使用高分辨率图片以获得最佳效果',
    tip2: '确保主体和背景之间有良好的对比度',
    tip3: '尝试不同的背景颜色以匹配您的项目',
    zoom: '缩放',
    dragPan: '拖动平移 • 滚动缩放',
    footer: '由 Remove.bg 提供支持 • 几秒钟创建精美图片',
    success: '背景已成功消除！',
    downloaded: '图片已下载！',
    errorType: '仅支持 JPG 和 PNG 格式',
    errorSize: '文件大小必须小于 10MB',
    errorFailed: '处理失败',
    errorProcess: '图片处理失败',
  }
};

// Direct API call to Remove.bg
const processWithRemoveBg = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', file);
  formData.append('size', 'auto');
  formData.append('format', 'png');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': 'ZVPuP9RmbPnUoGX6duU3wh9m',
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to remove background');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    setMounted(true);
  }, []);

  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    result: null,
    isProcessing: false,
  });
  const [backgroundColor, setBackgroundColor] = useState<BackgroundColor>('transparent');
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    try {
      const resultUrl = await processWithRemoveBg(file);
      setImageState((prev) => ({ ...prev, result: resultUrl, isProcessing: false }));
      toast.success(t.success);
    } catch (error) {
      console.error('Remove bg error:', error);
      setImageState((prev) => ({ ...prev, isProcessing: false }));
      toast.error(t.errorFailed);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) { toast.error(t.errorType); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(t.errorSize); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageState({ original: e.target?.result as string, result: null, isProcessing: true });
      setZoom(1); setPan({ x: 0, y: 0 });
      processImage(file);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }, [handleFileSelect]);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => { setIsDragging(false); }, []);
  const handleZoomIn = () => setZoom((p) => Math.min(p * 1.2, 5));
  const handleZoomOut = () => setZoom((p) => Math.max(p / 1.2, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const handleMouseDown = (e: React.MouseEvent) => { setIsPanning(true); setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); };
  const handleMouseUp = () => setIsPanning(false);
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom((p) => e.deltaY < 0 ? Math.min(p * 1.1, 5) : Math.max(p / 1.1, 0.5)); };

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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-stone-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">{t.title}</h1>
              <p className="text-sm text-slate-500">{t.subtitle}</p>
            </div>
          </div>
          {/* Language Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${lang === 'en' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('zh')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${lang === 'zh' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              中文
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!imageState.original ? (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center py-8">
              <h2 className="text-4xl font-bold text-slate-800 mb-4">{t.heroTitle}</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">{t.heroSubtitle}</p>
            </div>

            {/* Upload Area */}
            <div
              className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer max-w-2xl mx-auto w-full ${isDragging ? 'border-amber-400 bg-amber-50' : 'border-slate-300 hover:border-amber-400'} p-16 text-center bg-white shadow-xl`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-6 shadow-xl">
                <Upload className="h-10 w-10 text-white" />
              </div>
              <p className="text-xl font-semibold text-slate-800 mb-2">{t.dropHere}</p>
              <p className="text-base text-slate-500 mb-4">{t.orBrowse}</p>
              <span className="text-sm text-slate-400 bg-slate-100 px-5 py-2 rounded-full">{t.supports}</span>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t.feature1Title}</h3>
                <p className="text-slate-600 text-sm">{t.feature1Desc}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t.feature2Title}</h3>
                <p className="text-slate-600 text-sm">{t.feature2Desc}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t.feature3Title}</h3>
                <p className="text-slate-600 text-sm">{t.feature3Desc}</p>
              </div>
            </div>

            {/* Usage Examples */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">{t.usageTitle}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">👗</span>
                  </div>
                  <p className="font-medium text-slate-700">{t.fashion}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.fashionDesc}</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🍕</span>
                  </div>
                  <p className="font-medium text-slate-700">{t.food}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.foodDesc}</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">👤</span>
                  </div>
                  <p className="font-medium text-slate-700">{t.portrait}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.portraitDesc}</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🏠</span>
                  </div>
                  <p className="font-medium text-slate-700">{t.realEstate}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.realEstateDesc}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Images */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Original */}
                  <Card className="bg-white shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
                      <span className="text-sm font-semibold text-white">{t.originalImage}</span>
                    </div>
                    <CardContent className="p-3">
                      <div className="relative rounded-lg overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing aspect-square" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} style={{ touchAction: 'none' }}>
                        <img src={imageState.original!} alt="Original" className="w-full h-full object-contain" style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transition: isPanning ? 'none' : 'transform 0.2s' }} draggable={false} />
                      </div>
                    </CardContent>
                  </Card>
                  {/* Result */}
                  <Card className="bg-white shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{imageState.isProcessing ? t.processing : t.result}</span>
                      {!imageState.isProcessing && imageState.result && (
                        <div className="flex gap-1">
                          <button onClick={handleZoomOut} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"><ZoomOut className="h-4 w-4 text-white" /></button>
                          <button onClick={handleZoomIn} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"><ZoomIn className="h-4 w-4 text-white" /></button>
                          <button onClick={handleReset} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"><RotateCcw className="h-4 w-4 text-white" /></button>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing aspect-square" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} style={{ touchAction: 'none', backgroundColor: backgroundColor === 'transparent' ? '#f8fafc' : colorMap[backgroundColor] }}>
                        {imageState.isProcessing ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/95 z-10">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 animate-pulse mb-3" />
                            <p className="text-sm font-medium text-slate-600">{t.processing}</p>
                          </div>
                        ) : imageState.result ? (
                          <img src={imageState.result} alt="Result" className="w-full h-full object-contain" style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transition: isPanning ? 'none' : 'transform 0.2s' }} draggable={false} />
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500 px-1">
                  <span>{t.zoom}: {Math.round(zoom * 100)}%</span>
                  <span>{t.dragPan}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Background Selector */}
                <Card className="bg-white shadow-xl border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
                    <span className="text-sm font-semibold text-white">{t.chooseBackground}</span>
                  </div>
                  <CardContent className="p-4">
                    <RadioGroup value={backgroundColor} onValueChange={(v) => setBackgroundColor(v as BackgroundColor)} className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'transparent', label: 'None', bg: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)' },
                        { value: 'white', label: 'White', bg: '#ffffff' },
                        { value: 'black', label: 'Black', bg: '#1a1a1a' },
                        { value: 'cream', label: 'Cream', bg: '#f5f5dc' },
                        { value: 'pink', label: 'Pink', bg: '#ffb6c1' },
                        { value: 'lavender', label: 'Lavender', bg: '#e6e6fa' },
                        { value: 'sky', label: 'Sky', bg: '#87ceeb' },
                        { value: 'mint', label: 'Mint', bg: '#98fb98' },
                      ].map((item) => (
                        <div key={item.value}>
                          <RadioGroupItem value={item.value} id={item.value} className="sr-only" />
                          <Label htmlFor={item.value} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-pointer border-2 transition-all ${backgroundColor === item.value ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="w-10 h-10 rounded-full border border-slate-300 shadow-sm" style={{ background: item.bg, backgroundSize: item.value === 'transparent' ? '10px 10px' : 'auto', backgroundPosition: item.value === 'transparent' ? '0 0, 5px 5px' : '0 0' }} />
                            <span className="text-xs font-medium text-slate-600">{item.label}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={handleDownload} disabled={!imageState.result} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-5 rounded-xl border-0 shadow-lg shadow-amber-500/20 text-base">
                    <Download className="h-5 w-5 mr-2" />{t.download}
                  </Button>
                  <Button variant="outline" onClick={handleResetAll} className="bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-5 rounded-xl text-base px-6">
                    <Upload className="h-5 w-5 mr-2" />{t.newImage}
                  </Button>
                </div>

                {/* Tips */}
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-bold text-amber-800 mb-2">💡 {t.tips}</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• {t.tip1}</li>
                      <li>• {t.tip2}</li>
                      <li>• {t.tip3}</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-300 text-sm">{t.footer}</p>
        </div>
      </footer>

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
