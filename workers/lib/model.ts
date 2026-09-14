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
 * deepseek-reasoner) were retired on 2026-07-24. Use one of the current ids,
 * which are deepseek-v4-pro (strongest, best tool use) and deepseek-flash
 * (cheaper and faster).
 */

import { createDeepSeek } from "@ai-sdk/deepseek";
import { createWorkersAI } from "workers-ai-provider";
import type { LanguageModel } from "ai";
import type { Env } from "../types";

/** Model used when DEEPSEEK_MODEL is not set. */
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro";

/** Workers AI model used as a fallback when no DeepSeek key is configured. */
export const FALLBACK_WORKERS_AI_MODEL = "@cf/moonshotai/kimi-k2.5";

/**
 * Pick the chat model for this mailbox's agent.
 *
 * Returns the model plus a label for logs, so `wrangler tail` shows which
 * provider actually served a draft.
 *
 * The `as LanguageModel` casts are needed because @ai-sdk/deepseek pins its own
 * copy of @ai-sdk/provider (the root copy is pinned by `ai`), so the model
 * classes are structurally identical but nominally distinct to TypeScript.
 */
export function getAgentModel(env: Env): {
	model: LanguageModel;
	label: string;
} {
	const apiKey = env.DEEPSEEK_API_KEY;
	if (apiKey) {
		const modelId = env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
		return {
			model: createDeepSeek({ apiKey })(modelId) as LanguageModel,
			label: `deepseek:${modelId}`,
		};
	}

	console.warn(
		"DEEPSEEK_API_KEY is not set — falling back to Workers AI. Set the secret to use DeepSeek.",
	);
	return {
		model: createWorkersAI({ binding: env.AI })(FALLBACK_WORKERS_AI_MODEL) as LanguageModel,
		label: `workers-ai:${FALLBACK_WORKERS_AI_MODEL}`,
	};
}
