import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { useState, useRef } from 'react';

export function InteractiveMap() {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.25, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      const container = containerRef.current;
      if (container) {
        const maxX = (container.offsetWidth * (zoom - 1)) / 2;
        const maxY = (container.offsetHeight * (zoom - 1)) / 2;

        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <Card className="overflow-hidden gradient-card shadow-strong border-0 backdrop-blur-sm">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Station Map
            </h3>
            <p className="text-sm text-muted-foreground">Revi station locations</p>
          </div>
          <div className="px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
            <span className="text-xs font-medium text-primary">Live View</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="h-96 w-full overflow-hidden select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          <img
            src="../demo-dashboard/usc-campus-map.png"
            alt="USC Campus Map with waste management stations"
            className="w-full h-full object-cover transition-transform duration-300"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transformOrigin: 'center center'
            }}
            draggable={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-card/20 via-transparent to-transparent pointer-events-none"></div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="h-10 w-10 rounded-lg bg-card/90 backdrop-blur-sm shadow-md border border-border/50 hover:bg-card"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="h-10 w-10 rounded-lg bg-card/90 backdrop-blur-sm shadow-md border border-border/50 hover:bg-card"
          >
            <Minus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
