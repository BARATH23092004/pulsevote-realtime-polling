export type PollStatus = 'active' | 'closed';

export type User = {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'creator';
  createdAt: string;
};

export type PollOption = {
  id: string;
  text: string;
};

export type Poll = {
  id: string;
  creatorId: string;
  creatorName?: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  allowDuplicateVotes: boolean;
  anonymousVoting: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePollRequest = {
  question: string;
  options: string[];
  allowDuplicateVotes: boolean;
  anonymousVoting: boolean;
  expiresAt?: string;
};

export type UpdatePollRequest = {
  question?: string;
  status?: PollStatus;
  allowDuplicateVotes?: boolean;
  expiresAt?: string;
};

export type PollOptionResult = {
  id: string;
  text: string;
  count: number;
  percentage: number;
};

export type PollResultsResponse = {
  pollId: string;
  question: string;
  totalVotes: number;
  status: PollStatus;
  isExpired: boolean;
  expiresAt?: string;
  options: PollOptionResult[];
};

export type VoteRequest = {
  optionId: string;
  voterIdentifier?: string;
};

export type VoteBroadcastEvent = {
  type: 'VOTE_UPDATED';
  pollId: string;
  totalVotes: number;
  results: PollOptionResult[];
  timestamp?: string;
};

export type APIError = {
  code: string;
  message: string;
};

export type APIResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: APIError;
};

export type DashboardStats = {
  totalPolls: number;
  activePolls: number;
  totalVotes: number;
  recentPolls: Poll[];
};
