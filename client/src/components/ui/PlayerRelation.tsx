import { useState, useEffect, SetStateAction } from "react";
import { useStore } from "@/lib/state";
import { EnumRelationType } from "@shared/relation";

interface PlayerRelationProps {
  playerId: string;
}

const PlayerRelation = ({ playerId }: PlayerRelationProps) => {
  const socket = useStore((state) => state.socket);
  const userId = useStore((state) => state.userId);
  const engine = useStore((state) => state.engine);
  const [currentRelation, setCurrentRelation] = useState<EnumRelationType>(
    EnumRelationType.neutral
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket || !userId || !playerId) return;

    // Request current relation
    socket.emit("request relation", { id1: userId, id2: playerId });

    // Listen for relation updates
    const handleRelationUpdate = (relation: {
      id1: string;
      id2: string;
      relationType: SetStateAction<EnumRelationType>;
    }) => {
      if (
        (relation.id1 === userId && relation.id2 === playerId) ||
        (relation.id1 === playerId && relation.id2 === userId)
      ) {
        setCurrentRelation(relation.relationType);
        setLoading(false);
      }
    };

    socket.on("gamestate relation", handleRelationUpdate);

    return () => {
      socket.off("gamestate relation", handleRelationUpdate);
    };
  }, [socket, userId, playerId]);

  const changeRelation = (relationType: EnumRelationType) => {
    if (!engine || !userId || !playerId) return;
    engine.requestChangeRelation(playerId, relationType);
  };

  const getRelationLabel = (relationType: EnumRelationType) => {
    switch (relationType) {
      case EnumRelationType.friendly:
        return "Friendly";
      case EnumRelationType.hostile:
        return "Hostile";
      case EnumRelationType.neutral:
      default:
        return "Neutral";
    }
  };

  const getRelationColor = (relationType: EnumRelationType) => {
    switch (relationType) {
      case EnumRelationType.friendly:
        return "text-green-500";
      case EnumRelationType.hostile:
        return "text-red-500";
      case EnumRelationType.neutral:
      default:
        return "text-yellow-500";
    }
  };

  if (loading) {
    return <div className="mt-2 text-sm">Loading relation...</div>;
  }

  return (
    <div className="mt-2 p-2 border border-slate-700 rounded bg-slate-800">
      <h3 className="text-sm font-semibold mb-1">Player Relation</h3>
      <div className="mb-2">
        Current:{" "}
        <span className={getRelationColor(currentRelation)}>
          {getRelationLabel(currentRelation)}
        </span>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => changeRelation(EnumRelationType.friendly)}
          className={`px-2 py-1 text-xs rounded ${
            currentRelation === EnumRelationType.friendly
              ? "bg-green-700 border border-green-500"
              : "bg-slate-700 hover:bg-green-900"
          }`}
        >
          Friendly
        </button>
        <button
          onClick={() => changeRelation(EnumRelationType.neutral)}
          className={`px-2 py-1 text-xs rounded ${
            currentRelation === EnumRelationType.neutral
              ? "bg-yellow-700 border border-yellow-500"
              : "bg-slate-700 hover:bg-yellow-900"
          }`}
        >
          Neutral
        </button>
        <button
          onClick={() => changeRelation(EnumRelationType.hostile)}
          className={`px-2 py-1 text-xs rounded ${
            currentRelation === EnumRelationType.hostile
              ? "bg-red-700 border border-red-500"
              : "bg-slate-700 hover:bg-red-900"
          }`}
        >
          Hostile
        </button>
      </div>
    </div>
  );
};

export default PlayerRelation;
