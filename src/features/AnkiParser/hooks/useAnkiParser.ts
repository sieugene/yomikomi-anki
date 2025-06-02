"use client";
import { FormattedImportData } from "@/features/Collection/types";
import { useState } from "react";
import { useSqlJs } from "../context/SqlJsProvider";
import { Deck } from "../model/Deck";
import { Extractor } from "../model/Extractor";
import { useStoreCollection } from "@/features/Collection/context/StoreCollectionContext";

export const useAnkiParser = (type: string) => {
  const { add } = useStoreCollection();
  const [data, setData] = useState<FormattedImportData[]>([]);
  const { sqlClient } = useSqlJs();

  const handleUpload = async (extractor: Extractor, fastCacheFile?: File) => {
    if (!sqlClient) {
      throw new Error("SQL client is not initialized");
    }

    const deck = new Deck(type, sqlClient, extractor);
    await deck.init();

    const { mediaMap, models, notesRaw } = await deck.getCollectedData();

    const notes = Object.values(notesRaw).map((note) => {
      const model = models[note.mid] as { flds: { name: string }[] };

      const fieldNames: string[] = model.flds.map((f) => f.name);
      const values = note.flds.split("\x1f");
      const fields: Record<string, string> = {};
      fieldNames.forEach((name, idx) => {
        fields[name] = values[idx] ?? "";
      });
      return {
        id: note.id,
        fields,
      };
    });
    const formatted = notes.map((note) => {
      const collectionId = "0";
      const createdAt = new Date();
      const updatedAt = new Date();

      const importData: FormattedImportData = {
        note: {
          fields: note.fields,
          id: note.id.toString(),
          collectionId,
          createdAt,
          updatedAt,
        },
        media: Object.values(mediaMap).map((media, index) => {
          const item: FormattedImportData["media"][0] = {
            id: index.toString(),
            collectionId,
            createdAt,
            updatedAt,
            originalName: media.fileName,
            path: media.fileName,
            type: "image",
            getBlob: media.getBlob,
          };
          return item;
        }),
      };
      return importData;
    });

    if (fastCacheFile) {
      await add(fastCacheFile!);
    }

    setData(formatted);
  };
  return { handleUpload, data };
};
