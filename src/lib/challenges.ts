import type { Challenge, Membership, Team, Trip } from '@/types';

import { startOfWeek, sumMetric } from './metrics';

const DAY_MS = 24 * 60 * 60 * 1000;

export function challengePeriod(challenge: Challenge, now = new Date()): { start: number; end: number } {
  if (challenge.period === 'week') {
    const start = startOfWeek(now).getTime();
    return { start, end: start + 7 * DAY_MS };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
  };
}

export function daysLeft(challenge: Challenge, now = new Date()): number {
  return Math.max(1, Math.ceil((challengePeriod(challenge, now).end - now.getTime()) / DAY_MS));
}

/** Вклад пользователя: поездки с момента вступления в пределах текущего периода. */
export function myContribution(challenge: Challenge, membership: Membership | undefined, trips: Trip[], now = new Date()) {
  if (!membership) return 0;
  const { start, end } = challengePeriod(challenge, now);
  return sumMetric(trips, challenge.metric, Math.max(start, new Date(membership.joinedAt).getTime()), end);
}

export type LeaderboardRow = { team: Team; score: number; rank: number; isMine: boolean };

export function leaderboard(
  challenge: Challenge,
  membership: Membership | undefined,
  trips: Trip[],
  now = new Date(),
): LeaderboardRow[] {
  const elapsedDays = (now.getTime() - challengePeriod(challenge, now).start) / DAY_MS;
  const mine = myContribution(challenge, membership, trips, now);
  return challenge.teams
    .map((team) => {
      const isMine = team.id === membership?.teamId;
      const demoScore = team.dailyRate * elapsedDays;
      return {
        team: isMine ? { ...team, members: team.members + 1 } : team,
        score: (challenge.metric === 'trips' ? Math.floor(demoScore) : demoScore) + (isMine ? mine : 0),
        isMine,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
