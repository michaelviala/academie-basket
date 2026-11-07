export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Présent", short: "P", color: "#4ade80" },
  { value: "retard", label: "Retard", short: "R", color: "#facc15" },
  { value: "absent_justifie", label: "Excusé", short: "E", color: "#38bdf8" },
  { value: "absent", label: "Absent", short: "A", color: "#f87171" },
  { value: "blesse", label: "Blessé", short: "B", color: "#fb923c" },
] as const;

export type AttendanceValue = (typeof ATTENDANCE_STATUSES)[number]["value"];
export const ATTENDANCE_VALUES: string[] = ATTENDANCE_STATUSES.map((s) => s.value);
