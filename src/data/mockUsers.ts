import type { User } from '@/types';

/**
 * Workspace members.
 * TODO(api): replaced by GET /api/users (PostgreSQL table: users).
 */
export const mockUsers: User[] = [
  {
    id: 'usr_alex',
    name: 'Alex Johnson',
    email: 'alex.johnson@cinnabyte.io',
    title: 'Operations Manager',
    team: 'Operations',
    role: 'admin',
    avatarColor: 'emerald',
  },
  {
    id: 'usr_sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@cinnabyte.io',
    title: 'Finance Lead',
    team: 'Finance',
    role: 'manager',
    avatarColor: 'violet',
  },
  {
    id: 'usr_mike',
    name: 'Mike Torres',
    email: 'mike.torres@cinnabyte.io',
    title: 'Engineering Lead',
    team: 'Engineering',
    role: 'manager',
    avatarColor: 'sky',
  },
  {
    id: 'usr_emma',
    name: 'Emma Garcia',
    email: 'emma.garcia@cinnabyte.io',
    title: 'Product Designer',
    team: 'Design',
    role: 'member',
    avatarColor: 'rose',
  },
  {
    id: 'usr_daniel',
    name: 'Daniel Kim',
    email: 'daniel.kim@cinnabyte.io',
    title: 'IT Administrator',
    team: 'IT',
    role: 'member',
    avatarColor: 'slate',
  },
  {
    id: 'usr_sofia',
    name: 'Sofia Reyes',
    email: 'sofia.reyes@cinnabyte.io',
    title: 'People & Culture Manager',
    team: 'People',
    role: 'manager',
    avatarColor: 'amber',
  },
];

/**
 * The signed-in user for the demo.
 * TODO(auth): remove — the current user will come from the session.
 */
export const MOCK_CURRENT_USER_ID = 'usr_alex';
