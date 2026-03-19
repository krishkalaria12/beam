import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

const markdownPlugins = { cjk, code, math, mermaid };

export type MarkdownViewProps = ComponentProps<typeof Streamdown>;

export const MarkdownView = memo(
  ({ className, ...props }: MarkdownViewProps) => (
    <Streamdown
      className={cn(
        "module-markdown size-full text-launcher-md leading-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      plugins={markdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

MarkdownView.displayName = "MarkdownView";
