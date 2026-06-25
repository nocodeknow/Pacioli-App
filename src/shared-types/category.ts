import { z } from 'zod';
import { CategoryIdSchema } from './brands.js';

export const CategoryTypeSchema = z.enum(['Income', 'Expense']);
export type CategoryType = z.infer<typeof CategoryTypeSchema>;

export const CategorySchema = z.object({
  id: CategoryIdSchema,
  name: z.string().min(1),
  displayName: z.string().min(1),
  type: CategoryTypeSchema,
  parentCategory: CategoryIdSchema.nullable(),
  isGroup: z.boolean().default(false),
  archived: z.boolean(),
  notes: z.string().nullable(),
});

export type Category = z.infer<typeof CategorySchema>;
