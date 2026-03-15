import {
	Clipboard,
	LocalStorage,
	Toast,
	clearSearchBar,
	getDesktopContext,
	showHUD,
	showToast,
} from "@beam-launcher/api";

export default async function AurQuickHud() {
	const currentCount = Number(
		(await LocalStorage.getItem<number>("aur-quick-hud:count")) ?? 0,
	);
	const nextCount = currentCount + 1;
	await LocalStorage.setItem("aur-quick-hud:count", nextCount);

	const desktopContext = await getDesktopContext().catch(() => null);
	const selectedText =
		desktopContext?.selectedText.state === "supported"
			? desktopContext.selectedText.value?.trim()
			: undefined;
	const packageName =
		selectedText && selectedText.length > 0 ? selectedText : "neovim";
	const command = `yay -S ${packageName}`;

	await Clipboard.copy(command);
	await clearSearchBar();
	await showHUD(`Prepared ${packageName}`);
	await showToast({
		style: Toast.Style.Success,
		title: "AUR quick action ran",
		message: `Copied "${command}" · run #${nextCount}`,
	});
}
