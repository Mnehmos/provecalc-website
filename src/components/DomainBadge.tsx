/**
 * DomainBadge - Displays the physical domain classification for a unit
 *
 * Shows a subtle badge with the domain icon and label (e.g., "⚙️ Mechanics")
 * Can be clicked to show more details or filter by domain.
 */

import type { PhysicalDomain } from '../types/document';

interface DomainBadgeProps {
  domain: PhysicalDomain;
  size?: 'small' | 'medium';
  showLabel?: boolean;
  showTooltip?: boolean;
  onClick?: () => void;
}

export function DomainBadge({
  domain,
  size = 'small',
  showLabel = false,
  showTooltip = true,
  onClick,
}: DomainBadgeProps) {
  const tooltipText = showTooltip
    ? `${domain.label}: ${domain.quantity.replace(/_/g, ' ')}`
    : undefined;

  // Handle keyboard activation for accessibility
  const handleKeyDown = onClick
    ? (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          // Prevent scrolling on Space key
          if (event.key === ' ') {
            event.preventDefault();
          }
          onClick();
        }
      }
    : undefined;

  return (
    <span
      className={`domain-badge domain-badge-${size} domain-${domain.domain}`}
      style={{ '--domain-color': domain.color } as React.CSSProperties}
      title={tooltipText}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="domain-icon">{domain.icon}</span>
      {showLabel && <span className="domain-label">{domain.label}</span>}
    </span>
  );
}

/**
 * Default domain info for when classification fails or is unavailable
 */
export const DEFAULT_DOMAIN: PhysicalDomain = {
  domain: 'unknown',
  quantity: 'unknown',
  icon: '?',
  label: 'Unknown',
  color: '#9ca3af',
};

/**
 * Static domain metadata for client-side display without server call
 * NOTE: Keep in sync with sidecar/src/units.py::DOMAIN_INFO
 */
export const DOMAIN_METADATA: Record<string, Omit<PhysicalDomain, 'quantity'>> = {
  mechanics: { domain: 'mechanics', icon: '⚙️', label: 'Mechanics', color: '#3b82f6' },
  thermodynamics: { domain: 'thermodynamics', icon: '🔥', label: 'Thermo', color: '#ef4444' },
  electrical: { domain: 'electrical', icon: '⚡', label: 'Electrical', color: '#eab308' },
  magnetism: { domain: 'magnetism', icon: '🧲', label: 'Magnetism', color: '#8b5cf6' },
  chemistry: { domain: 'chemistry', icon: '🧪', label: 'Chemistry', color: '#22c55e' },
  optics: { domain: 'optics', icon: '💡', label: 'Optics', color: '#f97316' },
  dimensionless: { domain: 'dimensionless', icon: '∅', label: 'Ratio', color: '#6b7280' },
  unknown: { domain: 'unknown', icon: '?', label: 'Unknown', color: '#9ca3af' },
};
