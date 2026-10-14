import { streamDeck } from "@elgato/streamdeck";
import type {
	LifxActivateScenePayload,
	LifxBreatheEffectPayload,
	LifxCleanPayload,
	LifxCloudsEffectPayload,
	LifxColorValidation,
	LifxCyclePayload,
	LifxEffectsOffPayload,
	LifxFlameEffectPayload,
	LifxLight,
	LifxMorphEffectPayload,
	LifxMoveEffectPayload,
	LifxPulseEffectPayload,
	LifxResultsResponse,
	LifxScene,
	LifxStateDeltaPayload,
	LifxStatePayload,
	LifxStatesPayload,
	LifxSunEffectPayload,
} from "./types";

const LIFX_API_BASE = "https://api.lifx.com/v1";
const CACHE_TTL_MS = 15_000;

export class LifxApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly body?: unknown,
	) {
		super(message);
		this.name = "LifxApiError";
	}
}

/**
 * Client for the LIFX HTTP Cloud API v1 (`https://api.lifx.com/v1`).
 */
export class LifxClient {
	private apiToken = "";
	private lightsCache: { timestamp: number; selector: string; data: LifxLight[] } | null = null;
	private scenesCache: { timestamp: number; data: LifxScene[] } | null = null;

	/**
	 * Updates the Personal Access Token used for Bearer authentication.
	 */
	public setToken(token?: string): void {
		const trimmed = (token ?? "").trim();
		if (trimmed !== this.apiToken) {
			this.apiToken = trimmed;
			this.clearCache();
		}
	}

	/**
	 * Returns whether a non-empty API token is configured.
	 */
	public hasToken(): boolean {
		return this.apiToken.length > 0;
	}

	/**
	 * Clears cached lights and scenes.
	 */
	public clearCache(): void {
		this.lightsCache = null;
		this.scenesCache = null;
	}

	/**
	 * Performs an authenticated HTTP request against the LIFX v1 API.
	 */
	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		if (!this.hasToken()) {
			throw new LifxApiError("Missing LIFX Personal Access Token in settings.", 401);
		}

