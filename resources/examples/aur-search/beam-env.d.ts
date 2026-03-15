/// <reference types="@beam-launcher/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  /** Suggested Search Query - Pre-fill the AUR examples with a starter package query when the command opens. */
	"defaultQuery": string;

	/** Default Sort Mode - Choose the initial sort mode for the AUR list and grid views. */
	"defaultSortMode": "relevance" | "popularity" | "votes" | "updated";

	/** Package Scope - Filter the visible AUR results to all packages, maintained packages, or orphaned packages. */
	"packageScope": "all" | "maintained" | "orphaned";

	/** Example Query Presets - Show preset AUR searches when the search field is empty. */
	"showExampleQueries": boolean;

	/** Suggested AUR Helper - Use this helper when generating install commands in the AUR example extension. */
	"preferredHelper": "yay" | "paru" | "trizen" | "pikaur";
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Command: Search AUR Packages */
	export type SearchAur = ExtensionPreferences & {
		
	}

	/** Command: AUR Grid Explorer */
	export type AurGrid = ExtensionPreferences & {
		
	}

	/** Command: AUR Install Recipe */
	export type AurForm = ExtensionPreferences & {
		
	}

	/** Command: AUR Extension Guide */
	export type AurDetail = ExtensionPreferences & {
		
	}

	/** Command: AUR Quick HUD */
	export type AurNoView = ExtensionPreferences & {
		
	}
}

declare namespace Arguments {
  /** Command: Search AUR Packages */
	export type SearchAur = {
		
	}

	/** Command: AUR Grid Explorer */
	export type AurGrid = {
		
	}

	/** Command: AUR Install Recipe */
	export type AurForm = {
		
	}

	/** Command: AUR Extension Guide */
	export type AurDetail = {
		
	}

	/** Command: AUR Quick HUD */
	export type AurNoView = {
		
	}
}