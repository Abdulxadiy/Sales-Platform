import React, { useId } from 'react';
import { loaderMarkup } from './ilbi/loader.js';
import './IlbiLoader.css';

export default function IlbiLoader({ size, label = 'Yuklanmoqda...', inline = false, decorative = false, className = '' }) {
  const id = `ilbi-loader-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <span
      className={`ilbi-loader${inline ? ' ilbi-loader--inline' : ''} ${className}`}
      style={size == null ? undefined : { '--ilbi-loader-size': typeof size === 'number' ? `${size}px` : size }}
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      // Only the trusted brand paths and a React-generated ID enter this markup.
      dangerouslySetInnerHTML={{ __html: loaderMarkup(id) }}
    />
  );
}
