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

/**
 * Load the challenge list for the signed-in player.
 * Parameters: none.
 * @returns Promise of public challenge summaries, including the player's progress.
 */
export function listChallenges(): Promise<ChallengeSummary[]> {
  return apiGet<ChallengeSummary[]>("/api/challenges");
}

/**
 * Send a new riddle and its secret scoring strings to the server.
 * @param input - Title, secret regex, public examples and positive/negative controls.
 * @returns Promise of an object whose id identifies the created challenge.
 */
export function createChallenge(
  input: CreateChallengeInput,
): Promise<{ id: number }> {
  return apiPost<{ id: number }>("/api/challenges", input);
}

/**
 * Load one riddle and the player's attempt history.
 * @param id - Challenge ID to fetch.
 * @returns Promise of public examples, control counts, author and personal progress.
 */
export function getChallenge(id: number): Promise<ChallengeDetail> {
  return apiGet<ChallengeDetail>(`/api/challenges/${id}`);
}

/**
 * Submit a proposed solution for scoring.
 * @param challengeId - ID of the riddle to solve.
 * @param regex - Proposed regular expression, without display delimiters.
 * @returns Promise of correct positive/negative counts, totals, solved status and attempt number.
 */
export function submitAttempt(
  challengeId: number,
  regex: string,
): Promise<AttemptResult> {
  return apiPost<AttemptResult>(`/api/challenges/${challengeId}/attempts`, {
    regex,
  });
}

/**
 * Load the signed-in player's attempts for one riddle.
 * @param challengeId - ID of the riddle whose history is requested.
 * @returns Promise of submitted patterns, scores, solved flags and timestamps.
 */
export function listAttempts(
  challengeId: number,
): Promise<AttemptHistoryEntry[]> {
  return apiGet<AttemptHistoryEntry[]>(
    `/api/challenges/${challengeId}/attempts`,
  );
}
