import { Action, ActionPanel, Detail, showToast } from "@beam-launcher/api";

import { detailMarkdown } from "./constants";

export default function SimpleDetail() {
  return (
    <Detail
      markdown={detailMarkdown.trim()}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Template" text="Beam" />
          <Detail.Metadata.Label title="Style" text="Vicinae-inspired" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Repository"
            text="Open Beam"
            target="https://github.com/krishkalaria12/beam"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Say Hello" onAction={() => showToast({ title: "Hello from Beam" })} />
        </ActionPanel>
      }
    />
  );
}
