import React from "react";

export default function AnnotationSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton skeleton-avatar" />
        <div className="skeleton-meta">
          <div className="skeleton skeleton-name" />
          <div className="skeleton skeleton-handle" />
        </div>
      </div>

      <div className="skeleton-content">
        <div className="skeleton skeleton-source" />
        <div className="skeleton skeleton-highlight" />
        <div className="skeleton skeleton-text-1" />
        <div className="skeleton skeleton-text-2" />
      </div>

      <div className="skeleton-actions">
        <div className="skeleton skeleton-action" />
        <div className="skeleton skeleton-action" />
        <div className="skeleton skeleton-action" />
      </div>
    </div>
  );
}
