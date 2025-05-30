import { ImportCase } from "@/application/cases/import/import-case";
import { NextResponse } from "next/server";
import { ApiResponse, ImportFormData, ImportRouteRequest } from "../types";
import { HealthCase } from "@/application/cases/health/health-case";

async function POST(
  req: ImportRouteRequest
): Promise<NextResponse<ApiResponse["Import"] | { error: string }>> {
  const data = await req.formData();

  const formData: ImportFormData = {
    file: data.get("file") as File | null,
    collectionName: data.get("collectionName") as string | null,
  };

  if (!formData.file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  if (!formData.collectionName) {
    return NextResponse.json(
      { error: "No collectionName provided" },
      { status: 400 }
    );
  }

  // TODO guard
  const healthCase = new HealthCase();
  const { status } = await healthCase.check();
  if (status === "error") {
    return NextResponse.json({ error: "Service is offline" });
  }

  const importer = new ImportCase(formData.file, formData.collectionName);
  const createdNotes = await importer.import();

  return NextResponse.json(createdNotes);
}

export const API_IMPORT_HANDLERS = {
  POST,
};
