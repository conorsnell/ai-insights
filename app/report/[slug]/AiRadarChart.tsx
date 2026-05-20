'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { AiPlatformScore } from '@/lib/types';
import { RADAR_AXIS_ORDER } from '@/lib/platform-config';

const C = {
  blue:      '#0062DF',
  orange:    '#FF6300',
  lightGrey: '#F5F6FE',
  charcoal:  '#59596D',
} as const;

interface Props {
  platformScores: AiPlatformScore[];
  competitorScores?: AiPlatformScore[];
  primaryLabel: string;
  competitorLabel?: string;
}

export default function AiRadarChart({ platformScores, competitorScores, primaryLabel, competitorLabel }: Props) {
  const data = RADAR_AXIS_ORDER.map(name => {
    const primary = platformScores.find(p => p.platform === name);
    const comp = competitorScores?.find(p => p.platform === name);
    return {
      platform: name,
      primary: primary ? Math.round((primary.score / primary.maxScore) * 100) : 0,
      competitor: comp ? Math.round((comp.score / comp.maxScore) * 100) : undefined,
    };
  });

  const showCompetitor = !!competitorScores?.length;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke={C.lightGrey} />
        <PolarAngleAxis
          dataKey="platform"
          tick={{ fill: C.charcoal, fontSize: 12, fontFamily: 'Outfit, sans-serif' }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={primaryLabel}
          dataKey="primary"
          stroke={C.blue}
          fill={C.blue}
          fillOpacity={0.6}
        />
        {showCompetitor && (
          <Radar
            name={competitorLabel}
            dataKey="competitor"
            stroke={C.orange}
            fill={C.orange}
            fillOpacity={0.4}
          />
        )}
        {showCompetitor && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: C.charcoal, fontFamily: 'Outfit, sans-serif', paddingTop: 8 }}
          />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
}
