import "./globals";
import { isMainThread } from "node:worker_threads";
import { startCommandWorker } from "./command-worker";
import { startSupervisor } from "./supervisor";

if (isMainThread) {
  startSupervisor();
} else {
  startCommandWorker();
}
