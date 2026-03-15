import { useCallback } from "react";
import { toast } from "sonner";

import { toggleAwake } from "../api/toggle-awake";
import { useAwakeStore } from "../store/awake-store";

export function useAwakeToggle() {
  const { isAwake, isLoading, setAwake, fetchStatus } = useAwakeStore();

  const handleToggle = useCallback(async () => {
    try {
      const newStatus = await toggleAwake();
      setAwake(newStatus);
      toast(newStatus ? "Keep awake enabled" : "Keep awake disabled");
    } catch (e) {
      console.error("[useAwakeToggle] toggle error:", e);
      toast.error("Failed to toggle keep awake");
    }
  }, [setAwake]);

  return {
    isAwake,
    isLoading,
    toggle: handleToggle,
    refetch: fetchStatus,
  };
}
