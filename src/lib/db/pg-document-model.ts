/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";

import { connectPostgres, getPostgresPool } from "@/lib/db/postgres";

type AnyDoc = Record<string, any>;
type StoredDoc = AnyDoc & {
  _id: any;
  role?: any;
  roles?: any;
  maxUsageCount?: any;
  usageCount?: any;
  currentStep?: any;
  data?: any;
  completed?: any;
  savedAt?: any;
  completedAt?: any;
  universityId?: any;
};
type SortSpec = Record<string, 1 | -1 | "asc" | "desc" | "ascending" | "descending">;

function clone<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function getPath(doc: AnyDoc, path: string) {
  return path.split(".").reduce<any>((current, key) => current?.[key], doc);
}

function setPath(doc: AnyDoc, path: string, value: unknown) {
  const parts = path.split(".");
  let current = doc;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]!] = value;
}

function unsetPath(doc: AnyDoc, path: string) {
  const parts = path.split(".");
  let current = doc;
  for (const part of parts.slice(0, -1)) {
    current = current?.[part];
    if (!current) return;
  }
  delete current[parts[parts.length - 1]!];
}

function asComparable(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && /^\d{4}-\d{2}-\d{2}T/.test(value)) return parsed;
  }
  return value as any;
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (expected instanceof RegExp) {
    return expected.test(String(actual ?? ""));
  }

  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    const conditions = expected as AnyDoc;
    return Object.entries(conditions).every(([operator, value]) => {
      if (operator === "$in") {
        const values = Array.isArray(value) ? value : [];
        return Array.isArray(actual)
          ? actual.some((item) => values.includes(item))
          : values.includes(actual);
      }
      if (operator === "$nin") {
        const values = Array.isArray(value) ? value : [];
        return Array.isArray(actual)
          ? actual.every((item) => !values.includes(item))
          : !values.includes(actual);
      }
      if (operator === "$ne") return actual !== value;
      if (operator === "$exists") return value ? actual !== undefined : actual === undefined;
      if (operator === "$regex") {
        const flags = typeof conditions.$options === "string" ? conditions.$options : "";
        return new RegExp(String(value), flags).test(String(actual ?? ""));
      }
      if (operator === "$gte") return asComparable(actual) >= asComparable(value);
      if (operator === "$gt") return asComparable(actual) > asComparable(value);
      if (operator === "$lte") return asComparable(actual) <= asComparable(value);
      if (operator === "$lt") return asComparable(actual) < asComparable(value);
      if (operator === "$type") {
        if (value === "string") return typeof actual === "string";
        if (value === "number") return typeof actual === "number";
        if (value === "array") return Array.isArray(actual);
        return actual != null;
      }
      if (operator === "$options") return true;
      return matchesValue(getPath(actual as AnyDoc, operator), value);
    });
  }

  if (Array.isArray(actual)) return actual.includes(expected);
  return actual === expected;
}

function matchesFilter(doc: AnyDoc, filter: AnyDoc = {}): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return Array.isArray(value) && value.some((item) => matchesFilter(doc, item));
    if (key === "$and") return Array.isArray(value) && value.every((item) => matchesFilter(doc, item));
    return matchesValue(getPath(doc, key), value);
  });
}

function applyProjection(doc: AnyDoc, projection?: string | Record<string, 0 | 1 | boolean>) {
  if (!projection) return doc;

  const fields =
    typeof projection === "string"
      ? Object.fromEntries(
          projection
            .split(/\s+/)
            .filter(Boolean)
            .map((field) => [field.replace(/^-/, ""), field.startsWith("-") ? 0 : 1]),
        )
      : projection;

  const include = Object.values(fields).some((value) => value === 1 || value === true);
  if (include) {
    const projected: AnyDoc = {};
    for (const [field, enabled] of Object.entries(fields)) {
      if (enabled === 1 || enabled === true) setPath(projected, field, getPath(doc, field));
    }
    if (fields._id !== 0 && doc._id != null) projected._id = doc._id;
    return projected;
  }

  const projected = clone(doc);
  for (const [field, enabled] of Object.entries(fields)) {
    if (enabled === 0 || enabled === false) unsetPath(projected, field);
  }
  return projected;
}

