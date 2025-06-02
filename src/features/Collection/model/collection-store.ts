import { FileStoreManager } from "@/features/StoreManager/model/FileStoreManager";
import { v4 as uuidv4 } from "uuid";

const INIT_JSON_STRUCTURE = `
{
  "data": []
}
`;

export type CollectionStoreState = {
  data: {
    name: string;
    id: string;
  }[];
};

export class CollectionStore {
  private STORE_KEY = "CARD_STORE";
  private storeManager: FileStoreManager;
  private state: CollectionStoreState = {
    data: [],
  };
  constructor(
    storeManager: FileStoreManager,
    private readonly subcribe?: (state: CollectionStoreState) => void
  ) {
    this.storeManager = storeManager;
  }

  public async init() {
    const cardStoreExist = await this.storeManager.has(this.STORE_KEY);

    // Init Store
    if (!cardStoreExist) {
      await this.sync();
    } else {
      // Sync cached
      const cardFile = await this.storeManager.get(this.STORE_KEY);
      const text = await cardFile?.content.text();
      this.state = JSON.parse(text || INIT_JSON_STRUCTURE);
      await this.sync();
    }
  }

  public async add(ankiDeck: File) {
    
    const uuid = uuidv4();
    const name = ankiDeck?.name || "unkown file";
    await this.storeManager.saveFile(ankiDeck, uuid);
    this.state.data.push({
      id: uuid,
      name,
    });
    await this.sync();
  }

  public getState() {
    return this.state;
  }
  public getStoreManager() {
    return this.storeManager;
  }

  private async sync() {
    await this.storeManager.save({
      content: new Blob([JSON.stringify(this.state)], {
        type: "application/json",
      }),
      key: this.STORE_KEY,
      name: this.STORE_KEY,
      type: "application/json",
    });

    this.subcribe?.(this.state);
  }
}
