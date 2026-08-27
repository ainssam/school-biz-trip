import registry from "@/assets/templates/registry.json";

export type TemplateFiles = {
  hwp: string;
  pdf: string;
  hwpFieldMap: string;
  pdfFieldMap: string;
};

export type TemplateDefinition = {
  id: string;
  label: string;
  region: string;
  school: string;
  year: number;
  description: string;
  files: TemplateFiles;
};

export const defaultTemplateId = registry.defaultTemplateId;
export const templateCatalog = registry.templates satisfies TemplateDefinition[];

export function getTemplateById(id: string): TemplateDefinition {
  const template = templateCatalog.find((candidate) => candidate.id === id);
  if (!template) {
    throw new Error(`등록되지 않은 템플릿: ${id}`);
  }
  return template;
}

export function isTemplateId(id: string): boolean {
  return templateCatalog.some((template) => template.id === id);
}
