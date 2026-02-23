import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * SeoTextBlock — Collapsible SEO HTML text block.
 *
 * Props:
 *  html        — raw HTML string to render
 *  className   — extra CSS classes for the container
 *  maxLines    — number of visible lines when collapsed (default 4)
 *  prose       — if true, applies prose-invert styling
 */
export default function SeoTextBlock({ html, className = '', maxLines = 4, prose = false }) {
    const [expanded, setExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef(null);

    // Reset expansion state when html changes
    useEffect(() => {
        setExpanded(false);
    }, [html]);

    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const checkOverflow = () => {
            // Only measure overflow when the block is collapsed
            if (!expanded && contentRef.current) {
                const el = contentRef.current;
                // Add a small 2px tolerance for subpixel rendering variations
                const overflowing = el.scrollHeight > el.clientHeight + 2;
                setIsOverflowing(overflowing);
            }
        };

        checkOverflow();

        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [html, expanded, maxLines]);

    if (!html) return null;

    // Use inline style for line-clamp so dynamic value always works
    // (dynamic Tailwind classes like `line-clamp-${n}` are stripped by PurgeCSS)
    const clampStyle = !expanded
        ? {
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
        }
        : {};

    return (
        <div className={`seo-text-block ${className}`}>
            {/* Content */}
            <div
                ref={contentRef}
                className={[
                    prose ? 'prose prose-invert max-w-none' : '',
                    'seo-page-content text-sm text-text-secondary leading-relaxed',
                ].filter(Boolean).join(' ')}
                style={clampStyle}
                dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Read more / Collapse button */}
            {(isOverflowing || expanded) && (
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-2 flex items-center gap-1 text-xs text-accent-yellow hover:text-yellow-300 transition-colors font-medium"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Згорнути
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Читати далі
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
