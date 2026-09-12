"use client";

import { useEffect, useRef, useState } from "react";

export type FloatingPosition = { right: number; bottom: number };

function clampPosition(position: FloatingPosition, width: number, height: number): FloatingPosition {
  return {
    right: Math.max(8, Math.min(position.right, Math.max(8, width - 56))),
    bottom: Math.max(8, Math.min(position.bottom, Math.max(8, height - 44))),
  };
}

export function useFloatingPosition(storageKey: string, initial: FloatingPosition) {
  const [position, setPosition] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ pointerX: number; pointerY: number; position: FloatingPosition } | null>(null);
  const positionRef = useRef(position);
  const draggedRef = useRef(false);
  const storageKeyRef = useRef(storageKey);

  useEffect(() => {
    storageKeyRef.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    const load = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "null") as Partial<FloatingPosition> | null;
        if (saved && typeof saved.right === "number" && typeof saved.bottom === "number") {
          const next = clampPosition(saved as FloatingPosition, window.innerWidth, window.innerHeight);
          positionRef.current = next;
          setPosition(next);
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    };
    const loadTimer = window.setTimeout(load, 0);
    return () => window.clearTimeout(loadTimer);
  }, [storageKey]);

  useEffect(() => {
    const resize = () => setPosition((current) => {
      const next = clampPosition(current, window.innerWidth, window.innerHeight);
      positionRef.current = next;
      localStorage.setItem(storageKeyRef.current, JSON.stringify(next));
      return next;
    });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function onPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    start.current = { pointerX: event.clientX, pointerY: event.clientY, position };
    draggedRef.current = false;
    setDragging(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!start.current) return;
    const moved = Math.abs(event.clientX - start.current.pointerX) > 4 || Math.abs(event.clientY - start.current.pointerY) > 4;
    if (!moved) return;
    setDragging(true);
    draggedRef.current = true;
    const next = clampPosition({
      right: start.current.position.right - (event.clientX - start.current.pointerX),
      bottom: start.current.position.bottom - (event.clientY - start.current.pointerY),
    }, window.innerWidth, window.innerHeight);
    positionRef.current = next;
    setPosition(next);
  }

  function onPointerUp(event: React.PointerEvent) {
    if (!start.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (draggedRef.current) localStorage.setItem(storageKeyRef.current, JSON.stringify(positionRef.current));
    start.current = null;
    setDragging(false);
  }

  function consumeDragged() {
    const wasDragged = draggedRef.current;
    draggedRef.current = false;
    return wasDragged;
  }

  return { position, dragging, onPointerDown, onPointerMove, onPointerUp, consumeDragged };
}
