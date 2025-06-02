import JSZip from "jszip";
import { Extractor } from "../Extractor";
import protobuf from "protobufjs";

export class JSZipExtractor implements Extractor {
  private zip: JSZip;

  constructor(private file: File) {
    this.zip = new JSZip();
  }

  async init(): Promise<void> {
    await this.zip.loadAsync(this.file);
  }

  async extractFile(fileName: string): Promise<ArrayBuffer | null> {
    const file = this.zip.file(fileName);
    return file ? file.async("arraybuffer") : null;
  }

  async extractMedia(fileName: string): Promise<Record<string, string>> {
    const file = this.zip.file(fileName);
    if (!file) {
      throw new Error(`File ${fileName} not found`);
    }

    const buf = await file.async("uint8array");

    // trying to parse media file as a json
    try {
      return JSON.parse(buf.toString());
    } catch (e) {
      console.log("Failed to parse media as json...");
    }

    console.log("Trying to open media file as Proxy Buffer");

    // trying to decode media file as buffer message
    let entries = [];
    try {
      const root = protobuf.loadSync(
        __dirname + "/../protos/import_export.proto"
      );
      const MediaEntries = root.lookupType("anki.import_export.MediaEntries");
      const message = MediaEntries.decode(buf);
      entries = message.toJSON().entries || [];
    } catch (e: any) {
      throw new Error("Error during decode Proxy message: " + e?.message);
    }

    const res: Record<string, string> = {};
    for (const i in entries) {
      res[String(i)] = String(entries?.[i]?.name);
    }
debugger
    return res;
  }

  async listFiles(): Promise<string[]> {
    return Object.keys(this.zip.files);
  }
}
