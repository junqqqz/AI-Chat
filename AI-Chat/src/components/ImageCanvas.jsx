import React, { useRef, useEffect, useState } from'react';

const ImageCanvas = ({ imageUrl, alt = '生成的图片', className = '' }) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!imageUrl) return;
    
    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
      // 保持图片原始比例，同时适应容器大小
      const containerWidth = canvas.parentElement.clientWidth;
      const containerHeight = 300; // 默认高度
      
      const imgRatio = img.width / img.height;
      const containerRatio = containerWidth / containerHeight;
      
      let displayWidth, displayHeight;
      
      if (containerRatio > imgRatio) {
        // 容器更宽，以高度为基准
        displayHeight = containerHeight;
        displayWidth = displayHeight * imgRatio;
      } else {
        // 容器更高，以宽度为基准
        displayWidth = containerWidth;
        displayHeight = displayWidth / imgRatio;
      }
      
      // 设置canvas尺寸
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      
      // 绘制图片
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      setIsLoading(false);
    };
    
    img.onerror = (err) => {
      setError(err);
      setIsLoading(false);
    };
    
  }, [imageUrl]);

  if (error) {
    return <div className="text-red-500">图片加载失败</div>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center py-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} />
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        <i className="fa fa-image mr-1" aria-hidden="true"></i>AI生成图片
      </div>
    </div>
  );
};

export default ImageCanvas;  