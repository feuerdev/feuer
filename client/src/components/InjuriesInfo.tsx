import React from "react";
import { Injury, InjurySeverity, InjuryEffect } from "@shared/objects";

interface InjuriesInfoProps {
  injuries: Injury[] | undefined;
}

const InjurySeverityColors: Record<InjurySeverity, string> = {
  [InjurySeverity.Minor]: "text-green-400",
  [InjurySeverity.Moderate]: "text-yellow-400",
  [InjurySeverity.Severe]: "text-orange-400",
  [InjurySeverity.Critical]: "text-red-500",
};

const InjuryEffectLabels: Record<InjuryEffect, string> = {
  [InjuryEffect.StrengthDecrease]: "STR Dec.",
  [InjuryEffect.AgilityDecrease]: "AGI Dec.",
  [InjuryEffect.InitiativeDecrease]: "INIT Dec.",
  [InjuryEffect.MoraleDecrease]: "Morale Dec.",
  [InjuryEffect.GatheringDecrease]: "Gather Dec.",
  [InjuryEffect.MovementDecrease]: "Move Dec.",
};

const InjuriesInfo: React.FC<InjuriesInfoProps> = ({ injuries }) => {
  if (!injuries || injuries.length === 0) {
    return (
      <div className="mt-2 p-2 border border-slate-700 rounded bg-slate-800/50">
        <p className="text-xs text-slate-400 italic">No injuries.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold text-slate-300 mb-1">Injuries:</h4>
      <div className="space-y-2 p-2 border border-slate-700 rounded bg-slate-800/50 max-h-32 overflow-y-auto">
        {injuries.map((injury) => (
          <div key={injury.id} className="p-1.5 bg-slate-700/50 rounded shadow">
            <div className="flex justify-between items-start">
              <p
                className={`text-xs font-semibold ${
                  InjurySeverityColors[injury.severity]
                }`}
              >
                {injury.name} ({InjurySeverity[injury.severity]})
              </p>
              {injury.isPermanent && (
                <span className="text-xs text-red-400 ml-2">(Permanent)</span>
              )}
            </div>
            <p className="text-xs text-slate-400 italic mt-0.5">
              {injury.description}
            </p>
            {injury.effects.map((eff, index) => (
              <p key={index} className="text-xs text-amber-300/80 ml-2">
                - {InjuryEffectLabels[eff.effect]} {eff.magnitude}
                {eff.duration && (
                  <span className="text-slate-500">
                    {" "}
                    ({(eff.duration / 100).toFixed(1)}s left)
                  </span>
                )}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InjuriesInfo;
