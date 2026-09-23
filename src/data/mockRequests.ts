import type { Approval, Request } from '@/types';
import { ago } from './time';

/**
 * Internal requests submitted across the workspace.
 * TODO(api): replaced by GET /api/requests (PostgreSQL table: requests).
 *
 * `updatedAt` is recalculated from the activity log when the mock store is
 * seeded, so it always matches the latest event in each request's timeline.
 */
export const mockRequests: Request[] = [
  {
    id: 'REQ-1042',
    title: 'Laptop replacement for design work',
    description:
      'My 2019 MacBook Pro struggles with large Figma files, and the battery has started to swell. IT flagged it as a safety issue during the last hardware check.\n\nRequesting a 16" MacBook Pro (M-series, 32 GB) so I can keep working on the website redesign without interruptions. Happy to hand back the old machine for recycling.',
    category: 'it_equipment',
    requesterId: 'usr_emma',
    assigneeId: 'usr_daniel',
    priority: 'high',
    status: 'in_review',
    createdAt: ago({ hours: 26 }),
    updatedAt: ago({ hours: 26 }),
  },
  {
    id: 'REQ-1041',
    title: 'Design review for the onboarding flow',
    description:
      'Engineering has a first build of the new in-app onboarding flow (five screens). We would like a design review before it ships to beta users next week — especially the empty states and the permissions step on mobile.',
    category: 'design',
    requesterId: 'usr_mike',
    assigneeId: 'usr_emma',
    priority: 'medium',
    status: 'in_progress',
    createdAt: ago({ days: 6, hours: 3 }),
    updatedAt: ago({ days: 6, hours: 3 }),
  },
  {
    id: 'REQ-1040',
    title: 'Standing desks for the second-floor studio',
    description:
      'Four team members asked for sit-stand desks during the ergonomic review. The second-floor studio has room for them once the move is done. The vendor estimate is in the People shared drive.',
    category: 'facilities',
    requesterId: 'usr_sofia',
    assigneeId: 'usr_alex',
    priority: 'low',
    status: 'new',
    createdAt: ago({ hours: 1, minutes: 30 }),
    updatedAt: ago({ hours: 1, minutes: 30 }),
  },
  {
    id: 'REQ-1039',
    title: 'Figma seat for a freelance illustrator',
    description:
      'We are bringing in a freelance illustrator for the website redesign from October 1 to November 15. They need an editor seat in our Figma organization with access to the Website and Brand projects only.',
    category: 'software_access',
    requesterId: 'usr_emma',
    assigneeId: 'usr_daniel',
    priority: 'medium',
    status: 'new',
    createdAt: ago({ hours: 30 }),
    updatedAt: ago({ hours: 30 }),
  },
  {
    id: 'REQ-1038',
    title: 'Q4 conference travel budget',
    description:
      'Requesting travel and registration budget for three people to attend OpsSummit in Austin (November 12–14): flights, two nights of accommodation and conference passes. Estimated total: $6,850.',
    category: 'finance',
    requesterId: 'usr_alex',
    assigneeId: 'usr_sarah',
    priority: 'medium',
    status: 'in_review',
    createdAt: ago({ days: 2, hours: 3 }),
    updatedAt: ago({ days: 2, hours: 3 }),
  },
  {
    id: 'REQ-1037',
    title: 'VPN access for the remote QA team',
    description:
      'Our two contract QA engineers in Lisbon need VPN access to the staging environment before the mobile beta starts. Access should be limited to staging and expire on December 31.',
    category: 'software_access',
    requesterId: 'usr_mike',
    assigneeId: 'usr_daniel',
    priority: 'high',
    status: 'in_progress',
    createdAt: ago({ days: 2, hours: 5 }),
    updatedAt: ago({ days: 2, hours: 5 }),
  },
  {
    id: 'REQ-1036',
    title: 'Onboarding kits for October hires',
    description:
      'Three new hires start on October 5 (two engineers and one designer). Each needs a laptop, monitor, headset and the standard welcome pack, ready on their desks by October 2.',
    category: 'it_equipment',
    requesterId: 'usr_sofia',
    assigneeId: 'usr_alex',
    priority: 'medium',
    status: 'in_progress',
    createdAt: ago({ days: 7, hours: 2 }),
    updatedAt: ago({ days: 7, hours: 2 }),
  },
  {
    id: 'REQ-1035',
    title: 'Replace the meeting room display in 2B',
    description:
      'The display in meeting room 2B has a dead strip of pixels down the left side and the HDMI input cuts out during calls. The warranty expired in March.\n\nI have sourced a 65" replacement for $1,180, including the wall mount and installation.',
    category: 'facilities',
    requesterId: 'usr_daniel',
    assigneeId: 'usr_alex',
    priority: 'low',
    status: 'in_review',
    createdAt: ago({ hours: 28 }),
    updatedAt: ago({ hours: 28 }),
  },
  {
    id: 'REQ-1034',
    title: 'Brand refresh assets for the customer portal',
    description:
      'The customer portal still uses the old logo, colors and icon set. We need updated assets — logo lockups, favicon, 24 product icons and an email header — that follow the new Cinnabyte brand guidelines before the portal relaunch.',
    category: 'design',
    requesterId: 'usr_alex',
    assigneeId: 'usr_emma',
    priority: 'high',
    status: 'in_progress',
    createdAt: ago({ days: 8 }),
    updatedAt: ago({ days: 8 }),
  },
  {
    id: 'REQ-1033',
    title: 'Renew project-management software licenses',
    description:
      "The engineering team's project-management subscription renews on September 30. We need 18 seats on the annual plan (up from 15) to cover the new hires.",
    category: 'finance',
    requesterId: 'usr_mike',
    assigneeId: 'usr_sarah',
    priority: 'low',
    status: 'completed',
    createdAt: ago({ days: 12 }),
    updatedAt: ago({ days: 12 }),
  },
  {
    id: 'REQ-1032',
    title: 'Update the remote-work policy in the handbook',
    description:
      'The employee handbook still describes the old two-days-in-office policy. Please update the remote-work section to reflect the flexible policy approved in August and publish the changes to the internal wiki.',
    category: 'people',
    requesterId: 'usr_sofia',
    assigneeId: 'usr_alex',
    priority: 'medium',
    status: 'completed',
    createdAt: ago({ days: 13 }),
    updatedAt: ago({ days: 13 }),
  },
  {
    id: 'REQ-1031',
    title: 'Monitor arms for the engineering pod',
    description:
      'Six dual-monitor arms for the engineering pod to free up desk space. The model should match the ones the design team already uses.',
    category: 'it_equipment',
    requesterId: 'usr_mike',
    assigneeId: 'usr_daniel',
    priority: 'low',
    status: 'completed',
    createdAt: ago({ days: 16 }),
    updatedAt: ago({ days: 9 }),
  },
];

