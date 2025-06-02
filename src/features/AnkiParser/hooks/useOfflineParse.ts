import { useStoreCollection } from "@/features/Collection/context/StoreCollectionContext";
import { JSZipExtractor } from "../model/extractors/JSZipExtractor";
import { useAnkiParser } from "./useAnkiParser";

export const useOfflineParse = () => {
  const { getStoreManager } = useStoreCollection();
  const { data, handleUpload } = useAnkiParser("offline");

  const upload = async (file: File | null) => {
    if (!file) {
      throw new Error("File is not selected");
    }

    const extractor = new JSZipExtractor(file);
    await extractor.init();
    await handleUpload(extractor, file);
  };

  const getCacheFile = async (id: string) => {
    const fileStore = getStoreManager();
    const fileIsExist = await fileStore.has(id);
    if (fileIsExist) {
      const file = await fileStore.getAsFile(id);
      if (file) {
        const extractor = new JSZipExtractor(file);
        await extractor.init();
        await handleUpload(extractor);
      }
    } else {
      throw new Error("Cannot find file");
    }
  };

  return { data, upload, getCacheFile };
};
