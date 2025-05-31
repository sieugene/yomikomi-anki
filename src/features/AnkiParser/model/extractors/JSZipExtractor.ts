import JSZip from "jszip";
import { parseAnkiMediaJson } from "../../lib/parseAnkiMediaJson";
import { Extractor } from "../Extractor";

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

    const mediaFile = await file.async("string");
    if (!mediaFile) throw new Error(`Failed to prepare media file to string`);

    const mediaArray = parseAnkiMediaJson(mediaFile);
    return mediaArray;
  }

  async listFiles(): Promise<string[]> {
    return Object.keys(this.zip.files);
  }
}
