import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, PenLine, Download } from 'lucide-react';

/* ── Reusable draw-your-signature modal ──────────────────────────────────── */
export const SignatureModal = ({ open, onClose, onConfirm, loading, title = 'Draw Signature', signerLabel = 'PBPA Inspector' }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef(null);

  useEffect(() => { if (open) clear(); }, [open]); // eslint-disable-line

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;
    const onTouchStart = (e) => { e.preventDefault(); lastPos.current = getPos(e, canvas); setDrawing(true); };
    const onTouchMove  = (e) => {
      e.preventDefault();
      if (!lastPos.current) return;
      const ctx = canvas.getContext('2d');
      const pos = getPos(e, canvas);
      ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      lastPos.current = pos; setIsEmpty(false);
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    return () => { canvas.removeEventListener('touchstart', onTouchStart); canvas.removeEventListener('touchmove', onTouchMove); };
  }, [open, drawing]); // eslint-disable-line

  const startDraw = useCallback((e) => {
    if (e.touches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e, canvas);
    setDrawing(true);
  }, []);

  const draw = useCallback((e) => {
    if (e.touches) return;
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
  }, [drawing]);

  const stopDraw = useCallback(() => setDrawing(false), []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const confirm = () => {
    if (isEmpty) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-[#8B1A1A]" />
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{signerLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Canvas */}
        <div className="px-6 py-4">
          <p className="text-xs text-gray-400 mb-2">Draw your signature in the box below:</p>
          <div className="relative border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl bg-gray-50 dark:bg-slate-700/30 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={460}
              height={180}
              className="w-full touch-none cursor-crosshair"
              style={{ display: 'block' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchEnd={stopDraw}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-300 dark:text-slate-500 text-sm font-medium select-none">Sign here</p>
              </div>
            )}
            {/* Baseline */}
            <div className="absolute bottom-8 left-6 right-6 border-b border-gray-300 dark:border-slate-600 pointer-events-none" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-5">
          <button onClick={clear} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={isEmpty || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#8B1A1A] hover:bg-[#7a1717] disabled:opacity-50 transition"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {loading ? 'Signing...' : 'Sign & Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
