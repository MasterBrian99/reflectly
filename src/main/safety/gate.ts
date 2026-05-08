import type { SafetyDecision, SafetyRiskMarker, SafetyRiskSeverity, SafetyRiskType } from './types'

const severityPriority: Partial<Record<SafetyRiskSeverity, number>> = {
  critical: 0,
  high: 1
}

const typePriority: Record<SafetyRiskType, number> = {
  suicidal_ideation: 2,
  self_harm: 3,
  harm_to_others: 4,
  abuse: 5,
  acute_distress: 6,
  other: 7
}

function getMarkerPriority(marker: SafetyRiskMarker): number {
  return severityPriority[marker.severity] ?? typePriority[marker.type]
}

export function selectHighestPriorityRiskMarker(
  markers: SafetyRiskMarker[]
): SafetyRiskMarker | null {
  return markers.reduce<SafetyRiskMarker | null>((selectedMarker, marker) => {
    if (!selectedMarker) {
      return marker
    }

    return getMarkerPriority(marker) < getMarkerPriority(selectedMarker) ? marker : selectedMarker
  }, null)
}

export function evaluateSafetyGate(markers: SafetyRiskMarker[]): SafetyDecision {
  const marker = selectHighestPriorityRiskMarker(markers)

  if (!marker) {
    return {
      action: 'proceed',
      marker: null
    }
  }

  if (
    marker.severity === 'critical' ||
    marker.severity === 'high' ||
    marker.type === 'suicidal_ideation' ||
    marker.type === 'self_harm' ||
    marker.type === 'harm_to_others'
  ) {
    return {
      action: 'crisis_interrupt',
      marker
    }
  }

  if (
    marker.severity === 'medium' &&
    (marker.type === 'acute_distress' || marker.type === 'abuse')
  ) {
    return {
      action: 'supportive_notice',
      marker
    }
  }

  return {
    action: 'proceed',
    marker
  }
}
