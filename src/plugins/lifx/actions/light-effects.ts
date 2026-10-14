import { action, type KeyDownEvent } from "@elgato/streamdeck";
import { lifxClient } from "../client";
import { BaseLifxAction } from "./base-lifx-action";

export type LifxEffectType =
	| "breathe"
	| "pulse"
	| "move"
	| "morph"
	| "flame"
	| "clouds"
	| "sunrise"
	| "sunset"
	| "off";

export type LightEffectsSettings = {
	selector?: string;
	effectType?: LifxEffectType;
	color?: string;
	fromColor?: string;
	period?: number | string;
	cycles?: number | string;
	duration?: number | string;
	direction?: "forward" | "backward";
	palette?: string;
	minSaturation?: number | string;
	peak?: number | string;
	persist?: boolean;
	powerOn?: boolean;
	powerOff?: boolean;
};

/**
 * Triggers or stops LIFX effects (`breathe`, `pulse`, `move`, `morph`, `flame`, `clouds`, `sunrise`, `sunset`, `off`).
 */
@action({ UUID: "dev.codingcat.streamdeck.lifx-effects" })
export class LightEffectsAction extends BaseLifxAction<LightEffectsSettings> {
	override async onKeyDown(ev: KeyDownEvent<LightEffectsSettings>): Promise<void> {
		const hasToken = await this.ensureClientReady();
		if (!hasToken) {
			await ev.action.showAlert();
			return;
		}

		const settings = ev.payload.settings;
		const selector = settings.selector || "all";
		const effectType: LifxEffectType = settings.effectType || "breathe";
		const color = settings.color || "#ff0055";
		const fromColor = settings.fromColor?.trim() || undefined;
		const period = settings.period !== undefined ? Number(settings.period) : 2;
		const cycles = settings.cycles !== undefined ? Number(settings.cycles) : 5;
		const duration = settings.duration !== undefined ? Number(settings.duration) : 30;
		const powerOn = settings.powerOn ?? true;
		const persist = Boolean(settings.persist);

		try {
			switch (effectType) {
				case "breathe": {
					const peak = settings.peak !== undefined ? Number(settings.peak) : 0.5;
					await lifxClient.breatheEffect(selector, {
						color,
						from_color: fromColor,
						period,
						cycles,
						persist,
						power_on: powerOn,
						peak,
					});
					break;
				}
				case "pulse": {
					await lifxClient.pulseEffect(selector, {
						color,
						from_color: fromColor,
						period,
						cycles,
						persist,
						power_on: powerOn,
					});
					break;
				}
				case "move": {
					await lifxClient.moveEffect(selector, {
						direction: settings.direction || "forward",
						period,
						cycles,
						power_on: powerOn,
					});
					break;
				}
				case "morph": {
					const palette = settings.palette
						? settings.palette
								.split(",")
								.map((c: string) => c.trim())
								.filter(Boolean)
						: undefined;
					await lifxClient.morphEffect(selector, {
						period,
						duration,
						palette: palette && palette.length > 0 ? palette : undefined,
						power_on: powerOn,
					});
					break;
				}
				case "flame": {
					await lifxClient.flameEffect(selector, {
						period,
						duration,
						power_on: powerOn,
					});
					break;
				}
				case "clouds": {
					const minSaturation =
						settings.minSaturation !== undefined
							? Math.max(0, Math.min(1, Number(settings.minSaturation) / 100))
							: 0.2;
					await lifxClient.cloudsEffect(selector, {
						period,
						duration,
						min_saturation: minSaturation,
						power_on: powerOn,
					});
					break;
				}
				case "sunrise": {
					await lifxClient.sunriseEffect(selector, {
						duration,
						persist,
						power_on: powerOn,
					});
					break;
				}
				case "sunset": {
					await lifxClient.sunsetEffect(selector, {
						duration,
						persist,
						power_on: powerOn,
					});
					break;
				}
				case "off": {
					await lifxClient.effectsOff(selector, {
						power_off: Boolean(settings.powerOff),
					});
					break;
				}
			}

			await this.showSuccess(ev.action);
		} catch (error) {
			await this.handleError(ev.action, "LightEffectsAction", error);
		}
	}
}
