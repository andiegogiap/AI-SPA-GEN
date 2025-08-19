import React from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown }) => {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-[5px] h-full bg-white/10 hover:bg-primary/50 transition-colors duration-200 ease-in-out cursor-col-resize flex-shrink-0"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
    />
  );
};

export default ResizeHandle;