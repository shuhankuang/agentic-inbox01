// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

/**
 * Chat model selection for the email agent.
 *
 * DeepSeek is used when DEEPSEEK_API_KEY is configured (official API,
 * OpenAI-compatible, base URL https://api.deepseek.com). Without a key the
 * agent falls back to Workers AI so a missing secret degrades instead of
 * breaking every draft.
 *
 * Note on model ids: the legacy DeepSeek names (deepseek-chat,
 * deepseek-reasoner) were retired on 2026-07-24. Current ids are
 * deepseek-flash (used by default: cheap and fast) and deepseek-v4-pro
 * (stronger and slower).
 */

import { createDeepSeek } from "@ai-sdk/deepseek";
import { createWorkersAI } from "workers-ai-provider";
import type { LanguageModel } from "ai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { Env } from "../types";

/** Model used when DEEPSEEK_MODEL is not set. */
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-flash";

/**
 * DeepSeek thinking mode is on by default and only adds latency for drafting
 * email, so it is switched off. The provider serializes this into the request
 * body as `thinking: { type: "disabled" }`. Turning it off also makes
 * temperature/topP effective, which the API ignores while thinking is enabled.
 */
export const DEEPSEEK_PROVIDER_OPTIONS = {
	deepseek: { thinking: { type: "disabled" } },
} as const;

/** Workers AI model used as a fallback when no DeepSeek key is configured. */
export const FALLBACK_WORKERS_AI_MODEL = "@cf/moonshotai/kimi-k2.5";

/**
 * Which model the agent will use, without constructing a provider.
 *
 * Used both by getAgentModel and by the config endpoint, so the UI can show
 * whether the DeepSeek key is actually visible to the Worker.
 */
export function resolveAgentModelConfig(env: Env): {
	provider: "deepseek" | "workers-ai";
	modelId: string;
	label: string;
	deepseekConfigured: boolean;
} {
	const apiKey = env.DEEPSEEK_API_KEY;
	if (apiKey) {
		const modelId = env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
		return {
			provider: "deepseek",
			modelId,
			label: `deepseek:${modelId}`,
			deepseekConfigured: true,
		};
	}

	return {
		provider: "workers-ai",
		modelId: FALLBACK_WORKERS_AI_MODEL,
		label: `workers-ai:${FALLBACK_WORKERS_AI_MODEL}`,
		deepseekConfigured: false,
	};
}

/**
 * Pick the chat model for this mailbox's agent.
 *
 * Returns the model, a label for logs (so `wrangler tail` shows which provider
 * actually served a draft), and the provider options to pass to the model call.
 *
 * The `as LanguageModel` casts are needed because @ai-sdk/deepseek pins its own
 * copy of @ai-sdk/provider (the root copy is pinned by `ai`), so the model
 * classes are structurally identical but nominally distinct to TypeScript.
 */
export function getAgentModel(env: Env): {
	model: LanguageModel;
	label: string;
	providerOptions: ProviderOptions;
} {
	const config = resolveAgentModelConfig(env);

	if (config.provider === "deepseek") {
		return {
			model: createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY! })(config.modelId) as LanguageModel,
			label: config.label,
			providerOptions: DEEPSEEK_PROVIDER_OPTIONS,
		};
	}

	console.warn(
		"DEEPSEEK_API_KEY is not set — falling back to Workers AI. Set the secret to use DeepSeek.",
	);
	return {
		model: createWorkersAI({ binding: env.AI })(config.modelId) as LanguageModel,
		label: config.label,
		providerOptions: {},
	};
}