		const url = `${LIFX_API_BASE}${path}`;
		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.apiToken}`,
			Accept: "application/json",
		};

		let serializedBody: string | undefined;
		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
			serializedBody = JSON.stringify(body);
		}

		streamDeck.logger.debug(`LIFX API ${method} ${path}`, body ?? "");

		const response = await fetch(url, {
			method,
			headers,
			body: serializedBody,
		});

		const text = await response.text();
		let parsed: unknown = undefined;
		if (text.length > 0) {
			try {
				parsed = JSON.parse(text);
			} catch {
				parsed = text;
			}
		}

		if (!response.ok) {
			const errorMessage =
				typeof parsed === "object" && parsed !== null && "error" in parsed
					? String((parsed as { error: unknown }).error)
					: `LIFX API HTTP ${response.status} (${response.statusText})`;
			streamDeck.logger.error(`LIFX API error [${response.status}] on ${method} ${path}: ${errorMessage}`, parsed);
			throw new LifxApiError(errorMessage, response.status, parsed);
		}

		return parsed as T;
	}

	/**
	 * `GET /v1/lights/:selector`
	 * Gets lights belonging to the authenticated account filtered by selector.
	 */
	public async listLights(selector = "all", forceRefresh = false): Promise<LifxLight[]> {
		const now = Date.now();
		if (
			!forceRefresh &&
			this.lightsCache &&
			this.lightsCache.selector === selector &&
			now - this.lightsCache.timestamp < CACHE_TTL_MS
		) {
			return this.lightsCache.data;
		}

		const encodedSelector = encodeURIComponent(selector);
		const data = await this.request<LifxLight[]>("GET", `/lights/${encodedSelector}`);
		this.lightsCache = {
			timestamp: now,
			selector,
			data,
		};
		return data;
	}

	/**
	 * `POST /v1/lights/:selector/toggle`
	 * Toggles power on the targeted lights.
	 */
	public async togglePower(selector = "all", duration?: number): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		const payload = duration !== undefined && duration > 0 ? { duration } : {};
		this.lightsCache = null;
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/toggle`, payload);
	}

	/**
	 * `PUT /v1/lights/:selector/state`
	 * Sets state (power, color, brightness, duration, infrared, fast) on the targeted lights.
	 */
	public async setState(selector = "all", payload: LifxStatePayload): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		this.lightsCache = null;
		return this.request<LifxResultsResponse>("PUT", `/lights/${encodedSelector}/state`, payload);
	}

	/**
	 * `PUT /v1/lights/states`
	 * Sets state across multiple selectors in a single call.
	 */
	public async setStates(payload: LifxStatesPayload): Promise<LifxResultsResponse> {
		this.lightsCache = null;
		return this.request<LifxResultsResponse>("PUT", "/lights/states", payload);
	}

	/**
	 * `POST /v1/lights/:selector/state/delta`
	 * Changes brightness, hue, saturation, kelvin, or infrared by a relative amount.
	 */
	public async stateDelta(selector = "all", payload: LifxStateDeltaPayload): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		this.lightsCache = null;
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/state/delta`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/cycle`
	 * Advances the targeted lights to the next state in the provided list.
	 */
	public async cycle(selector = "all", payload: LifxCyclePayload): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		this.lightsCache = null;
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/cycle`, payload);
	}

	/**
	 * `GET /v1/scenes`
	 * Lists all scenes available in the user's LIFX Cloud account.
	 */
	public async listScenes(forceRefresh = false): Promise<LifxScene[]> {
		const now = Date.now();
		if (!forceRefresh && this.scenesCache && now - this.scenesCache.timestamp < CACHE_TTL_MS) {
			return this.scenesCache.data;
		}

		const data = await this.request<LifxScene[]>("GET", "/scenes");
		this.scenesCache = {
			timestamp: now,
			data,
		};
		return data;
	}

	/**
	 * `PUT /v1/scenes/scene_id::scene_uuid/activate`
	 * Activates a scene from the user's LIFX Cloud account.
	 */
	public async activateScene(
		sceneUuid: string,
		payload: LifxActivateScenePayload = {},
	): Promise<LifxResultsResponse> {
		const cleanedUuid = sceneUuid.replace(/^scene_id:/, "");
		const encodedScene = encodeURIComponent(`scene_id:${cleanedUuid}`);
		this.lightsCache = null;
		return this.request<LifxResultsResponse>("PUT", `/scenes/${encodedScene}/activate`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/breathe`
	 * Performs a breathe effect by slowly fading between the given colors.
	 */
	public async breatheEffect(
		selector = "all",
		payload: LifxBreatheEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/breathe`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/pulse`
	 * Performs a pulse effect by quickly flashing between the given colors.
	 */
	public async pulseEffect(
		selector = "all",
		payload: LifxPulseEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/pulse`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/move`
	 * Performs a linear move effect on multizone devices (LIFX Z, Beam).
	 */
	public async moveEffect(
		selector = "all",
		payload: LifxMoveEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/move`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/morph`
	 * Performs a morph effect on matrix devices (LIFX Tile, Candle, Ceiling).
	 */
	public async morphEffect(
		selector = "all",
		payload: LifxMorphEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/morph`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/flame`
	 * Performs a flame effect on matrix devices (LIFX Tile, Candle).
	 */
	public async flameEffect(
		selector = "all",
		payload: LifxFlameEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/flame`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/clouds`
	 * Performs a clouds effect on matrix devices (LIFX Ceiling, Luna).
	 */
	public async cloudsEffect(
		selector = "all",
		payload: LifxCloudsEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/clouds`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/sunrise`
	 * Performs a sunrise effect on matrix devices.
	 */
	public async sunriseEffect(
		selector = "all",
		payload: LifxSunEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/sunrise`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/sunset`
	 * Performs a sunset effect on matrix devices.
	 */
	public async sunsetEffect(
		selector = "all",
		payload: LifxSunEffectPayload,
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/sunset`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/effects/off`
	 * Turns off any running effects on the selected devices.
	 */
	public async effectsOff(
		selector = "all",
		payload: LifxEffectsOffPayload = {},
	): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/effects/off`, payload);
	}

	/**
	 * `POST /v1/lights/:selector/clean`
	 * Controls HEV antibacterial cleaning mode on compatible LIFX Clean bulbs.
	 */
	public async clean(selector = "all", payload: LifxCleanPayload = {}): Promise<LifxResultsResponse> {
		const encodedSelector = encodeURIComponent(selector);
		return this.request<LifxResultsResponse>("POST", `/lights/${encodedSelector}/clean`, payload);
	}

	/**
	 * `GET /v1/color`
	 * Validates a LIFX color string and returns its HSBK values.
	 */
	public async validateColor(colorString: string): Promise<LifxColorValidation> {
		const encoded = encodeURIComponent(colorString);
		return this.request<LifxColorValidation>("GET", `/color?string=${encoded}`);
	}
}

export const lifxClient = new LifxClient();
