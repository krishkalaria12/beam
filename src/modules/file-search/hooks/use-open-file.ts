import { useMutation } from "@tanstack/react-query";
import { openFile } from "../api/open-file";

export function useOpenFile() {
  return useMutation({
    mutationFn: (filePath: string) => openFile(filePath),
  });
}