/**
 * Approvals attached to requests in categories that need sign-off
 * (IT & Equipment, Facilities, Finance — see CATEGORY_META).
 * TODO(api): replaced by GET /api/requests/:id/approval (table: approvals).
 */
export const mockApprovals: Approval[] = [
  {
    id: 'apr_01',
    requestId: 'REQ-1042',
    approverId: 'usr_sarah',
    status: 'pending',
    requestedAt: ago({ hours: 20 }),
  },
  {
    id: 'apr_02',
    requestId: 'REQ-1038',
    approverId: 'usr_sarah',
    status: 'pending',
    requestedAt: ago({ days: 2, hours: 2 }),
  },
  {
    id: 'apr_03',
    requestId: 'REQ-1035',
    approverId: 'usr_alex',
    status: 'pending',
    requestedAt: ago({ hours: 27 }),
  },
  {
    id: 'apr_04',
    requestId: 'REQ-1036',
    approverId: 'usr_sarah',
    status: 'approved',
    requestedAt: ago({ days: 3 }),
    decidedAt: ago({ hours: 6 }),
  },
  {
    id: 'apr_05',
    requestId: 'REQ-1033',
    approverId: 'usr_sarah',
    status: 'approved',
    requestedAt: ago({ days: 10 }),
    decidedAt: ago({ days: 3, hours: 4 }),
  },
  {
    id: 'apr_06',
    requestId: 'REQ-1031',
    approverId: 'usr_sarah',
    status: 'approved',
    requestedAt: ago({ days: 15 }),
    decidedAt: ago({ days: 12 }),
  },
];
