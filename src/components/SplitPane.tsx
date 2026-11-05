// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useRef, useEffect } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Initial left-pane width percentage (0–100). Default 50. */
  defaultSplit?: number;
}

export default function SplitPane({ left, right, defaultSplit = 50 }: SplitPaneProps) {
  const [split, setSplit] = useState(defaultSplit);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
      {/* Left pane */}
      <div style={{ flex: split }} className="min-h-0 min-w-0 overflow-hidden">
        {left}
      </div>

      {/* Divider */}
      <div
        className="hidden w-1 cursor-col-resize bg-zinc-800 hover:bg-blue-600 transition-colors shrink-0 sm:block"
        onMouseDown={onMouseDown}
      />

      {/* Right pane */}
      <div style={{ flex: 100 - split }} className="min-h-0 min-w-0 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
