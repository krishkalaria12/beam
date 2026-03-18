import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  executeHyprWhsprRecord,
  type HyprWhsprRecordAction,
} from "../api/execute-hyprwhspr-record";
import { getHyprWhsprRecordStatus } from "../api/get-hyprwhspr-record-status";
import { parseHyprWhsprRecordState } from "../lib/status";
import { HyprWhsprFooter } from "./hyprwhspr-footer";
import { HyprWhsprHeader } from "./hyprwhspr-header";
import { HyprWhsprOutputCard } from "./hyprwhspr-output-card";
import { HyprWhsprRecordControlsCard } from "./hyprwhspr-record-controls-card";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface HyprWhsprViewProps {
  onBack: () => void | Promise<void>;
}

const RECORD_STATUS_QUERY_KEY = ["hyprwhspr", "record-status"] as const;

function resolveStatusTone(state: ReturnType<typeof parseHyprWhsprRecordState>) {
  if (state === "recording") {
    return "success" as const;
  }
  if (state === "idle") {
    return "neutral" as const;
  }
  return "warning" as const;
}

function resolveStatusLabel(state: ReturnType<typeof parseHyprWhsprRecordState>) {
  if (state === "recording") {
    return "recording";
  }
  if (state === "idle") {
    return "idle";
  }
  return "unknown";
}

export function HyprWhsprView({ onBack }: HyprWhsprViewProps) {
  const queryClient = useQueryClient();
  const [runningAction, setRunningAction] = useState<HyprWhsprRecordAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastActionOutput, setLastActionOutput] = useState("");
  const spaceHeldRef = useRef(false);

  const {
    data: recordStatusOutput = "",
    isLoading: isRecordStatusLoading,
    isFetching: isRecordStatusFetching,
  } = useQuery({
    queryKey: RECORD_STATUS_QUERY_KEY,
    queryFn: getHyprWhsprRecordStatus,
    refetchInterval: 900,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  const recordState = useMemo(
    () => parseHyprWhsprRecordState(recordStatusOutput),
    [recordStatusOutput],
  );
  const isRecording = recordState === "recording";

  const refreshRecordStatus = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: RECORD_STATUS_QUERY_KEY });
  }, [queryClient]);

  const runRecordAction = useCallback(
    async (action: HyprWhsprRecordAction) => {
      setRunningAction(action);
      setErrorMessage(null);

      try {
        const output = await executeHyprWhsprRecord(action, { hideLauncher: false });
        const normalizedOutput = output.trim();
        setLastActionOutput(
          normalizedOutput.length > 0
            ? normalizedOutput
            : `[${action}] command completed (no output)`,
        );
        await queryClient.invalidateQueries({ queryKey: RECORD_STATUS_QUERY_KEY });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "HyprWhspr command failed.");
      } finally {
        setRunningAction(null);
      }
    },
    [queryClient],
  );

  const onBackRef = useRef(onBack);
  const refreshRecordStatusRef = useRef(refreshRecordStatus);
  const runRecordActionRef = useRef(runRecordAction);
  onBackRef.current = onBack;
  refreshRecordStatusRef.current = refreshRecordStatus;
  runRecordActionRef.current = runRecordAction;

  useMountEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key.toLowerCase() === "escape") {
        event.preventDefault();
        void onBackRef.current();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (spaceHeldRef.current) {
          return;
        }
        spaceHeldRef.current = true;
        void runRecordActionRef.current("start");
        return;
      }

      if (event.key.toLowerCase() === "enter") {
        event.preventDefault();
        void runRecordActionRef.current("toggle");
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        void refreshRecordStatusRef.current();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      if (!spaceHeldRef.current) {
        return;
      }

      event.preventDefault();
      spaceHeldRef.current = false;
      void runRecordActionRef.current("stop");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      spaceHeldRef.current = false;
    };
  });

  const statusTone = resolveStatusTone(recordState);
  const statusLabel = resolveStatusLabel(recordState);

  return (
    <div className="glass-effect flex h-full w-full flex-col text-foreground">
      <HyprWhsprHeader
        statusTone={statusTone}
        statusLabel={statusLabel}
        isRecording={isRecording}
        onBack={onBack}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <HyprWhsprRecordControlsCard
          isRecording={isRecording}
          runningAction={runningAction}
          isRecordStatusFetching={isRecordStatusFetching}
          onToggle={() => {
            void runRecordAction("toggle");
          }}
          onStop={() => {
            void runRecordAction("stop");
          }}
          onCancel={() => {
            void runRecordAction("cancel");
          }}
          onRefresh={() => {
            void refreshRecordStatus();
          }}
        />

        <HyprWhsprOutputCard
          isRecordStatusLoading={isRecordStatusLoading}
          recordStatusOutput={recordStatusOutput}
          lastActionOutput={lastActionOutput}
          errorMessage={errorMessage}
        />
      </div>

      <HyprWhsprFooter />
    </div>
  );
}
