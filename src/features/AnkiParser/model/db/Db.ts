import type { Database, SqlJsStatic } from "sql.js";

export type Card = {
  id: number;
  nid: number;
  did: number;
  ord: number;
  mod: number;
  usn: number;
  type: number;
  queue: number;
  due: number;
  ivl: number;
  factor: number;
  reps: number;
  lapses: number;
  left: number;
  odue: number;
  odid: number;
  flags: number;
  data: string;
};

export type Note = {
  id: number;
  guid: string;
  mid: number;
  mod: number;
  usn: number;
  tags: string;
  flds: string;
  sfld: string;
  csum: number;
  flags: number;
  data: string;
  cards: Card[];
};

export type Collection = {
  id?: number;
  crt?: number;
  mod?: number;
  scm?: number;
  ver?: number;
  dty?: number;
  usn?: number;
  ls?: number;
  conf?: Record<string, unknown>;
  models?: Record<string, unknown>;
  decks?: Record<string, unknown>;
  dconf?: Record<string, unknown>;
  tags?: Record<string, unknown>;
};

export class Db {
  protected db: Database;
  constructor(private sqlClient: SqlJsStatic, dbFile: ArrayBuffer) {
    this.db = new this.sqlClient.Database(new Uint8Array(dbFile));
  }

  public getNotes() {
    const notes: Record<number, Note> = {};

    const noteRows = this.db.exec("SELECT * FROM notes")[0]?.values || [];
    const cardRows = this.db.exec("SELECT * FROM cards")[0]?.values || [];

    for (const row of noteRows) {
      const [id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data] =
        row as [
          number,
          string,
          number,
          number,
          number,
          string,
          string,
          string,
          number,
          number,
          string
        ];
      notes[id] = {
        id,
        guid,
        mid,
        mod,
        usn,
        tags,
        flds,
        sfld,
        csum,
        flags,
        data,
        cards: [],
      };
    }

    for (const row of cardRows) {
      const [
        id,
        nid,
        did,
        ord,
        mod,
        usn,
        type,
        queue,
        due,
        ivl,
        factor,
        reps,
        lapses,
        left,
        odue,
        odid,
        flags,
        data,
      ] = row as [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        string
      ];
      if (notes[nid]) {
        notes[nid].cards.push({
          id,
          nid,
          did,
          ord,
          mod,
          usn,
          type,
          queue,
          due,
          ivl,
          factor,
          reps,
          lapses,
          left,
          odue,
          odid,
          flags,
          data,
        });
      }
    }

    return notes;
  }

  async getCollection(): Promise<Collection> {
    if (!this.db) throw new Error("Database not initialized");
    const res = this.db.exec("SELECT * FROM col");
    const columns = res[0]?.columns || [];
    const values = res[0]?.values?.[0] || [];

    const collection: Collection = {};
    columns.forEach((column: string, index: number) => {
      const value = values[index];
      const key = column as keyof Collection;

      if (
        column === "conf" ||
        column === "models" ||
        column === "decks" ||
        column === "dconf" ||
        column === "tags"
      ) {
        const jsonKey = key as "conf" | "models" | "decks" | "dconf" | "tags";
        const strValue = typeof value === "string" ? value : "{}";
        try {
          collection[jsonKey] = JSON.parse(strValue);
        } catch {
          collection[jsonKey] = {};
        }
      } else {
        const numericKey = key as Exclude<
          keyof Collection,
          "conf" | "models" | "decks" | "dconf" | "tags"
        >;
        if (value === null || value === undefined) {
          collection[numericKey] = undefined;
        } else if (typeof value === "number") {
          collection[numericKey] = value;
        } else {
          const numValue = typeof value === "string" ? parseFloat(value) : NaN;
          collection[numericKey] = isNaN(numValue) ? undefined : numValue;
        }
      }
    });

    return collection;
  }

  async getModels(): Promise<Record<string, unknown>> {
    const col = await this.getCollection();
    return col.models || {};
  }
}