function sortDocs(docs: AnyDoc[], sort?: SortSpec) {
  if (!sort) return docs;
  const entries = Object.entries(sort);
  return [...docs].sort((a, b) => {
    for (const [field, direction] of entries) {
      const dir = direction === -1 || direction === "desc" || direction === "descending" ? -1 : 1;
      const av = asComparable(getPath(a, field));
      const bv = asComparable(getPath(b, field));
      if (av == null && bv != null) return -1 * dir;
      if (av != null && bv == null) return 1 * dir;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
    }
    return 0;
  });
}

function applyUpdate(doc: AnyDoc, update: AnyDoc, inserting = false) {
  const next = clone(doc);
  const hasOperator = Object.keys(update).some((key) => key.startsWith("$"));

  if (!hasOperator) return { ...next, ...update };

  for (const [key, value] of Object.entries(update.$set ?? {})) setPath(next, key, value);
  if (inserting) {
    for (const [key, value] of Object.entries(update.$setOnInsert ?? {})) setPath(next, key, value);
  }
  for (const [key, value] of Object.entries(update.$inc ?? {})) {
    setPath(next, key, Number(getPath(next, key) ?? 0) + Number(value));
  }
  for (const key of Object.keys(update.$unset ?? {})) unsetPath(next, key);
  for (const [key, value] of Object.entries(update.$addToSet ?? {})) {
    const current = getPath(next, key);
    const array = Array.isArray(current) ? [...current] : [];
    const values = (value as AnyDoc)?.$each ?? [value];
    for (const item of values) if (!array.includes(item)) array.push(item);
    setPath(next, key, array);
  }
  for (const [key, value] of Object.entries(update.$push ?? {})) {
    const current = getPath(next, key);
    const array = Array.isArray(current) ? [...current] : [];
    const values = (value as AnyDoc)?.$each ?? [value];
    array.push(...values);
    setPath(next, key, array);
  }

  return next;
}

export class PgDocument {
  [key: string]: any;

  constructor(
    private readonly model: PgDocumentModel,
    data: AnyDoc,
  ) {
    Object.assign(this, data);
  }

  toObject() {
    return clone({ ...this, model: undefined });
  }

  async save() {
    const doc = this.toObject();
    await this.model.replaceDocument(doc);
    return this;
  }
}

export class PgQuery<T> implements PromiseLike<T> {
  private sortSpec?: SortSpec;
  private limitCount?: number;
  private skipCount = 0;
  private projection?: string | Record<string, 0 | 1 | boolean>;
  private whereFilter?: AnyDoc;

  constructor(private readonly executor: (query: PgQuery<T>) => Promise<T>) {}

  sort(sort: SortSpec) {
    this.sortSpec = sort;
    return this;
  }

  limit(limit: number) {
    this.limitCount = limit;
    return this;
  }

  skip(skip: number) {
    this.skipCount = skip;
    return this;
  }

  select(projection: string | Record<string, 0 | 1 | boolean>) {
    this.projection = projection;
    return this;
  }

  lean<TResult = T>() {
    return this as unknown as PgQuery<TResult>;
  }

  populate() {
    return this;
  }

  where(filter: AnyDoc) {
    this.whereFilter = {
      ...(this.whereFilter ?? {}),
      ...filter,
    };
    return this;
  }

  exec() {
    return this.executor(this);
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.exec().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null) {
    return this.exec().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return this.exec().finally(onfinally ?? undefined);
  }

  apply(docs: AnyDoc[]) {
    let result = this.whereFilter
      ? docs.filter((doc) => matchesFilter(doc, this.whereFilter))
      : docs;
    result = sortDocs(result, this.sortSpec);
    if (this.skipCount) result = result.slice(this.skipCount);
    if (this.limitCount != null) result = result.slice(0, this.limitCount);
    if (this.projection) result = result.map((doc) => applyProjection(doc, this.projection));
    return result;
  }
}

export class PgDocumentModel {
  constructor(
    public readonly modelName: string,
    public readonly collection: string,
  ) {}

  private async allDocs() {
    await connectPostgres();
    const result = await getPostgresPool().query<{ doc: AnyDoc }>(
      "SELECT doc FROM app_documents WHERE collection = $1",
      [this.collection],
    );
    return result.rows.map((row) => row.doc);
  }

  private hydrate(doc: AnyDoc | null) {
    return doc ? new PgDocument(this, doc) : null;
  }

