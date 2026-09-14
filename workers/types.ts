// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

export interface Env extends Cloudflare.Env {
	POLICY_AUD: string;
	TEAM_DOMAIN: string;
	/**
	 * DeepSeek API key (set as a secret, never in wrangler.jsonc). When present,
	 * the email agent uses the DeepSeek API instead of Workers AI.
	 */
	DEEPSEEK_API_KEY?: string;
	/**
	 * DeepSeek model id. Defaults to deepseek-v4-pro; deepseek-flash is cheaper
	 * and faster. The legacy ids deepseek-chat/deepseek-reasoner were retired.
	 */
	DEEPSEEK_MODEL?: string;
}
