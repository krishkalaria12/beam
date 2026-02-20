import { z } from 'zod/v4';

const Themeable = z.object({
	light: z.string(),
	dark: z.string()
});

const ColorLike = z.union([z.string(), Themeable]);

const ImageSource = z.union([z.string(), Themeable]);

const ImageFallback = ImageSource;

const ImageMask = z.enum(['circle', 'roundedRectangle']);

const Image = z.object({
	source: ImageSource,
	mask: ImageMask.optional(),
	tintColor: ColorLike.optional(),
	fallback: ImageFallback.optional()
});

const FileIcon = z.object({
	fileIcon: z.string()
});

export const ImageLikeSchema = z.union([z.string(), Image, FileIcon]);
export type ImageLike = z.infer<typeof ImageLikeSchema>;
