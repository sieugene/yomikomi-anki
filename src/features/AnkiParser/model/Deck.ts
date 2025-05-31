import type { SqlJsStatic } from "sql.js";
import type { Extractor } from "./Extractor";
import { DB_FILES } from "../lib/constants";
import { FileStoreManager } from "@/features/StoreManager/model/FileStoreManager";
import { Db } from "./db/Db";
import Anki21bDb from "./db/Anki21bDb";
import Anki21Db from "./db/Anki21Db";
import Anki2Db from "./db/Anki2Db";

type Media = {
  fileName: string;
  getBlob: () => Promise<string>;
  revokeBlob: () => void;
};

export class Deck {
  private db: Db | null = null;
  private fileManager = new FileStoreManager();

  constructor(
    private deckName: string,
    private sqlClient: SqlJsStatic,
    private extractor: Extractor
  ) {}

  async init(): Promise<void> {
    let TARGET_DB_V = DB_FILES.LEGACY;
    const files = await this.extractor.listFiles();
  
    if (files.includes(DB_FILES.MODERN)) {
      TARGET_DB_V = DB_FILES.MODERN;
    } else if (files.includes(DB_FILES.LEGACY)) {
      TARGET_DB_V = DB_FILES.LEGACY;
    } else if (files.includes(DB_FILES.OLD)) {
      TARGET_DB_V = DB_FILES.OLD;
    }

    const itemKey = `${this.deckName}-db-file-${TARGET_DB_V}`;
    await this.syncCacheFile(itemKey, TARGET_DB_V, this.deckName);
    const dbFile = await this.fileManager.getAsFile(itemKey);
  
    if (!dbFile) {
      throw new Error(`Failed to retrieve database file for key: ${itemKey}`);
    }
    const arrayBuffer =
      dbFile instanceof ArrayBuffer
        ? dbFile
        : (await dbFile.arrayBuffer?.()) ?? null;
    if (!arrayBuffer) {
      throw new Error(
        `Database file is not a valid ArrayBuffer for key: ${itemKey}`
      );
    }

    switch (TARGET_DB_V) {
      case DB_FILES.MODERN:
        this.db = new Anki21bDb(this.sqlClient, arrayBuffer);
        break;
      case DB_FILES.LEGACY:
        this.db = new Anki21Db(this.sqlClient, arrayBuffer);
        break;
      case DB_FILES.OLD:
        this.db = new Anki2Db(this.sqlClient, arrayBuffer);
    }
  }

  async getCollectedData() {
    if (!this.db) throw new Error("Database not initialized");
    const mediaMap = await this.getMedia();
    const notesRaw = await this.db.getNotes();
    const models = await this.db.getModels();
    return {
      notesRaw,
      models,
      mediaMap,
    };
  }

  async getMedia(mediaFileName = "media"): Promise<Media[]> {
    const mediaArray = await this.extractor.extractMedia(mediaFileName);

    return Promise.all(
      Object.keys(mediaArray).map(async (key) => {
        const fileName = mediaArray[key];
        const itemKey = `${this.deckName}-${fileName}-${key}`;

        return {
          fileName,
          getBlob: async () => {
            try {
              await this.syncCacheFile(itemKey, key, fileName);
              const { url } = await this.fileManager.getFileUrl(itemKey);

              return url;
            } catch (error) {
              console.error(error);
              return "";
            }
          },
          revokeBlob: () => {
            if (itemKey) {
              this.fileManager.revokeFileUrl(itemKey);
            }
          },
        };
      })
    );
  }

  private async syncCacheFile(
    itemKey: string,
    extractFileName: string,
    fileName: string
  ) {
    const hasFile = await this.fileManager.has(itemKey).catch(() => null);
    if (!hasFile) {
      const dbFile = await this.extractor.extractFile(extractFileName);
      if (!dbFile)
        throw new Error(
          `syncCacheFile :: Cannot find file: ${extractFileName} `
        );
      await this.fileManager.saveFile(new File([dbFile], fileName), itemKey);
    }
    return hasFile;
  }
}
