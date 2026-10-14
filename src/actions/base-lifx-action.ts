import {
	type Action,
	type PropertyInspectorDidAppearEvent,
	type SendToPluginEvent,
	SingletonAction,
	streamDeck,
} from "@elgato/streamdeck";
import { lifxClient } from "../lifx/client";
import type {
	DataSourceGroup,
	DataSourceNode,
	JsonObject,
	JsonValue,
	LifxGlobalSettings,
} from "../lifx/types";

type DataSourcePayload = {
	event?: string;
	isRefresh?: boolean;
};

/**
 * Shared base class for all LIFX Stream Deck actions.
 * Handles Global API Token resolution, Property Inspector `<sdpi-select>` data sources,
 * and standard visual feedback (`showOk` / `showAlert`).
 */
export abstract class BaseLifxAction<T extends JsonObject = JsonObject> extends SingletonAction<T> {
	/**
	 * Ensures the `lifxClient` has the latest API token from Global Settings.
	 */
	protected async ensureClientReady(): Promise<boolean> {
		if (!lifxClient.hasToken()) {
			const globalSettings = await streamDeck.settings.getGlobalSettings<LifxGlobalSettings>();
			lifxClient.setToken(globalSettings.apiToken);
		}
		return lifxClient.hasToken();
	}

	/**
	 * When the Property Inspector opens, ensure the token is loaded so data sources can populate.
	 */
	override async onPropertyInspectorDidAppear(
		_ev: PropertyInspectorDidAppearEvent<T>,
	): Promise<void> {
		await this.ensureClientReady();
	}

	/**
	 * Handles `sdpi-components` v4 data-source requests (`getSelectors`, `getScenes`).
	 */
	override async onSendToPlugin(ev: SendToPluginEvent<JsonValue, T>): Promise<void> {
		const payload = (ev.payload ?? {}) as DataSourcePayload;
		const eventName = payload.event;
		const isRefresh = Boolean(payload.isRefresh);

		if (eventName === "getSelectors") {
			await this.sendSelectorsDataSource(isRefresh);
		} else if (eventName === "getScenes") {
			await this.sendScenesDataSource(isRefresh);
		}
	}

	/**
	 * Populates `<sdpi-select datasource="getSelectors">` with All Lights, Locations, Groups, and Individual Lights.
	 */
	protected async sendSelectorsDataSource(isRefresh: boolean): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await streamDeck.ui.sendToPropertyInspector({
				event: "getSelectors",
				items: [
					{
						label: "All Lights",
						value: "all",
					},
					{
						label: "⚠️ Enter LIFX API Token above, then click Refresh",
						value: "",
						disabled: true,
					},
				],
			});
			return;
		}

		try {
			const lights = await lifxClient.listLights("all", isRefresh);

			const locationsMap = new Map<string, string>();
			const groupsMap = new Map<string, string>();

			for (const light of lights) {
				if (light.location?.id && light.location?.name) {
					locationsMap.set(light.location.id, light.location.name);
				}
				if (light.group?.id && light.group?.name) {
					groupsMap.set(light.group.id, light.group.name);
				}
			}

			const items: DataSourceNode[] = [
				{
					label: "All Lights (all)",
					value: "all",
				},
			];

			if (locationsMap.size > 0) {
				const locationGroup: DataSourceGroup = {
					label: "Locations",
					children: Array.from(locationsMap.entries())
						.sort((a, b) => a[1].localeCompare(b[1]))
						.map(([id, name]) => ({
							label: `📍 ${name}`,
							value: `location_id:${id}`,
						})),
				};
				items.push(locationGroup);
			}

			if (groupsMap.size > 0) {
				const groupNodes: DataSourceGroup = {
					label: "Groups",
					children: Array.from(groupsMap.entries())
						.sort((a, b) => a[1].localeCompare(b[1]))
						.map(([id, name]) => ({
							label: `💡 ${name}`,
							value: `group_id:${id}`,
						})),
				};
				items.push(groupNodes);
			}

			if (lights.length > 0) {
				const lightNodes: DataSourceGroup = {
					label: "Lights",
					children: [...lights]
						.sort((a, b) => a.label.localeCompare(b.label))
						.map((light) => {
							const status = !light.connected
								? "offline"
								: light.power === "on"
									? `on • ${Math.round(light.brightness * 100)}%`
									: "off";
							return {
								label: `${light.label} (${status})`,
								value: `id:${light.id}`,
							};
						}),
				};
				items.push(lightNodes);
			}

			await streamDeck.ui.sendToPropertyInspector({
				event: "getSelectors",
				items,
			});
		} catch (error) {
			streamDeck.logger.error("Failed to fetch LIFX selectors for Property Inspector", error);
			await streamDeck.ui.sendToPropertyInspector({
				event: "getSelectors",
				items: [
					{
						label: "All Lights (all)",
						value: "all",
					},
					{
						label: `⚠️ Error: ${error instanceof Error ? error.message : "Failed to load lights"}`,
						value: "",
						disabled: true,
					},
				],
			});
		}
	}

	/**
	 * Populates `<sdpi-select datasource="getScenes">` with scenes from the user's LIFX Cloud account.
	 */
	protected async sendScenesDataSource(isRefresh: boolean): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await streamDeck.ui.sendToPropertyInspector({
				event: "getScenes",
				items: [
					{
						label: "⚠️ Enter LIFX API Token above, then click Refresh",
						value: "",
						disabled: true,
					},
				],
			});
			return;
		}

		try {
			const scenes = await lifxClient.listScenes(isRefresh);
			const items: DataSourceNode[] =
				scenes.length > 0
					? [...scenes]
							.sort((a, b) => a.name.localeCompare(b.name))
							.map((scene) => ({
								label: `${scene.name} (${scene.states.length} ${scene.states.length === 1 ? "state" : "states"})`,
								value: scene.uuid,
							}))
					: [
							{
								label: "No scenes found in LIFX account",
								value: "",
								disabled: true,
							},
						];

			await streamDeck.ui.sendToPropertyInspector({
				event: "getScenes",
				items,
			});
		} catch (error) {
			streamDeck.logger.error("Failed to fetch LIFX scenes for Property Inspector", error);
			await streamDeck.ui.sendToPropertyInspector({
				event: "getScenes",
				items: [
					{
						label: `⚠️ Error: ${error instanceof Error ? error.message : "Failed to load scenes"}`,
						value: "",
						disabled: true,
					},
				],
			});
		}
	}

	/**
	 * Shows the green checkmark on keypad actions when an API call succeeds.
	 */
	protected async showSuccess(actionInstance: Action<T>): Promise<void> {
		if (actionInstance.isKey()) {
			await actionInstance.showOk();
		}
	}

	/**
	 * Logs an error and shows the yellow warning triangle on the Stream Deck key/dial.
	 */
	protected async handleError(
		actionInstance: Action<T>,
		context: string,
		error: unknown,
	): Promise<void> {
		streamDeck.logger.error(`[${context}] Error:`, error);
		await actionInstance.showAlert();
	}
}
