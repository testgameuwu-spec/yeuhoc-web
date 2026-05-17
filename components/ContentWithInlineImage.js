'use client';

import Image from 'next/image';
import MathRenderer from './MathRenderer';

const IMAGE_MARKER_CAPTURE_REGEX = /\(\(\s*(\d+)\s*\)\)/g;

export function getRenderableImageSrc(src) {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed || trimmed.toLowerCase() === 'không') return null;
  return trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : null;
}

export function hasInlineImageMarker(text) {
  return /\(\(\s*\d+\s*\)\)/.test(text || '');
}

export function getInlineImageMarkerIds(text) {
  const ids = [];
  const seen = new Set();
  const regex = new RegExp(IMAGE_MARKER_CAPTURE_REGEX);
  let match;

  while ((match = regex.exec(text || '')) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return ids;
}

export function parseImageMap(image) {
  if (!image) return {};

  if (Array.isArray(image)) {
    return image.reduce((map, value, index) => {
      if (value) map[String(index + 1)] = value;
      return map;
    }, {});
  }

  if (typeof image === 'object') {
    return Object.entries(image).reduce((map, [key, value]) => {
      if (value) map[String(key)] = value;
      return map;
    }, {});
  }

  if (typeof image !== 'string') return {};

  const trimmed = image.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return parseImageMap(JSON.parse(trimmed));
    } catch {
      return {};
    }
  }

  const src = getRenderableImageSrc(trimmed);
  return src ? { default: src } : {};
}

export function getImageForMarker(image, markerId) {
  const imageMap = parseImageMap(image);
  return getRenderableImageSrc(imageMap[String(markerId)] || imageMap.default || Object.values(imageMap)[0]);
}

export default function ContentWithInlineImage({
  text,
  image,
  alt = '',
  className = '',
  imageWrapperClassName = 'mt-3',
  imageClassName = 'rounded-xl max-h-[300px] w-auto max-w-full object-contain',
  imageButtonClassName = '',
  imageButtonStyle = null,
  width = 900,
  height = 500,
  sizes = '(max-width: 1024px) 100vw, 50vw',
  preload = false,
  onImageClick = null,
}) {
  const imageMap = parseImageMap(image);
  const fallbackImageSrc = getRenderableImageSrc(imageMap.default || Object.values(imageMap)[0]);
  const content = text || '';

  const renderImage = (key, src) => {
    const imageSrc = getRenderableImageSrc(src);
    if (!imageSrc) return null;

    const imageElement = (
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        preload={preload}
        className={imageClassName}
      />
    );

    if (onImageClick) {
      return (
        <div key={key} className={imageWrapperClassName}>
          <button type="button" onClick={() => onImageClick(imageSrc)} className={imageButtonClassName} style={imageButtonStyle}>
            {imageElement}
          </button>
        </div>
      );
    }

    return (
      <div key={key} className={imageWrapperClassName}>
        {imageElement}
      </div>
    );
  };

  if (hasInlineImageMarker(content)) {
    const parts = [];
    let lastIndex = 0;
    const regex = new RegExp(IMAGE_MARKER_CAPTURE_REGEX);
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'image', value: match[1], marker: match[0] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.slice(lastIndex) });
    }

    return (
      <div className={className}>
        {parts.map((part, index) => {
          if (part.type === 'image') {
            return renderImage(`image-${part.value}-${index}`, imageMap[part.value] || imageMap.default)
              || <MathRenderer key={`marker-${part.value}-${index}`} text={part.marker} />;
          }

          return <MathRenderer key={`text-${index}`} text={part.value} />;
        })}
      </div>
    );
  }

  return (
    <div className={className}>
      <MathRenderer text={content} />
      {renderImage('image-fallback', fallbackImageSrc)}
    </div>
  );
}
