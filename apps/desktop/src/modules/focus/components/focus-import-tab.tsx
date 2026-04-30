import type { Dispatch } from "react";
import { DownloadCloud, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection, SettingsField, SettingsDivider } from "@/modules/settings/takeover/tabs/general/components/settings-field";

import type { FocusViewAction, FocusViewState } from "./focus-view-state";

interface FocusImportTabProps {
  state: FocusViewState;
  dispatch: Dispatch<FocusViewAction>;
  isBusy: boolean;
  onImport: () => void;
}

export function FocusImportTab({ state, dispatch, isBusy, onImport }: FocusImportTabProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <SettingsSection
        title="Import Categories"
        description="Import predefined focus categories via JSON format."
        icon={DownloadCloud}
        iconVariant="cyan"
      >
        <div className="p-5">
          <div className="mb-4 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--launcher-card-bg)] p-4 flex gap-3 text-launcher-xs text-muted-foreground">
            <Info className="size-4 shrink-0 text-primary" />
            <p>
              Paste JSON containing an array of category objects with <code className="font-semibold text-foreground">title</code>, <code className="font-semibold text-foreground">apps</code>, and <code className="font-semibold text-foreground">websites</code> properties.
            </p>
          </div>

          <Textarea
            value={state.importText}
            onChange={(event) => dispatch({ type: "set-import-text", value: event.target.value })}
            placeholder="[\n  {\n    &#34;title&#34;: &#34;Social Media&#34;,\n    &#34;apps&#34;: [&#34;discord&#34;],\n    &#34;websites&#34;: [&#34;x.com&#34;, &#34;instagram.com&#34;]\n  }\n]"
            className="min-h-[240px] resize-none font-mono text-sm border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] p-4"
          />
        </div>
        
        <SettingsDivider />
        
        <div className="p-5 flex justify-end">
          <Button onClick={onImport} disabled={isBusy || !state.importText.trim()} className="gap-2">
            <DownloadCloud className="size-4" />
            Import Configuration
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
