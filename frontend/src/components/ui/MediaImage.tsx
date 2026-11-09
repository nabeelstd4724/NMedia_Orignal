'use client';

import Image from 'next/image';
import { useState } from 'react';

type MediaImageProps = {
  src?: string;
  alt: string;
  title: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
};

export function MediaImage({ src, alt, title, className = '', sizes = '100vw', priority = false, fill = false, width, height }: MediaImageProps) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  const fallback = <span className={`media-fallback ${className}`} role="img" aria-label={`${title} artwork unavailable`}><span className="media-fallback-icon" aria-hidden="true">✦</span><span>{title}</span></span>;
  if (failed) return fallback;
  return <span className={`media-frame ${loaded ? 'is-loaded' : ''} ${className}`}>
    <Image src={src} alt={alt} title="" fill={fill} width={fill ? undefined : width} height={fill ? undefined : height} sizes={sizes} priority={priority} unoptimized onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    {!loaded && <span className="media-skeleton" aria-hidden="true" />}
  </span>;
}
