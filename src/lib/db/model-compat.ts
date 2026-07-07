/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { createPgModel, type PgDocumentModel } from "@/lib/db/pg-document-model";

export type InferSchemaType<T> = Record<string, any>;
export type Model<T = Record<string, any>> = PgDocumentModel;
export type PipelineStage = Record<string, any>;
export type Query<ResultType = unknown, DocType = unknown> = {
  where(filter: Record<string, unknown>): Query<ResultType, DocType>;
};

type SchemaOptions = {
  collection?: string;
  timestamps?: boolean;
  _id?: boolean;
};

export class Schema {
  static Types = {
    Mixed: "mixed",
    ObjectId: "objectId",
  };

  options: SchemaOptions;

  constructor(
    public definition: Record<string, unknown>,
    options: SchemaOptions = {},
  ) {
    this.options = options;
  }

  index(..._args: any[]) {
    return this;
  }

  path(name: string) {
    return this.definition[name];
  }

  add(definition: Record<string, unknown>) {
    this.definition = {
      ...this.definition,
      ...definition,
    };
    return this;
  }

  pre(..._args: any[]) {
    return this;
  }
}

export const models: Record<string, PgDocumentModel> = {};

function defaultCollection(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

export function model<T = Record<string, any>>(name: string, schema: Schema) {
  const collection = schema.options.collection ?? defaultCollection(name);
  const pgModel = createPgModel(name, collection);
  models[name] = pgModel;
  return pgModel;
}
