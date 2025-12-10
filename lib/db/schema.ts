import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fingerprintId: text("fingerprint_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);

export const giftLists = pgTable("gift_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gifts = pgTable("gifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id").notNull().references(() => giftLists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  price: text("price"),
  priority: priorityEnum("priority").notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  giftLists: many(giftLists),
}));

export const giftListsRelations = relations(giftLists, ({ one, many }) => ({
  owner: one(users, {
    fields: [giftLists.ownerId],
    references: [users.id],
  }),
  gifts: many(gifts),
}));

export const giftsRelations = relations(gifts, ({ one }) => ({
  list: one(giftLists, {
    fields: [gifts.listId],
    references: [giftLists.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertGiftListSchema = createInsertSchema(giftLists, {
  name: z.string().min(1).max(200),
});

export const selectGiftListSchema = createSelectSchema(giftLists);

export const insertGiftSchema = createInsertSchema(gifts, {
  name: z.string().min(1).max(500),
  url: z.string().url(),
  price: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
});

export const selectGiftSchema = createSelectSchema(gifts);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type GiftList = typeof giftLists.$inferSelect;
export type NewGiftList = typeof giftLists.$inferInsert;
export type Gift = typeof gifts.$inferSelect;
export type NewGift = typeof gifts.$inferInsert;

export type GiftListWithGifts = GiftList & {
  gifts: Gift[];
  owner: User;
};

export type GiftListWithOwner = GiftList & {
  owner: User;
  gifts?: Gift[];
};
