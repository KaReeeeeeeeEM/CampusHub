"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { FiArrowLeft, FiArrowRight, FiLoader, FiPlus, FiTrash2 } from "react-icons/fi";
import { z } from "zod";

import {
  CampusCheckbox,
  CampusInput,
  CampusTextarea,
} from "@/components/campushub";
import { MultiStepProgress } from "@/components/shared/multi-step-progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";

export const sharedPollTypes = [
  "GENERAL",
  "LEADERSHIP",
  "ACADEMIC",
  "EVENT",
  "SURVEY",
  "REFERENDUM",
] as const;

export const sharedPollVisibilities = [
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
] as const;

export const sharedPollStatuses = [
  "DRAFT",
  "ACTIVE",
  "CLOSED",
  "ARCHIVED",
] as const;

const pollFormSchema = z
  .object({
    title: z.string().trim().min(4, "Poll question is required."),
    description: z.string().trim().max(2000).optional().default(""),
    pollType: z.enum(sharedPollTypes).default("GENERAL"),
    visibility: z.enum(sharedPollVisibilities).default("UNIVERSITY"),
    collegeId: z.string().optional().default(""),
    departmentId: z.string().optional().default(""),
    startDate: z.string().optional().default(""),
    endDate: z.string().min(1, "Voting close date is required."),
    status: z.enum(sharedPollStatuses).default("DRAFT"),
    allowMultipleSelection: z.boolean().default(false),
    anonymous: z.boolean().default(true),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Option cannot be empty."),
        }),
      )
      .min(2, "Add at least two poll options."),
  })
  .superRefine((values, context) => {
    if (values.visibility === "COLLEGE" && !values.collegeId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a college for this poll.",
        path: ["collegeId"],
      });
    }

    if (values.visibility === "DEPARTMENT" && !values.departmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a department for this poll.",
        path: ["departmentId"],
      });
    }
  });

export type SharedPollFormValues = z.infer<typeof pollFormSchema>;

export type PollTargetOption = {
  id: string;
  name: string;
  universityId?: string;
};

type PollFormProps = {
  initialValues?: Partial<SharedPollFormValues>;
  collegeOptions?: PollTargetOption[];
  departmentOptions?: PollTargetOption[];
  isSubmitting?: boolean;
  submitLabel?: string;
  beforeFields?: React.ReactNode;
  onSubmit: (values: SharedPollFormValues) => void;
};

function SelectField<T extends string>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onValueChange: (value: T) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function TargetSelect({
  label,
  value,
  options,
  placeholder,
  onValueChange,
}: {
  label: string;
  value: string;
  options: PollTargetOption[];
  placeholder: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 md:col-span-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function defaultDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 16);
}

