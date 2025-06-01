import React from "react";
import { Battle } from "@shared/objects";
import { useStore } from "@/lib/state";
import { SelectionType } from "@shared/objects";

interface BattleInfoProps {
  battle: Battle | undefined;
  // onHide and onCloseBattle props will be removed
}

const BattleInfo: React.FC<BattleInfoProps> = ({ battle }) => {
  // Removed props
  if (!battle) {
    return null;
  }

  const handleHide = () => {
    console.log("Hiding battle info from BattleInfo component");
    useStore.getState().setSelection({ type: SelectionType.None });
  };

  const handleCloseBattle = () => {
    console.log(
      "Closing battle (and eventually removing indicator) from BattleInfo component"
    );
    useStore.getState().setSelection({ type: SelectionType.None });
    // TODO: Send request to engine to remove battle indicator
  };

  // Calculate battle progress - how much damage each side has taken
  const attackerHealth = Math.max(0, battle.attacker.morale);
  const defenderHealth = Math.max(0, battle.defender.morale);
  const attackerHealthPercent = attackerHealth;
  const defenderHealthPercent = defenderHealth;

  // Has either side fled?
  const attackerFled = battle.attacker.morale === 1;
  const defenderFled = battle.defender.morale === 1;

  // Is battle over?
  const isBattleOver =
    battle.attacker.morale <= 0 ||
    battle.defender.morale <= 0 ||
    attackerFled ||
    defenderFled;

  // Get more detailed info for more informative battle display
  const attacker = battle.attacker;
  const defender = battle.defender;

  return (
    <div className="absolute top-1/2 left-1/2 z-20 w-2/5 -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-slate-800 bg-opacity-95 p-4 shadow-xl">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
        <h3 className={`text-lg font-semibold ${"text-red-400"}`}>
          Battle in Progress!
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleHide} // Use internal handler
            className="text-slate-400 hover:text-slate-200 p-1"
            aria-label="Hide battle details"
            title="Hide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228"
              />
            </svg>
          </button>
          <button
            onClick={handleCloseBattle} // Use internal handler
            className="text-slate-400 hover:text-red-500 p-1"
            aria-label="Close battle and remove indicator"
            title="Close Battle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <>
          {/* Attacker Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/50 p-2 rounded">
              <p className="text-sm text-blue-300 font-medium mb-1">Attacker</p>
              <p className="text-xs text-slate-300">ID: {attacker.id}</p>
              <div className="mt-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Morale:</span>
                  <span
                    className={
                      attackerFled
                        ? "text-yellow-400"
                        : attackerHealth < 30
                        ? "text-red-400"
                        : "text-green-400"
                    }
                  >
                    {attackerFled ? "Fled!" : `${attackerHealth.toFixed(1)}%`}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      attackerFled
                        ? "bg-yellow-500"
                        : attackerHealth < 30
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${attackerHealthPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 mt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Strength:</span>
                  <span className="text-slate-300">{attacker.strength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Agility:</span>
                  <span className="text-slate-300">{attacker.agility}</span>
                </div>
              </div>
            </div>

            {/* Defender Section */}
            <div className="bg-slate-700/50 p-2 rounded">
              <p className="text-sm text-red-300 font-medium mb-1">Defender</p>
              <p className="text-xs text-slate-300">ID: {defender.id}</p>
              <div className="mt-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Morale:</span>
                  <span
                    className={
                      defenderFled
                        ? "text-yellow-400"
                        : defenderHealth < 30
                        ? "text-red-400"
                        : "text-green-400"
                    }
                  >
                    {defenderFled ? "Fled!" : `${defenderHealth.toFixed(1)}%`}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      defenderFled
                        ? "bg-yellow-500"
                        : defenderHealth < 30
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${defenderHealthPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2 mt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Strength:</span>
                  <span className="text-slate-300">{defender.strength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Agility:</span>
                  <span className="text-slate-300">{defender.agility}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      </div>

      {/* Battle result section */}
      {isBattleOver && (
        <div className="mt-4 pt-2 border-t border-slate-700">
          <h4 className="font-semibold text-amber-400">
            Battle {attackerFled || defenderFled ? "Ended" : "Over"}!
          </h4>
          {battle.attacker.morale <= 0 && (
            <p className="text-slate-300">Attacker has been defeated.</p>
          )}
          {battle.defender.morale <= 0 && (
            <p className="text-slate-300">Defender has been defeated.</p>
          )}
          {attackerFled && (
            <p className="text-slate-300">Attacker has fled the battle.</p>
          )}
          {defenderFled && (
            <p className="text-slate-300">Defender has fled the battle.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BattleInfo;
