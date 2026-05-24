import z from "zod";

export const ISODateTimeStringSchema = z.string().datetime();
export type ISODateTimeString = z.infer<typeof ISODateTimeStringSchema>;

export const LocalDateStringSchema = z.string().date();
export type LocalDateString = z.infer<typeof LocalDateStringSchema>;

export const LocalDatePeriodStringSchema = z
  .object({
    startDate: LocalDateStringSchema,
    endDate: LocalDateStringSchema,
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "終了日は開始日以降にしてください",
      });
    }
  });
export type LocalDatePeriodString = z.infer<
  typeof LocalDatePeriodStringSchema
>;

const LOCAL_DATE_TIME_MINUTE_REGEX =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):[0-5]\d$/;

function isValidLocalDateTimeMinute(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/,
  );
  if (!match) return false;

  const [, y, m, d, h, min] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(min);

  const date = new Date(year, month - 1, day, hour, minute);

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
}

export const LocalDateTimeMinuteStringSchema = z
  .string()
  .regex(
    LOCAL_DATE_TIME_MINUTE_REGEX,
    "YYYY-MM-DD HH:mm 形式で入力してください",
  )
  .refine(isValidLocalDateTimeMinute, {
    message: "存在しない日時です",
  });
export type LocalDateTimeMinuteString = z.infer<
  typeof LocalDateTimeMinuteStringSchema
>;