export function PollForm({
  initialValues,
  collegeOptions = [],
  departmentOptions = [],
  isSubmitting = false,
  submitLabel = "Create Poll",
  beforeFields,
  onSubmit,
}: PollFormProps) {
  const [step, setStep] = useState(0);
  const { register, control, handleSubmit, watch, setValue, trigger, formState } =
    useForm<z.input<typeof pollFormSchema>, unknown, SharedPollFormValues>({
      resolver: zodResolver(pollFormSchema),
      defaultValues: {
        title: initialValues?.title ?? "",
        description: initialValues?.description ?? "",
        pollType: initialValues?.pollType ?? "GENERAL",
        visibility: initialValues?.visibility ?? "UNIVERSITY",
        collegeId: initialValues?.collegeId ?? "",
        departmentId: initialValues?.departmentId ?? "",
        startDate: initialValues?.startDate ?? defaultDate(0),
        endDate: initialValues?.endDate ?? defaultDate(1),
        status: initialValues?.status ?? "DRAFT",
        allowMultipleSelection:
          initialValues?.allowMultipleSelection ?? false,
        anonymous: initialValues?.anonymous ?? true,
        options: initialValues?.options ?? [{ label: "" }, { label: "" }],
      },
    });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });
  const pollType = watch("pollType") ?? "GENERAL";
  const visibility = watch("visibility") ?? "UNIVERSITY";
  const status = watch("status") ?? "DRAFT";
  const steps = [
    {
      title: "Basics",
      description: "Write the poll question and supporting context.",
    },
    {
      title: "Audience",
      description: "Choose visibility, schedule, and publication status.",
    },
    {
      title: "Options",
      description: "Add choices and voting rules.",
    },
  ];
  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  async function goNext() {
    const valid = await trigger(
      step === 0
        ? ["title", "description"]
        : ["pollType", "visibility", "collegeId", "departmentId", "status", "endDate"],
    );
    if (valid) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        if (!isLastStep) {
          event.preventDefault();
          void goNext();
          return;
        }
        void handleSubmit(onSubmit)(event);
      }}
    >
      <MultiStepProgress
        activeIndex={step}
        className="mb-8"
        maxClickableIndex={step}
        steps={steps.map((item) => ({
          label: item.title,
          icon: FiArrowRight,
        }))}
        onStepClick={setStep}
      />
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {currentStep.title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentStep.description}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {step === 0 ? (
          <>
            {beforeFields}
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Poll Question</span>
              <CampusTextarea
                {...register("title")}
                invalid={Boolean(formState.errors.title)}
                placeholder="e.g. Which workshop should run next?"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Description</span>
              <CampusTextarea
                {...register("description")}
                invalid={Boolean(formState.errors.description)}
                placeholder="Explain what students are voting on and how the results will be used."
              />
            </label>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <SelectField
              label="Poll Type"
              value={pollType}
              options={sharedPollTypes}
              onValueChange={(value) =>
                setValue("pollType", value as SharedPollFormValues["pollType"])
              }
            />
            <SelectField
              label="Audience"
              value={visibility}
              options={sharedPollVisibilities}
              onValueChange={(value) => {
                setValue("visibility", value as SharedPollFormValues["visibility"]);
                if (value !== "COLLEGE") setValue("collegeId", "");
                if (value !== "DEPARTMENT") setValue("departmentId", "");
              }}
            />
            {visibility === "COLLEGE" ? (
              <TargetSelect
                label="College"
                value={watch("collegeId") || ""}
                options={collegeOptions}
                placeholder="Choose college"
                onValueChange={(value) => setValue("collegeId", value)}
              />
            ) : null}
            {visibility === "DEPARTMENT" ? (
              <TargetSelect
                label="Department"
                value={watch("departmentId") || ""}
                options={departmentOptions}
                placeholder="Choose department"
                onValueChange={(value) => setValue("departmentId", value)}
              />
            ) : null}
            <SelectField
              label="Status"
              value={status}
              options={sharedPollStatuses}
              onValueChange={(value) =>
                setValue("status", value as SharedPollFormValues["status"])
              }
            />
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Voting Opens</span>
                <CampusInput
                  {...register("startDate")}
                  type="datetime-local"
                  invalid={Boolean(formState.errors.startDate)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Voting Closes</span>
                <CampusInput
                  {...register("endDate")}
                  type="datetime-local"
                  invalid={Boolean(formState.errors.endDate)}
                />
              </label>
            </div>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <div className="space-y-3 md:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-sm font-medium">Options</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add each poll option as a separate choice.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => append({ label: "" })}
                >
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  Add Option
                </Button>
              </div>
              <div className="grid gap-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <CampusInput
                      {...register(`options.${index}.label`)}
                      invalid={Boolean(formState.errors.options?.[index]?.label)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      aria-label={`Remove option ${index + 1}`}
                      className="shrink-0"
                      disabled={fields.length <= 2}
                      size="icon"
                      type="button"
                      variant="secondary"
                      onClick={() => remove(index)}
                    >
                      <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
              {formState.errors.options?.message ? (
                <p className="text-xs font-medium text-destructive">
                  {formState.errors.options.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
                <CampusCheckbox
                  checked={watch("allowMultipleSelection")}
                  onChange={(event) =>
                    setValue("allowMultipleSelection", event.target.checked)
                  }
                />
                <span className="text-sm font-medium">
                  Allow multiple selections
                </span>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
                <CampusCheckbox
                  checked={watch("anonymous")}
                  onChange={(event) =>
                    setValue("anonymous", event.target.checked)
                  }
                />
                <span className="text-sm font-medium">Anonymous voting</span>
              </label>
            </div>
          </>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          disabled={step === 0 || isSubmitting}
          type="button"
          variant="secondary"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        {!isLastStep ? (
          <Button disabled={isSubmitting} type="button" onClick={goNext}>
            Continue
            <FiArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
