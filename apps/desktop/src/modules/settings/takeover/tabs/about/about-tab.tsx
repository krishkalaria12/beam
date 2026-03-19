import { isTauri } from "@tauri-apps/api/core";
import { getName, getVersion } from "@tauri-apps/api/app";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { BookOpen, Bug, Github, Info } from "lucide-react";
import { useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { AboutLink } from "./components/about-link";

async function openExternal(target: string) {
  try {
    await shellOpen(target);
  } catch {
    window.open(target, "_blank", "noopener,noreferrer");
  }
}

export function AboutTab() {
  const [version, setVersion] = useState("0.1.0");
  const [productName, setProductName] = useState("beam");

  useMountEffect(() => {
    if (!isTauri()) {
      return;
    }

    void Promise.all([getName(), getVersion()])
      .then(([nextName, nextVersion]) => {
        setProductName(nextName || "beam");
        setVersion(nextVersion || "0.1.0");
      })
      .catch(() => {
        setProductName("beam");
        setVersion("0.1.0");
      });
  });

  return (
    <div className="custom-scrollbar flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto px-8 py-10">
      <div className="w-full max-w-[560px] space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)]">
          <Info className="size-7 text-foreground" />
        </div>

        <div className="space-y-2">
          <div className="font-mono text-[length:calc(var(--beam-font-size-base)*1.8462)] text-foreground">
            {productName}
          </div>
          <div className="text-launcher-lg text-foreground/90">
            Beam’s launcher settings, command registry controls, and extension runtime configuration.
          </div>
          <div className="font-mono text-launcher-sm uppercase tracking-[0.14em] text-muted-foreground">
            Version {version}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <AboutLink
            icon={Github}
            label="GitHub"
            onClick={() => {
              void openExternal("https://github.com/krishkalaria12/beam");
            }}
          />
          <AboutLink
            icon={BookOpen}
            label="Docs"
            onClick={() => {
              void openExternal("https://github.com/krishkalaria12/beam");
            }}
          />
          <AboutLink
            icon={Bug}
            label="Report Bug"
            onClick={() => {
              void openExternal("https://github.com/krishkalaria12/beam/issues/new");
            }}
          />
        </div>
      </div>
    </div>
  );
}
