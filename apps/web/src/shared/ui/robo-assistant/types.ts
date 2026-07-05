export type RoboMood =
  | "idle"
  | "happy"
  | "thinking"
  | "success"
  | "warning"
  | "sleepy";

export type RoboContext =
  | "hero"
  | "lead-form"
  | "thanks"
  | "parent-portal"
  | "teacher-portal"
  | "crm-empty";

export interface RoboAssistantProps {
  mood?: RoboMood;
  context?: RoboContext;
  message?: string;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  interactiveAssembly?: boolean;
}
