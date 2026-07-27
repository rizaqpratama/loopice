// Absence of a TaskDependency row between two tasks *is* "no dependency" --
// there is no NO_DEPENDENCY value stored.
export const DEPENDENCY_TYPES = ["FINISH_TO_START", "START_TO_START", "MANUAL_RELEASE"] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];
