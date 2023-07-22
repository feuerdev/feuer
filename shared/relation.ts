import { UserId } from "./objects"

export type PlayerRelation = {
  id1: UserId
  id2: UserId
  relationType: EnumRelationType
}

export default PlayerRelation

export function create(
  id1: UserId,
  id2: UserId,
  relationType = EnumRelationType.neutral
): PlayerRelation {
  return {
    id1,
    id2,
    relationType,
  }
}
/**
 * Always put the lower id first
 */
export function hash(id1: string, id2: string): string {
  if (id1 < id2) {
    return id1 + "-" + id2
  } else {
    return id2 + "-" + id1
  }
}

export enum EnumRelationType {
  neutral = 0,
  friendly = 1,
  hostile = 2,
}
