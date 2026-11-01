/**
 * Nova design system - FileDropzone component.
 * Provides drag-and-drop file selection area.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

function FileDropzone({
  onFiles,
  accept,
  disabled,
  children,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      data-slot="file-dropzone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        disabled
          ? "border-muted/50 bg-muted/50 opacity-50"
          : isDragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary"
      )}
    >
      <input
        type="file"
        accept={accept}
        multiple
        onChange={handleInputChange}
        className="sr-only"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>("input[type=file]");
          input?.click();
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 text-sm",
          disabled ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {children || (
          <>
            <p>Click to upload or drag and drop</p>
            {accept && <p className="text-xs text-muted-foreground mt-2">Accept: {accept}</p>}
          </>
        )}
      </button>
    </div>
  );
}

export { FileDropzone };
