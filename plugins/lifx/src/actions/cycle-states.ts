import { action, type KeyDownEvent } from "@elgato/streamdeck";
import { lifxClient } from "../lifx/client";
import type { LifxStatePayload } from "../lifx/types";
import { BaseLifxAction } from "./base-lifx-action";

export type CycleStatesSettings = {
	selector?: string;
	statesList?: string;
	direction?: "forward" | "backward";
	duration?: number | string;
};

const DEFAULT_STATES_LIST = "red, green, blue, kelvin:2700, kelvin:6500";

/**
 * Cycles a light or group through a list of color/state presets (`POST /v1/lights/:selector/cycle`).
 */
@action({ UUID: "dev.codingcat.lifx.cycle" })
export class CycleStatesAction extends BaseLifxAction<CycleStatesSettings> {
	override async onKeyDown(ev: KeyDownEvent<CycleStatesSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selector = settings.selector || "all";
		const direction = settings.direction || "forward";
		const duration = settings.duration !== undefined ? Number(settings.duration) : 0.5;
		const rawStates = (settings.statesList || DEFAULT_STATES_LIST).trim();

		const states = this.parseStatesList(rawStates);
		if (states.length < 2) {
			await ev.action.showAlert();
			return;
		}

		try {
			await lifxClient.cycle(selector, {
				states,
				defaults: {
					power: "on",
					duration: !Number.isNaN(duration) && duration >= 0 ? duration : 0.5,
				},
				direction,
			});
			await this.showSuccess(ev.action);
		} catch (error) {
			await this.handleError(ev.action, "CycleStatesAction", error);
		}
	}

	/**
	 * Parses either a JSON array of `LifxStatePayload` objects or a comma/newline-separated list of LIFX color strings.
	 */
	private parseStatesList(input: string): LifxStatePayload[] {
		if (input.startsWith("[")) {
			try {
				const parsed = JSON.parse(input);
				if (Array.isArray(parsed)) {
					return parsed as LifxStatePayload[];
				}
			} catch {
				// Fall back to comma/line parsing
			}
		}

		return input
			.split(/[\n,]+/)
			.map((entry) => entry.trim())
			.filter(Boolean)
			.map((entry) => {
				if (entry.toLowerCase() === "off") {
					return { power: "off" as const };
				}
				return { power: "on" as const, color: entry };
			});
	}
}
