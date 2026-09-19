import { api, getVoterIdentifier } from './api';
import type {
  Poll,
  CreatePollRequest,
  UpdatePollRequest,
  PollResultsResponse,
  VoteRequest,
  DashboardStats,
  APIResponse,
} from '../types';

export const pollService = {
  async createPoll(data: CreatePollRequest) {
    const response = await api.post<APIResponse<Poll>>('/polls', data);
    return response.data;
  },

  async getPoll(id: string) {
    const response = await api.get<APIResponse<Poll>>(`/polls/${id}`);
    return response.data;
  },

  async getUserPolls() {
    const response = await api.get<APIResponse<Poll[]>>('/polls/user/all');
    return response.data;
  },

  async getDashboardStats() {
    const response = await api.get<APIResponse<DashboardStats>>('/polls/dashboard/stats');
    return response.data;
  },

  async updatePoll(id: string, data: UpdatePollRequest) {
    const response = await api.put<APIResponse<Poll>>(`/polls/${id}`, data);
    return response.data;
  },

  async closePoll(id: string) {
    const response = await api.post<APIResponse<Poll>>(`/polls/${id}/close`);
    return response.data;
  },

  async deletePoll(id: string) {
    const response = await api.delete<APIResponse<void>>(`/polls/${id}`);
    return response.data;
  },

  async getPollResults(id: string) {
    const response = await api.get<APIResponse<PollResultsResponse>>(`/polls/${id}/results`);
    return response.data;
  },

  async castVote(pollId: string, optionId: string) {
    const voterId = getVoterIdentifier();
    const payload: VoteRequest = {
      optionId,
      voterIdentifier: voterId,
    };
    const response = await api.post<APIResponse<PollResultsResponse>>(`/polls/${pollId}/vote`, payload);
    return response.data;
  },
};
