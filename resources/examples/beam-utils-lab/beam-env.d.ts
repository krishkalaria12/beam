/// <reference types="@beam-launcher/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  /** Default Query - Starter filter for the package dashboard. */
	"defaultQuery": string;

	/** Preferred Open Target - Choose whether package actions open npm or repository pages first. */
	"preferredOpenTarget": "repository" | "npm";

	/** Repository Signals - Include Beam GitHub repository stats in the dashboard status card. */
	"showRepositorySignals": boolean;
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Command: Beam Utils Dashboard */
	export type Dashboard = ExtensionPreferences & {
		
	}

	/** Command: Beam Workflow Form */
	export type WorkflowForm = ExtensionPreferences & {
		
	}

	/** Command: Capture Beam Snapshot */
	export type CaptureSnapshot = ExtensionPreferences & {
		
	}
}

declare namespace Arguments {
  /** Command: Beam Utils Dashboard */
	export type Dashboard = {
		
	}

	/** Command: Beam Workflow Form */
	export type WorkflowForm = {
		
	}

	/** Command: Capture Beam Snapshot */
	export type CaptureSnapshot = {
		
	}
}