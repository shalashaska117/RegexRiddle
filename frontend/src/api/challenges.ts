import { apiGet, apiPost } from "./client";

export interface ChallengeAuthor {
  id: number;
  username: string;
}

export interface ChallengeSummary {
  id: number;
  title: string;
  author: ChallengeAuthor;
  createdAt: string;
  solvedByMe: boolean;
  myAttempts: number;
  solvedCount: number;
}

export interface AttemptHistoryEntry {
  proposedRegex: string;
  positivesMatched: number;
  negativesMatched: number;
  solved: boolean;
  createdAt: string;
}

export interface ChallengeDetail {
  id: number;
  title: string;
  author: ChallengeAuthor;
  createdAt: string;
  examplePositive: string;
  exampleNegative: string;
  controlCounts: { positive: number; negative: number };
  solvedByMe: boolean;
  myAttempts: AttemptHistoryEntry[];
}

export interface CreateChallengeInput {
  title: string;
  regex: string;
  examplePositive: string;
  exampleNegative: string;
  controlsPositive: string[];
  controlsNegative: string[];
}

export interface AttemptResult {
  positivesMatched: number;
  totalPositives: number;
  negativesMatched: number;
  totalNegatives: number;
  solved: boolean;
  attemptNumber: number;
}

export function listChallenges(): Promise<ChallengeSummary[]> {
  return apiGet<ChallengeSummary[]>("/api/challenges");
}

export function createChallenge(
  input: CreateChallengeInput,
): Promise<{ id: number }> {
  return apiPost<{ id: number }>("/api/challenges", input);
}

export function getChallenge(id: number): Promise<ChallengeDetail> {
  return apiGet<ChallengeDetail>(`/api/challenges/${id}`);
}

export function submitAttempt(
  challengeId: number,
  regex: string,
): Promise<AttemptResult> {
  return apiPost<AttemptResult>(`/api/challenges/${challengeId}/attempts`, {
    regex,
  });
}

export function listAttempts(
  challengeId: number,
): Promise<AttemptHistoryEntry[]> {
  return apiGet<AttemptHistoryEntry[]>(
    `/api/challenges/${challengeId}/attempts`,
  );
}
