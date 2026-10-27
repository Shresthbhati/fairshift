import type { IconType } from 'react-icons';
import { FiAlertTriangle, FiCheck, FiCheckCircle, FiClock, FiMessageCircle, FiRefreshCw, FiSearch, FiSend, FiSlash, FiThumbsUp, FiTool, FiXCircle } from 'react-icons/fi';

export type StatusMeta = { key: string; color: string; icon: IconType };

// Status is always icon + text + colour, never colour alone.
export const INCIDENT_STATUS: Record<string, StatusMeta> = {
  submitted: { key: 'common.status.incident.submitted', color: 'info', icon: FiSend },
  acknowledged: { key: 'common.status.incident.acknowledged', color: 'info', icon: FiCheck },
  investigating: { key: 'common.status.incident.investigating', color: 'warning', icon: FiSearch },
  action_taken: { key: 'common.status.incident.action_taken', color: 'warning', icon: FiTool },
  resolved: { key: 'common.status.incident.resolved', color: 'success', icon: FiCheckCircle },
  closed_no_action: { key: 'common.status.incident.closed_no_action', color: 'ink.700', icon: FiSlash },
  reopened: { key: 'common.status.incident.reopened', color: 'warning', icon: FiRefreshCw },
  escalated: { key: 'common.status.incident.escalated', color: 'danger', icon: FiAlertTriangle },
};

export const DISPUTE_STATUS: Record<string, StatusMeta> = {
  submitted: { key: 'common.status.dispute.submitted', color: 'info', icon: FiSend },
  acknowledged: { key: 'common.status.dispute.acknowledged', color: 'info', icon: FiCheck },
  responded: { key: 'common.status.dispute.responded', color: 'warning', icon: FiMessageCircle },
  accepted_by_worker: { key: 'common.status.dispute.accepted_by_worker', color: 'success', icon: FiThumbsUp },
  challenged: { key: 'common.status.dispute.challenged', color: 'warning', icon: FiClock },
  escalated: { key: 'common.status.dispute.escalated', color: 'danger', icon: FiAlertTriangle },
  withdrawn: { key: 'common.status.dispute.withdrawn', color: 'ink.700', icon: FiXCircle },
  resolved: { key: 'common.status.dispute.resolved', color: 'success', icon: FiCheckCircle },
};

export const STATUS_META = { incident: INCIDENT_STATUS, dispute: DISPUTE_STATUS } as const;