  async replaceDocument(doc: AnyDoc): Promise<any> {
    await connectPostgres();
    const now = new Date().toISOString();
    const id = String(doc._id ?? doc.id ?? randomUUID());
    const next: AnyDoc = { ...doc, _id: id, updatedAt: doc.updatedAt ?? now };
    if (!next.createdAt) next.createdAt = now;
    await getPostgresPool().query(
      `INSERT INTO app_documents (collection, id, doc, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, COALESCE(($3::jsonb->>'createdAt')::timestamptz, NOW()), NOW())
       ON CONFLICT (collection, id)
       DO UPDATE SET doc = EXCLUDED.doc, updated_at = NOW()`,
      [this.collection, id, JSON.stringify(next)],
    );
    return this.hydrate(next);
  }

  find<T extends AnyDoc = StoredDoc>(filter: AnyDoc = {}): PgQuery<T[]> {
    return new PgQuery<AnyDoc[]>(async (query) => {
      const docs = (await this.allDocs()).filter((doc) => matchesFilter(doc, filter));
      return query.apply(docs);
    }) as unknown as PgQuery<T[]>;
  }

  findOne<T extends AnyDoc = StoredDoc>(filter: AnyDoc = {}): PgQuery<T | null> {
    return new PgQuery<AnyDoc | null>(async (query) => {
      const docs = (await this.allDocs()).filter((doc) => matchesFilter(doc, filter));
      return query.apply(docs)[0] ?? null;
    }) as unknown as PgQuery<T | null>;
  }

  findById<T extends AnyDoc = StoredDoc>(id: string): PgQuery<T | null> {
    return this.findOne({ _id: id });
  }

  async exists(filter: AnyDoc = {}): Promise<any> {
    const doc = await this.findOne(filter).select("_id");
    return doc ? { _id: doc._id } : null;
  }

  countDocuments(filter: AnyDoc = {}): PgQuery<number> {
    return new PgQuery<number>(async () => {
      return (await this.allDocs()).filter((doc) => matchesFilter(doc, filter)).length;
    });
  }

