import { Action, ActionPanel, Detail, showToast } from "@beam-launcher/api";

import {
	AUR_SAMPLE_PACKAGE,
	buildAurInstallCommand,
	getAurPackageUrl,
} from "./aur";
import { AurPackageSheet } from "./aur-parts";

export default function AurExtensionGuide() {
	return (
		<Detail
			markdown={[
				"# AUR Extension Guide",
				"",
				"This package is intentionally built to exercise Beam's extension runtime broadly.",
				"",
				"## Commands",
				"",
				"1. Search AUR Packages: controlled list, detail metadata, dropdown accessories, push navigation, and empty-view loading states.",
				"2. AUR Grid Explorer: grouped grid sections, grid detail, search, and animated loading feedback.",
				"3. AUR Install Recipe: form controls, persistent values, submit flow, clipboard copy, and local storage.",
				"4. AUR Quick HUD: no-view execution, clear-search behavior, desktop context, and clipboard utilities.",
				"",
				"## Test ideas",
				"",
				"- type quickly into search bars",
				"- switch sort dropdowns while loading",
				"- open pushed detail views and action submenus",
				"- submit the form with different values",
				"- run the no-view command repeatedly to confirm local storage writes",
			].join("\n")}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.Label
						title="Extension"
						text="beam-launcher/aur-search"
					/>
					<Detail.Metadata.Label
						title="Purpose"
						text="Runtime integration testbed"
					/>
					<Detail.Metadata.TagList title="Coverage">
						<Detail.Metadata.TagList.Item
							key="coverage-list"
							text="List"
							color="#2563eb"
						/>
						<Detail.Metadata.TagList.Item
							key="coverage-grid"
							text="Grid"
							color="#7c3aed"
						/>
						<Detail.Metadata.TagList.Item
							key="coverage-form"
							text="Form"
							color="#16a34a"
						/>
						<Detail.Metadata.TagList.Item
							key="coverage-detail"
							text="Detail"
							color="#f59e0b"
						/>
						<Detail.Metadata.TagList.Item
							key="coverage-no-view"
							text="No View"
							color="#dc2626"
						/>
					</Detail.Metadata.TagList>
					<Detail.Metadata.Separator />
					<Detail.Metadata.Link
						title="AUR"
						text="Open aur.archlinux.org"
						target="https://aur.archlinux.org"
					/>
					<Detail.Metadata.Link
						title="SDK"
						text="@beam-launcher/api"
						target="https://www.npmjs.com/package/@beam-launcher/api"
					/>
				</Detail.Metadata>
			}
			actions={
				<ActionPanel>
					<ActionPanel.Section key="inspect" title="Inspect">
						<Action.Push
							key="sample-package-sheet"
							title="Open Sample Package Sheet"
							target={<AurPackageSheet pkg={AUR_SAMPLE_PACKAGE} />}
						/>
						<Action.CopyToClipboard
							key="copy-sample-install"
							title="Copy Sample Install Command"
							content={buildAurInstallCommand(AUR_SAMPLE_PACKAGE)}
						/>
						<Action.Open
							key="open-sample-package"
							title="Open Sample AUR Package"
							target={getAurPackageUrl(AUR_SAMPLE_PACKAGE)}
						/>
					</ActionPanel.Section>
					<ActionPanel.Section key="feedback" title="Feedback">
						<Action
							key="show-guide-toast"
							title="Show Toast"
							onAction={() =>
								showToast({
									title: "AUR guide opened",
									message:
										"Detail rendering, metadata, and actions are active.",
								})
							}
						/>
					</ActionPanel.Section>
				</ActionPanel>
			}
		/>
	);
}
