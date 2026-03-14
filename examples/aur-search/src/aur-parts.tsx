import {
	Action,
	ActionPanel,
	Color,
	Detail,
	Icon,
	List,
	showToast,
} from "@beam-launcher/api";

import {
	buildAurInstallCommand,
	buildDetailMarkdown,
	formatAurDate,
	formatPopularity,
	formatVotes,
	getAurCloneUrl,
	getAurPackageUrl,
	getAurSignals,
	getAurSnapshotUrl,
	getMaintainerLabel,
	type AurPackage,
} from "./aur";

export function AurPackageSheet({ pkg }: { pkg: AurPackage }) {
	return (
		<Detail
			markdown={buildDetailMarkdown(pkg)}
			metadata={
				<Detail.Metadata>
					<Detail.Metadata.Label
						key="package"
						title="Package"
						text={pkg.Name}
					/>
					<Detail.Metadata.Label
						key="maintainer"
						title="Maintainer"
						text={{
							value: getMaintainerLabel(pkg),
							color: pkg.Maintainer ? Color.Green : Color.Orange,
						}}
					/>
					<Detail.Metadata.Label
						key="votes"
						title="Votes"
						text={formatVotes(pkg.NumVotes)}
					/>
					<Detail.Metadata.Label
						key="popularity"
						title="Popularity"
						text={formatPopularity(pkg.Popularity)}
					/>
					<Detail.Metadata.TagList key="signals" title="Signals">
						{getAurSignals(pkg).map((signal) => (
							<Detail.Metadata.TagList.Item
								key={signal.text}
								text={signal.text}
								color={signal.color}
							/>
						))}
					</Detail.Metadata.TagList>
					<Detail.Metadata.Separator />
					<Detail.Metadata.Link
						key="aur-link"
						title="AUR"
						text="Open package page"
						target={getAurPackageUrl(pkg)}
					/>
					<Detail.Metadata.Link
						key="clone-link"
						title="Clone"
						text="Open git source"
						target={getAurCloneUrl(pkg)}
					/>
				</Detail.Metadata>
			}
			actions={<AurPackageActions pkg={pkg} />}
		/>
	);
}

export function AurListResultDetail({ pkg }: { pkg: AurPackage }) {
	return (
		<List.Item.Detail
			markdown={buildDetailMarkdown(pkg)}
			metadata={
				<List.Item.Detail.Metadata>
					<List.Item.Detail.Metadata.Label
						key="package"
						title="Package"
						text={pkg.Name}
					/>
					<List.Item.Detail.Metadata.Label
						key="version"
						title="Version"
						text={pkg.Version}
					/>
					<List.Item.Detail.Metadata.Label
						key="base"
						title="Base"
						text={pkg.PackageBase}
					/>
					<List.Item.Detail.Metadata.Label
						key="maintainer"
						title="Maintainer"
						text={{
							value: getMaintainerLabel(pkg),
							color: pkg.Maintainer ? Color.Green : Color.Orange,
						}}
					/>
					<List.Item.Detail.Metadata.Separator />
					<List.Item.Detail.Metadata.Label
						key="votes"
						title="Votes"
						text={formatVotes(pkg.NumVotes)}
					/>
					<List.Item.Detail.Metadata.Label
						key="popularity"
						title="Popularity"
						text={formatPopularity(pkg.Popularity)}
					/>
					<List.Item.Detail.Metadata.Label
						key="updated"
						title="Last Updated"
						text={formatAurDate(pkg.LastModified) ?? "Unknown"}
					/>
					<List.Item.Detail.Metadata.Label
						key="out-of-date"
						title="Out Of Date"
						text={formatAurDate(pkg.OutOfDate) ?? "No"}
					/>
					<List.Item.Detail.Metadata.TagList key="signals" title="Signals">
						{getAurSignals(pkg).map((signal) => (
							<List.Item.Detail.Metadata.TagList.Item
								key={signal.text}
								text={signal.text}
								color={signal.color}
							/>
						))}
					</List.Item.Detail.Metadata.TagList>
					<List.Item.Detail.Metadata.Link
						key="aur-link"
						title="AUR"
						target={getAurPackageUrl(pkg)}
						text="Open package page"
					/>
					{pkg.URL ? (
						<List.Item.Detail.Metadata.Link
							key="homepage-link"
							title="Homepage"
							target={pkg.URL}
							text="Open project page"
						/>
					) : null}
				</List.Item.Detail.Metadata>
			}
		/>
	);
}

export function AurPackageActions({ pkg }: { pkg: AurPackage }) {
	return (
		<ActionPanel>
			<ActionPanel.Section key="open-section" title="Open">
				<Action.Open
					key="open-package"
					title="Open AUR Package"
					icon={Icon.ArrowNe}
					target={getAurPackageUrl(pkg)}
				/>
				<Action.Push
					key="open-sheet"
					title="Open Package Sheet"
					icon={Icon.Sidebar}
					target={<AurPackageSheet pkg={pkg} />}
				/>
				<Action.Open
					key="open-snapshot"
					title="Open Snapshot"
					icon={Icon.Download}
					target={getAurSnapshotUrl(pkg)}
				/>
				{pkg.URL ? (
					<Action.Open
						key="open-homepage"
						title="Open Project Homepage"
						icon={Icon.Link}
						target={pkg.URL}
					/>
				) : null}
			</ActionPanel.Section>
			<ActionPanel.Section key="copy-section" title="Copy">
				<ActionPanel.Submenu key="copy-actions" title="Copy">
					<Action.CopyToClipboard
						key="copy-package-name"
						title="Copy Package Name"
						content={pkg.Name}
					/>
					<Action.CopyToClipboard
						key="copy-install-command"
						title="Copy Install Command"
						content={buildAurInstallCommand(pkg)}
					/>
					<Action.CopyToClipboard
						key="copy-clone-url"
						title="Copy Git Clone URL"
						content={getAurCloneUrl(pkg)}
					/>
					<Action.CopyToClipboard
						key="copy-markdown"
						title="Copy Package Markdown"
						content={buildDetailMarkdown(pkg)}
					/>
				</ActionPanel.Submenu>
			</ActionPanel.Section>
			<ActionPanel.Section key="beam-tests" title="Beam Tests">
				<Action
					key="show-package-toast"
					title="Show Package Toast"
					icon={Icon.SpeechBubble}
					onAction={() =>
						showToast({
							title: pkg.Name,
							message: `${formatVotes(pkg.NumVotes)} votes · ${formatPopularity(pkg.Popularity)} popularity`,
						})
					}
				/>
			</ActionPanel.Section>
		</ActionPanel>
	);
}