  async create(input: AnyDoc | AnyDoc[]): Promise<any> {
    if (Array.isArray(input)) {
      const created = [];
      for (const doc of input) created.push(await this.create(doc));
      return created;
    }
    const now = new Date().toISOString();
    const doc = {
      ...input,
      _id: input._id ?? randomUUID(),
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    return this.replaceDocument(doc);
  }

  async insertMany(input: AnyDoc[], _options: AnyDoc = {}): Promise<any> {
    return this.create(input);
  }

  async updateOne(filter: AnyDoc, update: AnyDoc, options: AnyDoc = {}) {
    const existing = (await this.allDocs()).find((doc) => matchesFilter(doc, filter));
    if (!existing && options.upsert) {
      const base = Object.fromEntries(
        Object.entries(filter).filter(([key, value]) => !key.startsWith("$") && typeof value !== "object"),
      );
      await this.replaceDocument(applyUpdate({ ...base, _id: (filter as AnyDoc)._id ?? randomUUID() }, update, true));
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    if (!existing) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    await this.replaceDocument({ ...applyUpdate(existing, update), updatedAt: new Date().toISOString() });
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(filter: AnyDoc, update: AnyDoc) {
    const docs = (await this.allDocs()).filter((doc) => matchesFilter(doc, filter));
    for (const doc of docs) {
      await this.replaceDocument({ ...applyUpdate(doc, update), updatedAt: new Date().toISOString() });
    }
    return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length };
  }

  findOneAndUpdate<T extends AnyDoc = AnyDoc>(filter: AnyDoc, update: AnyDoc, options: AnyDoc = {}): PgQuery<T | null> {
    return new PgQuery<any>(async () => {
      const existing = (await this.allDocs()).find((doc) => matchesFilter(doc, filter));
      if (!existing) {
        if (!options.upsert) return null;
        const base = Object.fromEntries(
          Object.entries(filter).filter(([key, value]) => !key.startsWith("$") && typeof value !== "object"),
        );
        return this.replaceDocument(applyUpdate({ ...base, _id: (filter as AnyDoc)._id ?? randomUUID() }, update, true));
      }
      const next = { ...applyUpdate(existing, update), updatedAt: new Date().toISOString() };
      await this.replaceDocument(next);
      return this.hydrate(options.new === false || options.returnDocument === "before" ? existing : next);
    }) as unknown as PgQuery<T | null>;
  }

  findByIdAndUpdate<T extends AnyDoc = AnyDoc>(id: string, update: AnyDoc, options: AnyDoc = {}): PgQuery<T | null> {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  findOneAndDelete<T extends AnyDoc = AnyDoc>(filter: AnyDoc): PgQuery<T | null> {
    return new PgQuery<any>(async () => {
      const existing = (await this.allDocs()).find((doc) => matchesFilter(doc, filter));
      if (!existing) return null;
      await this.deleteOne({ _id: existing._id });
      return this.hydrate(existing);
    }) as unknown as PgQuery<T | null>;
  }

  async deleteOne(filter: AnyDoc) {
    const existing = (await this.allDocs()).find((doc) => matchesFilter(doc, filter));
    if (!existing) return { acknowledged: true, deletedCount: 0 };
    await getPostgresPool().query("DELETE FROM app_documents WHERE collection = $1 AND id = $2", [
      this.collection,
      String(existing._id),
    ]);
    return { acknowledged: true, deletedCount: 1 };
  }

  async deleteMany(filter: AnyDoc = {}) {
    const docs = (await this.allDocs()).filter((doc) => matchesFilter(doc, filter));
    for (const doc of docs) await this.deleteOne({ _id: doc._id });
    return { acknowledged: true, deletedCount: docs.length };
  }

  async distinct(field: string, filter: AnyDoc = {}) {
    return Array.from(
      new Set(
        (await this.allDocs())
          .filter((doc) => matchesFilter(doc, filter))
          .flatMap((doc) => {
            const value = getPath(doc, field);
            return Array.isArray(value) ? value : [value];
          })
          .filter((value) => value != null),
      ),
    );
  }

  async bulkWrite(operations: AnyDoc[]) {
    for (const operation of operations) {
      if (operation.updateOne) {
        await this.updateOne(
          operation.updateOne.filter,
          operation.updateOne.update,
          { upsert: operation.updateOne.upsert },
        );
      }
      if (operation.insertOne) await this.create(operation.insertOne.document);
      if (operation.deleteOne) await this.deleteOne(operation.deleteOne.filter);
    }
    return { acknowledged: true };
  }

  aggregate<T = any>(pipeline: AnyDoc[] = []): PgQuery<T[]> {
    return new PgQuery<T[]>(async () => {
      let rows = await this.allDocs();
      for (const stage of pipeline) {
        if (stage.$match) rows = rows.filter((doc) => matchesFilter(doc, stage.$match));
        else if (stage.$sort) rows = sortDocs(rows, stage.$sort);
        else if (stage.$skip) rows = rows.slice(Number(stage.$skip));
        else if (stage.$limit) rows = rows.slice(0, Number(stage.$limit));
        else if (stage.$count) rows = [{ [stage.$count]: rows.length }];
        else if (stage.$project) rows = rows.map((doc) => applyProjection(doc, stage.$project));
        else if (stage.$unwind) {
          const path = String(stage.$unwind.path ?? stage.$unwind).replace(/^\$/, "");
          rows = rows.flatMap((doc) => {
            const values = getPath(doc, path);
            return Array.isArray(values)
              ? values.map((value) => {
                  const next = clone(doc);
                  setPath(next, path, value);
                  return next;
                })
              : [doc];
          });
        } else if (stage.$group) {
          rows = groupRows(rows, stage.$group);
        }
      }
      return rows as T[];
    });
  }
}

function groupRows(rows: AnyDoc[], spec: AnyDoc) {
  const groups = new Map<string, AnyDoc>();
  for (const row of rows) {
    const idExpr = spec._id;
    const id = typeof idExpr === "string" && idExpr.startsWith("$") ? getPath(row, idExpr.slice(1)) : idExpr;
    const key = JSON.stringify(id);
    const target = groups.get(key) ?? { _id: id };
    for (const [field, expression] of Object.entries(spec)) {
      if (field === "_id") continue;
      const expr = expression as AnyDoc;
      if (expr.$sum != null) {
        target[field] = Number(target[field] ?? 0) + (expr.$sum === 1 ? 1 : Number(getPath(row, String(expr.$sum).replace(/^\$/, "")) ?? 0));
      }
      if (expr.$first != null && target[field] == null) {
        target[field] = getPath(row, String(expr.$first).replace(/^\$/, ""));
      }
      if (expr.$push != null) {
        target[field] = [...(target[field] ?? []), getPath(row, String(expr.$push).replace(/^\$/, ""))];
      }
    }
    groups.set(key, target);
  }
  return Array.from(groups.values());
}

export function createPgModel(modelName: string, collection: string) {
  return new PgDocumentModel(modelName, collection);
}
