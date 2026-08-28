export const importableFields = [
  "school",
  "position",
  "name",
  "applicationDate",
  "tripStart",
  "tripEnd",
  "purpose",
  "destination",
] as const;

export type ImportableField = (typeof importableFields)[number];

export type ImportSource = {
  fileName: string;
  fileType: "xlsx" | "pdf" | "unsupported";
  sheetName?: string;
  row?: number;
  block?: number;
  page?: number;
  hiddenSheet?: boolean;
};

export type TripImportCandidate = {
  id: string;
  source: ImportSource;
  status: "recognized" | "needs-review" | "unsupported";
  values: Partial<Record<ImportableField, string>>;
  recognizedFields: ImportableField[];
  issues: string[];
  included: boolean;
};
