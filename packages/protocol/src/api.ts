import { z } from 'zod/v4';
import { ImageLikeSchema } from './image';

export const InvokeCommandPayloadSchema = z.object({
	requestId: z.string(),
	command: z.string(),
	params: z.record(z.string(), z.unknown()).optional()
});

export const InvokeCommandMessageSchema = z.object({
	type: z.literal('invoke_command'),
	payload: InvokeCommandPayloadSchema
});

export const OpenPayloadSchema = z.object({
	target: z.string(),
	application: z.string().optional()
});
export const OpenMessageSchema = z.object({
	type: z.literal('open'),
	payload: OpenPayloadSchema
});

export const BrowserExtensionRequestPayloadSchema = z.object({
	requestId: z.string(),
	method: z.string(),
	params: z.unknown()
});
export const BrowserExtensionRequestMessageSchema = z.object({
	type: z.literal('browser-extension-request'),
	payload: BrowserExtensionRequestPayloadSchema
});

export const OauthAuthorizePayloadSchema = z.object({
	url: z.string(),
	providerName: z.string(),
	providerIcon: ImageLikeSchema.optional(),
	description: z.string().optional()
});
export const OauthAuthorizeMessageSchema = z.object({
	type: z.literal('oauth-authorize'),
	payload: OauthAuthorizePayloadSchema
});

export const OauthGetTokensPayloadSchema = z.object({
	requestId: z.string(),
	providerId: z.string()
});
export const OauthGetTokensMessageSchema = z.object({
	type: z.literal('oauth-get-tokens'),
	payload: OauthGetTokensPayloadSchema
});

export const OauthSetTokensPayloadSchema = z.object({
	requestId: z.string(),
	providerId: z.string(),
	tokens: z.record(z.string(), z.unknown())
});
export const OauthSetTokensMessageSchema = z.object({
	type: z.literal('oauth-set-tokens'),
	payload: OauthSetTokensPayloadSchema
});

export const OauthRemoveTokensPayloadSchema = z.object({
	requestId: z.string(),
	providerId: z.string()
});
export const OauthRemoveTokensMessageSchema = z.object({
	type: z.literal('oauth-remove-tokens'),
	payload: OauthRemoveTokensPayloadSchema
});
