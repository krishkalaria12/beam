import {
	Action,
	ActionPanel,
	Clipboard,
	Form,
	Icon,
	LocalStorage,
	Toast,
	showHUD,
	showToast,
	usePersistentState,
} from "@beam-launcher/api";
import { useMemo, useState } from "react";

import {
	AUR_SAMPLE_PACKAGE,
	buildAurInstallCommand,
	getAurPreferences,
} from "./aur";

export default function AurInstallRecipe() {
	const [extensionPreferences] = useState(getAurPreferences);
	const suggestedPackageName =
		extensionPreferences.defaultQuery.trim() || AUR_SAMPLE_PACKAGE.Name;
	const [packageName, setPackageName, packageNameLoading] = usePersistentState(
		"aur-form:package-name",
		suggestedPackageName,
	);
	const [helper, setHelper, helperLoading] = usePersistentState(
		"aur-form:helper",
		extensionPreferences.preferredHelper,
	);
	const [includeDevel, setIncludeDevel, includeDevelLoading] =
		usePersistentState("aur-form:include-devel", false);
	const [notes, setNotes, notesLoading] = usePersistentState(
		"aur-form:notes",
		"Use this command to test Beam form controls, persistent values, and submit actions.",
	);
	const [tags, setTags] = useState<string[]>(["aur", "maintained"]);
	const [auditDate, setAuditDate] = useState<Date | null>(new Date());
	const [attachments, setAttachments] = useState<string[]>([]);

	const formLoading =
		packageNameLoading || helperLoading || includeDevelLoading || notesLoading;
	const preview = useMemo(
		() => buildAurInstallCommand(packageName, helper, includeDevel),
		[helper, includeDevel, packageName],
	);
	const handleHelperChange = (value: string) => {
		setHelper(value as typeof extensionPreferences.preferredHelper);
	};

	const resetToSample = () => {
		setPackageName(suggestedPackageName);
		setHelper(extensionPreferences.preferredHelper);
		setIncludeDevel(false);
		setNotes(
			"Use this command to test Beam form controls, persistent values, and submit actions.",
		);
		setTags(["aur", "maintained"]);
		setAuditDate(new Date());
		setAttachments([]);
	};

	return (
		<Form
			isLoading={formLoading}
			navigationTitle="AUR Install Recipe"
			searchBarAccessory={
				<Form.LinkAccessory
					target="https://aur.archlinux.org"
					text="Open AUR"
				/>
			}
			actions={
				<ActionPanel>
					<ActionPanel.Section key="recipe" title="Recipe">
						<Action.SubmitForm
							key="save-recipe"
							title="Save Recipe"
							onSubmit={async (values) => {
								await LocalStorage.setItem("aur-form:last-recipe", {
									...values,
									preview,
									savedAt: new Date().toISOString(),
								});
								await Clipboard.copy(preview);
								await showHUD("AUR recipe copied");
								await showToast({
									style: Toast.Style.Success,
									title: "AUR recipe captured",
									message:
										"Saved to local storage and copied to the clipboard.",
								});
							}}
						/>
						<Action.CopyToClipboard
							key="copy-install-command"
							title="Copy Install Command"
							content={preview}
						/>
					</ActionPanel.Section>
					<ActionPanel.Section key="workspace" title="Workspace">
						<Action
							key="reset-to-sample"
							title="Reset To Sample"
							icon={Icon.ArrowCounterClockwise}
							onAction={resetToSample}
						/>
					</ActionPanel.Section>
				</ActionPanel>
			}
		>
			<Form.TextField
				key="package-name"
				id="packageName"
				title="Package"
				value={packageName}
				onChange={setPackageName}
			/>
			<Form.PasswordField
				key="sudo-password"
				id="sudoPassword"
				title="Sudo Password"
			/>
			<Form.Dropdown
				key="helper"
				id="helper"
				title="Helper"
				value={helper}
				onChange={handleHelperChange}
			>
				<Form.Dropdown.Section key="common-helpers" title="Common Helpers">
					<Form.Dropdown.Item
						key="helper-yay"
						value="yay"
						title="yay"
						icon={Icon.WrenchScrewdriver}
					/>
					<Form.Dropdown.Item
						key="helper-paru"
						value="paru"
						title="paru"
						icon={Icon.Bird}
					/>
				</Form.Dropdown.Section>
				<Form.Dropdown.Section key="other-helpers" title="Other Helpers">
					<Form.Dropdown.Item
						key="helper-trizen"
						value="trizen"
						title="trizen"
						icon={Icon.Package}
					/>
					<Form.Dropdown.Item
						key="helper-pikaur"
						value="pikaur"
						title="pikaur"
						icon={Icon.Terminal}
					/>
				</Form.Dropdown.Section>
			</Form.Dropdown>
			<Form.Checkbox
				key="include-devel"
				id="includeDevel"
				title="Devel Packages"
				label="Include devel updates"
				value={includeDevel}
				onChange={setIncludeDevel}
			/>
			<Form.TextArea
				key="notes"
				id="notes"
				title="Notes"
				value={notes}
				onChange={setNotes}
			/>
			<Form.TagPicker
				key="tags"
				id="tags"
				title="Tags"
				value={tags}
				onChange={setTags}
			>
				<Form.TagPicker.Section key="signal-tags" title="Signals">
					<Form.TagPicker.Item
						key="tag-aur"
						value="aur"
						title="AUR"
						icon={Icon.Package}
					/>
					<Form.TagPicker.Item
						key="tag-linux"
						value="linux"
						title="Linux"
						icon={Icon.Archlinux}
					/>
				</Form.TagPicker.Section>
				<Form.TagPicker.Section key="state-tags" title="State">
					<Form.TagPicker.Item
						key="tag-maintained"
						value="maintained"
						title="Maintained"
						icon={Icon.CheckCircle}
					/>
					<Form.TagPicker.Item
						key="tag-orphaned"
						value="orphaned"
						title="Orphaned"
						icon={Icon.Exclamationmark}
					/>
					<Form.TagPicker.Item
						key="tag-devel"
						value="devel"
						title="Devel"
						icon={Icon.Cog}
					/>
				</Form.TagPicker.Section>
			</Form.TagPicker>
			<Form.DatePicker
				key="recheck-at"
				id="recheckAt"
				title="Re-check On"
				type={Form.DatePicker.Type.Date}
				value={auditDate}
				onChange={setAuditDate}
			/>
			<Form.Separator />
			<Form.FilePicker
				key="pkgbuilds"
				id="PKGBUILDs"
				title="PKGBUILD Attachments"
				allowMultipleSelection
				value={attachments}
				onChange={setAttachments}
			/>
			<Form.Description key="preview" title="Preview" text={preview} />
			<Form.Description
				key="coverage"
				title="Coverage"
				text="This command exercises persistent form state, dropdown sections, tag pickers, file pickers, clipboard copy, local storage, and submit actions."
			/>
		</Form>
	);
}
