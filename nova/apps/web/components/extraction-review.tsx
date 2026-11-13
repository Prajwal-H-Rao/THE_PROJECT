/**
 * Nova design system - Extraction review component (task 12.8).
 * Renders extracted fields beside their supporting text spans.
 * Unknown fields (no resolvable span) are marked "unknown" and stay unknown
 * until the user confirms them.
 */

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CandidateField, ProfileCandidateFields } from "@/lib/api-types";

interface ExtractionReviewProps {
  fields: ProfileCandidateFields;
  supportingText: string;
  onConfirm: (fieldName: keyof ProfileCandidateFields) => void;
  onMarkUnknown: (fieldName: keyof ProfileCandidateFields) => void;
}

function isUnknown<T>(field: CandidateField<T>): boolean {
  return field.sourceRef === "" && field.method === "unknown";
}

function renderCandidateValue<T>(field: CandidateField<T>): React.ReactNode {
  if (Array.isArray(field.value)) {
    return <span className="text-sm text-foreground">{field.value.join(", ")}</span>;
  }
  return <span className="text-sm text-foreground">{String(field.value)}</span>;
}

function fieldLabel(name: keyof ProfileCandidateFields): string {
  const labels: Record<keyof ProfileCandidateFields, string> = {
    headline: "Headline",
    summary: "Summary",
    skills: "Skills",
    experience: "Experience",
    education: "Education",
    location: "Location",
  };
  return labels[name];
}

export function ExtractionReview({
  fields,
  supportingText,
  onConfirm,
  onMarkUnknown,
}: ExtractionReviewProps) {
  const fieldEntries: Array<[keyof ProfileCandidateFields, CandidateField<unknown>]> = [
    ["headline", fields.headline],
    ["summary", fields.summary],
    ["skills", fields.skills],
    ["experience", fields.experience],
    ["education", fields.education],
    ["location", fields.location],
  ];

  const unknownCount = fieldEntries.filter(([, f]) => isUnknown(f)).length;
  const confirmedCount = fieldEntries.filter(([, f]) => !isUnknown(f)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Extraction Review</h2>
        <Badge variant={unknownCount === 0 ? "success" : "warning"}>
          {confirmedCount} of {fieldEntries.length} confirmed{unknownCount > 0 ? `, ${unknownCount} unknown` : ""}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fieldEntries.map(([name, field]) => {
          const unknown = isUnknown(field);
          return (
            <Card key={name} className="w-full border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{fieldLabel(name)}</CardTitle>
                  {unknown ? (
                    <Badge variant="destructive" className="text-xs">unknown</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{field.method}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Value</p>
                  {field.value === "" || field.value === undefined || field.value === null ? (
                    <p className="text-sm text-muted-foreground italic">—</p>
                  ) : (
                    renderCandidateValue(field as CandidateField<unknown>)
                  )}
                </div>
                {field.sourceRef && !unknown ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Source span</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {field.sourceRef}
                    </pre>
                    <p className="text-xs text-muted-foreground">Confidence: {(field.confidence * 100).toFixed(0)}%</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground text-destructive">
                      No supporting span found
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkUnknown(name)}
                      className="w-full"
                    >
                      Mark unknown
                    </Button>
                  </div>
                )}
                {!unknown && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onConfirm(name)}
                    className="w-full"
                  >
                    Confirm
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="border-t pt-4 space-y-1">
        <h3 className="text-sm font-medium text-foreground">Supporting text</h3>
        <pre className="text-sm text-foreground whitespace-pre-wrap break-words bg-muted p-3 rounded">
          {supportingText}
        </pre>
      </div>
    </div>
  );
}
