'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Download, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast, Toaster } from 'sonner';

type BackgroundColor = 'transparent' | 'white' | 'blue';

interface ImageState {
  original: string | null;
  result: string | null;
  isProcessing: boolean;
}

export default function Home() {
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
  const originalImageRef = useRef<HTMLDivElement>(null);
  const resultImageRef = useRef<HTMLDivElement>(null);

  const processImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setImageState((prev) => ({
          ...prev,
          result: data.data.resultUrl,
          isProcessing: false,
        }));
        toast.success('Background removed successfully!');
      } else {
        setImageState((prev) => ({
          ...prev,
          isProcessing: false,
        }));
        toast.error(data.error || 'Failed to remove background');
      }
    } catch (error) {
      setImageState((prev) => ({
        ...prev,
        isProcessing: false,
      }));
      toast.error('Failed to process image');
    }
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Invalid file type. Only JPG and PNG are allowed.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const originalUrl = e.target?.result as string;
        setImageState({
          original: originalUrl,
          result: null,
          isProcessing: true,
        });
        setZoom(1);
        setPan({ x: 0, y: 0 });
        processImage(file);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev * 1.1, 5));
    } else {
      setZoom((prev) => Math.max(prev / 1.1, 0.5));
    }
  };

  const handleDownload = () => {
    if (!imageState.result) return;

    let downloadUrl = imageState.result;

    if (backgroundColor !== 'transparent') {
      const canvas = document.createElement('canvas');
      const img = new window.Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = backgroundColor === 'white' ? '#ffffff' : '#3b82f6';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          downloadUrl = canvas.toDataURL('image/png');
          triggerDownload(downloadUrl);
        }
      };
      img.src = imageState.result;
    } else {
      triggerDownload(downloadUrl);
    }
  };

  const triggerDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'background-removed.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded!');
  };

  const handleResetAll = () => {
    setImageState({ original: null, result: null, isProcessing: false });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setBackgroundColor('transparent');
  };

  const ImageViewer = ({
    src,
    label,
    isProcessing,
    bgColor,
  }: {
    src: string | null;
    label: string;
    isProcessing?: boolean;
    bgColor?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {!isProcessing && src && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div
          className="relative aspect-square rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            touchAction: 'none',
            backgroundColor: bgColor,
          }}
        >
          {isProcessing ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <Skeleton className="w-full h-full rounded-lg" />
              <p className="text-sm text-muted-foreground animate-pulse">Processing image...</p>
            </div>
          ) : src ? (
            <img
              src={src}
              alt={label}
              className="w-full h-full object-contain"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isPanning ? 'none' : 'transform 0.2s ease-out',
              }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center px-4">
          <h1 className="text-lg font-semibold">🎨 Image Background Remover</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        {!imageState.original ? (
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drop your image here</p>
            <p className="text-sm text-muted-foreground mb-2">or click to upload</p>
            <p className="text-xs text-muted-foreground">JPG/PNG only, max 10MB</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageViewer
                src={imageState.original}
                label="Original"
                bgColor="transparent"
              />
              <ImageViewer
                src={imageState.result}
                label={imageState.isProcessing ? 'Processing...' : 'Result'}
                isProcessing={imageState.isProcessing}
                bgColor={
                  backgroundColor === 'white'
                    ? '#ffffff'
                    : backgroundColor === 'blue'
                    ? '#3b82f6'
                    : 'transparent'
                }
              />
            </div>

            <Card>
              <CardContent className="p-4">
                <Label className="text-sm font-medium mb-3 block">Background Color</Label>
                <RadioGroup
                  value={backgroundColor}
                  onValueChange={(value) => setBackgroundColor(value as BackgroundColor)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transparent" id="transparent" />
                    <Label htmlFor="transparent" className="cursor-pointer">Transparent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="white" id="white" />
                    <Label htmlFor="white" className="cursor-pointer">White</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="blue" id="blue" />
                    <Label htmlFor="blue" className="cursor-pointer">Blue</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={handleDownload} disabled={!imageState.result}>
                <Download className="h-4 w-4 mr-2" />
                Download Image
              </Button>
              <Button size="lg" variant="outline" onClick={handleResetAll}>
                Upload New Image
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">📖 How it works</h3>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Upload your image</li>
                  <li>2. AI removes background automatically</li>
                  <li>3. Choose background color and download</li>
                </ol>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Powered by Remove.bg · Made with ❤️
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
