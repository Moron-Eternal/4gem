import React from 'react';
import { CreatureInstance } from '../types/creature';
import { Trophy, Medal, Award, Zap, Flag, Skull } from 'lucide-react';

interface LeaderboardProps {
  population: CreatureInstance[];
  selectedCreatureId: number | null;
  onSelectCreature: (id: number | null) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  population,
  selectedCreatureId,
  onSelectCreature,
}) => {
  const sorted = [...population].sort((a, b) => b.fitness - a.fitness).slice(0, 6);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={13} className="text-yellow-400" />;
      case 2:
        return <Medal size={13} className="text-slate-300" />;
      case 3:
        return <Award size={13} className="text-amber-600" />;
      default:
        return <span className="text-[10px] font-mono text-slate-500">#{rank}</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
          <Trophy size={14} className="text-yellow-400" /> Speed & Gate Standings
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Top 6</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {sorted.map((creature, idx) => {
          const rank = idx + 1;
          const isSelected = creature.id === selectedCreatureId;
          const isLeader = rank === 1;

          return (
            <div
              key={creature.id}
              onClick={() => onSelectCreature(isSelected ? null : creature.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition border ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                  : creature.eliminated
                  ? 'bg-rose-950/15 border-rose-900/30 text-rose-300/70 hover:bg-rose-950/30'
                  : isLeader
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-100 hover:bg-amber-950/40'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 flex justify-center">
                  {getRankBadge(rank)}
                </div>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isLeader ? '#facc15' : creature.color }}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-[11px] truncate max-w-[85px]">
                    {creature.name}
                  </span>
                  {creature.eliminated ? (
                    <span className="text-[9px] font-mono text-rose-400 flex items-center gap-0.5">
                      <Skull size={9} /> {creature.disqualificationReason || 'ELIMINATED'}
                    </span>
                  ) : creature.checkpointsReached.length > 0 ? (
                    <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5">
                      <Flag size={9} /> Gates: {creature.checkpointsReached.length}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="font-mono text-right flex flex-col items-end">
                <span className={isLeader ? 'text-yellow-400 font-bold text-[11px]' : 'text-slate-200 text-[11px]'}>
                  {Math.round(creature.fitness / 10)}m
                </span>
                <span className="text-[9px] text-cyan-400 flex items-center gap-0.5">
                  <Zap size={9} /> {creature.averageSpeed.toFixed(1)} m/s
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
