import type { Project } from '@/types';
import { dueIn } from './time';

/**
 * Active and recent projects.
 * TODO(api): replaced by GET /api/projects (tables: projects, project_members).
 */
export const mockProjects: Project[] = [
  {
    id: 'PRJ-101',
    name: 'Website Redesign',
    description:
      'Refresh cinnabyte.io with the new brand system, a faster page architecture and a clearer pricing story for small teams.',
    ownerId: 'usr_emma',
    memberIds: ['usr_emma', 'usr_mike', 'usr_alex'],
    progress: 82,
    status: 'on_track',
    startDate: dueIn(-40),
    dueDate: dueIn(18),
  },
  {
    id: 'PRJ-102',
    name: 'Internal Portal',
    description:
      'One home for policies, tools and team directories, with single sign-on so people stop hunting for bookmarks.',
    ownerId: 'usr_mike',
    memberIds: ['usr_mike', 'usr_daniel', 'usr_sofia', 'usr_alex'],
    progress: 64,
    status: 'on_track',
    startDate: dueIn(-60),
    dueDate: dueIn(30),
  },
  {
    id: 'PRJ-103',
    name: 'Mobile Application',
    description:
      'The first Cinnabyte mobile app: requests, approvals and notifications on the go. The beta is blocked by an Android push-notification crash.',
    ownerId: 'usr_mike',
    memberIds: ['usr_mike', 'usr_emma', 'usr_daniel'],
    progress: 41,
    status: 'at_risk',
    startDate: dueIn(-50),
    dueDate: dueIn(12),
  },
  {
    id: 'PRJ-104',
    name: 'Second-floor Office Move',
    description:
      'Move Operations, Design and People to the renovated second floor with minimal disruption to day-to-day work.',
    ownerId: 'usr_alex',
    memberIds: ['usr_alex', 'usr_daniel', 'usr_sofia'],
    progress: 36,
    status: 'on_track',
    startDate: dueIn(-20),
    dueDate: dueIn(26),
  },
  {
    id: 'PRJ-105',
    name: 'Onboarding Revamp',
    description:
      'Redesign the first 90 days for new hires: better equipment kits, clearer plans and a buddy for every newcomer.',
    ownerId: 'usr_sofia',
    memberIds: ['usr_sofia', 'usr_alex', 'usr_emma'],
    progress: 15,
    status: 'planning',
    startDate: dueIn(-7),
    dueDate: dueIn(55),
  },
  {
    id: 'PRJ-106',
    name: 'IT Asset Inventory',
    description:
      'Tag, log and reconcile every laptop, monitor and phone the company owns ahead of the annual audit.',
    ownerId: 'usr_daniel',
    memberIds: ['usr_daniel', 'usr_alex'],
    progress: 100,
    status: 'completed',
    startDate: dueIn(-45),
    dueDate: dueIn(-6),
  },
];
