export type SupervisorToWorkerMessage =
  | {
      kind: "bridge";
      payload: unknown;
    }
  | {
      kind: "shutdown";
    };

export interface WorkerToSupervisorMessage {
  kind: "output";
  payload: object;
}
