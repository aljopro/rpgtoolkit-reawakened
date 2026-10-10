// expect-rule: none
export type StepStatus = "running" | "finished";

export function step(budget: number, ip: number): { ip: number; status: StepStatus } {
  const next = ip + Math.floor(budget);
  return { ip: next, status: "running" };
}
