import { clearSearchBar, showToast } from "@beam-launcher/api";

export default async function NoView() {
  await clearSearchBar();
  await showToast({ title: "Hello from Beam's no-view command" });
}
