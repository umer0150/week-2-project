import type { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {

  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    name: {
      type: "varchar(100)",
      notNull: true,
    },

    email: {
      type: "varchar(255)",
      notNull: true,
      unique: true,
    },

    password_hash: {
      type: "text",
      notNull: true,
    },

    role: {
      type: "text",
      default: "user",
    },

    created_at: {
      type: "timestamp",
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createTable("refresh_tokens", {
  id: {
    type: "uuid",
    primaryKey: true,
    default: pgm.func("gen_random_uuid()"),
  },

  user_id: {
    type: "uuid",
    references: "users",
    onDelete: "CASCADE",
  },

  token_hash: {
    type: "text",
    notNull: true,
  },

  expires_at: {
    type: "timestamp",
    notNull: true,
  },

  revoked: {
    type: "boolean",
    notNull: true,
    default: false,
  },
});
}


export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("refresh_tokens");
  pgm.dropTable("users");
}